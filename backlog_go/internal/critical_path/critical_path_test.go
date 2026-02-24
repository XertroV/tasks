package critical_path

import (
	"reflect"
	"testing"

	"github.com/XertroV/tasks/backlog_go/internal/models"
)

func taskFromID(t *testing.T, id string, estimate float64, dependsOn []string) models.Task {
	t.Helper()
	path, err := models.ParseTaskPath(id)
	if err != nil {
		t.Fatalf("ParseTaskPath(%q) unexpected error: %v", id, err)
	}

	return models.Task{
		ID:            id,
		Title:         "Task " + id,
		Status:        models.StatusPending,
		EstimateHours: estimate,
		Complexity:    models.ComplexityMedium,
		Priority:      models.PriorityMedium,
		DependsOn:     dependsOn,
		EpicID:        path.EpicID(),
		MilestoneID:   path.MilestoneID(),
		PhaseID:       path.PhaseID(),
	}
}

func TestCalculateBuildsDependencyGraphAndComputesCriticalPath(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
		Phases: []models.Phase{
			{
				ID: "P1",
				Milestones: []models.Milestone{
					{
						ID: "P1.M1",
						Epics: []models.Epic{
							{
								ID:    "P1.M1.E1",
								Tasks: []models.Task{taskFromID(t, "P1.M1.E1.T001", 5, []string{})},
							},
							{
								ID:        "P1.M1.E2",
								DependsOn: []string{"E1"},
								Tasks:     []models.Task{taskFromID(t, "P1.M1.E2.T001", 3, []string{})},
							},
						},
					},
				},
			},
		},
	}

	calc := NewCriticalPathCalculator(tree, nil)
	criticalPath, next, err := calc.Calculate()
	if err != nil {
		t.Fatalf("Calculate() returned error: %v", err)
	}

	expectedPath := []string{"P1.M1.E1.T001", "P1.M1.E2.T001"}
	if !reflect.DeepEqual(criticalPath, expectedPath) {
		t.Fatalf("critical path = %v, expected %v", criticalPath, expectedPath)
	}
	if next != expectedPath[0] {
		t.Fatalf("next task = %q, expected %q", next, expectedPath[0])
	}
}

func TestCalculateRejectsDependencyCycle(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
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
									taskFromID(t, "P1.M1.E1.T001", 1, []string{"P1.M1.E1.T002"}),
									taskFromID(t, "P1.M1.E1.T002", 1, []string{"P1.M1.E1.T001"}),
								},
							},
						},
					},
				},
			},
		},
	}

	calc := NewCriticalPathCalculator(tree, nil)
	_, _, err := calc.Calculate()
	if err == nil {
		t.Fatal("Calculate() expected error for dependency cycle")
	}
}

func TestFindAllAvailableRespectsEpicMilestoneAndPhaseDependencies(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
		Phases: []models.Phase{
			{
				ID: "P1",
				Milestones: []models.Milestone{
					{
						ID: "P1.M1",
						Epics: []models.Epic{
							{ID: "P1.M1.E1", Tasks: []models.Task{taskFromID(t, "P1.M1.E1.T001", 1, nil)}},
							{ID: "P1.M1.E2", DependsOn: []string{"E1"}, Tasks: []models.Task{taskFromID(t, "P1.M1.E2.T001", 1, nil)}},
						},
					},
				},
			},
			{
				ID: "P2",
				Milestones: []models.Milestone{
					{
						ID:        "P2.M1",
						DependsOn: []string{"P1.M1"},
						Epics: []models.Epic{
							{ID: "P2.M1.E1", Tasks: []models.Task{taskFromID(t, "P2.M1.E1.T001", 1, nil)}},
						},
					},
				},
			},
		},
	}

	calc := NewCriticalPathCalculator(tree, nil)
	available := calc.FindAllAvailable()
	if !reflect.DeepEqual(available, []string{"P1.M1.E1.T001"}) {
		t.Fatalf("FindAllAvailable() = %v, expected only upstream task", available)
	}

	tree.FindTask("P1.M1.E1.T001").Status = models.StatusDone
	available = calc.FindAllAvailable()
	if !reflect.DeepEqual(available, []string{"P1.M1.E2.T001"}) {
		t.Fatalf("after completion, FindAllAvailable() = %v, expected only epic-dependent task", available)
	}

	tree.FindTask("P1.M1.E2.T001").Status = models.StatusDone
	available = calc.FindAllAvailable()
	if !reflect.DeepEqual(available, []string{"P2.M1.E1.T001"}) {
		t.Fatalf("after phase completion, FindAllAvailable() = %v, expected phase-unblocked task", available)
	}
}

