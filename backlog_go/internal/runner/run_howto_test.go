package runner

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestRunHowtoOutputsGuide(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	output, err := runInDir(t, root, "howto")
	if err != nil {
		t.Fatalf("run howto = %v", err)
	}
	if !strings.Contains(output, "# Backlog How-To") {
		t.Fatalf("output = %q, expected backlog how-to header", output)
	}
	if !strings.Contains(output, "Core Work Loop") {
		t.Fatalf("output = %q, expected core work loop guidance", output)
	}
}

func TestRunHowtoJSON(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	output, err := runInDir(t, root, "howto", "--json")
	if err != nil {
		t.Fatalf("run howto --json = %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(output), &payload); err != nil {
		t.Fatalf("howto json parse: %v\noutput=%q", err, output)
	}
	if payload["name"] != "backlog-howto" {
		t.Fatalf("name = %#v, expected backlog-howto", payload["name"])
	}
	content, ok := payload["content"].(string)
	if !ok || !strings.Contains(content, "# Backlog How-To") {
		t.Fatalf("content = %#v, expected backlog how-to content", payload["content"])
	}
}
