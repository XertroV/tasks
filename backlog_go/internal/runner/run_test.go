package runner

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	taskcontext "github.com/XertroV/tasks/backlog_go/internal/context"
	"github.com/XertroV/tasks/backlog_go/internal/models"
	"gopkg.in/yaml.v3"
)

func TestRunReturnsNil(t *testing.T) {
	t.Parallel()

	if err := Run(); err != nil {
		t.Fatalf("Run() = %v, expected nil", err)
	}
}

func TestRunAddCommand(t *testing.T) {
	t.Parallel()

	root := setupAddFixture(t)

	output, err := runInDir(t, root, "add", "P1.M1.E1", "--title", "New Task")
	if err != nil {
		t.Fatalf("run add = %v, expected nil", err)
	}
	if !strings.Contains(output, "Created task: P1.M1.E1.T001") {
		t.Fatalf("output = %q, expected created task id", output)
	}

	index := readYAMLMap(t, filepath.Join(root, ".tasks", "01-phase", "01-ms", "01-epic", "index.yaml"))
	tasks, ok := index["tasks"].([]interface{})
	if !ok || len(tasks) != 1 {
		t.Fatalf("epic index should contain 1 task, got %#v", index["tasks"])
	}
	task := tasks[0].(map[string]interface{})
	if task["id"] != "T001" {
		t.Fatalf("task id in index = %v, expected T001", task["id"])
	}
	if task["title"] != "New Task" {
		t.Fatalf("task title = %v, expected New Task", task["title"])
	}

	taskFile := filepath.Join(root, ".tasks", "01-phase", "01-ms", "01-epic", task["file"].(string))
	content := readFile(t, taskFile)
	if !strings.Contains(content, "id: P1.M1.E1.T001") {
		t.Fatalf("task file missing full id, got %q", content)
	}
	if !strings.Contains(content, "status: pending") {
		t.Fatalf("task file missing pending status, got %q", content)
	}
}

func TestRunAddRejectsLockedEpic(t *testing.T) {
	t.Parallel()

	root := setupAddFixture(t)
	epicIndex := readYAMLMap(t, filepath.Join(root, ".tasks", "01-phase", "01-ms", "01-epic", "index.yaml"))
	epicIndex["locked"] = true
	writeYAMLMap(t, filepath.Join(root, ".tasks", "01-phase", "01-ms", "01-epic", "index.yaml"), epicIndex)

	_, err := runInDir(t, root, "add", "P1.M1.E1", "--title", "Blocked")
	if err == nil {
		t.Fatalf("run add expected error for locked epic")
	}
	if !strings.Contains(err.Error(), "cannot accept new tasks") {
		t.Fatalf("error = %q, expected lock message", err)
	}
}

func TestRunAddEpicCommand(t *testing.T) {
	t.Parallel()

	root := setupAddFixture(t)
	output, err := runInDir(
		t,
		root,
		"add-epic",
		"P1.M1",
		"--title",
		"Second Epic",
		"--description",
		"Epic description",
	)
	if err != nil {
		t.Fatalf("run add-epic = %v, expected nil", err)
	}
	if !strings.Contains(output, "Created epic: P1.M1.E2") {
		t.Fatalf("output = %q, expected created epic id", output)
	}

	milestoneIndex := readYAMLMap(t, filepath.Join(root, ".tasks", "01-phase", "01-ms", "index.yaml"))
	epics, ok := milestoneIndex["epics"].([]interface{})
	if !ok || len(epics) != 2 {
		t.Fatalf("milestone index should contain 2 epics, got %#v", milestoneIndex["epics"])
	}
	added := epics[1].(map[string]interface{})
	if added["id"] != "E2" {
		t.Fatalf("added epic id = %v, expected E2", added["id"])
	}
	if added["description"] != "Epic description" {
		t.Fatalf("added epic description = %v, expected provided description", added["description"])
	}

	epicDir := filepath.Join(root, ".tasks", "01-phase", "01-ms", added["path"].(string), "index.yaml")
	epicData := readYAMLMap(t, epicDir)
	if epicData["id"] != "P1.M1.E2" {
		t.Fatalf("epic index id = %v, expected P1.M1.E2", epicData["id"])
	}
}

func TestRunAddMilestoneCommand(t *testing.T) {
	t.Parallel()

	root := setupAddFixture(t)
	output, err := runInDir(
		t,
		root,
		"add-milestone",
		"P1",
		"--title",
		"Second Milestone",
		"--description",
		"Milestone description",
	)
	if err != nil {
		t.Fatalf("run add-milestone = %v, expected nil", err)
	}
	if !strings.Contains(output, "Created milestone: P1.M2") {
		t.Fatalf("output = %q, expected created milestone id", output)
	}

	phaseIndex := readYAMLMap(t, filepath.Join(root, ".tasks", "01-phase", "index.yaml"))
	milestones, ok := phaseIndex["milestones"].([]interface{})
	if !ok || len(milestones) != 2 {
		t.Fatalf("phase index should contain 2 milestones, got %#v", phaseIndex["milestones"])
	}
	added := milestones[1].(map[string]interface{})
	if added["id"] != "M2" {
		t.Fatalf("added milestone id = %v, expected M2", added["id"])
	}
	if added["description"] != "Milestone description" {
		t.Fatalf("added milestone description = %v, expected provided description", added["description"])
	}
}

func TestRunAddInvalidEpicID(t *testing.T) {
	t.Parallel()

	root := setupAddFixture(t)
	_, err := runInDir(t, root, "add", "P1", "--title", "Nope")
	if err == nil {
		t.Fatalf("run add expected error for malformed id")
	}
	if !strings.Contains(err.Error(), "invalid epic id") {
		t.Fatalf("error = %q, expected malformed epic id", err)
	}
}

func TestRunAddEpicCommandRejectsMalformedMilestoneID(t *testing.T) {
	t.Parallel()

	root := setupAddFixture(t)
	_, err := runInDir(t, root, "add-epic", "P1", "--title", "Nope")
	if err == nil {
		t.Fatalf("run add-epic expected error for malformed milestone id")
	}
	if !strings.Contains(err.Error(), "invalid milestone id") {
		t.Fatalf("error = %q, expected malformed milestone id", err)
	}
}

func TestRunAddMilestoneCommandRejectsMalformedPhaseID(t *testing.T) {
	t.Parallel()

	root := setupAddFixture(t)
	_, err := runInDir(t, root, "add-milestone", "P1.M1", "--title", "Nope")
	if err == nil {
		t.Fatalf("run add-milestone expected error for malformed phase id")
	}
	if !strings.Contains(err.Error(), "invalid phase id") {
		t.Fatalf("error = %q, expected malformed phase id", err)
	}
}

func TestRunAddCommandRejectsLockedMilestoneAndEpic(t *testing.T) {
	t.Parallel()

	root := setupAddFixture(t)
	epicIndex := readYAMLMap(t, filepath.Join(root, ".tasks", "01-phase", "01-ms", "01-epic", "index.yaml"))
	epicIndex["locked"] = true
	writeYAMLMap(t, filepath.Join(root, ".tasks", "01-phase", "01-ms", "01-epic", "index.yaml"), epicIndex)

	milestoneIndex := readYAMLMap(t, filepath.Join(root, ".tasks", "01-phase", "01-ms", "index.yaml"))
	milestoneIndex["locked"] = true
	writeYAMLMap(t, filepath.Join(root, ".tasks", "01-phase", "01-ms", "index.yaml"), milestoneIndex)

	_, err := runInDir(t, root, "add", "P1.M1.E1", "--title", "Blocked")
	if err == nil {
		t.Fatalf("run add expected error for locked hierarchy")
	}
	if !strings.Contains(err.Error(), "cannot accept new tasks") {
		t.Fatalf("error = %q, expected locked-task message", err)
	}
}

func TestRunAddEpicCommandAcceptsNameAlias(t *testing.T) {
	t.Parallel()

	root := setupAddFixture(t)
	output, err := runInDir(
		t,
		root,
		"add-epic",
		"P1.M1",
		"--name",
		"Alias Epic",
	)
	if err != nil {
		t.Fatalf("run add-epic = %v, expected nil", err)
	}
	if !strings.Contains(output, "Created epic: P1.M1.E2") {
		t.Fatalf("output = %q, expected created epic id", output)
	}
}

func TestRunAddMilestoneCommandAcceptsNameAlias(t *testing.T) {
	t.Parallel()

	root := setupAddFixture(t)
	output, err := runInDir(
		t,
		root,
		"add-milestone",
		"P1",
		"--name",
		"Alias Milestone",
	)
	if err != nil {
		t.Fatalf("run add-milestone = %v, expected nil", err)
	}
	if !strings.Contains(output, "Created milestone: P1.M2") {
		t.Fatalf("output = %q, expected created milestone id", output)
	}
}

