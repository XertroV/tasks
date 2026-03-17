package runner

import (
	"fmt"
	"math"
	"math/rand"
	"os"
	"strconv"
	"strings"
)

type rgb struct {
	r int
	g int
	b int
}

const startupLogoReset = "\x1b[0m"

var startupLogoFont = map[rune][2]string{
	'T': packPixelRows([4]string{"#####", " ##  ", " ##  ", " ##  "}),
	'H': packPixelRows([4]string{"##  #", "#####", "##  #", "##  #"}),
	'E': packPixelRows([4]string{"#####", "#### ", "##   ", "#####"}),
	'B': packPixelRows([4]string{"#### ", "#####", "##  #", "#### "}),
	'A': packPixelRows([4]string{" ### ", "##  #", "#####", "##  #"}),
	'C': packPixelRows([4]string{" ####", "##   ", "##   ", " ####"}),
	'K': packPixelRows([4]string{"#  ##", "#### ", "#### ", "#  ##"}),
	'L': packPixelRows([4]string{"##   ", "##   ", "##   ", "#####"}),
	'O': packPixelRows([4]string{" ### ", "##  #", "##  #", " ### "}),
	'G': packPixelRows([4]string{" ####", "##   ", "## ##", " ####"}),
	'S': packPixelRows([4]string{" ####", "###  ", "  ###", "#### "}),
	'P': packPixelRows([4]string{"#### ", "#####", "#### ", "#    "}),
	'W': packPixelRows([4]string{"#   #", "#   #", "# # #", " # # "}),
	'R': packPixelRows([4]string{"#### ", "#####", "#### ", "#  ##"}),
	'N': packPixelRows([4]string{"#   #", "##  #", "# ###", "#   #"}),
	'I': packPixelRows([4]string{" ### ", " ### ", " ### ", " ### "}),
	'D': packPixelRows([4]string{"#### ", "#   #", "#   #", "#### "}),
	'Y': packPixelRows([4]string{"#   #", " ### ", " ### ", " ### "}),
	'F': packPixelRows([4]string{"#####", "#### ", "#    ", "#    "}),
	' ': packPixelRows([4]string{"     ", "     ", "     ", "     "}),
	'?': packPixelRows([4]string{"#####", "#   #", " ### ", "  #  "}),
}

func packPixelRows(rows [4]string) [2]string {
	width := len(rows[0])
	var top strings.Builder
	var bottom strings.Builder
	for i := 0; i < width; i++ {
		topLeft := rows[0][i] == '#'
		topRight := rows[1][i] == '#'
		switch {
		case topLeft && topRight:
			top.WriteString("█")
		case topLeft:
			top.WriteString("▀")
		case topRight:
			top.WriteString("▄")
		default:
			top.WriteString(" ")
		}

		bottomLeft := rows[2][i] == '#'
		bottomRight := rows[3][i] == '#'
		switch {
		case bottomLeft && bottomRight:
			bottom.WriteString("█")
		case bottomLeft:
			bottom.WriteString("▀")
		case bottomRight:
			bottom.WriteString("▄")
		default:
			bottom.WriteString(" ")
		}
	}
	return [2]string{top.String(), bottom.String()}
}

func renderLogoText(text string) (string, string) {
	var upperLines [2]strings.Builder
	for _, ch := range strings.ToUpper(text) {
		glyph, ok := startupLogoFont[ch]
		if !ok {
			glyph = startupLogoFont['?']
		}
		upperLines[0].WriteString(glyph[0])
		upperLines[0].WriteString(" ")
		upperLines[1].WriteString(glyph[1])
		upperLines[1].WriteString(" ")
	}
	return upperLines[0].String(), upperLines[1].String()
}

func startupLogoColorize(text string, c rgb) string {
	if text == "" {
		return text
	}
	return fmt.Sprintf("\x1b[38;2;%d;%d;%dm%s%s", c.r, c.g, c.b, text, startupLogoReset)
}

func startupLogoBlend(a, b rgb, t float64) rgb {
	return rgb{
		r: int(math.Round(float64(a.r) + (float64(b.r)-float64(a.r))*t)),
		g: int(math.Round(float64(a.g) + (float64(b.g)-float64(a.g))*t)),
		b: int(math.Round(float64(a.b) + (float64(b.b)-float64(a.b))*t)),
	}
}

func startupLogoLayerNoise(rng *rand.Rand, depth float64, col int, total int) float64 {
	edge := 0.0
	if total > 1 {
		edge = math.Abs((float64(col)/float64(total-1))-0.5) * 2
	}
	delta := depth + (0.75-edge)*0.35 + (rng.Float64()-0.5)*0.25
	return maxFloat(delta, 0)
}

func startupLogoDissolve(char string, depth float64, col int, total int, rng *rand.Rand) string {
	if char == " " {
		return " "
	}
	if depth <= 0.04 {
		return char
	}
	noise := startupLogoLayerNoise(rng, depth, col, total)
	switch {
	case noise < 0.25:
		return char
	case noise < 0.40:
		return "█"
	case noise < 0.55:
		if rng.Intn(2) == 0 {
			return "▓"
		}
		return "▒"
	case noise < 0.78:
		if rng.Intn(2) == 0 {
			return "░"
		}
		return "·"
	default:
		return " "
	}
}

