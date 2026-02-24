package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestMissingDataDirErrorFormatting(t *testing.T) {
	t.Parallel()

	err := (&MissingDataDirError{BaseDir: "/tmp/project"}).Error()
	if err == "" || err == "data directory not found" {
		t.Fatalf("expected contextual error message, got %q", err)
	}
}

func TestValidateDataDirAndPathHelpers(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	dataDir := filepath.Join(root, BacklogDir)
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		t.Fatalf("failed to create data dir: %v", err)
	}

	if err := ValidateDataDir(dataDir); err != nil {
		t.Fatalf("ValidateDataDir() error = %v", err)
	}
	if ContextFilePath(dataDir) != filepath.Join(dataDir, ContextFileName) {
		t.Fatalf("ContextFilePath() mismatch")
	}
	if SessionsFilePath(dataDir) != filepath.Join(dataDir, SessionsFileName) {
		t.Fatalf("SessionsFilePath() mismatch")
	}
}

func TestMustDataDirUsesCurrentWorkingDirectory(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	nested := filepath.Join(root, "a", "b")
	if err := os.MkdirAll(filepath.Join(root, BacklogDir), 0o755); err != nil {
		t.Fatalf("failed to create backlog dir: %v", err)
	}
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatalf("failed to create nested dir: %v", err)
	}

	prev, err := os.Getwd()
	if err != nil {
		t.Fatalf("Getwd() error = %v", err)
	}
	defer func() { _ = os.Chdir(prev) }()

	if err := os.Chdir(nested); err != nil {
		t.Fatalf("Chdir() error = %v", err)
	}
	if got := MustDataDir(); filepath.Base(got) != BacklogDir {
		t.Fatalf("MustDataDir() = %q, expected .backlog path", got)
	}
}