func TestFindSiblingTasksRespectsDependencyContext(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
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
									taskFromID(t, "P1.M1.E1.T001", 1, nil),
									taskFromID(t, "P1.M1.E1.T002", 1, []string{"P1.M1.E1.T001"}),
									taskFromID(t, "P1.M1.E1.T003", 1, []string{"P1.M1.E1.T002"}),
									taskFromID(t, "P1.M1.E1.T004", 1, []string{"P1.M1.E2.T001"}),
								},
							},
							{ID: "P1.M1.E2", Tasks: []models.Task{taskFromID(t, "P1.M1.E2.T001", 1, nil)}},
						},
					},
				},
			},
		},
	}

	calc := NewCriticalPathCalculator(tree, nil)
	primary := tree.FindTask("P1.M1.E1.T002")
	siblings, err := calc.FindSiblingTasks(primary.ID, 3)
	if err != nil {
		t.Fatalf("FindSiblingTasks() returned error: %v", err)
	}

	expected := []string{"P1.M1.E1.T003"}
	if !reflect.DeepEqual(siblings, expected) {
		t.Fatalf("FindSiblingTasks() = %v, expected %v", siblings, expected)
	}
}

func TestFindSiblingTasksSkipsClaimedAndPendingImplicitBlockers(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
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
									taskFromID(t, "P1.M1.E1.T001", 1, nil),
									taskFromID(t, "P1.M1.E1.T002", 1, []string{"P1.M1.E1.T001"}),
									taskFromID(t, "P1.M1.E1.T003", 1, []string{"P1.M1.E1.T002"}),
								},
							},
						},
					},
				},
			},
		},
	}

	tree.FindTask("P1.M1.E1.T002").ClaimedBy = "other-agent"
	calc := NewCriticalPathCalculator(tree, nil)
	primary := tree.FindTask("P1.M1.E1.T001")
	siblings, err := calc.FindSiblingTasks(primary.ID, 3)
	if err != nil {
		t.Fatalf("FindSiblingTasks() returned error: %v", err)
	}

	if len(siblings) != 0 {
		t.Fatalf("expected no siblings after claimed blocker, got %v", siblings)
	}
}

func TestCheckDependenciesWithinBatch(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
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
									taskFromID(t, "P1.M1.E1.T001", 1, nil),
									taskFromID(t, "P1.M1.E1.T002", 1, []string{"P1.M1.E1.T001"}),
									taskFromID(t, "P1.M1.E1.T003", 1, []string{"P1.M1.E1.T002"}),
									taskFromID(t, "P1.M1.E1.T004", 1, nil),
								},
							},
							{
								ID:    "P1.M1.E2",
								Tasks: []models.Task{taskFromID(t, "P1.M1.E2.T001", 1, nil)},
							},
						},
					},
				},
			},
		},
	}

	calc := NewCriticalPathCalculator(tree, nil)
	t002 := tree.FindTask("P1.M1.E1.T002")
	t003 := tree.FindTask("P1.M1.E1.T003")
	t004 := tree.FindTask("P1.M1.E1.T004")

	if !calc.checkDependenciesWithinBatch(t002, map[string]struct{}{"P1.M1.E1.T001": {}}) {
		t.Fatalf("expected T002 to be satisfiable when its dependency is in batch")
	}

	if calc.checkDependenciesWithinBatch(t003, map[string]struct{}{}) {
		t.Fatalf("expected T003 to be blocked without explicit dependency in batch")
	}

	if !calc.checkDependenciesWithinBatch(t003, map[string]struct{}{t002.ID: {}}) {
		t.Fatalf("expected T003 to be satisfiable when explicit dependency is in batch")
	}

	if calc.checkDependenciesWithinBatch(t004, map[string]struct{}{}) {
		t.Fatalf("expected T004 to be blocked by implicit dependency when previous task is pending")
	}

	if !calc.checkDependenciesWithinBatch(t004, map[string]struct{}{t003.ID: {}}) {
		t.Fatalf("expected T004 to be satisfiable when implicit dependency is in batch")
	}
}

