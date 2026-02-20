package cmd

// TODO: implement Cobra/CLI command wiring.
// Planned command matrix lives under .backlog/01-go-implementation/P1.M3.
type RootCommand struct {
	name    string
	version string
}

func NewRootCommand() *RootCommand {
	return &RootCommand{
		name:    "backlog-go",
		version: "0.0.0",
	}
}