func startupLogoHumLine(width int, rng *rand.Rand, color bool, c rgb) string {
	if width <= 0 {
		return ""
	}
	segments := width / 3
	segWidth := maxInt(1, segments/2)
	state := 0 // 0 lit, 1 dim, 2 flicker, 3 dead
	stateRemaining := rng.Intn(5) + 4
	var out strings.Builder
	for i := 0; i < width; i++ {
		stateRemaining--
		if stateRemaining <= 0 {
			state = rng.Intn(4)
			segWidth = maxInt(1, segWidth+rng.Intn(4)-2)
			stateRemaining = maxInt(3, segWidth+rng.Intn(7))
		}
		switch state {
		case 0:
			if rng.Float64() < 0.85 {
				out.WriteString("━")
			} else {
				out.WriteString("═")
			}
		case 1:
			if rng.Float64() < 0.75 {
				out.WriteString("─")
			} else {
				out.WriteString("╌")
			}
		case 2:
			if rng.Intn(2) == 0 {
				out.WriteString("─")
			} else {
				out.WriteString("╌")
			}
		default:
			out.WriteString(" ")
		}
	}
	line := out.String()
	if color {
		return startupLogoColorize(line, c)
	}
	return line
}

func startupLogoDripLine(width int, pad int, rng *rand.Rand, color bool, c rgb) string {
	if width <= 0 {
		return strings.Repeat(" ", pad)
	}
	var out strings.Builder
	out.WriteString(strings.Repeat(" ", pad))
	for i := 0; i < width; i++ {
		chance := rng.Float64()
		switch {
		case chance < 0.03:
			out.WriteString("·")
		case chance < 0.08:
			out.WriteString("░")
		case chance < 0.12:
			out.WriteString("▓")
		default:
			out.WriteString(" ")
		}
	}
	line := out.String()
	if color {
		return startupLogoColorize(line, c)
	}
	return line
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func startupLogoTerminalWidth() int {
	columns := strings.TrimSpace(os.Getenv("COLUMNS"))
	if columns != "" {
		width, err := strconv.Atoi(columns)
		if err == nil && width > 0 {
			return width
		}
	}
	return 80
}

func stdoutLooksTTY() bool {
	stat, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return stat.Mode()&os.ModeCharDevice != 0
}

func shouldRenderStartupLogo() bool {
	return stdoutLooksTTY()
}

func renderStack2(width int, seed int64, color bool) []string {
	if width <= 0 {
		width = 80
	}
	const logoText = "THE BACKLOGS"
	const seedDefault = int64(3)
	if seed == 0 {
		seed = seedDefault
	}
	if seed == seedDefault {
		source := startupLogoPythonStack2Plain
		if color {
			source = startupLogoPythonStack2Color
		}
		out := make([]string, len(source))
		for i, line := range source {
			out[i] = line
		}
		return out
	}

	lineA, lineB := renderLogoText(logoText)
	baseTextWidth := len(lineA)
	palette := []rgb{
		{255, 235, 90},
		{240, 210, 65},
		{210, 175, 45},
		{170, 130, 30},
		{120, 80, 12},
		{70, 42, 3},
		{35, 18, 0},
	}
	layerCount := len(palette)
	maxIndent := (layerCount - 1) * 2
	naturalWidth := baseTextWidth + maxIndent

	leftPad := 0
	if width > naturalWidth {
		leftPad = (width - naturalWidth) / 2
	}
	humPad := 0
	if humWidth := naturalWidth + 4; width > humWidth {
		humPad = (width - humWidth) / 2
	}

	rng := rand.New(rand.NewSource(seed))
	out := make([]string, 0, 30)

	humLine := startupLogoHumLine(baseTextWidth+4, rng, color, palette[1])
	if humPad > 0 {
		humLine = strings.Repeat(" ", humPad) + humLine
	}
	out = append(out, humLine)
	out = append(out, "")

	for layer := 0; layer < layerCount; layer++ {
		indent := layer * 2
		paddedLine := leftPad + indent
		depth := 0.0
		if layerCount > 1 {
			depth = float64(layer) / float64(layerCount-1)
		}
		baseColor := palette[layer]
		for _, source := range [2]string{lineA, lineB} {
			var rendered strings.Builder
			rendered.WriteString(strings.Repeat(" ", paddedLine))
			for idx, ch := range source {
				cell := startupLogoDissolve(string(ch), depth, idx, len(source), rng)
				if color {
					rendered.WriteString(startupLogoColorize(cell, baseColor))
				} else {
					rendered.WriteString(cell)
				}
			}
			out = append(out, rendered.String())
		}
		if layer == layerCount-1 {
			continue
		}
		dividerLen := baseTextWidth + indent
		divColor := startupLogoBlend(baseColor, palette[layer+1], 0.45)
		divider := strings.Repeat(" ", paddedLine) + strings.Repeat("─", dividerLen)
		if color {
			divider = startupLogoColorize(divider, divColor)
		}
		out = append(out, divider)
	}

	dripWidth := naturalWidth
	for i := 0; i < 3; i++ {
		out = append(out, startupLogoDripLine(dripWidth, leftPad+2, rng, color, palette[minInt(layerCount-1, i+1)]))
		dripWidth = maxInt(dripWidth-1, baseTextWidth+2)
	}
	return out
}

func printStartupLogo(seed int64, useColor bool) {
	if !shouldRenderStartupLogo() {
		return
	}
	for _, line := range renderStack2(startupLogoTerminalWidth(), seed, useColor) {
		fmt.Println(line)
	}
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
