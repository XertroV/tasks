package loader

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/XertroV/tasks/backlog_go/internal/models"
)

func TestLoadScopeAndLoadTreeWithBenchmark(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	tasksDir := filepath.Join(root, ".tasks")

	writeYAMLFile(t, filepath.Join(tasksDir, "index.yaml"), map[string]interface{}{
		"project": "Scope Fixture",
		"phases": []map[string]interface{}{
			{"id": "P1", "name": "Phase 1", "path": "01-phase"},
		},
	})
	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "index.yaml"), map[string]interface{}{
		"milestones": []map[string]interface{}{
			{"id": "M1", "name": "Milestone 1", "path": "01-ms"},
		},
	})
	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "01-ms", "index.yaml"), map[string]interface{}{
		"epics": []map[string]interface{}{
			{"id": "E1", "name": "Epic 1", "path": "01-epic"},
		},
	})
	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "01-ms", "01-epic", "index.yaml"), map[string]interface{}{
		"id": "P1.M1.E1",
		"tasks": []map[string]interface{}{
			{
				"id":             "T001",
				"title":          "Task",
				"file":           "T001-task.todo",
				"status":         "pending",
				"estimate_hours": 1,
				"complexity":     "low",
				"priority":       "medium",
			},
		},
	})
	writeTextFile(t, filepath.Join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-task.todo"), `---
id: P1.M1.E1.T001
title: Task
status: pending
estimate_hours: 1
complexity: low
priority: medium
depends_on: []
tags: []
---
`)

	l := New(tasksDir)
	scoped, err := l.LoadScope("P1.M1.E1", "metadata", false, false, false)
	if err != nil {
		t.Fatalf("LoadScope() = %v", err)
	}
	if len(scoped.Phases) != 1 || len(scoped.Phases[0].Milestones) != 1 || len(scoped.Phases[0].Milestones[0].Epics) != 1 {
		t.Fatalf("LoadScope() returned unexpected shape: %+v", scoped.Phases)
	}

	tree, bench, err := l.LoadTreeWithBenchmark(true, false, false)
	if err != nil {
		t.Fatalf("LoadTreeWithBenchmark() = %v", err)
	}
	if len(tree.Phases) != 1 {
		t.Fatalf("tree phases = %d, expected 1", len(tree.Phases))
	}
	if bench.OverallMs <= 0 {
		t.Fatalf("benchmark overall_ms = %.2f, expected positive value", bench.OverallMs)
	}
}

func TestFilterByPathCoversAllDepths(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
		Project: "Filter Fixture",
		Phases: []models.Phase{
			{
				ID: "P1",
				Milestones: []models.Milestone{
					{
						ID: "P1.M1",
						Epics: []models.Epic{
							{
								ID: "P1.M1.E1",
								Tasks: []models.Task{
									{ID: "P1.M1.E1.T001"},
									{ID: "P1.M1.E1.T002"},
								},
							},
						},
					},
				},
			},
			{
				ID: "P2",
				Milestones: []models.Milestone{
					{
						ID: "P2.M1",
						Epics: []models.Epic{
							{
								ID:    "P2.M1.E1",
								Tasks: []models.Task{{ID: "P2.M1.E1.T001"}},
							},
						},
					},
				},
			},
		},
	}

	l := New()
	p1, _ := models.ParseTaskPath("P1")
	m1, _ := models.ParseTaskPath("P1.M1")
	e1, _ := models.ParseTaskPath("P1.M1.E1")
	t1, _ := models.ParseTaskPath("P1.M1.E1.T001")

	phaseScoped := l.filterByPath(tree, p1)
	if len(phaseScoped.Phases) != 1 || phaseScoped.Phases[0].ID != "P1" {
		t.Fatalf("phase filter returned unexpected phases: %+v", phaseScoped.Phases)
	}

	milestoneScoped := l.filterByPath(tree, m1)
	if len(milestoneScoped.Phases) != 1 || len(milestoneScoped.Phases[0].Milestones) != 1 {
		t.Fatalf("milestone filter returned unexpected hierarchy: %+v", milestoneScoped.Phases)
	}

	epicScoped := l.filterByPath(tree, e1)
	if len(epicScoped.Phases) != 1 || len(epicScoped.Phases[0].Milestones[0].Epics) != 1 {
		t.Fatalf("epic filter returned unexpected hierarchy: %+v", epicScoped.Phases)
	}

	taskScoped := l.filterByPath(tree, t1)
	tasks := taskScoped.Phases[0].Milestones[0].Epics[0].Tasks
	if len(tasks) != 1 || tasks[0].ID != "P1.M1.E1.T001" {
		t.Fatalf("task filter returned unexpected tasks: %+v", tasks)
	}
}

func TestLoaderUtilityHelpers(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	taskPath := filepath.Join(root, "todo.todo")
	writeTextFile(t, taskPath, `---
id: P1.M1.E1.T001
title: Utility Task
status: pending
---
body
`)

	l := New()
	frontmatter, err := l.parseTodoFrontmatter(taskPath, false, nil)
	if err != nil {
		t.Fatalf("parseTodoFrontmatter() = %v", err)
	}
	if frontmatter["id"] != "P1.M1.E1.T001" {
		t.Fatalf("frontmatter id = %v, expected task id", frontmatter["id"])
	}

	if parseRFC3339("2026-01-01T00:00:00Z") == nil {
		t.Fatalf("parseRFC3339() expected valid timestamp")
	}
	if parseRFC3339("not-a-time") != nil {
		t.Fatalf("parseRFC3339() expected nil for invalid timestamp")
	}

	if got := fileTypeIndex("todo_file"); got != "todo_file" {
		t.Fatalf("fileTypeIndex(todo_file) = %q", got)
	}
	if got := fileTypeIndex("yaml"); got != "root_index" {
		t.Fatalf("fileTypeIndex(yaml) = %q, expected root_index", got)
	}

	if got := taskPathFromTaskID("P1.M1.E1.T001"); got != "P1" {
		t.Fatalf("taskPathFromTaskID() = %q, expected P1", got)
	}
	if got := taskPathFromTaskID("B1"); got != "" {
		t.Fatalf("taskPathFromTaskID(B1) = %q, expected empty string", got)
	}

	if detectTasksDir() == "" {
		// In tests we run from a repository that contains .tasks; this should be discoverable.
		t.Fatalf("detectTasksDir() returned empty path")
	}

	if ts := parseRFC3339(time.Now().UTC().Format(time.RFC3339)); ts == nil {
		t.Fatalf("parseRFC3339() should parse a valid RFC3339 timestamp")
	}
}