func TestRunAddMilestoneCommandRejectsLockedPhase(t *testing.T) {
	t.Parallel()

	root := setupAddFixture(t)
	rootIndex := readYAMLMap(t, filepath.Join(root, ".tasks", "index.yaml"))
	phases, _ := rootIndex["phases"].([]interface{})
	phases[0].(map[string]interface{})["locked"] = true
	writeYAMLMap(t, filepath.Join(root, ".tasks", "index.yaml"), rootIndex)

	_, err := runInDir(t, root, "add-milestone", "P1", "--title", "Blocked")
	if err == nil {
		t.Fatalf("run add-milestone expected error for locked phase")
	}
	if !strings.Contains(err.Error(), "cannot accept new milestones") {
		t.Fatalf("error = %q, expected locked milestone message", err)
	}
}

func TestRunClaimRejectsClaimedTask(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	writeWorkflowTaskFile(t, root, "P1.M1.E1.T001", "a", "in_progress", "agent-x", "2026-01-01T00:00:00Z")
	writeWorkflowTaskFile(t, root, "P1.M1.E1.T002", "b", "pending", "", "")

	_, err := runInDir(t, root, "claim", "P1.M1.E1.T001")
	if err == nil {
		t.Fatalf("run claim expected error for already claimed task")
	}
	if !strings.Contains(err.Error(), "Task P1.M1.E1.T001 is already claimed by agent-x") {
		t.Fatalf("error = %q, expected claim guard message", err)
	}
}

func TestRunClaimRejectsMissingTaskFile(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	setTaskTodoFilePath(t, root, "P1.M1.E1.T001", filepath.Join("01-phase", "01-ms", "01-epic", "missing.todo"))

	_, err := runInDir(t, root, "claim", "P1.M1.E1.T001")
	if err == nil {
		t.Fatalf("run claim expected error for missing todo file")
	}
	if !strings.Contains(err.Error(), "Cannot claim P1.M1.E1.T001 because the task file is missing.") {
		t.Fatalf("error = %q, expected missing file message", err)
	}
}

func TestRunMoveTaskToEpicRenumbersID(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	tasksRoot := filepath.Join(root, ".tasks")

	milestoneIndexPath := filepath.Join(tasksRoot, "01-phase", "01-ms", "index.yaml")
	milestoneIndex := readYAMLMap(t, milestoneIndexPath)
	epics, _ := milestoneIndex["epics"].([]interface{})
	epics = append(epics,
		map[string]interface{}{
			"id":   "E2",
			"name": "Target",
			"path": "02-target-epic",
		},
	)
	milestoneIndex["epics"] = epics
	writeYAMLMap(t, milestoneIndexPath, milestoneIndex)
	targetEpicIndex := filepath.Join(tasksRoot, "01-phase", "01-ms", "02-target-epic", "index.yaml")
	writeYAMLMap(t, targetEpicIndex, map[string]interface{}{
		"id":     "P1.M1.E2",
		"name":   "Target",
		"status": "pending",
		"tasks":  []map[string]interface{}{},
	})

	output, err := runInDir(
		t,
		root,
		"move",
		"P1.M1.E1.T001",
		"--to",
		"P1.M1.E2",
	)
	if err != nil {
		t.Fatalf("run move = %v, expected nil", err)
	}
	if !strings.Contains(output, "New ID: P1.M1.E2.T001") {
		t.Fatalf("output = %q, expected remapped id", output)
	}

	moved := readFile(t, filepath.Join(tasksRoot, "01-phase", "01-ms", "02-target-epic", "T001-a.todo"))
	if !strings.Contains(moved, "id: P1.M1.E2.T001") {
		t.Fatalf("task file missing remapped id, got %q", moved)
	}
}

func TestRunMoveEpicToMilestoneRemapsDescendants(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	tasksRoot := filepath.Join(root, ".tasks")
	phaseIndexPath := filepath.Join(tasksRoot, "index.yaml")
	phaseIndex := readYAMLMap(t, phaseIndexPath)
	phases := phaseIndex["phases"].([]interface{})
	phases = append(phases,
		map[string]interface{}{
			"id":   "P2",
			"name": "Second phase",
			"path": "02-phase",
		},
	)
	phaseIndex["phases"] = phases
	writeYAMLMap(t, phaseIndexPath, phaseIndex)

	milestoneIndexPath := filepath.Join(tasksRoot, "01-phase", "index.yaml")
	writeYAMLMap(t, milestoneIndexPath, map[string]interface{}{
		"id":   "P1",
		"name": "Phase",
		"milestones": []map[string]interface{}{
			{
				"id":   "M1",
				"name": "Milestone",
				"path": "01-ms",
			},
			{
				"id":   "M2",
				"name": "Second",
				"path": "02-ms",
			},
		},
	})
	writeYAMLMap(t, filepath.Join(tasksRoot, "02-phase", "index.yaml"), map[string]interface{}{
		"id":         "P2",
		"name":       "Second phase",
		"milestones": []map[string]interface{}{},
	})
	writeYAMLMap(t, filepath.Join(tasksRoot, "02-phase", "02-ms", "index.yaml"), map[string]interface{}{
		"id":             "P2.M2",
		"name":           "Second",
		"path":           "02-ms",
		"epics":          []map[string]interface{}{},
		"status":         "pending",
		"estimate_hours": 0,
		"complexity":     "medium",
		"depends_on":     []string{},
	})

	output, err := runInDir(
		t,
		root,
		"move",
		"P1.M1.E1",
		"--to",
		"P2.M2",
	)
	if err != nil {
		t.Fatalf("run move = %v, expected nil", err)
	}
	if !strings.Contains(output, "New ID: P2.M2.E1") {
		t.Fatalf("output = %q, expected remapped id", output)
	}

	moved := readFile(t, filepath.Join(tasksRoot, "02-phase", "02-ms", "01-epic", "T001-a.todo"))
	if !strings.Contains(moved, "id: P2.M2.E1.T001") {
		t.Fatalf("task file missing remapped id, got %q", moved)
	}
}

