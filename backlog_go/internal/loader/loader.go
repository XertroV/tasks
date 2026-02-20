package loader

import "github.com/XertroV/tasks/backlog_go/internal/models"

// Loader is a placeholder for .backlog/.tasks loading behavior.
type Loader struct{}

func New() *Loader { return &Loader{} }

func (l *Loader) LoadTree() (models.TaskTree, error) { return models.TaskTree{}, nil }
