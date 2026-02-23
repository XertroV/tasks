package context

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/XertroV/tasks/backlog_go/internal/config"
)

func TestContextRoundTrip(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	dataDir := filepath.Join(root, config.BacklogDir)
	if err := createDir(dataDir); err != nil {
		t.Fatalf("failed to create data dir: %v", err)
	}

	seed := Context{
		CurrentTask:     "P1.M1.E1.T001",
		PrimaryTask:     "P1.M1.E1.T001",
		AdditionalTasks: []string{"P1.M1.E1.T002"},
		SiblingTasks:    []string{"P1.M1.E2.T001"},
		Agent:           "cli-user",
		Mode:            "single",
	}
	if err := SaveContext(dataDir, seed); err != nil {
		t.Fatalf("SaveContext() error = %v", err)
	}

	actual, err := LoadContext(dataDir)
	if err != nil {
		t.Fatalf("LoadContext() error = %v", err)
	}
	if actual.CurrentTask != seed.CurrentTask {
		t.Fatalf("CurrentTask = %q, expected %q", actual.CurrentTask, seed.CurrentTask)
	}
	if actual.Agent != seed.Agent {
		t.Fatalf("Agent = %q, expected %q", actual.Agent, seed.Agent)
	}
}

func TestLoadContextMissingFile(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	dataDir := filepath.Join(root, "empty")
	if err := createDir(dataDir); err != nil {
		t.Fatalf("failed to create empty data dir: %v", err)
	}

	taskID, err := GetCurrentTask(dataDir)
	if err != nil {
		t.Fatalf("GetCurrentTask() error = %v", err)
	}
	if taskID != "" {
		t.Fatalf("taskID = %q, expected empty", taskID)
	}
}

func createDir(path string) error {
	return os.MkdirAll(path, 0o755)
}