func TestBuildDependencyGraphIgnoresEmptyDependencyContainers(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
		Phases: []models.Phase{
			{
				ID: "P1",
				Milestones: []models.Milestone{
					{
						ID:    "P1.M1",
						Epics: []models.Epic{},
					},
				},
			},
			{
				ID: "P2",
				Milestones: []models.Milestone{
					{
						ID:        "P2.M1",
						DependsOn: []string{"P1.M1"},
						Epics: []models.Epic{
							{
								ID:    "P2.M1.E1",
								Tasks: []models.Task{taskFromID(t, "P2.M1.E1.T001", 1, nil)},
							},
						},
					},
				},
			},
		},
	}

	calc := NewCriticalPathCalculator(tree, nil)
	path, next, err := calc.Calculate()
	if err != nil {
		t.Fatalf("Calculate() returned error: %v", err)
	}
	expectedPath := []string{"P2.M1.E1.T001"}
	if !reflect.DeepEqual(path, expectedPath) {
		t.Fatalf("critical path = %v, expected %v", path, expectedPath)
	}
	if next != "P2.M1.E1.T001" {
		t.Fatalf("next task = %q, expected %q", next, "P2.M1.E1.T001")
	}
}

func TestFindTasksBlockedByAndRootBlockers(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
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
									taskFromID(t, "P1.M1.E1.T001", 1, nil),
									taskFromID(t, "P1.M1.E1.T002", 1, []string{"P1.M1.E1.T001"}),
									taskFromID(t, "P1.M1.E1.T003", 1, []string{"P1.M1.E1.T002"}),
								},
							},
						},
					},
				},
			},
		},
	}

	calc := NewCriticalPathCalculator(tree, nil)
	blocked, err := calc.FindTasksBlockedBy("P1.M1.E1.T001")
	if err != nil {
		t.Fatalf("FindTasksBlockedBy() returned error: %v", err)
	}
	expectedBlocked := []string{"P1.M1.E1.T002"}
	if !reflect.DeepEqual(blocked, expectedBlocked) {
		t.Fatalf("FindTasksBlockedBy() = %v, expected %v", blocked, expectedBlocked)
	}

	rootBlockers, err := calc.FindRootBlockers()
	if err != nil {
		t.Fatalf("FindRootBlockers() returned error: %v", err)
	}
	expectedRoots := []string{"P1.M1.E1.T001"}
	if !reflect.DeepEqual(rootBlockers, expectedRoots) {
		t.Fatalf("FindRootBlockers() = %v, expected %v", rootBlockers, expectedRoots)
	}
}

func TestWhyReportIncludesDependenciesAndCriticalPath(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
		Phases: []models.Phase{
			{
				ID: "P1",
				Milestones: []models.Milestone{
					{
						ID: "P1.M1",
						Epics: []models.Epic{
							{ID: "P1.M1.E1", Tasks: []models.Task{
								taskFromID(t, "P1.M1.E1.T001", 1, nil),
								taskFromID(t, "P1.M1.E1.T002", 1, []string{"P1.M1.E1.T001"}),
							}},
						},
					},
				},
			},
		},
	}

	calc := NewCriticalPathCalculator(tree, nil)
	report, err := calc.Why("P1.M1.E1.T002")
	if err != nil {
		t.Fatalf("Why() returned error: %v", err)
	}

	if report.TaskID != "P1.M1.E1.T002" {
		t.Fatalf("expected report for task %q, got %q", "P1.M1.E1.T002", report.TaskID)
	}
	if report.CanStart {
		t.Fatal("expected report.CanStart to be false for blocked task")
	}
	if len(report.ExplicitDependencies) != 1 || report.ExplicitDependencies[0].ID != "P1.M1.E1.T001" {
		t.Fatalf("expected one explicit dependency on T001, got %+v", report.ExplicitDependencies)
	}
}

func TestCanStartValidationAndPhaseHelpers(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
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
									taskFromID(t, "P1.M1.E1.T001", 1, nil),
									taskFromID(t, "P1.M1.E1.T002", 1, []string{"P1.M1.E1.T001"}),
								},
							},
						},
					},
				},
			},
		},
	}

	calc := NewCriticalPathCalculator(tree, nil)
	if err := calc.ValidateStatusTransition(models.StatusPending, models.StatusInProgress); err != nil {
		t.Fatalf("ValidateStatusTransition() = %v", err)
	}
	if err := calc.ValidateStatusTransition(models.StatusDone, models.StatusPending); err == nil {
		t.Fatalf("ValidateStatusTransition() expected invalid transition error")
	}

	canStart, err := calc.CanStart("P1.M1.E1.T001")
	if err != nil {
		t.Fatalf("CanStart() = %v", err)
	}
	if !canStart {
		t.Fatalf("CanStart() expected true for root pending task")
	}
	if _, err := calc.CanStart("bad-id"); err == nil {
		t.Fatalf("CanStart() expected malformed task id error")
	}

	phase, err := calc.resolvePhaseDependency("P1")
	if err != nil {
		t.Fatalf("resolvePhaseDependency() = %v", err)
	}
	if phase == nil || phase.ID != "P1" {
		t.Fatalf("resolvePhaseDependency() returned unexpected phase: %+v", phase)
	}
	if _, err := calc.resolvePhaseDependency("bad-id"); err == nil {
		t.Fatalf("resolvePhaseDependency() expected malformed dependency error")
	}

	if calc.isPhaseComplete(tree.Phases[0]) {
		t.Fatalf("isPhaseComplete() expected false with pending tasks")
	}
	tree.FindTask("P1.M1.E1.T001").Status = models.StatusDone
	tree.FindTask("P1.M1.E1.T002").Status = models.StatusDone
	calc = NewCriticalPathCalculator(tree, nil)
	if !calc.isPhaseComplete(tree.Phases[0]) {
		t.Fatalf("isPhaseComplete() expected true when all tasks are done")
	}
}