func TestRunUnclaimPendingClaimedTask(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	writeWorkflowTaskFile(t, root, "P1.M1.E1.T001", "a", "in_progress", "agent-x", "2026-01-01T00:00:00Z")

	output, err := runInDir(t, root, "unclaim", "P1.M1.E1.T001")
	if err != nil {
		t.Fatalf("run unclaim = %v, expected nil", err)
	}
	if !strings.Contains(output, "Unclaimed: P1.M1.E1.T001 - a") {
		t.Fatalf("output = %q, expected unclaim confirmation", output)
	}
	taskText := readFile(t, filepath.Join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"))
	if !strings.Contains(taskText, "status: pending") {
		t.Fatalf("task text = %q, expected status pending", taskText)
	}
	if strings.Contains(taskText, "claimed_by:") {
		t.Fatalf("task text = %q, expected claim cleared", taskText)
	}
}

func TestRunUnclaimRejectsUnclaimedPendingTask(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	output, err := runInDir(t, root, "unclaim", "P1.M1.E1.T001")
	if err != nil {
		t.Fatalf("run unclaim = %v, expected nil", err)
	}
	if !strings.Contains(output, "Task is not in progress: pending") {
		t.Fatalf("output = %q, expected not-in-progress message", output)
	}
}

func TestRunSyncWritesDerivedStats(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	output, err := runInDir(t, root, "sync")
	if err != nil {
		t.Fatalf("run sync = %v, expected nil", err)
	}
	if !strings.Contains(output, "Synced") {
		t.Fatalf("output = %q, expected synced message", output)
	}
	rootIndex := readYAMLMap(t, filepath.Join(root, ".tasks", "index.yaml"))
	statsRaw, ok := rootIndex["stats"].(map[string]interface{})
	if !ok {
		t.Fatalf("root stats missing or invalid: %#v", rootIndex["stats"])
	}
	if asInt(statsRaw["total_tasks"]) != 2 {
		t.Fatalf("expected 2 tasks, got %v", statsRaw["total_tasks"])
	}
	if _, ok := rootIndex["critical_path"]; !ok {
		t.Fatalf("root stats missing critical_path")
	}
}

func TestFilterTasksByIDs(t *testing.T) {
	t.Parallel()

	tasks := []models.Task{
		{ID: "P1.M1.E1.T001", Status: models.StatusDone},
		{ID: "P1.M1.E1.T002", Status: models.StatusPending},
		{ID: "P1.M1.E1.T003", Status: models.StatusDone},
	}

	filtered := filterTasksByIDs(
		[]string{"P1.M1.E1.T001", "P1.M1.E1.T002", "P1.M1.E1.T999"},
		tasks,
		func(task models.Task) bool {
			return task.Status == models.StatusPending
		},
	)
	if len(filtered) != 1 {
		t.Fatalf("len(filtered) = %d, expected 1", len(filtered))
	}
	if filtered[0].ID != "P1.M1.E1.T002" {
		t.Fatalf("filtered = %v, expected only pending task", filtered)
	}
}

func TestRunShowNoTaskFallsBackToCurrent(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	dataDir := filepath.Join(root, ".tasks")
	if err := taskcontext.SetCurrentTask(dataDir, "P1.M1.E1.T001", ""); err != nil {
		t.Fatalf("set current task = %v, expected nil", err)
	}

	output, err := runInDir(t, root, "show")
	if err != nil {
		t.Fatalf("run show = %v, expected nil", err)
	}
	if !strings.Contains(output, "Task: P1.M1.E1.T001") {
		t.Fatalf("output = %q, expected task detail", output)
	}
}

func TestRunShowNoTaskCurrentTaskUnavailable(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	output, err := runInDir(t, root, "show")
	if err != nil {
		t.Fatalf("run show = %v, expected nil", err)
	}
	if !strings.Contains(output, "No task specified and no current working task set.") {
		t.Fatalf("output = %q, expected no current task guidance", output)
	}
}

func TestRunShowInvalidTaskPath(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	_, err := runInDir(t, root, "show", "invalid-id")
	if err == nil {
		t.Fatalf("run show expected parse error for invalid task path")
	}
	if !strings.Contains(err.Error(), "Invalid path format: invalid-id") {
		t.Fatalf("err = %q, expected invalid path format error", err)
	}
}

func TestRunShowRejectsUnknownFlag(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	_, err := runInDir(t, root, "show", "--unknown")
	if err == nil {
		t.Fatalf("run show expected flag validation error")
	}
	if !strings.Contains(err.Error(), "unexpected flag: --unknown") {
		t.Fatalf("err = %q, expected unexpected flag error", err)
	}
}

func TestRunInitRequiresProject(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	_, err := runInDir(t, root, "init")
	if err == nil {
		t.Fatalf("run init expected project validation error")
	}
	if !strings.Contains(err.Error(), "init requires --project") {
		t.Fatalf("err = %q, expected missing project error", err)
	}
}

func TestRunInitWritesBacklogIndex(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	output, err := runInDir(t, root, "init", "--project", "Go Client", "--description", "Parity work", "--timeline-weeks", "12")
	if err != nil {
		t.Fatalf("run init = %v, expected nil", err)
	}
	if !strings.Contains(output, `Initialized project "Go Client" in .backlog/`) {
		t.Fatalf("output = %q, expected init success message", output)
	}

	indexPath := filepath.Join(root, ".backlog", "index.yaml")
	index := readYAMLMap(t, indexPath)
	if index["project"] != "Go Client" {
		t.Fatalf("project = %v, expected Go Client", index["project"])
	}
	if asInt(index["timeline_weeks"]) != 12 {
		t.Fatalf("timeline_weeks = %v, expected 12", index["timeline_weeks"])
	}
	if phases, ok := index["phases"].([]interface{}); !ok || len(phases) != 0 {
		t.Fatalf("phases = %#v, expected empty phase list", index["phases"])
	}
}

func TestRunInitRejectsDuplicateProject(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	if _, err := runInDir(t, root, "init", "--project", "Go Client"); err != nil {
		t.Fatalf("run init = %v, expected nil", err)
	}
	_, err := runInDir(t, root, "init", "--project", "Go Client")
	if err == nil {
		t.Fatalf("run init expected duplicate project error")
	}
	if !strings.Contains(err.Error(), "Already initialized (.backlog/index.yaml exists)") {
		t.Fatalf("err = %q, expected duplicate error", err)
	}
}

func TestRunInitRejectsInvalidTimeline(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	_, err := runInDir(t, root, "init", "--project", "Go Client", "--timeline-weeks", "not-a-number")
	if err == nil {
		t.Fatalf("run init expected timeline parse error")
	}
	if !strings.Contains(err.Error(), "invalid --timeline-weeks value") {
		t.Fatalf("err = %q, expected timeline parse error", err)
	}
}

func TestRunListIncludesAuxItemsByDefault(t *testing.T) {
	t.Parallel()

	root := setupListAuxAndScopeFixture(t)
	output, err := runInDir(t, root, "list")
	if err != nil {
		t.Fatalf("run list = %v, expected nil", err)
	}
	if !strings.Contains(output, "Bugs (0/1 done)") {
		t.Fatalf("output = %q, expected bugs section", output)
	}
	if !strings.Contains(output, "Ideas (0/1 done)") {
		t.Fatalf("output = %q, expected ideas section", output)
	}
}

func TestRunListRejectsUnknownFlag(t *testing.T) {
	t.Parallel()

	root := setupListAuxAndScopeFixture(t)
	_, err := runInDir(t, root, "list", "--unknown")
	if err == nil {
		t.Fatalf("run list expected unknown flag error")
	}
	if !strings.Contains(err.Error(), "unexpected flag: --unknown") {
		t.Fatalf("err = %q, expected unexpected flag error", err)
	}
}

func TestRunListScopedMilestoneFiltersNestedItems(t *testing.T) {
	t.Parallel()

	root := setupListAuxAndScopeFixture(t)
	output, err := runInDir(t, root, "list", "P1.M1")
	if err != nil {
		t.Fatalf("run list P1.M1 = %v, expected nil", err)
	}
	if !strings.Contains(output, "Milestone One (") {
		t.Fatalf("output = %q, expected only milestone one totals", output)
	}
	if strings.Contains(output, "Milestone Two") {
		t.Fatalf("output = %q, expected milestone two to be filtered out", output)
	}
}

func TestRunListScopedEpicFiltersTasksInJSON(t *testing.T) {
	t.Parallel()

	root := setupListAuxAndScopeFixture(t)
	output, err := runInDir(t, root, "list", "--json", "P1.M1.E1")
	if err != nil {
		t.Fatalf("run list --json P1.M1.E1 = %v, expected nil", err)
	}
	if !strings.Contains(output, "P1.M1.E1.T001") {
		t.Fatalf("output = %q, expected scoped epic task", output)
	}
	if strings.Contains(output, "P1.M1.E2.T001") {
		t.Fatalf("output = %q, expected scoped task filtering by epic", output)
	}
}

func TestRunLsRejectsUnknownFlag(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	_, err := runInDir(t, root, "ls", "--unknown")
	if err == nil {
		t.Fatalf("run ls expected unknown flag error")
	}
	if !strings.Contains(err.Error(), "unexpected flag: --unknown") {
		t.Fatalf("err = %q, expected unexpected flag error", err)
	}
}

func TestRunListWarnsMissingTaskFiles(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	setTaskTodoFilePath(t, root, "P1.M1.E1.T001", filepath.Join("01-phase", "01-ms", "01-epic", "missing.todo"))

	output, err := runInDir(t, root, "list")
	if err != nil {
		t.Fatalf("run list = %v, expected nil", err)
	}
	if !strings.Contains(output, "Warning: 1 task file(s) referenced in index are missing.") {
		t.Fatalf("output = %q, expected missing file warning", output)
	}
	if !strings.Contains(output, "P1.M1.E1.T001") {
		t.Fatalf("output = %q, expected missing task id", output)
	}
}

func TestRunListJSONSkipsMissingTaskFilesWarning(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	setTaskTodoFilePath(t, root, "P1.M1.E1.T001", filepath.Join("01-phase", "01-ms", "01-epic", "missing.todo"))

	output, err := runInDir(t, root, "list", "--json")
	if err != nil {
		t.Fatalf("run list --json = %v, expected nil", err)
	}
	if strings.Contains(output, "Warning:") {
		t.Fatalf("output = %q, expected no missing-file warning for JSON mode", output)
	}
}

type cliListJSONTask struct {
	ID             string   `json:"id"`
	Title          string   `json:"title"`
	Status         string   `json:"status"`
	EstimateHours  float64  `json:"estimate_hours"`
	Complexity     string   `json:"complexity"`
	Priority       string   `json:"priority"`
	OnCriticalPath bool     `json:"on_critical_path"`
	FileExists     bool     `json:"file_exists"`
	File           string   `json:"file"`
	GrabAdditional []string `json:"grab_additional"`
}

type cliListJSONMilestone struct {
	ID     string         `json:"id"`
	Name   string         `json:"name"`
	Status string         `json:"status"`
	Stats  map[string]int `json:"stats"`
}

type cliListJSONPhase struct {
	ID         string                `json:"id"`
	Name       string                `json:"name"`
	Status     string                `json:"status"`
	Stats      map[string]int        `json:"stats"`
	Milestones []cliListJSONMilestone `json:"milestones"`
}

type cliListJSON struct {
	CriticalPath  []string            `json:"critical_path"`
	NextAvailable string              `json:"next_available"`
	Phases        []cliListJSONPhase  `json:"phases"`
	Tasks         []cliListJSONTask   `json:"tasks"`
	Bugs          []cliListJSONTask   `json:"bugs"`
	Ideas         []cliListJSONTask   `json:"ideas"`
	Filter        map[string]string   `json:"filter"`
}

type cliNextJSON struct {
	ID             string   `json:"id"`
	Title          string   `json:"title"`
	File           string   `json:"file"`
	FileExists     bool     `json:"file_exists"`
	EstimateHours  float64  `json:"estimate_hours"`
	Complexity     string   `json:"complexity"`
	Status         string   `json:"status"`
	Priority       string   `json:"priority"`
	OnCriticalPath bool     `json:"on_critical_path"`
	GrabAdditional []string `json:"grab_additional"`
}

type cliPreviewJSON struct {
	CriticalPath  []string          `json:"critical_path"`
	Normal        []cliListJSONTask  `json:"normal"`
	Bugs          []cliListJSONTask  `json:"bugs"`
	Ideas         []cliListJSONTask  `json:"ideas"`
	NextAvailable string            `json:"next_available"`
}

type cliLogJSONEvent struct {
	TaskID    string     `json:"task_id"`
	Title     string     `json:"title"`
	Event     string     `json:"event"`
	Kind      string     `json:"kind"`
	Timestamp time.Time  `json:"timestamp"`
	Actor     *string    `json:"actor"`
}

type cliTreeJSONTask struct {
	ID           string     `json:"id"`
	Title        string     `json:"title"`
	Status       string     `json:"status"`
	File         string     `json:"file"`
	FileExists   bool       `json:"file_exists"`
	Estimate     float64    `json:"estimate_hours"`
	Complexity   string     `json:"complexity"`
	Priority     string     `json:"priority"`
	DependsOn    []string   `json:"depends_on"`
	ClaimedBy    *string    `json:"claimed_by"`
	ClaimedAt    *time.Time `json:"claimed_at"`
	StartedAt    *time.Time `json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at"`
	OnCritical   bool       `json:"on_critical_path"`
}

type cliTreeJSONEpic struct {
	ID    string          `json:"id"`
	Name  string          `json:"name"`
	Status string         `json:"status"`
	Tasks []cliTreeJSONTask `json:"tasks"`
}

type cliTreeJSONMilestone struct {
	ID        string           `json:"id"`
	Name      string           `json:"name"`
	Status    string           `json:"status"`
	Stats     map[string]int   `json:"stats"`
	Epics     []cliTreeJSONEpic `json:"epics"`
}

type cliTreeJSONPhase struct {
	ID        string                `json:"id"`
	Name      string                `json:"name"`
	Status    string                `json:"status"`
	Stats     map[string]int        `json:"stats"`
	Milestones []cliTreeJSONMilestone `json:"milestones"`
}

type cliTreeJSON struct {
	CriticalPath    []string           `json:"critical_path"`
	NextAvailable   string             `json:"next_available"`
	MaxDepth        int                `json:"max_depth"`
	ShowDetails     bool               `json:"show_details"`
	UnfinishedOnly  bool               `json:"unfinished_only"`
	ShowCompletedAux bool              `json:"show_completed_aux"`
	Phases          []cliTreeJSONPhase `json:"phases"`
	Bugs            []cliTreeJSONTask  `json:"bugs"`
	Ideas           []cliTreeJSONTask  `json:"ideas"`
}

type cliDashJSONCurrentTask struct {
	ID          string `json:"id"`
	Title       string `json:"title,omitempty"`
	Agent       string `json:"agent"`
	File        string `json:"file,omitempty"`
	FileExists  bool   `json:"file_exists"`
	Found       bool   `json:"found"`
	WorkingTask bool   `json:"working_task"`
}

type cliDashJSONPhase struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Done            int     `json:"done"`
	Total           int     `json:"total"`
	InProgress      int     `json:"in_progress"`
	Blocked         int     `json:"blocked"`
	PercentComplete float64 `json:"percent_complete"`
}

