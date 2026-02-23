package main

import (
	"os"
	"strings"
	"testing"
)

func TestPrecommitConfigContainsGoQualityHooks(t *testing.T) {
	t.Parallel()

	raw, err := os.ReadFile(".pre-commit-config.yaml")
	if err != nil {
		t.Fatalf("failed to read pre-commit config: %v", err)
	}
	cfg := string(raw)

	for _, expected := range []string{
		"gofmt-check",
		"go-unit-tests",
		"go-coverage-check",
		"check-yaml",
	} {
		if !strings.Contains(cfg, expected) {
			t.Fatalf("pre-commit config is missing expected hook id %q", expected)
		}
	}
}

func TestMakefileCheckTargetExists(t *testing.T) {
	t.Parallel()

	raw, err := os.ReadFile("Makefile")
	if err != nil {
		t.Fatalf("failed to read Makefile: %v", err)
	}
	text := string(raw)
	if !strings.Contains(text, "check: fmt-check test coverage-check") {
		t.Fatalf("Makefile check target missing expected format: `check: fmt-check test coverage-check`")
	}
}
