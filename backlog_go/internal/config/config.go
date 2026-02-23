package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

const (
	BacklogDir      = ".backlog"
	TasksDir        = ".tasks"
	ContextFileName = ".context.yaml"
	SessionsFileName = ".sessions.yaml"
	ConfigFileName   = "config.yaml"
)

// MissingDataDirError reports absence of an expected task data directory.
type MissingDataDirError struct {
	BaseDir string
}

func (e *MissingDataDirError) Error() string {
	if e == nil {
		return "data directory not found"
	}
	if e.BaseDir == "" {
		return "data directory not found"
	}
	return fmt.Sprintf("no data directory found from %s (.backlog/ or .tasks/)", e.BaseDir)
}

// DetectDataDir searches the working directory and nearby parents for a backlog
// data directory. It prefers .backlog over .tasks for compatibility with current
// project conventions.
func DetectDataDir() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	return DetectDataDirFrom(cwd)
}

// DetectDataDirFrom mirrors DetectDataDir but with a caller-supplied base path.
// Tests can use this to inspect parent traversal behavior.
func DetectDataDirFrom(basePath string) (string, error) {
	candidates := []string{
		filepath.Join(basePath, BacklogDir),
		filepath.Join(basePath, TasksDir),
		filepath.Join(filepath.Dir(basePath), BacklogDir),
		filepath.Join(filepath.Dir(basePath), TasksDir),
		filepath.Join(filepath.Dir(filepath.Dir(basePath)), BacklogDir),
	}
	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate, nil
		}
	}
	return "", &MissingDataDirError{BaseDir: basePath}
}

// MustDataDir wraps DetectDataDir and returns an empty string on failure.
func MustDataDir() string {
	dataDir, err := DetectDataDir()
	if err != nil {
		return ""
	}
	return dataDir
}

// DataDirFilePath formats a path under the provided data directory.
func DataDirFilePath(dataDir, fileName string) string {
	return filepath.Join(dataDir, fileName)
}

// ContextFilePath returns the absolute path to the active context file for a root.
func ContextFilePath(dataDir string) string {
	return DataDirFilePath(dataDir, ContextFileName)
}

// SessionsFilePath returns the absolute path to the active sessions file for a root.
func SessionsFilePath(dataDir string) string {
	return DataDirFilePath(dataDir, SessionsFileName)
}

// ValidateDataDir validates that dataDir is non-empty and exists.
func ValidateDataDir(dataDir string) error {
	if dataDir == "" {
		return errors.New("data directory must not be empty")
	}
	if _, err := os.Stat(dataDir); err != nil {
		return fmt.Errorf("data directory %s does not exist", dataDir)
	}
	return nil
}