type cliDashJSONCriticalPath struct {
	Tasks          []string `json:"tasks"`
	RemainingCount int      `json:"remaining_count"`
	RemainingHours float64  `json:"remaining_hours"`
	AllComplete    bool     `json:"all_complete"`
	NextID         string   `json:"next_id,omitempty"`
	NextTitle      string   `json:"next_title,omitempty"`
}

type cliDashJSONOverall struct {
	Done           int     `json:"done"`
	Total          int     `json:"total"`
	InProgress     int     `json:"in_progress"`
	Blocked        int     `json:"blocked"`
	Percent        float64 `json:"percent_complete"`
}

type cliDashJSONStatus struct {
	InProgress    int `json:"in_progress"`
	Blocked       int `json:"blocked"`
	StaleClaims   int `json:"stale_claims"`
	ActiveSession int `json:"active_sessions"`
}

type cliDashJSON struct {
	Agent           string                  `json:"agent"`
	CurrentTask     *cliDashJSONCurrentTask `json:"current_task"`
	Overall         cliDashJSONOverall      `json:"overall"`
	Phases          []cliDashJSONPhase      `json:"phases"`
	CompletedPhases []string                `json:"completed_phases"`
	CriticalPath    cliDashJSONCriticalPath `json:"critical_path"`
	Status          cliDashJSONStatus       `json:"status"`
}

type cliAdminJSON struct {
	Command     string `json:"command"`
	Implemented bool   `json:"implemented"`
	Message     string `json:"message"`
	Guidance    string `json:"guidance"`
}

func decodeJSONPayload(t *testing.T, raw string, target interface{}) {
	t.Helper()
	raw = strings.TrimSpace(raw)
	if raw == "" {
		t.Fatalf("expected JSON output, got empty")
	}
	if err := json.Unmarshal([]byte(raw), target); err != nil {
		t.Fatalf("decode payload = %v, raw = %q", err, raw)
	}
}

func listTaskIDs(tasks []cliListJSONTask) map[string]bool {
	out := map[string]bool{}
	for _, task := range tasks {
		out[task.ID] = true
	}
	return out
}

func TestRunListJSONMachineContract(t *testing.T) {
	t.Parallel()

	root := setupListAuxAndScopeFixture(t)

	payloadRaw, err := runInDir(t, root, "list", "--json")
	if err != nil {
		t.Fatalf("run list --json = %v, expected nil", err)
	}

	payload := cliListJSON{}
	decodeJSONPayload(t, payloadRaw, &payload)

	if payload.NextAvailable != "P1.M1.E1.T001" {
		t.Fatalf("next_available = %q, expected P1.M1.E1.T001", payload.NextAvailable)
	}
	if len(payload.CriticalPath) == 0 {
		t.Fatalf("critical_path unexpectedly empty")
	}

	if len(payload.Phases) != 1 {
		t.Fatalf("phases length = %d, expected 1", len(payload.Phases))
	}
	phase := payload.Phases[0]
	if phase.ID != "P1" {
		t.Fatalf("phase id = %s, expected P1", phase.ID)
	}
	if len(phase.Milestones) != 2 {
		t.Fatalf("milestones = %d, expected 2", len(phase.Milestones))
	}
	if phase.Milestones[0].ID != "P1.M1" || phase.Milestones[1].ID != "P1.M2" {
		t.Fatalf("milestone ids = %#v, expected P1.M1 and P1.M2", []string{phase.Milestones[0].ID, phase.Milestones[1].ID})
	}
	if phase.Milestones[0].Stats["done"] != 1 {
		t.Fatalf("milestone M1 done = %d, expected 1", phase.Milestones[0].Stats["done"])
	}
	if phase.Milestones[1].Stats["total"] != 1 {
		t.Fatalf("milestone M2 total = %d, expected 1", phase.Milestones[1].Stats["total"])
	}

	if len(payload.Tasks) != 3 {
		t.Fatalf("tasks length = %d, expected 3", len(payload.Tasks))
	}
	ids := listTaskIDs(payload.Tasks)
	for _, id := range []string{"P1.M1.E1.T001", "P1.M1.E1.T002", "P1.M1.E2.T001"} {
		if !ids[id] {
			t.Fatalf("task list missing %s", id)
		}
	}

	if len(payload.Bugs) != 1 {
		t.Fatalf("bugs length = %d, expected 1", len(payload.Bugs))
	}
	if payload.Bugs[0].ID != "B1" {
		t.Fatalf("bug id = %s, expected B1", payload.Bugs[0].ID)
	}

	if len(payload.Ideas) != 1 {
		t.Fatalf("ideas length = %d, expected 1", len(payload.Ideas))
	}
	if payload.Ideas[0].ID != "I1" {
		t.Fatalf("idea id = %s, expected I1", payload.Ideas[0].ID)
	}
}

