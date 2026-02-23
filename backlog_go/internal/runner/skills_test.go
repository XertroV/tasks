package runner

import (
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
)

func TestRunSkillsInstallBacklogHowtoWritesSkillFile(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	_, err := runInDir(t, root, "skills", "install", "backlog-howto", "--client=codex", "--artifact=skills")
	if err != nil {
		t.Fatalf("run skills install = %v", err)
	}

	content := readFile(t, filepath.Join(root, ".agents", "skills", "backlog-howto", "SKILL.md"))
	if !strings.Contains(content, "name: backlog-howto") {
		t.Fatalf("content missing skill name: %q", content)
	}
	if !strings.Contains(content, "Skill-Version:") {
		t.Fatalf("content missing skill version marker: %q", content)
	}
}

func TestRunSkillsInstallDefaultIncludesBacklogHowto(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	output, err := runInDir(
		t,
		root,
		"skills",
		"install",
		"--client=codex",
		"--artifact=skills",
		"--dry-run",
		"--json",
	)
	if err != nil {
		t.Fatalf("run skills install default --json = %v", err)
	}

	payload := map[string]any{}
	if err := json.Unmarshal([]byte(output), &payload); err != nil {
		t.Fatalf("failed to parse json: %v\n%s", err, output)
	}
	rawSkills, ok := payload["skills"].([]any)
	if !ok {
		t.Fatalf("skills key missing or invalid: %#v", payload["skills"])
	}
	found := false
	for _, item := range rawSkills {
		if value, ok := item.(string); ok && value == "backlog-howto" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("default skills should include backlog-howto, got %#v", rawSkills)
	}
}

func TestRunSkillsInstallBacklogHowtoCommandReferencesSourceAndVersion(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	_, err := runInDir(
		t,
		root,
		"skills",
		"install",
		"backlog-howto",
		"--client=opencode",
		"--artifact=commands",
	)
	if err != nil {
		t.Fatalf("run skills install command artifact = %v", err)
	}

	content := readFile(t, filepath.Join(root, ".opencode", "commands", "backlog-howto.md"))
	if !strings.Contains(content, "bl_skills/backlog-howto/SKILL.md") {
		t.Fatalf("command artifact missing source reference: %q", content)
	}
	if !strings.Contains(content, "Skill-Version:") {
		t.Fatalf("command artifact missing version reference: %q", content)
	}
}