func TestFindAdditionalBugsAndDependencyRelationships(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
		Bugs: []models.Task{
			{ID: "B1", Title: "Primary bug", Status: models.StatusPending, Priority: models.PriorityHigh},
			{ID: "B2", Title: "Depends on primary", Status: models.StatusPending, Priority: models.PriorityHigh, DependsOn: []string{"B1"}},
			{ID: "B3", Title: "Independent bug", Status: models.StatusPending, Priority: models.PriorityMedium},
			{ID: "B4", Title: "Depends on B3", Status: models.StatusPending, Priority: models.PriorityLow, DependsOn: []string{"B3"}},
		},
	}

	calc := NewCriticalPathCalculator(tree, nil)
	additional, err := calc.FindAdditionalBugs("B1", 3)
	if err != nil {
		t.Fatalf("FindAdditionalBugs() = %v", err)
	}
	if contains(additional, "B2") {
		t.Fatalf("FindAdditionalBugs() should exclude directly dependent bug: %v", additional)
	}
	if !contains(additional, "B3") {
		t.Fatalf("FindAdditionalBugs() should include independent bug B3: %v", additional)
	}

	if !hasDependencyRelationship("B2", "B1", calc) {
		t.Fatalf("expected dependency relationship B2 -> B1")
	}
	if hasDependencyRelationship("B3", "B1", calc) {
		t.Fatalf("unexpected dependency relationship B3 -> B1")
	}

	task := tree.FindTask("B2")
	deps := calc.taskDependencies(task, "B1")
	if len(deps) != 1 || deps[0].ID != "B1" {
		t.Fatalf("taskDependencies() = %v, expected dependency on B1", deps)
	}
}

func TestDependencyResolutionAndBoundaryHelpers(t *testing.T) {
	t.Parallel()

	tree := models.TaskTree{
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
									taskFromID(t, "P1.M1.E1.T001", 1, nil),
									taskFromID(t, "P1.M1.E1.T002", 1, nil),
								},
							},
						},
					},
				},
			},
		},
	}

	calc := NewCriticalPathCalculator(tree, nil)
	targets, err := calc.resolveDependencyTargets("E1", "P1.M1")
	if err != nil {
		t.Fatalf("resolveDependencyTargets(E1) = %v", err)
	}
	if len(targets) != 2 {
		t.Fatalf("resolveDependencyTargets(E1) returned %d targets, expected 2", len(targets))
	}

	epic, err := calc.resolveEpicDependency("E1", "P1.M1")
	if err != nil || epic == nil || epic.ID != "P1.M1.E1" {
		t.Fatalf("resolveEpicDependency() unexpected result: epic=%+v err=%v", epic, err)
	}
	milestone, err := calc.resolveMilestoneDependency("M1", "P1")
	if err != nil || milestone == nil || milestone.ID != "P1.M1" {
		t.Fatalf("resolveMilestoneDependency() unexpected result: milestone=%+v err=%v", milestone, err)
	}

	epicTasks := tree.Phases[0].Milestones[0].Epics[0].Tasks
	if firstTaskInEpic(epicTasks) != "P1.M1.E1.T001" || lastTaskInEpic(epicTasks) != "P1.M1.E1.T002" {
		t.Fatalf("unexpected first/last task in epic")
	}
	if firstTaskInMilestone(tree.Phases[0].Milestones[0]) != "P1.M1.E1.T001" || lastTaskInMilestone(tree.Phases[0].Milestones[0]) != "P1.M1.E1.T002" {
		t.Fatalf("unexpected first/last task in milestone")
	}
	if firstTaskInPhase(tree.Phases[0]) != "P1.M1.E1.T001" || lastTaskInPhase(tree.Phases[0]) != "P1.M1.E1.T002" {
		t.Fatalf("unexpected first/last task in phase")
	}
}