func TestRunNextJSONMachineContract(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)

	payloadRaw, err := runInDir(t, root, "next", "--json")
	if err != nil {
		t.Fatalf("run next --json = %v, expected nil", err)
	}

	payload := cliNextJSON{}
	decodeJSONPayload(t, payloadRaw, &payload)

	if payload.ID != "P1.M1.E1.T001" {
		t.Fatalf("id = %s, expected P1.M1.E1.T001", payload.ID)
	}
	if payload.File != "T001-a.todo" {
		t.Fatalf("file = %s, expected T001-a.todo", payload.File)
	}
	if !payload.FileExists {
		t.Fatalf("file_exists = false, expected true")
	}
	if payload.Status != "pending" {
		t.Fatalf("status = %s, expected pending", payload.Status)
	}
	if !payload.OnCriticalPath {
		t.Fatalf("expected task to be on critical path")
	}
	if len(payload.GrabAdditional) != 1 || payload.GrabAdditional[0] != "P1.M1.E1.T002" {
		t.Fatalf("grab_additional = %#v, expected [P1.M1.E1.T002]", payload.GrabAdditional)
	}
}

func TestRunPreviewJSONMachineContract(t *testing.T) {
	t.Parallel()

	root := setupListAuxAndScopeFixture(t)

	payloadRaw, err := runInDir(t, root, "preview", "--json")
	if err != nil {
		t.Fatalf("run preview --json = %v, expected nil", err)
	}

	payload := cliPreviewJSON{}
	decodeJSONPayload(t, payloadRaw, &payload)

	if payload.NextAvailable != "P1.M1.E1.T001" {
		t.Fatalf("next_available = %s, expected P1.M1.E1.T001", payload.NextAvailable)
	}
	if len(payload.Normal) != 2 {
		t.Fatalf("normal length = %d, expected 2", len(payload.Normal))
	}
	if len(payload.Bugs) != 1 {
		t.Fatalf("bugs length = %d, expected 1", len(payload.Bugs))
	}
	if len(payload.Ideas) != 1 {
		t.Fatalf("ideas length = %d, expected 1", len(payload.Ideas))
	}

	normalIDs := listTaskIDs(payload.Normal)
	for _, id := range []string{"P1.M1.E1.T001", "P1.M1.E2.T001"} {
		if !normalIDs[id] {
			t.Fatalf("normal payload missing %s", id)
		}
	}
	bugIDs := listTaskIDs(payload.Bugs)
	if !bugIDs["B1"] {
		t.Fatalf("bug payload missing B1")
	}
	ideaIDs := listTaskIDs(payload.Ideas)
	if !ideaIDs["I1"] {
		t.Fatalf("idea payload missing I1")
	}
}

func TestRunLogJSONMachineContract(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	writeWorkflowTaskFileWithTimes(
		t,
		root,
		"P1.M1.E1.T001",
		"Task One",
		"done",
		"agent-a",
		"2026-01-01T10:00:00Z",
		"2026-01-01T10:30:00Z",
		"2026-01-01T11:00:00Z",
	)
	writeWorkflowTaskFileWithTimes(
		t,
		root,
		"P1.M1.E1.T002",
		"Task Two",
		"in_progress",
		"agent-b",
		"2026-01-01T10:45:00Z",
		"2026-01-01T11:30:00Z",
		"",
	)

	payloadRaw, err := runInDir(t, root, "log", "--json")
	if err != nil {
		t.Fatalf("run log --json = %v, expected nil", err)
	}
	events := []cliLogJSONEvent{}
	decodeJSONPayload(t, payloadRaw, &events)

	if len(events) < 5 {
		t.Fatalf("events = %#v, expected at least 5", events)
	}
	if events[0].TaskID != "P1.M1.E1.T002" {
		t.Fatalf("first event = %s, expected P1.M1.E1.T002", events[0].TaskID)
	}
	if events[0].Event != "started" {
		t.Fatalf("first event = %q, expected started", events[0].Event)
	}
	if events[0].Kind != "updated" {
		t.Fatalf("first kind = %q, expected updated", events[0].Kind)
	}
	if events[0].Actor == nil || *events[0].Actor != "agent-b" {
		t.Fatalf("first actor = %v, expected agent-b", events[0].Actor)
	}

	if events[1].TaskID != "P1.M1.E1.T001" {
		t.Fatalf("second event = %s, expected P1.M1.E1.T001", events[1].TaskID)
	}
	if events[1].Event != "completed" {
		t.Fatalf("second event = %q, expected completed", events[1].Event)
	}
	if events[1].Kind != "updated" {
		t.Fatalf("second kind = %q, expected updated", events[1].Kind)
	}
	if events[1].Actor == nil || *events[1].Actor != "agent-a" {
		t.Fatalf("second actor = %v, expected agent-a", events[1].Actor)
	}

	foundClaimed := false
	for _, event := range events {
		if event.Event == "claimed" {
			foundClaimed = true
			break
		}
	}
	if !foundClaimed {
		t.Fatalf("expected at least one claimed event, got %#v", events)
	}
}

func TestRunLogJSONIncludesAddedEvents(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	now := time.Date(2026, time.January, 1, 12, 0, 0, 0, time.UTC)
	taskOnePath := filepath.Join(root, ".tasks", workflowTaskFilePath("P1.M1.E1.T001"))
	taskTwoPath := filepath.Join(root, ".tasks", workflowTaskFilePath("P1.M1.E1.T002"))
	if err := os.Chtimes(taskOnePath, now, now); err != nil {
		t.Fatalf("set task one mtime = %v, expected nil", err)
	}
	if err := os.Chtimes(taskTwoPath, now.Add(-time.Minute), now.Add(-time.Minute)); err != nil {
		t.Fatalf("set task two mtime = %v, expected nil", err)
	}

	payloadRaw, err := runInDir(t, root, "log", "--json")
	if err != nil {
		t.Fatalf("run log --json = %v, expected nil", err)
	}
	events := []cliLogJSONEvent{}
	decodeJSONPayload(t, payloadRaw, &events)
	if len(events) != 2 {
		t.Fatalf("len(events) = %d, expected 2", len(events))
	}
	for _, event := range events {
		if event.Event != "added" {
			t.Fatalf("event = %q, expected added", event.Event)
		}
		if event.Kind != "created" {
			t.Fatalf("kind = %q, expected created", event.Kind)
		}
		if event.Actor != nil {
			t.Fatalf("actor = %v, expected nil", event.Actor)
		}
	}
}

func TestRunTreeJSONMachineContract(t *testing.T) {
	t.Parallel()

	root := setupListAuxAndScopeFixture(t)

	payloadRaw, err := runInDir(t, root, "tree", "--json")
	if err != nil {
		t.Fatalf("run tree --json = %v, expected nil", err)
	}
	payload := cliTreeJSON{}
	decodeJSONPayload(t, payloadRaw, &payload)

	if payload.MaxDepth != 4 {
		t.Fatalf("max_depth = %d, expected 4", payload.MaxDepth)
	}
	if payload.ShowDetails {
		t.Fatalf("show_details = %v, expected false", payload.ShowDetails)
	}
	if payload.UnfinishedOnly {
		t.Fatalf("unfinished_only = %v, expected false", payload.UnfinishedOnly)
	}
	if len(payload.Phases) != 1 {
		t.Fatalf("phases length = %d, expected 1", len(payload.Phases))
	}
	phase := payload.Phases[0]
	if len(phase.Milestones) != 2 {
		t.Fatalf("milestones = %d, expected 2", len(phase.Milestones))
	}
	if phase.Milestones[0].ID != "P1.M1" {
		t.Fatalf("milestone id = %s, expected P1.M1", phase.Milestones[0].ID)
	}
	if phase.Stats["total"] <= 0 {
		t.Fatalf("phase.total = %d, expected > 0", phase.Stats["total"])
	}
	if len(payload.Bugs) != 1 || payload.Bugs[0].ID != "B1" {
		t.Fatalf("bugs payload = %#v, expected one bug B1", payload.Bugs)
	}
	if len(payload.Ideas) != 1 || payload.Ideas[0].ID != "I1" {
		t.Fatalf("ideas payload = %#v, expected one idea I1", payload.Ideas)
	}
}

