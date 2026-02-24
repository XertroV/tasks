package context

import (
	"os"
	"time"

	"gopkg.in/yaml.v3"

	"github.com/XertroV/tasks/backlog_go/internal/config"
)

const (
	modeSingle   = "single"
	modeMulti    = "multi"
	modeSiblings = "siblings"
)

type Context struct {
	CurrentTask     string   `yaml:"current_task,omitempty"`
	PrimaryTask     string   `yaml:"primary_task,omitempty"`
	AdditionalTasks []string `yaml:"additional_tasks,omitempty"`
	SiblingTasks    []string `yaml:"sibling_tasks,omitempty"`
	Agent           string   `yaml:"agent,omitempty"`
	StartedAt       string   `yaml:"started_at,omitempty"`
	Mode            string   `yaml:"mode,omitempty"`
}

type SessionPayload struct {
	Agent         string `yaml:"agent"`
	TaskID        string `yaml:"task_id"`
	LastHeartbeat string `yaml:"last_heartbeat"`
	StartedAt     string `yaml:"started_at,omitempty"`
	Progress      string `yaml:"progress,omitempty"`
}

// LoadContext loads existing context from the active data root.
func LoadContext(dataDir string) (Context, error) {
	path := config.ContextFilePath(dataDir)
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return Context{}, nil
		}
		return Context{}, err
	}
	out := Context{}
	if err := yaml.Unmarshal(raw, &out); err != nil {
		return Context{}, err
	}
	return out, nil
}

// SaveContext persists context to the active data root.
func SaveContext(dataDir string, value Context) error {
	if err := config.ValidateDataDir(dataDir); err != nil {
		return err
	}
	payload, err := yaml.Marshal(value)
	if err != nil {
		return err
	}
	return os.WriteFile(config.ContextFilePath(dataDir), payload, 0o644)
}

// ClearContext removes the context file entirely.
func ClearContext(dataDir string) error {
	if err := os.Remove(config.ContextFilePath(dataDir)); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	return nil
}

// GetCurrentTask returns current task id from context, if available.
func GetCurrentTask(dataDir string) (string, error) {
	ctx, err := LoadContext(dataDir)
	if err != nil {
		return "", err
	}
	return ctx.CurrentTask, nil
}

// SetCurrentTask updates single-task context state.
func SetCurrentTask(dataDir string, taskID string, agent string) error {
	ctx := Context{
		CurrentTask: taskID,
		StartedAt:   time.Now().UTC().Format(time.RFC3339),
		Mode:        modeSingle,
	}
	if agent != "" {
		ctx.Agent = agent
	}
	return SaveContext(dataDir, ctx)
}

// SetMultiTaskContext stores a batch-work context.
func SetMultiTaskContext(dataDir string, agent string, primaryTaskID string, additionalTasks []string) error {
	ctx := Context{
		PrimaryTask:     primaryTaskID,
		AdditionalTasks: additionalTasks,
		Agent:           agent,
		StartedAt:       time.Now().UTC().Format(time.RFC3339),
		Mode:            modeMulti,
	}
	return SaveContext(dataDir, ctx)
}

// SetSiblingTaskContext stores sibling-task context for an agent.
func SetSiblingTaskContext(dataDir string, agent string, primaryTaskID string, siblings []string) error {
	ctx := Context{
		PrimaryTask:  primaryTaskID,
		SiblingTasks: siblings,
		Agent:        agent,
		StartedAt:    time.Now().UTC().Format(time.RFC3339),
		Mode:         modeSiblings,
	}
	return SaveContext(dataDir, ctx)
}

// LoadSessions loads raw sessions map entries. Kept intentionally generic.
func LoadSessions(dataDir string) (map[string]SessionPayload, error) {
	raw, err := os.ReadFile(config.SessionsFilePath(dataDir))
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]SessionPayload{}, nil
		}
		return nil, err
	}
	sessions := map[string]SessionPayload{}
	if err := yaml.Unmarshal(raw, &sessions); err != nil {
		return nil, err
	}
	return sessions, nil
}

// SaveSessions writes raw session map entries.
func SaveSessions(dataDir string, sessions map[string]SessionPayload) error {
	if err := config.ValidateDataDir(dataDir); err != nil {
		return err
	}
	payload, err := yaml.Marshal(sessions)
	if err != nil {
		return err
	}
	return os.WriteFile(config.SessionsFilePath(dataDir), payload, 0o644)
}
