package runner

import (
	"strings"
	"testing"
)

func TestStyleProgressBarWithStatusDistributesByStatus(t *testing.T) {
	bar := styleProgressBarWithStatus(2, 1, 1, 4)
	if len([]rune(bar)) != 20 {
		t.Fatalf("progress bar width = %d, expected 20", len([]rune(bar)))
	}
	if strings.Count(bar, "█") != 10 {
		t.Fatalf("done segment count = %d, expected 10: %q", strings.Count(bar, "█"), bar)
	}
	if strings.Count(bar, "▓") != 5 {
		t.Fatalf("in-progress segment count = %d, expected 5: %q", strings.Count(bar, "▓"), bar)
	}
	if strings.Count(bar, "▒") != 5 {
		t.Fatalf("blocked segment count = %d, expected 5: %q", strings.Count(bar, "▒"), bar)
	}
}

func TestStyleProgressBarWithStatusZeroTotal(t *testing.T) {
	bar := styleProgressBarWithStatus(1, 1, 1, 0)
	if bar != "░░░░░░░░░░░░░░░░░░░░░░" {
		t.Fatalf("unexpected zero-total bar: %q", bar)
	}
}
