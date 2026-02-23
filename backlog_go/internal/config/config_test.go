package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectDataDirFrom(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, "repo"), 0o755); err != nil {
		t.Fatalf("failed to create repo directory: %v", err)
	}
	nested := filepath.Join(root, "repo", "sub")
	err := os.Mkdir(nested, 0o755)
	if err != nil {
		t.Fatalf("failed to create nested directory: %v", err)
	}
	if err := os.Mkdir(filepath.Join(nested, ".tasks"), 0o755); err != nil {
		t.Fatalf("failed to create tasks directory: %v", err)
	}
	if err := os.Mkdir(filepath.Join(root, ".backlog"), 0o755); err != nil {
		t.Fatalf("failed to create backlog directory: %v", err)
	}

	dataDir, err := DetectDataDirFrom(nested)
	if err != nil {
		t.Fatalf("DetectDataDirFrom() error = %v", err)
	}
	if filepath.Base(dataDir) != ".backlog" {
		t.Fatalf("detected %q, expected .backlog parent", dataDir)
	}
}
