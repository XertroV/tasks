package runner

import (
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync/atomic"

	"github.com/XertroV/tasks/backlog_go/internal/models"
)

const (
	ansiReset   = "\033[0m"
	ansiBright  = 1
	ansiDim     = 2
	ansiRed     = 31
	ansiGreen   = 32
	ansiYellow  = 33
	ansiBlue    = 34
	ansiMagenta = 35
	ansiCyan    = 36
)

const (
	colorModeAuto int32 = iota
	colorModeOn
	colorModeOff
)

var colorModeState int32

func parseCommandColorFlags(rawArgs []string) ([]string, error) {
	mode := colorModeAuto
	filtered := make([]string, 0, len(rawArgs))
	for _, arg := range rawArgs {
		hasMode, parsedMode, parseErr := parseCommandColorFlag(arg)
		if parseErr != nil {
			return nil, parseErr
		}
		if hasMode {
			mode = parsedMode
			continue
		}
		filtered = append(filtered, arg)
	}
	atomic.StoreInt32(&colorModeState, mode)
	return filtered, nil
}

func parseCommandColorFlag(arg string) (bool, int32, error) {
	if arg == "--color" {
		return true, colorModeOn, nil
	}
	if arg == "--no-color" {
		return true, colorModeOff, nil
	}
	if strings.HasPrefix(arg, "--color=") {
		value, err := parseBooleanFlag(strings.TrimPrefix(arg, "--color="), "--color")
		if err != nil {
			return false, colorModeAuto, err
		}
		if value {
			return true, colorModeOn, nil
		}
		return true, colorModeOff, nil
	}
	if strings.HasPrefix(arg, "--no-color=") {
		value, err := parseBooleanFlag(strings.TrimPrefix(arg, "--no-color="), "--no-color")
		if err != nil {
			return false, colorModeAuto, err
		}
		if value {
			return true, colorModeOff, nil
		}
		return true, colorModeOn, nil
	}
	return false, colorModeAuto, nil
}

func parseBooleanFlag(value, flag string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "t", "yes", "on", "y":
		return true, nil
	case "0", "false", "f", "no", "off", "n":
		return false, nil
	case "":
		return false, fmt.Errorf("expected value for %s", flag)
	default:
		return false, fmt.Errorf("invalid value for %s: %s", flag, value)
	}
}

func shouldUseColor() bool {
	mode := atomic.LoadInt32(&colorModeState)
	if mode == colorModeOn {
		return true
	}
	if mode == colorModeOff {
		return false
	}
	return autoColorAllowed()
}

func autoColorAllowed() bool {
	if parseBoolEnv("NO_COLOR") {
		return false
	}
	if value, ok := os.LookupEnv("FORCE_COLOR"); ok && strings.TrimSpace(value) != "0" {
		return true
	}
	if value, ok := os.LookupEnv("CLICOLOR_FORCE"); ok && strings.TrimSpace(value) != "0" {
		return true
	}
	if parseBoolEnv("CLICOLOR") == false {
		return false
	}
	term := strings.TrimSpace(strings.ToUpper(os.Getenv("TERM")))
	if term == "DUMB" {
		return false
	}
	info, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return info.Mode()&os.ModeCharDevice != 0
}

func parseBoolEnv(name string) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(name)))
	if value == "" {
		if name == "CLICOLOR" {
			return true
		}
		return false
	}
	switch value {
	case "1", "true", "yes", "on", "always":
		return true
	case "0", "false", "no", "off", "never":
		return false
	default:
		return false
	}
}

func ansiStyled(text string, attrs ...int) string {
	if !shouldUseColor() || len(attrs) == 0 {
		return text
	}
	parts := make([]string, 0, len(attrs))
	for _, attr := range attrs {
		parts = append(parts, strconv.Itoa(attr))
	}
	return "\033[" + strings.Join(parts, ";") + "m" + text + ansiReset
}

func styleHeader(text string) string {
	return ansiStyled(text, ansiBright, ansiCyan)
}

func styleSubHeader(text string) string {
	return ansiStyled(text, ansiBright, ansiBlue)
}

func styleSuccess(text string) string {
	return ansiStyled(text, ansiBright, ansiGreen)
}

func styleWarning(text string) string {
	return ansiStyled(text, ansiBright, ansiYellow)
}

func styleError(text string) string {
	return ansiStyled(text, ansiBright, ansiRed)
}

func styleCritical(text string) string {
	return ansiStyled(text, ansiBright, ansiMagenta)
}

func styleMuted(text string) string {
	return ansiStyled(text, ansiDim)
}

