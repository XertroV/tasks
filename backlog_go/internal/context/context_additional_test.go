package context

import (
	"path/filepath"
	"testing"

	"github.com/XertroV/tasks/backlog_go/internal/config"
)

func TestSetCurrentTaskAndClearContext(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	dataDir := filepath.Join(root, config.BacklogDir)
	if err := createDir(dataDir); err != nil {
		t.Fatalf("create data dir: %v", err)
	}

	if err := SetCurrentTask(dataDir, "P1.M1.E1.T001", "agent-a"); err != nil {
		t.Fatalf("SetCurrentTask() error = %v", err)
	}
	taskID, err := GetCurrentTask(dataDir)
	if err != nil {
		t.Fatalf("GetCurrentTask() error = %v", err)
	}
	if taskID != "P1.M1.E1.T001" {
		t.Fatalf("taskID = %q, expected P1.M1.E1.T001", taskID)
	}

	if err := ClearContext(dataDir); err != nil {
		t.Fatalf("ClearContext() error = %v", err)
	}
	taskID, err = GetCurrentTask(dataDir)
	if err != nil {
		t.Fatalf("GetCurrentTask() after clear error = %v", err)
	}
	if taskID != "" {
		t.Fatalf("taskID after clear = %q, expected empty", taskID)
	}
}

func TestMultiAndSiblingContextSetters(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	dataDir := filepath.Join(root, config.BacklogDir)
	if err := createDir(dataDir); err != nil {
		t.Fatalf("create data dir: %v", err)
	}

	if err := SetMultiTaskContext(dataDir, "agent-m", "P1.M1.E1.T001", []string{"P1.M1.E1.T002"}); err != nil {
		t.Fatalf("SetMultiTaskContext() error = %v", err)
	}
	ctx, err := LoadContext(dataDir)
	if err != nil {
		t.Fatalf("LoadContext() error = %v", err)
	}
	if ctx.Mode != "multi" || len(ctx.AdditionalTasks) != 1 {
		t.Fatalf("context after multi set = %+v, expected multi mode with additional task", ctx)
	}

	if err := SetSiblingTaskContext(dataDir, "agent-s", "P1.M1.E1.T001", []string{"P1.M1.E2.T001"}); err != nil {
		t.Fatalf("SetSiblingTaskContext() error = %v", err)
	}
	ctx, err = LoadContext(dataDir)
	if err != nil {
		t.Fatalf("LoadContext() error = %v", err)
	}
	if ctx.Mode != "siblings" || len(ctx.SiblingTasks) != 1 {
		t.Fatalf("context after sibling set = %+v, expected sibling mode with sibling task", ctx)
	}
}

func TestSessionsRoundTrip(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	dataDir := filepath.Join(root, config.BacklogDir)
	if err := createDir(dataDir); err != nil {
		t.Fatalf("create data dir: %v", err)
	}

	sessions := map[string]SessionPayload{
		"agent-a": {
			Agent:         "agent-a",
			TaskID:        "P1.M1.E1.T001",
			LastHeartbeat: "2026-01-01T00:00:00Z",
			StartedAt:     "2026-01-01T00:00:00Z",
			Progress:      "halfway",
		},
	}
	if err := SaveSessions(dataDir, sessions); err != nil {
		t.Fatalf("SaveSessions() error = %v", err)
	}

	loaded, err := LoadSessions(dataDir)
	if err != nil {
		t.Fatalf("LoadSessions() error = %v", err)
	}
	session, ok := loaded["agent-a"]
	if !ok {
		t.Fatalf("expected agent-a session, got %#v", loaded)
	}
	if session.TaskID != "P1.M1.E1.T001" || session.Progress != "halfway" {
		t.Fatalf("loaded session = %+v, expected persisted values", session)
	}
}