func TestRunTreeJSONUnfinishedFiltersCompletedTasks(t *testing.T) {
	t.Parallel()

	root := setupListAuxAndScopeFixture(t)

	payloadRaw, err := runInDir(t, root, "tree", "--json", "--unfinished")
	if err != nil {
		t.Fatalf("run tree --json --unfinished = %v, expected nil", err)
	}
	payload := cliTreeJSON{}
	decodeJSONPayload(t, payloadRaw, &payload)
	if !payload.UnfinishedOnly {
		t.Fatalf("unfinished_only = %v, expected true", payload.UnfinishedOnly)
	}
	milestones := payload.Phases[0].Milestones
	if len(milestones) != 2 {
		t.Fatalf("milestones = %d, expected 2", len(milestones))
	}
	if milestones[0].Epics[0].ID != "P1.M1.E1" {
		t.Fatalf("epic id = %s, expected P1.M1.E1", milestones[0].Epics[0].ID)
	}
	if len(milestones[0].Epics[0].Tasks) != 1 {
		t.Fatalf("unfinished tasks in first epic = %d, expected 1", len(milestones[0].Epics[0].Tasks))
	}
}

func TestRunTreeHidesCompletedBugsByDefault(t *testing.T) {
	t.Parallel()

	root := setupListAuxAndScopeFixture(t)
	setAuxTaskStatus(t, root, "bugs", "B1", "done")

	output, err := runInDir(t, root, "tree")
	if err != nil {
		t.Fatalf("run tree = %v, expected nil", err)
	}
	if strings.Contains(output, "Root bug") {
		t.Fatalf("output = %q, expected completed bug hidden by default", output)
	}

	output, err = runInDir(t, root, "tree", "--show-completed-aux")
	if err != nil {
		t.Fatalf("run tree --show-completed-aux = %v, expected nil", err)
	}
	if !strings.Contains(output, "Root bug") {
		t.Fatalf("output = %q, expected completed bug when show-completed-aux is set", output)
	}
}

func TestRunDashCommandOutputsCurrentTaskAndProgress(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	dataDir := filepath.Join(root, ".tasks")
	if err := taskcontext.SetCurrentTask(dataDir, "P1.M1.E1.T001", "agent-test"); err != nil {
		t.Fatalf("set current task = %v", err)
	}

	output, err := runInDir(t, root, "dash")
	if err != nil {
		t.Fatalf("run dash = %v, expected nil", err)
	}
	if !strings.Contains(output, "Current Task") {
		t.Fatalf("output = %q, expected current task header", output)
	}
	if !strings.Contains(output, "P1.M1.E1.T001") {
		t.Fatalf("output = %q, expected current task id", output)
	}
	if !strings.Contains(output, "Agent: agent-test") {
		t.Fatalf("output = %q, expected current agent", output)
	}
	if !strings.Contains(output, "Progress:") {
		t.Fatalf("output = %q, expected Progress section", output)
	}
	if !strings.Contains(output, "Critical Path:") {
		t.Fatalf("output = %q, expected Critical Path section", output)
	}
	if !strings.Contains(output, "Status:") {
		t.Fatalf("output = %q, expected Status section", output)
	}
}

func TestRunDashJSONCommandMachineContract(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	if err := taskcontext.SetCurrentTask(filepath.Join(root, ".tasks"), "P1.M1.E1.T001", "agent-test"); err != nil {
		t.Fatalf("set current task = %v", err)
	}
	if err := writeTodoTaskFromMap(filepath.Join(root, ".tasks", workflowTaskFilePath("P1.M1.E1.T001")), map[string]interface{}{
		"id":            "P1.M1.E1.T001",
		"title":         "a",
		"status":        "in_progress",
		"estimate_hours": 1,
		"complexity":    "medium",
		"priority":      "medium",
		"depends_on":    []string{},
		"tags":          []string{},
		"claimed_by":    "agent-test",
		"claimed_at":    "2026-01-01T00:00:00Z",
	}); err != nil {
		t.Fatalf("write todo file = %v", err)
	}
	if err := writeTodoTaskFromMap(filepath.Join(root, ".tasks", workflowTaskFilePath("P1.M1.E1.T002")), map[string]interface{}{
		"id":            "P1.M1.E1.T002",
		"title":         "b",
		"status":        "done",
		"estimate_hours": 1,
		"complexity":    "medium",
		"priority":      "medium",
		"depends_on":    []string{},
		"tags":          []string{},
	}); err != nil {
		t.Fatalf("write todo file = %v", err)
	}

	output, err := runInDir(t, root, "dash", "--json")
	if err != nil {
		t.Fatalf("run dash --json = %v", err)
	}

	payload := cliDashJSON{}
	decodeJSONPayload(t, output, &payload)
	if payload.Agent != "agent-test" {
		t.Fatalf("agent = %q, expected agent-test", payload.Agent)
	}
	if payload.CurrentTask == nil {
		t.Fatalf("current_task = nil, expected payload")
	}
	if payload.CurrentTask.ID != "P1.M1.E1.T001" {
		t.Fatalf("current_task.id = %q, expected P1.M1.E1.T001", payload.CurrentTask.ID)
	}
	if payload.CurrentTask.WorkingTask != true {
		t.Fatalf("current_task.working_task = %v, expected true", payload.CurrentTask.WorkingTask)
	}
	if payload.Overall.Total != 2 {
		t.Fatalf("overall.total = %d, expected 2", payload.Overall.Total)
	}
	if payload.Overall.Done != 1 {
		t.Fatalf("overall.done = %d, expected 1", payload.Overall.Done)
	}
	if payload.Overall.InProgress != 1 {
		t.Fatalf("overall.in_progress = %d, expected 1", payload.Overall.InProgress)
	}
	if payload.CriticalPath.AllComplete {
		t.Fatalf("critical_path.all_complete = true, expected false")
	}
	if payload.CriticalPath.RemainingCount < 1 {
		t.Fatalf("critical_path.remaining_count = %d, expected >=1", payload.CriticalPath.RemainingCount)
	}
	if len(payload.Phases) != 1 {
		t.Fatalf("phases length = %d, expected 1", len(payload.Phases))
	}
}

func TestRunAdminCommandNotImplemented(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	output, err := runInDir(t, root, "admin")
	if err != nil {
		t.Fatalf("run admin = %v, expected nil", err)
	}
	if !strings.Contains(output, "admin command is not implemented in the Go client.") {
		t.Fatalf("output = %q, expected not implemented message", output)
	}
	if !strings.Contains(output, "Use `backlog dash` to inspect current project status.") {
		t.Fatalf("output = %q, expected usage guidance", output)
	}

	output, err = runInDir(t, root, "admin", "--help")
	if err != nil {
		t.Fatalf("run admin --help = %v, expected nil", err)
	}
	if !strings.Contains(output, "Usage: backlog admin") {
		t.Fatalf("output = %q, expected admin usage", output)
	}
}

func TestRunAdminCommandJSONNotImplemented(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	output, err := runInDir(t, root, "admin", "--json")
	if err != nil {
		t.Fatalf("run admin --json = %v, expected nil", err)
	}

	payload := cliAdminJSON{}
	decodeJSONPayload(t, output, &payload)
	if payload.Command != "admin" {
		t.Fatalf("command = %q, expected admin", payload.Command)
	}
	if payload.Implemented != false {
		t.Fatalf("implemented = %v, expected false", payload.Implemented)
	}
	if !strings.Contains(payload.Message, "not implemented in the Go client") {
		t.Fatalf("message = %q, expected not implemented message", payload.Message)
	}
	if !strings.Contains(payload.Guidance, "Use `backlog dash`") {
		t.Fatalf("guidance = %q, expected usage guidance", payload.Guidance)
	}
}

func TestRunDoneRejectsMalformedTaskID(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)

	_, err := runInDir(t, root, "done", "not-a-task")
	if err == nil {
		t.Fatalf("run done expected malformed ID error")
	}
	if !strings.Contains(err.Error(), "malformed task id: not-a-task") {
		t.Fatalf("err = %q, expected malformed ID error", err)
	}
}

