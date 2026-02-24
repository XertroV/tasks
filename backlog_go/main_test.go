package main

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"
)

func TestMainPrintsUsage(t *testing.T) {
	t.Parallel()

	originalStdout := os.Stdout
	originalArgs := os.Args
	defer func() { os.Stdout = originalStdout }()
	defer func() { os.Args = originalArgs }()

	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("failed to create pipe: %v", err)
	}
	var out bytes.Buffer
	os.Stdout = w

	readDone := make(chan struct{})
	go func() {
		_, _ = io.Copy(&out, r)
		close(readDone)
	}()

	os.Args = []string{"backlog"}
	main()

	if err := w.Close(); err != nil {
		t.Fatalf("failed to close write side: %v", err)
	}
	<-readDone

	output := out.String()
	if !strings.Contains(output, "Usage: backlog <command> [options]") {
		t.Fatalf("output %q does not contain expected usage banner", strings.TrimSpace(output))
	}
}
