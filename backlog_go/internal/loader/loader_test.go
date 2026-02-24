package loader

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/XertroV/tasks/backlog_go/internal/models"
	"gopkg.in/yaml.v3"
)

func writeTextFile(t *testing.T, path string, text string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("failed to create parent directory: %v", err)
	}
	if err := os.WriteFile(path, []byte(text), 0o644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}
}

func writeYAMLFile(t *testing.T, path string, value interface{}) {
	t.Helper()
	payload, err := yaml.Marshal(value)
	if err != nil {
		t.Fatalf("failed to marshal yaml: %v", err)
	}
	writeTextFile(t, path, string(payload))
}

func TestLoadTreeWithoutConfiguredDir(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	l := New(filepath.Join(root, "missing"))
	if l == nil {
		t.Fatal("New() returned nil")
	}

	if _, err := l.LoadTree(); err == nil {
		t.Fatal("LoadTree() expected error for missing data directory")
	}
}

func TestLoadTreeHandlesMissingIndexesByReturningMinimalHierarchy(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	tasksDir := filepath.Join(root, ".tasks")

	writeYAMLFile(t, filepath.Join(tasksDir, "index.yaml"), map[string]interface{}{
		"project":        "Minimal",
		"description":    "Missing index compatibility",
		"timeline_weeks": 1,
		"phases": []map[string]interface{}{
			{
				"id":   "P1",
				"name": "Phase",
				"path": "01-phase",
			},
		},
	})
	writeTextFile(t, filepath.Join(tasksDir, "01-phase", "placeholder.txt"), "present")

	l := New(tasksDir)
	tree, err := l.LoadTree()
	if err != nil {
		t.Fatalf("LoadTree() error = %v", err)
	}
	if len(tree.Phases) != 1 {
		t.Fatalf("got %d phases, expected 1", len(tree.Phases))
	}
	if got := tree.Phases[0].ID; got != "P1" {
		t.Fatalf("phase id = %q, expected %q", got, "P1")
	}
	if len(tree.Phases[0].Milestones) != 0 {
		t.Fatalf("milestones = %d, expected 0", len(tree.Phases[0].Milestones))
	}
}

func TestLoadTreeSupportsLegacyEstimatedHoursAndCompletedStatusAlias(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	tasksDir := filepath.Join(root, ".tasks")

	writeYAMLFile(t, filepath.Join(tasksDir, "index.yaml"), map[string]interface{}{
		"project":         "Alias Test",
		"description":     "Loader aliases",
		"timeline_weeks":  1,
		"estimated_hours": 12,
		"phases": []map[string]interface{}{
			{
				"id":              "P1",
				"name":            "Phase",
				"path":            "01-phase",
				"estimated_hours": 12,
			},
		},
	})

	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "index.yaml"), map[string]interface{}{
		"milestones": []map[string]interface{}{
			{
				"id":              "M1",
				"name":            "Milestone",
				"path":            "01-milestone",
				"estimated_hours": 8,
			},
		},
	})

	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "01-milestone", "index.yaml"), map[string]interface{}{
		"epics": []map[string]interface{}{
			{
				"id":              "E1",
				"name":            "Epic",
				"path":            "01-epic",
				"estimated_hours": 5,
			},
		},
	})

	epicDir := filepath.Join(tasksDir, "01-phase", "01-milestone", "01-epic")
	writeYAMLFile(t, filepath.Join(epicDir, "index.yaml"), map[string]interface{}{
		"tasks": []map[string]interface{}{
			{
				"id":              "T001",
				"file":            "T001-task.todo",
				"title":           "Index Title",
				"status":          "pending",
				"estimated_hours": 2,
				"complexity":      "low",
				"priority":        "medium",
			},
		},
	})
	writeTextFile(t, filepath.Join(epicDir, "T001-task.todo"), `---
id: P1.M1.E1.T001
title: Frontmatter Title
status: completed
estimate_hours: 3
complexity: high
priority: medium
depends_on: []
tags: [go]
---

# Task body
`)

	l := New(tasksDir)
	tree, err := l.LoadTree()
	if err != nil {
		t.Fatalf("LoadTree() error = %v", err)
	}

	if len(tree.Phases) != 1 {
		t.Fatalf("got %d phases, expected 1", len(tree.Phases))
	}
	if tree.Phases[0].EstimateHours != 12 {
		t.Fatalf("phase estimate_hours = %.2f, expected 12", tree.Phases[0].EstimateHours)
	}
	if len(tree.Phases[0].Milestones) != 1 || tree.Phases[0].Milestones[0].EstimateHours != 8 {
		t.Fatalf("milestone estimate_hours mismatch: %v", tree.Phases[0].Milestones)
	}
	if tree.Phases[0].Milestones[0].Epics[0].EstimateHours != 5 {
		t.Fatalf("epic estimate_hours = %.2f, expected 5", tree.Phases[0].Milestones[0].Epics[0].EstimateHours)
	}

	task := tree.Phases[0].Milestones[0].Epics[0].Tasks[0]
	if task.ID != "P1.M1.E1.T001" {
		t.Fatalf("task id = %q, expected %q", task.ID, "P1.M1.E1.T001")
	}
	if task.Title != "Frontmatter Title" {
		t.Fatalf("task title = %q, expected %q", task.Title, "Frontmatter Title")
	}
	if task.Status != models.StatusDone {
		t.Fatalf("task status = %q, expected %q", task.Status, models.StatusDone)
	}
	if task.Complexity != models.ComplexityHigh {
		t.Fatalf("task complexity = %q, expected %q", task.Complexity, models.ComplexityHigh)
	}
}