func TestRunDoneRejectsMissingStatusValue(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)

	_, err := runInDir(t, root, "done", "P1.M1.E1.T001", "--status")
	if err == nil {
		t.Fatalf("run done --status expected missing value error")
	}
	if !strings.Contains(err.Error(), "expected value for --status") {
		t.Fatalf("err = %q, expected missing --status value message", err)
	}
}

func TestRunDoneRejectsInvalidStatusValue(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)

	_, err := runInDir(t, root, "done", "--status", "not-a-status", "P1.M1.E1.T001")
	if err == nil {
		t.Fatalf("run done expected invalid status error")
	}
	if !strings.Contains(err.Error(), "invalid status: not-a-status") {
		t.Fatalf("err = %q, expected invalid status error", err)
	}
}

func TestRunDoneRejectsIncompatibleStatusTransition(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)

	_, err := runInDir(t, root, "done", "--status", "rejected", "P1.M1.E1.T001")
	if err == nil {
		t.Fatalf("run done expected transition error")
	}
	if !strings.Contains(err.Error(), "cannot transition from 'pending' to 'rejected'") {
		t.Fatalf("err = %q, expected transition error", err)
	}
}

func TestRunDoneCompletesInProgressTaskWithDefaultStatus(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	writeWorkflowTaskFile(t, root, "P1.M1.E1.T001", "a", "in_progress", "", "")

	output, err := runInDir(t, root, "done", "P1.M1.E1.T001")
	if err != nil {
		t.Fatalf("run done = %v, expected nil", err)
	}
	if !strings.Contains(output, "Completed: P1.M1.E1.T001 - a") {
		t.Fatalf("output = %q, expected completed confirmation", output)
	}

	taskText := readFile(t, filepath.Join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"))
	if !strings.Contains(taskText, "status: done") {
		t.Fatalf("task file status = %q, expected done", taskText)
	}
}

func TestRunDoneRejectsMissingTaskFile(t *testing.T) {
	t.Parallel()

	root := setupWorkflowFixture(t)
	writeWorkflowTaskFile(t, root, "P1.M1.E1.T001", "a", "in_progress", "", "")
	setTaskTodoFilePath(t, root, "P1.M1.E1.T001", filepath.Join("01-phase", "01-ms", "01-epic", "missing.todo"))

	_, err := runInDir(t, root, "done", "P1.M1.E1.T001")
	if err == nil {
		t.Fatalf("run done expected missing file error")
	}
	if !strings.Contains(err.Error(), "no such file") {
		t.Fatalf("err = %q, expected no such file error", err)
	}
}

func asInt(value any) int {
	switch n := value.(type) {
	case int:
		return n
	case int32:
		return int(n)
	case int64:
		return int(n)
	case float64:
		return int(n)
	default:
		return 0
	}
}

func writeWorkflowTaskFile(t *testing.T, root, taskID, title, status, claimedBy, claimedAt string) {
	t.Helper()
	writeWorkflowTaskFileWithTimes(
		t,
		root,
		taskID,
		title,
		status,
		claimedBy,
		claimedAt,
		"",
		"",
	)
}

func writeWorkflowTaskFileWithTimes(
	t *testing.T,
	root string,
	taskID string,
	title string,
	status string,
	claimedBy string,
	claimedAt string,
	startedAt string,
	completedAt string,
) {
	t.Helper()
	payload := map[string]interface{}{
		"id":            taskID,
		"title":         title,
		"status":        status,
		"estimate_hours": 1,
		"complexity":    "medium",
		"priority":      "medium",
		"depends_on":    []string{},
		"tags":          []string{},
	}
	if claimedBy != "" {
		payload["claimed_by"] = claimedBy
	}
	if claimedAt != "" {
		payload["claimed_at"] = claimedAt
	}
	if startedAt != "" {
		payload["started_at"] = startedAt
	}
	if completedAt != "" {
		payload["completed_at"] = completedAt
	}

	taskPath := filepath.Join(root, ".tasks", workflowTaskFilePath(taskID))
	if err := writeTodoTaskFromMap(taskPath, payload); err != nil {
		t.Fatalf("write task file: %v", err)
	}
}

func writeTodoTaskFromMap(taskPath string, frontmatter map[string]interface{}) error {
	if err := os.MkdirAll(filepath.Dir(taskPath), 0o755); err != nil {
		return err
	}
	payload, err := yaml.Marshal(frontmatter)
	if err != nil {
		return err
	}
	content := fmt.Sprintf("---\n%s---\n", string(payload))
	return os.WriteFile(taskPath, []byte(content), 0o644)
}

func setAuxTaskStatus(t *testing.T, root string, section string, itemID string, status string) {
	t.Helper()
	indexPath := filepath.Join(root, ".tasks", section, "index.yaml")
	index := readYAMLMap(t, indexPath)
	entries, ok := index[section].([]interface{})
	if !ok {
		t.Fatalf("expected %s index to contain %s entries", section, section)
	}
	found := false
	for _, raw := range entries {
		entry := raw.(map[string]interface{})
		if asString(entry["id"]) == itemID {
			entry["status"] = status
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("%s not found in %s index", itemID, section)
	}
	writeYAMLMap(t, indexPath, index)
}

func workflowTaskFilePath(taskID string) string {
	base := filepath.Base(taskID)
	if strings.HasSuffix(base, "001") {
		return filepath.Join("01-phase", "01-ms", "01-epic", "T001-a.todo")
	}
	if strings.HasSuffix(base, "002") {
		return filepath.Join("01-phase", "01-ms", "01-epic", "T002-b.todo")
	}
	return filepath.Join("01-phase", "01-ms", "01-epic", "T001-a.todo")
}

func setTaskTodoFilePath(t *testing.T, root, fullID, todoFile string) {
	t.Helper()
	indexPath := filepath.Join(root, ".tasks", "01-phase", "01-ms", "01-epic", "index.yaml")
	index := readYAMLMap(t, indexPath)
	entries, ok := index["tasks"].([]interface{})
	if !ok {
		t.Fatalf("expected epic tasks entry to be a list")
	}
	for _, raw := range entries {
		entry := raw.(map[string]interface{})
		shortID := asString(entry["id"])
		if strings.HasSuffix(fullID, shortID) {
			entry["file"] = todoFile
			break
		}
	}
	writeYAMLMap(t, indexPath, index)
}

func setupWorkflowFixture(t *testing.T) string {
	t.Helper()

	root := t.TempDir()
	dataDir := filepath.Join(root, ".tasks")
	writeYAMLMap(t, filepath.Join(dataDir, "index.yaml"), map[string]interface{}{
		"project": "Go Command Workflow Fixtures",
		"phases": []map[string]interface{}{
			{
				"id":   "P1",
				"name": "Phase",
				"path": "01-phase",
			},
		},
	})
	writeYAMLMap(t, filepath.Join(dataDir, "01-phase", "index.yaml"), map[string]interface{}{
		"milestones": []map[string]interface{}{
			{
				"id":   "M1",
				"name": "Milestone",
				"path": "01-ms",
			},
		},
	})
	writeYAMLMap(t, filepath.Join(dataDir, "01-phase", "01-ms", "index.yaml"), map[string]interface{}{
		"epics": []map[string]interface{}{
			{
				"id":     "E1",
				"name":   "Epic",
				"path":   "01-epic",
				"status": "pending",
			},
		},
	})
	writeYAMLMap(t, filepath.Join(dataDir, "01-phase", "01-ms", "01-epic", "index.yaml"), map[string]interface{}{
		"id":     "P1.M1.E1",
		"name":   "Epic",
		"status": "pending",
		"tasks": []map[string]interface{}{
			{
				"id":             "T001",
				"title":          "a",
				"file":           "T001-a.todo",
				"status":         "pending",
				"estimate_hours": 1,
				"complexity":     "medium",
				"priority":       "medium",
				"depends_on":     []string{},
				"tags":           []string{},
			},
			{
				"id":             "T002",
				"title":          "b",
				"file":           "T002-b.todo",
				"status":         "pending",
				"estimate_hours": 1,
				"complexity":     "medium",
				"priority":       "medium",
				"depends_on":     []string{},
				"tags":           []string{},
			},
		},
	})

	writeWorkflowTaskFile(t, root, "P1.M1.E1.T001", "a", "pending", "", "")
	writeWorkflowTaskFile(t, root, "P1.M1.E1.T002", "b", "pending", "", "")
	return root
}

func setupListAuxAndScopeFixture(t *testing.T) string {
	t.Helper()

	root := t.TempDir()
	dataDir := filepath.Join(root, ".tasks")
	writeYAMLMap(t, filepath.Join(dataDir, "index.yaml"), map[string]interface{}{
		"project": "List Scoping Fixtures",
		"phases": []map[string]interface{}{
			{
				"id":   "P1",
				"name": "Primary Phase",
				"path": "01-phase",
			},
		},
	})
	writeYAMLMap(t, filepath.Join(dataDir, "01-phase", "index.yaml"), map[string]interface{}{
		"milestones": []map[string]interface{}{
			{
				"id":   "M1",
				"name": "Milestone One",
				"path": "01-ms1",
			},
			{
				"id":   "M2",
				"name": "Milestone Two",
				"path": "02-ms2",
			},
		},
	})
	writeYAMLMap(t, filepath.Join(dataDir, "01-phase", "01-ms1", "index.yaml"), map[string]interface{}{
		"epics": []map[string]interface{}{
			{
				"id":     "E1",
				"name":   "Epic One",
				"path":   "01-epic",
				"status": "pending",
				"tasks": []map[string]interface{}{
					{
						"id":             "T001",
						"title":          "Epic One Task",
						"file":           "epic-one.task",
						"status":         "pending",
						"estimate_hours": 1,
						"complexity":     "medium",
						"priority":       "medium",
						"depends_on":     []string{},
						"tags":           []string{},
					},
					{
						"id":             "T002",
						"title":          "Epic One Extra Task",
						"file":           "epic-one.extra",
						"status":         "done",
						"estimate_hours": 1,
						"complexity":     "medium",
						"priority":       "medium",
						"depends_on":     []string{},
						"tags":           []string{},
					},
				},
			},
			{
				"id":     "E2",
				"name":   "Epic Two",
				"path":   "02-epic",
				"status": "pending",
				"tasks": []map[string]interface{}{
					{
						"id":             "T001",
						"title":          "Epic Two Task",
						"file":           "epic-two.task",
						"status":         "pending",
						"estimate_hours": 1,
						"complexity":     "medium",
						"priority":       "medium",
						"depends_on":     []string{},
						"tags":           []string{},
					},
				},
			},
		},
	})
	writeYAMLMap(t, filepath.Join(dataDir, "01-phase", "02-ms2", "index.yaml"), map[string]interface{}{
		"epics": []map[string]interface{}{
			{
				"id":     "E1",
				"name":   "Milestone Two Epic",
				"path":   "01-epic",
				"status": "pending",
				"tasks": []map[string]interface{}{
					{
						"id":             "T001",
						"title":          "Milestone Two Task",
						"file":           "milestone-two.task",
						"status":         "pending",
						"estimate_hours": 1,
						"complexity":     "medium",
						"priority":       "medium",
						"depends_on":     []string{},
						"tags":           []string{},
					},
				},
			},
		},
	})

	writeYAMLMap(t, filepath.Join(dataDir, "bugs", "index.yaml"), map[string]interface{}{
		"bugs": []map[string]interface{}{
			{
				"id":             "B1",
				"title":          "Root bug",
				"file":           "bug-task.todo",
				"status":         "pending",
				"estimate_hours": 1,
				"complexity":     "medium",
				"priority":       "high",
				"depends_on":     []string{},
				"tags":           []string{},
			},
		},
	})
	writeYAMLMap(t, filepath.Join(dataDir, "ideas", "index.yaml"), map[string]interface{}{
		"ideas": []map[string]interface{}{
			{
				"id":             "I1",
				"title":          "Root idea",
				"file":           "idea-task.todo",
				"status":         "pending",
				"estimate_hours": 1,
				"complexity":     "medium",
				"priority":       "high",
				"depends_on":     []string{},
				"tags":           []string{},
			},
		},
	})

	writeTaskFile(t, root, filepath.Join(".tasks", "01-phase", "01-ms1", "01-epic", "epic-one.task"), "P1.M1.E1.T001", "Epic One Task")
	writeTaskFile(t, root, filepath.Join(".tasks", "01-phase", "01-ms1", "01-epic", "epic-one.extra"), "P1.M1.E1.T002", "Epic One Extra Task")
	writeTaskFile(t, root, filepath.Join(".tasks", "01-phase", "01-ms1", "02-epic", "epic-two.task"), "P1.M1.E2.T001", "Epic Two Task")
	writeTaskFile(t, root, filepath.Join(".tasks", "01-phase", "02-ms2", "01-epic", "milestone-two.task"), "P1.M1.M2.E1.T001", "Milestone Two Task")
	writeTaskFile(t, root, filepath.Join(".tasks", "bugs", "bug-task.todo"), "B1", "Root bug")
	writeTaskFile(t, root, filepath.Join(".tasks", "ideas", "idea-task.todo"), "I1", "Root idea")

	return root
}

func writeTaskFile(t *testing.T, root, relativePath, taskID, title string) {
	t.Helper()

	fullPath := filepath.Join(root, relativePath)
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		t.Fatalf("create task dir: %v", err)
	}
	content := []string{
		"---",
		fmt.Sprintf("id: %s", taskID),
		fmt.Sprintf("title: %s", title),
		"status: pending",
		"estimate_hours: 1",
		"complexity: medium",
		"priority: medium",
		"depends_on: []",
		"tags: []",
		"---",
	}
	if err := os.WriteFile(fullPath, []byte(strings.Join(content, "\n")), 0o644); err != nil {
		t.Fatalf("write task file %s: %v", fullPath, err)
	}
}

func setupAddFixture(t *testing.T) string {
	t.Helper()

	root := t.TempDir()
	dataDir := filepath.Join(root, ".tasks")
	writeYAMLMap(t, filepath.Join(dataDir, "index.yaml"), map[string]interface{}{
		"project": "Go Command Fixtures",
		"phases": []map[string]interface{}{
			{
				"id":   "P1",
				"name": "Phase",
				"path": "01-phase",
			},
		},
	})
	writeYAMLMap(t, filepath.Join(dataDir, "01-phase", "index.yaml"), map[string]interface{}{
		"milestones": []map[string]interface{}{
			{
				"id":   "M1",
				"name": "Milestone",
				"path": "01-ms",
			},
		},
	})
	writeYAMLMap(t, filepath.Join(dataDir, "01-phase", "01-ms", "index.yaml"), map[string]interface{}{
		"epics": []map[string]interface{}{
			{
				"id":     "E1",
				"name":   "Epic",
				"path":   "01-epic",
				"status": "pending",
			},
		},
	})
	writeYAMLMap(t, filepath.Join(dataDir, "01-phase", "01-ms", "01-epic", "index.yaml"), map[string]interface{}{
		"id":     "P1.M1.E1",
		"name":   "Epic",
		"status": "pending",
		"tasks":  []map[string]interface{}{},
	})
	return root
}

func runInDir(t *testing.T, dir string, args ...string) (string, error) {
	t.Helper()

	previous, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to getwd: %v", err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("failed to chdir to fixture: %v", err)
	}

	outPipeR, outPipeW, err := os.Pipe()
	if err != nil {
		t.Fatalf("failed to create stdout pipe: %v", err)
	}
	errPipeR, errPipeW, err := os.Pipe()
	if err != nil {
		t.Fatalf("failed to create stderr pipe: %v", err)
	}

	oldStdout, oldStderr := os.Stdout, os.Stderr
	os.Stdout = outPipeW
	os.Stderr = errPipeW

	runErr := Run(args...)

	outPipeW.Close()
	errPipeW.Close()
	outBytes, _ := io.ReadAll(outPipeR)
	errBytes, _ := io.ReadAll(errPipeW)

	os.Stdout = oldStdout
	os.Stderr = oldStderr
	if cherr := os.Chdir(previous); cherr != nil {
		t.Fatalf("failed to restore cwd: %v", cherr)
	}

	return string(outBytes) + string(errBytes), runErr
}

func readYAMLMap(t *testing.T, path string) map[string]interface{} {
	t.Helper()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read %s: %v", path, err)
	}
	out := map[string]interface{}{}
	if err := yaml.Unmarshal(content, &out); err != nil {
		t.Fatalf("failed to parse %s: %v", path, err)
	}
	return out
}

func writeYAMLMap(t *testing.T, path string, data map[string]interface{}) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("failed to create fixture dir: %v", err)
	}
	payload, err := yaml.Marshal(data)
	if err != nil {
		t.Fatalf("failed to marshal yaml: %v", err)
	}
	if err := os.WriteFile(path, payload, 0o644); err != nil {
		t.Fatalf("failed to write %s: %v", path, err)
	}
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read %s: %v", path, err)
	}
	return string(raw)
}
