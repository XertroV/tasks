package cmd

import "testing"

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

	if command.Usage() == "" {
		t.Fatal("usage should not be empty")
	}

	if !command.IsKnownCommand("init") {
		t.Fatal("init should be known command")
	}

	if len(command.Commands()) == 0 {
		t.Fatal("commands should not be empty")
	}
}