func TestLoadWithBenchmarkCountsMissingTaskFiles(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	tasksDir := filepath.Join(root, ".tasks")

	writeYAMLFile(t, filepath.Join(tasksDir, "index.yaml"), map[string]interface{}{
		"project":        "Benchmark Test",
		"timeline_weeks": 1,
		"phases": []map[string]interface{}{
			{
				"id":   "P1",
				"name": "Phase",
				"path": "01-phase",
			},
		},
	})
	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "index.yaml"), map[string]interface{}{
		"milestones": []map[string]interface{}{
			{
				"id":   "M1",
				"name": "Milestone",
				"path": "01-ms",
			},
		},
	})
	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "01-ms", "index.yaml"), map[string]interface{}{
		"epics": []map[string]interface{}{
			{
				"id":   "E1",
				"name": "Epic",
				"path": "01-epic",
			},
		},
	})

	epicDir := filepath.Join(tasksDir, "01-phase", "01-ms", "01-epic")
	writeYAMLFile(t, filepath.Join(epicDir, "index.yaml"), map[string]interface{}{
		"tasks": []map[string]interface{}{
			{
				"id":             "T001",
				"file":           "T001-present.todo",
				"title":          "Present",
				"status":         "pending",
				"estimate_hours": 1,
				"complexity":     "low",
				"priority":       "medium",
			},
			{
				"id":             "T002",
				"file":           "T002-missing.todo",
				"title":          "Missing",
				"status":         "pending",
				"estimate_hours": 1,
				"complexity":     "low",
				"priority":       "medium",
			},
		},
	})
	writeTextFile(t, filepath.Join(epicDir, "T001-present.todo"), `---
id: P1.M1.E1.T001
title: Present
status: pending
estimate_hours: 1
complexity: low
priority: medium
depends_on: []
tags: []
---
`)

	l := New(tasksDir)
	tree, benchmark, err := l.LoadWithBenchmark(loadModeFull, true, true, true)
	if err != nil {
		t.Fatalf("LoadWithBenchmark() error = %v", err)
	}
	if len(tree.Phases) != 1 {
		t.Fatalf("got %d phases, expected 1", len(tree.Phases))
	}
	epic := tree.Phases[0].Milestones[0].Epics[0]
	if len(epic.Tasks) != 2 {
		t.Fatalf("got %d tasks, expected 2", len(epic.Tasks))
	}
	if benchmark.MissingTaskFiles != 1 {
		t.Fatalf("missing_task_files = %d, expected 1", benchmark.MissingTaskFiles)
	}
}

func TestLoadRejectsMalformedHierarchyIDs(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	tasksDir := filepath.Join(root, ".tasks")
	taskRoot := filepath.Join(tasksDir, "index.yaml")

	writeYAMLFile(t, taskRoot, map[string]interface{}{
		"project":        "Malformed IDs",
		"timeline_weeks": 1,
		"phases": []map[string]interface{}{
			{
				"id":   "phase-1",
				"name": "Phase",
				"path": "01-phase",
			},
		},
	})

	l := New(tasksDir)
	if _, err := l.LoadTree(); err == nil {
		t.Fatal("LoadTree() expected error for malformed phase id")
	}
}

func TestLoadRejectsMalformedMilestoneAndEpicIDs(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	tasksDir := filepath.Join(root, ".tasks")
	writeYAMLFile(t, filepath.Join(tasksDir, "index.yaml"), map[string]interface{}{
		"project":        "Malformed IDs",
		"timeline_weeks": 1,
		"phases": []map[string]interface{}{
			{
				"id":   "P1",
				"name": "Phase",
				"path": "01-phase",
			},
		},
	})
	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "index.yaml"), map[string]interface{}{
		"milestones": []map[string]interface{}{
			{
				"id":              "bad",
				"name":            "Milestone",
				"path":            "01-ms",
				"estimated_hours": 1,
			},
		},
	})
	if _, err := New(tasksDir).LoadTree(); err == nil {
		t.Fatal("LoadTree() expected error for malformed milestone id")
	}

	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "index.yaml"), map[string]interface{}{
		"milestones": []map[string]interface{}{
			{
				"id":   "M1",
				"name": "Milestone",
				"path": "01-ms",
				"epics": []map[string]interface{}{
					{
						"id":              "bad",
						"name":            "Epic",
						"path":            "01-epic",
						"estimated_hours": 1,
					},
				},
			},
		},
	})

	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "01-ms", "index.yaml"), map[string]interface{}{
		"epics": []map[string]interface{}{
			{
				"id":   "bad",
				"name": "Epic",
				"path": "01-epic",
			},
		},
	})
	if _, err := New(tasksDir).LoadTree(); err == nil {
		t.Fatal("LoadTree() expected error for malformed epic id")
	}
}

