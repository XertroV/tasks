package main

import (
	"os"

	"github.com/XertroV/tasks/backlog_go/internal/runner"
)

func main() {
	if err := runner.Run(os.Args[1:]...); err != nil {
		os.Stderr.WriteString(err.Error())
		os.Stderr.WriteString("\n")
		os.Exit(1)
	}
}
