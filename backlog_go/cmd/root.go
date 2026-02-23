package cmd

import (
	"github.com/XertroV/tasks/backlog_go/internal/commands"

	"fmt"
	"sort"
)

// RootCommand captures shared CLI metadata and the supported command list.
type RootCommand struct {
	name     string
	version  string
	commands []string
}

func NewRootCommand() *RootCommand {
	commands := []string{
		commands.CmdAdmin,
		commands.CmdAdd,
		commands.CmdAddEpic,
		commands.CmdAddMilestone,
		commands.CmdAddPhase,
		commands.CmdBlockers,
		commands.CmdClaim,
		commands.CmdCycle,
		commands.CmdDash,
		commands.CmdDone,
		commands.CmdGrants,
		commands.CmdGrant,
		commands.CmdHelp,
		commands.CmdInit,
		commands.CmdList,
		commands.CmdLs,
		commands.CmdLog,
		commands.CmdMove,
		commands.CmdNext,
		commands.CmdPreview,
		commands.CmdReport,
		commands.CmdReportAlias,
		commands.CmdSearch,
		commands.CmdSet,
		commands.CmdShow,
		commands.CmdSprint,
		commands.CmdSync,
		commands.CmdTimeline,
		commands.CmdTimelineAlias,
		commands.CmdTree,
		commands.CmdUpdate,
		commands.CmdUndone,
		commands.CmdUnknown,
		commands.CmdVersion,
		commands.CmdWork,
		commands.CmdWhy,
	}
	sort.Strings(commands)

	return &RootCommand{
		name:     "backlog",
		version:  "0.1.0",
		commands: commands,
	}
}

func (r *RootCommand) Name() string {
	return r.name
}

func (r *RootCommand) Version() string {
	return r.version
}

func (r *RootCommand) Commands() []string {
	out := append([]string{}, r.commands...)
	sort.Strings(out)
	return out
}

func (r *RootCommand) IsKnownCommand(candidate string) bool {
	for _, command := range r.commands {
		if command == candidate {
			return true
		}
	}
	return false
}

func (r *RootCommand) Usage() string {
	return fmt.Sprintf(`Usage: %s <command> [options]

Commands:
  %s

Run '%s --help' for detailed usage on a command.`, r.name, joinCommands(r.commands), r.name)
}

func joinCommands(items []string) string {
	out := ""
	for idx, item := range items {
		if idx > 0 {
			out += ", "
		}
		out += item
	}
	return out
}