func TestLoadTaskUsesEstimateAndDependenciesFromFrontmatterAndIndex(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	tasksDir := filepath.Join(root, ".tasks")

	writeYAMLFile(t, filepath.Join(tasksDir, "index.yaml"), map[string]interface{}{
		"project": "Frontmatter Overrides",
		"phases": []map[string]interface{}{
			{
				"id":   "P1",
				"name": "Phase",
				"path": "01-phase",
			},
		},
	})
	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "index.yaml"), map[string]interface{}{
		"milestones": []map[string]interface{}{
			{
				"id":   "M1",
				"name": "Milestone",
				"path": "01-ms",
			},
		},
	})
	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "01-ms", "index.yaml"), map[string]interface{}{
		"epics": []map[string]interface{}{
			{
				"id":   "E1",
				"name": "Epic",
				"path": "01-epic",
			},
		},
	})

	epicDir := filepath.Join(tasksDir, "01-phase", "01-ms", "01-epic")
	writeYAMLFile(t, filepath.Join(epicDir, "index.yaml"), map[string]interface{}{
		"tasks": []map[string]interface{}{
			{
				"id":             "T001",
				"file":           "T001-main.todo",
				"title":          "Main Task",
				"status":         "pending",
				"estimate_hours": 4,
				"complexity":     "low",
				"priority":       "medium",
				"depends_on":     []string{"T002"},
			},
			{
				"id":             "T002",
				"file":           "T002-dep.todo",
				"title":          "Dependency",
				"status":         "pending",
				"estimate_hours": 1,
				"complexity":     "low",
				"priority":       "medium",
			},
		},
	})
	writeTextFile(t, filepath.Join(epicDir, "T001-main.todo"), `---
id: P1.M1.E1.T001
title: Frontmatter Title
status: pending
estimate_hours: 0
complexity: medium
priority: high
---
`)
	writeTextFile(t, filepath.Join(epicDir, "T002-dep.todo"), `---
id: P1.M1.E1.T002
title: Dependency
status: pending
estimate_hours: 1
complexity: low
priority: medium
---
`)

	tree, err := New(tasksDir).LoadTree()
	if err != nil {
		t.Fatalf("LoadTree() error = %v", err)
	}

	task := tree.Phases[0].Milestones[0].Epics[0].Tasks[0]
	if task.ID != "P1.M1.E1.T001" {
		t.Fatalf("task id = %q, expected %q", task.ID, "P1.M1.E1.T001")
	}
	if task.EstimateHours != 0 {
		t.Fatalf("task estimate_hours = %.2f, expected 0 from frontmatter", task.EstimateHours)
	}
	if len(task.DependsOn) != 1 || task.DependsOn[0] != "P1.M1.E1.T002" {
		t.Fatalf("task depends_on = %v, expected [P1.M1.E1.T002]", task.DependsOn)
	}
}

func TestLoadRejectsMalformedTaskFrontmatterYAML(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	tasksDir := filepath.Join(root, ".tasks")

	writeYAMLFile(t, filepath.Join(tasksDir, "index.yaml"), map[string]interface{}{
		"project":        "Malformed Frontmatter",
		"timeline_weeks": 1,
		"phases": []map[string]interface{}{
			{
				"id":   "P1",
				"name": "Phase",
				"path": "01-phase",
			},
		},
	})
	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "index.yaml"), map[string]interface{}{
		"milestones": []map[string]interface{}{
			{
				"id":   "M1",
				"name": "Milestone",
				"path": "01-ms",
			},
		},
	})
	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "01-ms", "index.yaml"), map[string]interface{}{
		"epics": []map[string]interface{}{
			{
				"id":   "E1",
				"name": "Epic",
				"path": "01-epic",
			},
		},
	})
	writeYAMLFile(t, filepath.Join(tasksDir, "01-phase", "01-ms", "01-epic", "index.yaml"), map[string]interface{}{
		"tasks": []map[string]interface{}{
			{
				"id":             "T001",
				"file":           "T001-bad.todo",
				"title":          "Bad Task",
				"status":         "pending",
				"estimate_hours": 1,
				"complexity":     "medium",
				"priority":       "medium",
				"depends_on":     []string{},
				"tags":           []string{},
			},
		},
	})
	writeTextFile(t, filepath.Join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-bad.todo"), `---
id: P1.M1.E1.T001
title: Bad Task
status: pending
estimate_hours: 1
complexity: medium
priority: medium
tags: [

---
`)

	_, err := New(tasksDir).LoadTree()
	if err == nil {
		t.Fatal("LoadTree() expected malformed frontmatter error")
	}
	if !strings.Contains(err.Error(), "invalid yaml in") {
		t.Fatalf("err = %q, expected invalid yaml message", err)
	}
}
