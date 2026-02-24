package runner

import (
	"fmt"
	"os"
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
	case "1", "true", "t", "yes", "on":
		return true, nil
	case "0", "false", "f", "no", "off":
		return false, nil
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
	const width = 20
	if total <= 0 {
		return styleMuted(strings.Repeat("░", width))
	}
	filled := int((float64(done) / float64(total)) * width)
	if filled < 0 {
		filled = 0
	}
	if filled > width {
		filled = width
	}
	filledBar := strings.Repeat("█", filled)
	emptyBar := strings.Repeat("░", width-filled)
	return styleSuccess(filledBar) + styleMuted(emptyBar)
}
