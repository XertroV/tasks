package cmd

import (
	"strings"
	"testing"
)

func TestNewRootCommandDefaults(t *testing.T) {
	t.Parallel()

	command := NewRootCommand()
	if command == nil {
		t.Fatal("NewRootCommand() returned nil")
	}
	if command.name != "backlog" {
		t.Fatalf("name = %q, expected backlog", command.name)
	}
	if command.version != "0.1.0" {
		t.Fatalf("version = %q, expected 0.1.0", command.version)
	}
	if command.Name() != "backlog" {
		t.Fatalf("Name() = %q, expected backlog", command.Name())
	}
	if command.Version() != "0.1.0" {
		t.Fatalf("Version() = %q, expected 0.1.0", command.Version())
	}

	if command.Usage() == "" {
		t.Fatal("usage should not be empty")
	}

	if !command.IsKnownCommand("init") {
		t.Fatal("init should be known command")
	}

	if len(command.Commands()) == 0 {
		t.Fatal("commands should not be empty")
	}

	usage := command.Usage()
	if !strings.Contains(usage, "next") || !strings.Contains(usage, "Show next available task on critical path.") {
		t.Fatalf("usage %q missing command descriptions", usage)
	}
	if !strings.Contains(usage, "\n  howto") {
		t.Fatalf("usage %q missing howto command entry", usage)
	}
	commandsSection := strings.SplitN(usage, "Commands:\n", 2)
	if len(commandsSection) != 2 {
		t.Fatalf("usage %q missing commands section", usage)
	}
	firstCommandLine := strings.SplitN(commandsSection[1], "\n", 2)[0]
	if !strings.Contains(firstCommandLine, "howto") {
		t.Fatalf("first command line %q does not prioritize howto", firstCommandLine)
	}

	for _, name := range command.Commands() {
		desc := command.commandDescriptions[name]
		if strings.TrimSpace(desc) == "" {
			t.Fatalf("missing description for command %q", name)
		}
	}
}