func styleStatusLabel(status models.Status) string {
	switch status {
	case models.StatusDone:
		return styleSuccess(string(status))
	case models.StatusInProgress:
		return styleWarning(string(status))
	case models.StatusBlocked:
		return styleError(string(status))
	case models.StatusPending:
		return styleMuted(string(status))
	default:
		return styleMuted(string(status))
	}
}

func styleStatusText(status string) string {
	return styleStatusLabel(models.Status(status))
}

func statusIconStyled(status models.Status) string {
	switch status {
	case models.StatusDone:
		return styleSuccess("✓") + " "
	case models.StatusInProgress:
		return styleWarning("→") + " "
	case models.StatusPending:
		return styleMuted("[ ]") + " "
	case models.StatusBlocked:
		return styleError("✗") + " "
	default:
		return styleMuted("X") + " "
	}
}

func dependencyBlockedIconStyled() string {
	return styleWarning("[~]") + " "
}

func criticalMarkerStyled(onCritical bool) string {
	if !onCritical {
		return " "
	}
	return styleCritical("★")
}

func logEventIconStyled(eventType string) string {
	switch eventType {
	case "completed":
		return styleSuccess("✓")
	case "started":
		return styleWarning("▶")
	case "claimed":
		return styleSubHeader("✎")
	default:
		return styleSubHeader("✚")
	}
}

func styleProgressBar(done, total int) string {
	return styleProgressBarWithStatus(done, 0, 0, total)
}

func styleProgressBarWithStatus(done, inProgress, blocked, total int) string {
	const width = 20
	if total <= 0 {
		return strings.Repeat("░", width)
	}

	done = maxInt(done, 0)
	inProgress = maxInt(inProgress, 0)
	blocked = maxInt(blocked, 0)
	if done > total {
		done = total
	}
	if inProgress > total {
		inProgress = total
	}
	if blocked > total {
		blocked = total
	}

	allocated := done + inProgress + blocked
	if allocated > total {
		overflow := allocated - total
		if blocked >= overflow {
			blocked -= overflow
			overflow = 0
		} else {
			overflow -= blocked
			blocked = 0
		}

		if overflow > 0 {
			if inProgress >= overflow {
				inProgress -= overflow
				overflow = 0
			} else {
				overflow -= inProgress
				inProgress = 0
			}
		}

		if overflow > 0 && done >= overflow {
			done -= overflow
		}
	}

	pending := total - done - inProgress - blocked
	if pending < 0 {
		pending = 0
	}

	widths := progressBarWidths(barWidthByStatus{
		done:       done,
		inProgress: inProgress,
		blocked:    blocked,
		pending:    pending,
	}, total, width)

	return styleSuccess(strings.Repeat("█", widths.done)) +
		styleWarning(strings.Repeat("▓", widths.inProgress)) +
		styleError(strings.Repeat("▒", widths.blocked)) +
		styleMuted(strings.Repeat("░", widths.pending))
}

type barWidthByStatus struct {
	done       int
	inProgress int
	blocked    int
	pending    int
}

func progressBarWidths(stats barWidthByStatus, total int, width int) barWidthByStatus {
	if total <= 0 || width <= 0 {
		return barWidthByStatus{}
	}

	counts := []int{stats.done, stats.inProgress, stats.blocked, stats.pending}
	allocated := make([]int, len(counts))
	remainders := []struct {
		idx int
		rem int
	}{
		{idx: 0},
		{idx: 1},
		{idx: 2},
		{idx: 3},
	}

	used := 0
	for i, count := range counts {
		if count <= 0 {
			continue
		}
		numerator := int64(count) * int64(width)
		allocated[i] = int(numerator / int64(total))
		remainders[i].rem = int(numerator % int64(total))
		used += allocated[i]
	}

	remaining := width - used
	if remaining <= 0 {
		return barWidthByStatus{done: allocated[0], inProgress: allocated[1], blocked: allocated[2], pending: allocated[3]}
	}

	sort.SliceStable(remainders, func(i, j int) bool {
		if remainders[i].rem == remainders[j].rem {
			return remainders[i].idx < remainders[j].idx
		}
		return remainders[i].rem > remainders[j].rem
	})

	for remaining > 0 {
		for _, rem := range remainders {
			if remaining == 0 {
				break
			}
			allocated[rem.idx]++
			remaining--
		}
	}

	return barWidthByStatus{done: allocated[0], inProgress: allocated[1], blocked: allocated[2], pending: allocated[3]}
}

func maxInt(value, fallback int) int {
	if value > fallback {
		return value
	}
	return fallback
}
