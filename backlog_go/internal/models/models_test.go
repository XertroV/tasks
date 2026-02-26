package models

import "testing"

func TestParseTaskPath(t *testing.T) {
	t.Parallel()

	cases := map[string]bool{
		"P1":            true,
		"P1.M1":         true,
		"P1.M1.E1":      true,
		"P1.M1.E1.T001": true,
		"P1.M1.E1.T123": true,
		"P1.MA":         false,
		"P1.M1.X1":      false,
		"P1.M1.E1.T":    false,
		"bad":           false,
		"P1.M1.E":       false,
		"P1.M1.E1.TX":   false,
	}

	for input, ok := range cases {
		_, err := ParseTaskPath(input)
		if ok && err != nil {
			t.Fatalf("ParseTaskPath(%q) = %v, expected success", input, err)
		}
		if !ok && err == nil {
			t.Fatalf("ParseTaskPath(%q) = success, expected error", input)
		}
	}
}

func TestPathQueryParseValidation(t *testing.T) {
	t.Parallel()

	if _, err := ParsePathQuery("P1.M1.*"); err != nil {
		t.Fatalf("ParsePathQuery() = %v, expected success", err)
	}
	if _, err := ParsePathQuery("P1.**"); err != nil {
		t.Fatalf("ParsePathQuery() = %v, expected success", err)
	}
	if _, err := ParsePathQuery("P1..M1"); err == nil {
		t.Fatalf("ParsePathQuery(\"P1..M1\") should fail")
	}
	if _, err := ParsePathQuery("P1.**.M1"); err == nil {
		t.Fatalf("ParsePathQuery(\"P1.**.M1\") should fail")
	}
}

func TestIDHelpers(t *testing.T) {
	t.Parallel()

	phases := []string{"P1", "P2", "P4"}
	if NextPhaseID(phases) != "P5" {
		t.Fatalf("NextPhaseID() = %q, expected P5", NextPhaseID(phases))
	}

	milestones := []string{"M1", "M3", "M2"}
	if NextMilestoneID(milestones) != "M4" {
		t.Fatalf("NextMilestoneID() = %q, expected M4", NextMilestoneID(milestones))
	}

	tasks := []string{"T001", "T010", "T009"}
	if NextTaskID(tasks) != "T011" {
		t.Fatalf("NextTaskID() = %q, expected T011", NextTaskID(tasks))
	}

	if got := DirectoryName(3, "Alpha Phase"); got != "03-alpha-phase" {
		t.Fatalf("DirectoryName() = %q, expected 03-alpha-phase", got)
	}

	if !SafePathPrefix("01-alpha-phase") {
		t.Fatalf("SafePathPrefix() returned false for valid path")
	}
	if SafePathPrefix("../bad") {
		t.Fatalf("SafePathPrefix() should reject traversal")
	}
}

func TestParseStatusPriorityComplexity(t *testing.T) {
	t.Parallel()

	pending, err := ParseStatus("pending")
	if err != nil {
		t.Fatalf("ParseStatus(%q) returned error: %v", "pending", err)
	}
	if pending != StatusPending {
		t.Fatalf("ParseStatus(%q) = %q, expected %q", "pending", pending, StatusPending)
	}

	inProgress, err := ParseStatus("inprogress")
	if err != nil || inProgress != StatusInProgress {
		t.Fatalf("ParseStatus(%q) = %q, expected %q, err=%v", "inprogress", inProgress, StatusInProgress, err)
	}

	if _, err := ParseStatus("completed"); err != nil {
		t.Fatalf("ParseStatus(%q) should normalize alias, got error %v", "completed", err)
	}

	if _, err := ParseStatus("bad-status"); err == nil {
		t.Fatalf("ParseStatus(%q) should error on invalid value", "bad-status")
	}

	priority, err := ParsePriority("high")
	if err != nil || priority != PriorityHigh {
		t.Fatalf("ParsePriority(%q) = %q, expected %q, err=%v", "high", priority, PriorityHigh, err)
	}
	if _, err := ParsePriority("unknown"); err == nil {
		t.Fatalf("ParsePriority(%q) should reject invalid priority", "unknown")
	}

	complexity, err := ParseComplexity("critical")
	if err != nil || complexity != ComplexityCritical {
		t.Fatalf("ParseComplexity(%q) = %q, expected %q, err=%v", "critical", complexity, ComplexityCritical, err)
	}
	if _, err := ParseComplexity("unknown"); err == nil {
		t.Fatalf("ParseComplexity(%q) should reject invalid complexity", "unknown")
	}
}

func TestStatusTransitionValidation(t *testing.T) {
	t.Parallel()

	if err := ValidateStatusTransition(StatusPending, StatusInProgress); err != nil {
		t.Fatalf("ValidateStatusTransition(%q, %q) returned error: %v", StatusPending, StatusInProgress, err)
	}

	if err := ValidateStatusTransition(StatusDone, StatusInProgress); err == nil {
		t.Fatalf("ValidateStatusTransition(%q, %q) should reject transition", StatusDone, StatusInProgress)
	}
}

