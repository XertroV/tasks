package commands

import "testing"

func TestCommandConstants(t *testing.T) {
	t.Parallel()

	cases := map[string]string{
		"Init":    CmdInit,
		"List":    CmdList,
		"Ls":      CmdLs,
		"Show":    CmdShow,
		"Add":     CmdAdd,
		"AddEpic": CmdAddEpic,
		"AddMilestone": CmdAddMilestone,
		"Grant":   CmdGrant,
		"Claim":   CmdClaim,
		"Done":    CmdDone,
		"Cycle":   CmdCycle,
		"Move":    CmdMove,
		"Unknown": "nonexistent",
	}

	for name, value := range cases {
		if value == "" && name != "Unknown" {
			t.Fatalf("%s should not be empty", name)
		}
	}

	if len(CmdMove) == 0 {
		t.Fatal("command names should not be empty")
	}
}
