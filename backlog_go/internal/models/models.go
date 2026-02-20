package models

// TODO: implement parity models for status/priority/complexity and hierarchy IDs.

type Status string

type Priority string

type Complexity string

const (
	StatusPending    Status = "pending"
	StatusInProgress Status = "in_progress"
	StatusBlocked    Status = "blocked"
	StatusDone       Status = "done"
)

const (
	PriorityLow      Priority = "low"
	PriorityMedium   Priority = "medium"
	PriorityHigh     Priority = "high"
	PriorityCritical Priority = "critical"
)

const (
	ComplexityLow      Complexity = "low"
	ComplexityMedium   Complexity = "medium"
	ComplexityHigh     Complexity = "high"
	ComplexityCritical Complexity = "critical"
)

// TaskPath models hierarchical IDs like P1, P1.M1, P1.M1.E1, P1.M1.E1.T001.
type TaskPath struct {
	PhaseID    string
	MilestoneID string
	EpicID     string
	TaskID     string
}

// TaskTree, Phase, Milestone, Epic, and Task structures are pending implementation.
type Task struct{}
type Epic struct{}
type Milestone struct{}
type Phase struct{}
type TaskTree struct{}