func TestTaskPathHelpers(t *testing.T) {
	t.Parallel()

	phase := ForPhase("P1")
	if !phase.IsPhase() || phase.Depth() != 1 {
		t.Fatalf("ForPhase(%q) should represent phase depth, got %d", "P1", phase.Depth())
	}

	milestone := phase.WithMilestone("M1")
	if !milestone.IsMilestone() || milestone.Milestone != "M1" {
		t.Fatalf("WithMilestone() did not build milestone path, got %q", milestone.FullID())
	}

	epic, err := milestone.WithEpic("E1")
	if err != nil {
		t.Fatalf("WithEpic() failed: %v", err)
	}
	if epic.Epic != "E1" {
		t.Fatalf("WithEpic() produced unexpected ID: %q", epic.FullID())
	}

	task, err := epic.WithTask("T001")
	if err != nil {
		t.Fatalf("WithTask() failed: %v", err)
	}
	if task.Task != "T001" || !task.IsTask() {
		t.Fatalf("WithTask() produced unexpected task path: %q", task.FullID())
	}

	if _, err := phase.WithEpic("E1"); err == nil {
		t.Fatalf("WithEpic() on phase should fail")
	}

	if _, err := milestone.WithTask("T001"); err == nil {
		t.Fatalf("WithTask() without epic should fail")
	}
}

func TestTaskTreeFindHelpers(t *testing.T) {
	t.Parallel()

	tree := TaskTree{
		Project: "Project",
		Phases: []Phase{
			{
				ID: "P1",
				Milestones: []Milestone{
					{
						ID: "P1.M1",
						Epics: []Epic{
							{
								ID: "P1.M1.E1",
								Tasks: []Task{
									{ID: "P1.M1.E1.T001"},
								},
							},
						},
					},
				},
			},
		},
		Bugs:  []Task{{ID: "B001"}},
		Ideas: []Task{{ID: "I001"}},
	}

	if got := tree.FindTask("P1.M1.E1.T001"); got == nil || got.ID != "P1.M1.E1.T001" {
		t.Fatalf("FindTask() with full ID did not locate task")
	}
	if got := tree.FindTask("T001"); got != nil {
		t.Fatalf("FindTask() with suffix ID should require full ID")
	}
	if got := tree.FindEpic("E1"); got == nil || got.ID != "P1.M1.E1" {
		t.Fatalf("FindEpic() with suffix ID did not locate epic")
	}
	if got := tree.FindMilestone("M1"); got == nil || got.ID != "P1.M1" {
		t.Fatalf("FindMilestone() with suffix ID did not locate milestone")
	}
	if got := tree.FindPhase("P1"); got == nil || got.ID != "P1" {
		t.Fatalf("FindPhase() did not locate phase")
	}

	all := tree.AllTasks()
	if len(all) != 3 {
		t.Fatalf("AllTasks() returned %d tasks, expected 3", len(all))
	}
}

func TestValidationHelpersAndTaskPathMethods(t *testing.T) {
	t.Parallel()

	if !IsValidStatus("pending") || IsValidStatus("bad") {
		t.Fatalf("IsValidStatus() validation mismatch")
	}
	if !IsValidPriority("high") || IsValidPriority("urgent") {
		t.Fatalf("IsValidPriority() validation mismatch")
	}
	if !IsValidComplexity("medium") || IsValidComplexity("insane") {
		t.Fatalf("IsValidComplexity() validation mismatch")
	}

	milestone := ForMilestone("P1", "M2")
	if milestone.FullID() != "P1.M2" || milestone.MilestoneID() != "P1.M2" {
		t.Fatalf("ForMilestone() produced unexpected IDs: %+v", milestone)
	}
	epic := ForEpic("P1", "M2", "E3")
	if !epic.IsEpic() || epic.EpicID() != "P1.M2.E3" {
		t.Fatalf("ForEpic() produced unexpected path: %+v", epic)
	}
	task := ForTask("P1", "M2", "E3", "T004")
	if !task.IsTask() || task.TaskID() != "P1.M2.E3.T004" {
		t.Fatalf("ForTask() produced unexpected path: %+v", task)
	}
	if task.String() != task.FullID() || task.PhaseID() != "P1" {
		t.Fatalf("task String()/PhaseID mismatch: %+v", task)
	}

	parent := task.Parent()
	if parent == nil || parent.FullID() != "P1.M2.E3" {
		t.Fatalf("Parent() = %+v, expected epic path", parent)
	}

	if next := NextEpicID([]string{"E1", "E3", "bad"}); next != "E4" {
		t.Fatalf("NextEpicID() = %q, expected E4", next)
	}
}

func TestPathQueryMatchingAndTaskHelpers(t *testing.T) {
	t.Parallel()

	query, err := ParsePathQuery("P1.M1.*")
	if err != nil {
		t.Fatalf("ParsePathQuery() = %v", err)
	}
	if !query.Matches("P1.M1.E2.T001") {
		t.Fatalf("expected query to match child path")
	}
	allQuery, err := ParsePathQuery("P1.**")
	if err != nil {
		t.Fatalf("ParsePathQuery() = %v", err)
	}
	if !allQuery.Matches("P1.M2.E1.T001") {
		t.Fatalf("expected recursive wildcard query to match descendant path")
	}
	if allQuery.Matches("P1") {
		t.Fatalf("expected recursive wildcard query not to match exact scope node")
	}
	if query.Matches("P2.M1.E2.T001") {
		t.Fatalf("query should not match wrong phase")
	}

	task := Task{ID: "P1.M1.E1.T001", Status: StatusPending}
	if !task.IsAvailable() {
		t.Fatalf("task should be available when pending and unclaimed")
	}
	task.ClaimedBy = "agent"
	if task.IsAvailable() {
		t.Fatalf("claimed task should not be available")
	}
	if _, err := task.TaskPath(); err != nil {
		t.Fatalf("TaskPath() = %v, expected success", err)
	}

	empty := Task{}
	if _, err := empty.TaskPath(); err == nil {
		t.Fatalf("TaskPath() expected error for empty ID")
	}
}
