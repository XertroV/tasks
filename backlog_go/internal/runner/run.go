package runner

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/XertroV/tasks/backlog_go/cmd"
	"github.com/XertroV/tasks/backlog_go/internal/commands"
	"github.com/XertroV/tasks/backlog_go/internal/config"
	taskcontext "github.com/XertroV/tasks/backlog_go/internal/context"
	"github.com/XertroV/tasks/backlog_go/internal/critical_path"
	"github.com/XertroV/tasks/backlog_go/internal/loader"
	"github.com/XertroV/tasks/backlog_go/internal/models"
	"github.com/XertroV/tasks/backlog_go/internal/skills"
	"gopkg.in/yaml.v3"
)

const (
	previewDisplayLimit      = 5
	previewAuxLimit          = 5
	previewBugFanoutCount    = 2
	grabSiblingAdditionalMax = 4
	grabBugAdditionalMax     = 2
)

const migrationComment = "<!-- CLI migrated: 'tasks' -> 'backlog' (alias 'bl' also works). -->\n"

var agentsSnippets = map[string]string{
	"short":  "# AGENTS.md (Short)\n\n# Work Loop & Task Backlog\n\n## Task Workflow\n- Use `backlog grab` to claim work, then `backlog done` or `backlog cycle`.\n- If a command fails to parse args/usage, run exactly one recovery command: `backlog cycle`.\n- For explicit task IDs, use `backlog claim <TASK_ID> [TASK_ID ...]`.\n- Prefer critical-path work, then `critical > high > medium > low` priority.\n- If blocked, run `backlog blocked --reason \"<why>\"` and handoff quickly.\n- Keep each change scoped to one task; update status as soon as state changes.\n- Before done: run targeted tests for changed code.\n- For more see `backlog --help`.\n",
	"medium": "# AGENTS.md (Medium)\n\n# Work Loop & Task Backlog\n\n## Defaults\n- Claim with `backlog grab` (or `backlog grab --single` for focused work).\n- Use `backlog claim <TASK_ID> [TASK_ID ...]` when task IDs are provided.\n- If command argument parsing fails, run `backlog cycle` once to recover.\n- CLI selection order is: critical-path first, then task priority.\n- Use `backlog work <id>` when switching context; use `backlog show` to review details.\n",
	"long":   "# AGENTS.md (Long)\n\n# Work Loop & Task Backlog\n\n## Operating Model\n- Default command: `backlog`. Use local `.backlog/` state as source of truth.\n- Selection strategy: critical-path first, then `critical > high > medium > low`.\n- Treat task files as contracts: requirements + acceptance criteria drive scope.\n",
}

var migrationKnownCommands = []string{
	"list",
	"ls",
	"show",
	"next",
	"claim",
	"grab",
	"done",
	"cycle",
	"work",
	"update",
	"sync",
	"check",
	"unclaim-stale",
	"add",
	"add-epic",
	"add-milestone",
	"add-phase",
	"move",
	"idea",
	"bug",
	"fixed",
	"blocked",
	"skip",
	"unclaim",
	"handoff",
	"why",
	"dash",
	"search",
	"blockers",
	"timeline",
	"tl",
	"session",
	"report",
	"data",
	"schema",
	"skills",
	"migrate",
}

type previewTaskPayload struct {
	ID             string   `json:"id"`
	Title          string   `json:"title"`
	Status         string   `json:"status"`
	File           string   `json:"file"`
	FileExists     bool     `json:"file_exists"`
	EstimateHours  float64  `json:"estimate_hours"`
	Complexity     string   `json:"complexity"`
	Priority       string   `json:"priority"`
	OnCritical     bool     `json:"on_critical_path"`
	GrabAdditional []string `json:"grab_additional"`
	Path           string   `json:"path,omitempty"`
}

type completionNotice struct {
	EpicCompleted      bool
	MilestoneCompleted bool
	PhaseCompleted     bool
}

type logEventPayload struct {
	TaskID    string    `json:"task_id"`
	Title     string    `json:"title"`
	Event     string    `json:"event"`
	Kind      string    `json:"kind"`
	Timestamp time.Time `json:"timestamp"`
	Actor     *string   `json:"actor"`
}

type logEvent struct {
	TaskID    string
	Title     string
	Event     string
	Timestamp time.Time
	Actor     *string
}

type treeTask struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Status      string     `json:"status"`
	File        string     `json:"file"`
	FileExists  bool       `json:"file_exists"`
	Estimate    float64    `json:"estimate_hours"`
	Complexity  string     `json:"complexity"`
	Priority    string     `json:"priority"`
	DependsOn   []string   `json:"depends_on"`
	ClaimedBy   *string    `json:"claimed_by"`
	ClaimedAt   *time.Time `json:"claimed_at"`
	StartedAt   *time.Time `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at"`
	OnCritical  bool       `json:"on_critical_path"`
	Path        string     `json:"path,omitempty"`
}

type treeEpicPayload struct {
	ID     string     `json:"id"`
	Name   string     `json:"name"`
	Status string     `json:"status"`
	Tasks  []treeTask `json:"tasks"`
}

type treeMilestonePayload struct {
	ID     string            `json:"id"`
	Name   string            `json:"name"`
	Status string            `json:"status"`
	Stats  map[string]int    `json:"stats"`
	Epics  []treeEpicPayload `json:"epics"`
}

type treePhasePayload struct {
	ID         string                 `json:"id"`
	Name       string                 `json:"name"`
	Status     string                 `json:"status"`
	Stats      map[string]int         `json:"stats"`
	Milestones []treeMilestonePayload `json:"milestones"`
}

type treePayload struct {
	CriticalPath     []string           `json:"critical_path"`
	NextAvailable    string             `json:"next_available"`
	MaxDepth         int                `json:"max_depth"`
	ShowDetails      bool               `json:"show_details"`
	UnfinishedOnly   bool               `json:"unfinished_only"`
	ShowCompletedAux bool               `json:"show_completed_aux"`
	Phases           []treePhasePayload `json:"phases"`
	Bugs             []treeTask         `json:"bugs"`
	Ideas            []treeTask         `json:"ideas"`
}

type reportProgressJSON struct {
	Overall struct {
		Total           int     `json:"total"`
		Done            int     `json:"done"`
		InProgress      int     `json:"in_progress"`
		Pending         int     `json:"pending"`
		Blocked         int     `json:"blocked"`
		PercentComplete float64 `json:"percent_complete"`
		RemainingHours  float64 `json:"remaining_hours"`
	} `json:"overall"`
	Auxiliary struct {
		Bugs struct {
			Total          int     `json:"total"`
			Done           int     `json:"done"`
			InProgress     int     `json:"in_progress"`
			Pending        int     `json:"pending"`
			Blocked        int     `json:"blocked"`
			RemainingHours float64 `json:"remaining_hours"`
		} `json:"bugs"`
		Ideas struct {
			Total          int     `json:"total"`
			Done           int     `json:"done"`
			InProgress     int     `json:"in_progress"`
			Pending        int     `json:"pending"`
			Blocked        int     `json:"blocked"`
			RemainingHours float64 `json:"remaining_hours"`
		} `json:"ideas"`
	} `json:"auxiliary"`
	Bugs   []treeTask `json:"bugs"`
	Ideas  []treeTask `json:"ideas"`
	Phases []struct {
		ID          string  `json:"id"`
		Name        string  `json:"name"`
		Total       int     `json:"total"`
		Done        int     `json:"done"`
		InProgress  int     `json:"in_progress"`
		Pending     int     `json:"pending"`
		Blocked     int     `json:"blocked"`
		PercentDone float64 `json:"percent_complete"`
		Remaining   float64 `json:"remaining_hours"`
		Milestones  []struct {
			ID         string  `json:"id"`
			Name       string  `json:"name"`
			Total      int     `json:"total"`
			Done       int     `json:"done"`
			InProgress int     `json:"in_progress"`
			Pending    int     `json:"pending"`
			Blocked    int     `json:"blocked"`
			Percent    float64 `json:"percent_complete"`
			Remaining  float64 `json:"remaining_hours"`
			Epics      []struct {
				ID         string  `json:"id"`
				Name       string  `json:"name"`
				Total      int     `json:"total"`
				Done       int     `json:"done"`
				InProgress int     `json:"in_progress"`
				Pending    int     `json:"pending"`
				Blocked    int     `json:"blocked"`
				Percent    float64 `json:"percent_complete"`
				Remaining  float64 `json:"remaining_hours"`
			} `json:"epics"`
		} `json:"milestones"`
	} `json:"phases"`
}

type dashCurrentTaskPayload struct {
	ID          string `json:"id"`
	Title       string `json:"title,omitempty"`
	Agent       string `json:"agent"`
	File        string `json:"file,omitempty"`
	FileExists  bool   `json:"file_exists"`
	Found       bool   `json:"found"`
	WorkingTask bool   `json:"working_task"`
}

type dashPhaseProgressPayload struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Done            int     `json:"done"`
	Total           int     `json:"total"`
	InProgress      int     `json:"in_progress"`
	Blocked         int     `json:"blocked"`
	PercentComplete float64 `json:"percent_complete"`
}

type dashCriticalPathPayload struct {
	Tasks          []string `json:"tasks"`
	RemainingCount int      `json:"remaining_count"`
	RemainingHours float64  `json:"remaining_hours"`
	AllComplete    bool     `json:"all_complete"`
	NextID         string   `json:"next_id,omitempty"`
	NextTitle      string   `json:"next_title,omitempty"`
}

type dashOverallPayload struct {
	Done       int     `json:"done"`
	Total      int     `json:"total"`
	InProgress int     `json:"in_progress"`
	Blocked    int     `json:"blocked"`
	Percent    float64 `json:"percent_complete"`
}

type dashStatusPayload struct {
	InProgress    int `json:"in_progress"`
	Blocked       int `json:"blocked"`
	StaleClaims   int `json:"stale_claims"`
	ActiveSession int `json:"active_sessions"`
}

type dashJSON struct {
	Agent           string                     `json:"agent"`
	CurrentTask     *dashCurrentTaskPayload    `json:"current_task"`
	Overall         dashOverallPayload         `json:"overall"`
	Phases          []dashPhaseProgressPayload `json:"phases"`
	CompletedPhases []string                   `json:"completed_phases"`
	CriticalPath    dashCriticalPathPayload    `json:"critical_path"`
	Status          dashStatusPayload          `json:"status"`
}

type adminJSONPayload struct {
	Command     string `json:"command"`
	Implemented bool   `json:"implemented"`
	Message     string `json:"message"`
	Guidance    string `json:"guidance"`
}

// Run executes the CLI entrypoint.
// Keeping behavior intentionally explicit and predictable for this milestone.
func Run(rawArgs ...string) error {
	if len(rawArgs) == 0 {
		rawArgs = os.Args[1:]
	}
	args := make([]string, len(rawArgs))
	copy(args, rawArgs)

	root := cmd.NewRootCommand()
	if len(args) == 0 {
		fmt.Println(root.Usage())
		return nil
	}
	if len(args) == 1 && (args[0] == "-h" || args[0] == "--help" || args[0] == commands.CmdHelp) {
		fmt.Println(root.Usage())
		return nil
	}
	if len(args) == 1 && (args[0] == "-v" || args[0] == "--version" || args[0] == commands.CmdVersion) {
		fmt.Printf("%s version %s\n", root.Name(), root.Version())
		return nil
	}

	command := normalizeCommand(args[0])
	payload := args[1:]

	if !root.IsKnownCommand(command) {
		return fmt.Errorf("unknown command: %s", command)
	}

	switch command {
	case commands.CmdInit:
		return runInit(payload)
	case commands.CmdLog:
		return runLog(payload)
	case commands.CmdTree:
		return runTree(payload)
	case commands.CmdDash:
		return runDash(payload)
	case commands.CmdAdd:
		return runAdd(payload)
	case commands.CmdAddEpic:
		return runAddEpic(payload)
	case commands.CmdAddMilestone:
		return runAddMilestone(payload)
	case commands.CmdAddPhase:
		return runAddPhase(payload)
	case commands.CmdList, commands.CmdLs:
		return runList(command, payload)
	case commands.CmdShow:
		return runShow(payload)
	case commands.CmdGrab:
		return runGrab(payload)
	case commands.CmdNext:
		return runNext(payload)
	case commands.CmdPreview:
		return runPreview(payload)
	case commands.CmdSkills:
		return runSkills(payload)
	case commands.CmdSearch:
		return runSearch(payload)
	case commands.CmdBlockers:
		return runBlockers(payload)
	case commands.CmdWhy:
		return runWhy(payload)
	case commands.CmdCheck:
		return runCheck(payload)
	case commands.CmdData:
		return runData(payload)
	case commands.CmdSchema:
		return runSchema(payload)
	case commands.CmdSession:
		return runSession(payload)
	case commands.CmdReport, commands.CmdReportAlias:
		return runReport(payload)
	case commands.CmdTimeline, commands.CmdTimelineAlias:
		return runTimeline(payload)
	case commands.CmdAdmin:
		return runAdmin(payload)
	case commands.CmdAgents:
		return runAgents(payload)
	case commands.CmdClaim:
		return runClaim(payload)
	case commands.CmdDone:
		return runDone(payload)
	case commands.CmdUnclaim:
		return runUnclaim(payload)
	case commands.CmdBlocked:
		return runBlocked(payload)
	case commands.CmdCycle:
		return runCycle(payload)
	case commands.CmdWork:
		return runWork(payload)
	case commands.CmdSkip:
		return runSkip(payload)
	case commands.CmdHandoff:
		return runHandoff(payload)
	case commands.CmdUnclaimStale:
		return runUnclaimStale(payload)
	case commands.CmdSet:
		return runSet(payload)
	case commands.CmdUpdate:
		return runUpdate(payload)
	case commands.CmdUndone:
		return runUndone(payload)
	case commands.CmdBenchmark:
		return runBenchmark(payload)
	case commands.CmdSync:
		return runSync()
	case commands.CmdMove:
		return runMove(payload)
	case commands.CmdLock:
		return runLock(payload, true)
	case commands.CmdUnlock:
		return runLock(payload, false)
	case commands.CmdIdea:
		return runIdea(payload)
	case commands.CmdBug:
		return runBug(payload)
	case commands.CmdFixed:
		return runFixed(payload)
	case commands.CmdMigrate:
		return runMigrate(payload)
	default:
		return fmt.Errorf("command not implemented: %s", command)
	}
}

func normalizeCommand(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

type initOptions struct {
	project       string
	description   string
	timelineWeeks int
}

func runInit(args []string) error {
	opts, err := parseInit(args)
	if err != nil {
		return err
	}
	if opts.project == "" {
		return errors.New("init requires --project")
	}

	if err := ensureBacklogDataAvailable(); err != nil {
		return err
	}
	indexPath := filepath.Join(config.BacklogDir, "index.yaml")
	if _, err := os.Stat(indexPath); err == nil {
		return errors.New("Already initialized (.backlog/index.yaml exists)")
	}
	if err := os.MkdirAll(filepath.Dir(indexPath), 0o755); err != nil {
		return fmt.Errorf("failed to create .backlog: %w", err)
	}
	content := fmt.Sprintf(
		`project: %q
description: %q
timeline_weeks: %d
phases: []
`,
		opts.project,
		opts.description,
		opts.timelineWeeks,
	)
	if err := os.WriteFile(indexPath, []byte(content), 0o644); err != nil {
		return fmt.Errorf("failed to write %s: %w", indexPath, err)
	}
	fmt.Printf("Initialized project %q in %s/\n", opts.project, filepath.Dir(indexPath))
	return nil
}

func runBenchmark(args []string) error {
	if err := validateAllowedFlags(
		args,
		map[string]bool{
			"--json":          true,
			"--top":           true,
			"--mode":          true,
			"--parse-body":    true,
			"--no-parse-body": true,
		},
	); err != nil {
		return err
	}

	rawMode := strings.TrimSpace(parseOption(args, "--mode"))
	mode := "full"
	if rawMode != "" {
		mode = rawMode
	}
	if mode != "full" && mode != "metadata" && mode != "index" {
		return fmt.Errorf("--mode must be one of: full, metadata, index")
	}

	parseTaskBody := true
	if parseFlag(args, "--no-parse-body") {
		parseTaskBody = false
	}
	if parseFlag(args, "--parse-body") {
		parseTaskBody = true
	}
	effectiveParseTaskBody := parseTaskBody && mode == "full"

	top, err := parseIntOptionWithDefault(args, 10, "--top")
	if err != nil {
		return err
	}
	if top <= 0 {
		return fmt.Errorf("--top must be a positive integer")
	}

	_, benchmark, err := loader.New().LoadWithBenchmark(mode, effectiveParseTaskBody, true, true)
	if err != nil {
		return err
	}

	taskTotal := benchmark.Counts["tasks"]
	missingTaskFiles := benchmark.MissingTaskFiles
	foundTaskFiles := taskTotal - missingTaskFiles
	indexParseMs := benchmark.IndexParseMs
	taskFrontmatterParseMs := benchmark.TaskFrontmatterParse
	taskBodyParseMs := benchmark.TaskBodyParse
	otherParseMs := benchmark.OverallMs - indexParseMs - taskFrontmatterParseMs - taskBodyParseMs
	if otherParseMs < 0 {
		otherParseMs = 0
	}

	slowestPhases := sortedTimings(benchmark.PhaseTimings, top)
	slowestMilestones := sortedTimings(benchmark.MilestoneTimings, top)
	slowestEpics := sortedTimings(benchmark.EpicTimings, top)

	totalFilesParsed := 0
	for _, count := range benchmark.Files {
		totalFilesParsed += count
	}

	if parseFlag(args, "--json") {
		output := map[string]interface{}{
			"overall_ms":                benchmark.OverallMs,
			"index_parse_ms":            indexParseMs,
			"task_frontmatter_parse_ms": taskFrontmatterParseMs,
			"task_body_parse_ms":        taskBodyParseMs,
			"files": map[string]interface{}{
				"total":      totalFilesParsed,
				"by_type":    benchmark.Files,
				"by_type_ms": benchmark.FilesByTypeMs,
			},
			"counts": map[string]int{
				"phases":     benchmark.Counts["phases"],
				"milestones": benchmark.Counts["milestones"],
				"epics":      benchmark.Counts["epics"],
				"tasks":      taskTotal,
			},
			"missing_task_files": benchmark.MissingTaskFiles,
			"phase_timings":      benchmark.PhaseTimings,
			"milestone_timings":  benchmark.MilestoneTimings,
			"epic_timings":       benchmark.EpicTimings,
			"task_timings":       benchmark.TaskTimings,
			"parse_mode":         mode,
			"parse_task_body":    effectiveParseTaskBody,
			"summary": map[string]interface{}{
				"overall_ms":                benchmark.OverallMs,
				"files_parsed":              totalFilesParsed,
				"task_files_total":          taskTotal,
				"task_files_found":          foundTaskFiles,
				"task_files_missing":        missingTaskFiles,
				"index_parse_ms":            indexParseMs,
				"task_frontmatter_parse_ms": taskFrontmatterParseMs,
				"task_body_parse_ms":        taskBodyParseMs,
				"task_parse_other_ms":       otherParseMs,
				"parse_mode":                mode,
				"parse_task_body":           effectiveParseTaskBody,
				"node_counts": map[string]int{
					"phases":     benchmark.Counts["phases"],
					"milestones": benchmark.Counts["milestones"],
					"epics":      benchmark.Counts["epics"],
				},
			},
			"slowest": map[string]interface{}{
				"phases":     slowestPhases,
				"milestones": slowestMilestones,
				"epics":      slowestEpics,
			},
		}
		raw, err := json.MarshalIndent(output, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	fmt.Println("\nTask Tree Benchmark")
	fmt.Printf("Overall parse time: %s\n", formatMs(benchmark.OverallMs))
	fmt.Printf("Parse mode: %s\n", mode)
	fmt.Printf("Task body parsing: %s\n", boolLabel(effectiveParseTaskBody, "enabled", "disabled"))
	fmt.Printf("Index parse time: %s\n", formatMs(indexParseMs))
	fmt.Printf("Task frontmatter parse time: %s\n", formatMs(taskFrontmatterParseMs))
	fmt.Printf("Task body parse time: %s\n", formatMs(taskBodyParseMs))
	fmt.Printf("Other parse time: %s\n", formatMs(otherParseMs))
	fmt.Printf("Total files parsed: %d\n", totalFilesParsed)
	fmt.Printf("Task files (leaves): %d (%d found, %d missing)\n", taskTotal, foundTaskFiles, missingTaskFiles)
	fmt.Printf("Phases parsed: %d\n", benchmark.Counts["phases"])
	fmt.Printf("Milestones parsed: %d\n", benchmark.Counts["milestones"])
	fmt.Printf("Epics parsed: %d\n", benchmark.Counts["epics"])
	fmt.Println("")

	fileTypes := make([]string, 0, len(benchmark.Files))
	for fileType := range benchmark.Files {
		fileTypes = append(fileTypes, fileType)
	}
	sort.Strings(fileTypes)
	if len(fileTypes) > 0 {
		fmt.Println("Files by type:")
		for _, fileType := range fileTypes {
			count := benchmark.Files[fileType]
			if count == 0 {
				continue
			}
			fileTypeMs := benchmark.FilesByTypeMs[fileType]
			fmt.Printf("  %s: %d files (%s)\n", fileType, count, formatMs(fileTypeMs))
		}
	}

	if len(slowestPhases) > 0 {
		fmt.Println("\nSlowest phases:")
		for _, item := range slowestPhases {
			fmt.Printf("  %s (%s): %s\n", asString(item["id"]), asString(item["path"]), formatMs(timingMS(item)))
		}
	}

	if len(slowestMilestones) > 0 {
		fmt.Println("\nSlowest milestones:")
		for _, item := range slowestMilestones {
			fmt.Printf("  %s (%s): %s\n", asString(item["id"]), asString(item["path"]), formatMs(timingMS(item)))
		}
	}

	if len(slowestEpics) > 0 {
		fmt.Println("\nSlowest epics:")
		for _, item := range slowestEpics {
			fmt.Printf("  %s (%s): %s\n", asString(item["id"]), asString(item["path"]), formatMs(timingMS(item)))
		}
	}

	return nil
}

func formatMs(ms float64) string {
	return fmt.Sprintf("%.2fms", ms)
}

func boolLabel(value bool, whenTrue, whenFalse string) string {
	if value {
		return whenTrue
	}
	return whenFalse
}

func timingMS(record map[string]any) float64 {
	raw, ok := record["ms"]
	if !ok {
		return 0
	}
	switch value := raw.(type) {
	case float64:
		return value
	case float32:
		return float64(value)
	case int:
		return float64(value)
	case int64:
		return float64(value)
	default:
		return 0
	}
}

func sortedTimings(items []map[string]any, top int) []map[string]any {
	out := make([]map[string]any, len(items))
	copy(out, items)
	sort.Slice(out, func(i, j int) bool {
		return timingMS(out[i]) > timingMS(out[j])
	})
	if top >= len(out) {
		return out
	}
	return out[:top]
}

func parseInit(args []string) (initOptions, error) {
	opts := initOptions{timelineWeeks: 0}
	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch arg {
		case "--project", "-p":
			if i+1 >= len(args) {
				return initOptions{}, errors.New("expected value for --project")
			}
			opts.project = args[i+1]
			i++
		case "--description", "-d":
			if i+1 >= len(args) {
				return initOptions{}, errors.New("expected value for --description")
			}
			opts.description = args[i+1]
			i++
		case "--timeline-weeks", "-w":
			if i+1 >= len(args) {
				return initOptions{}, errors.New("expected value for --timeline-weeks")
			}
			value, err := strconv.Atoi(args[i+1])
			if err != nil {
				return initOptions{}, errors.New("invalid --timeline-weeks value")
			}
			opts.timelineWeeks = value
			i++
		default:
			return initOptions{}, fmt.Errorf("invalid argument: %s", arg)
		}
	}
	return opts, nil
}

func runAdd(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	epicID := firstPositionalArg(args, map[string]bool{
		"--title":      true,
		"-T":           true,
		"--estimate":   true,
		"-e":           true,
		"--complexity": true,
		"-c":           true,
		"--priority":   true,
		"-p":           true,
		"--depends-on": true,
		"-d":           true,
		"--tags":       true,
		"-b":           true,
	})
	if epicID == "" {
		return errors.New("add requires EPIC_ID")
	}
	title := parseOption(args, "--title", "-T")
	if strings.TrimSpace(title) == "" {
		return errors.New("add requires --title")
	}
	estimate, err := parseFloatOptionWithDefault(args, 1, "--estimate", "-e")
	if err != nil {
		return err
	}
	complexity, err := parseComplexityOption(args, "--complexity", "-c")
	if err != nil {
		return err
	}
	priority, err := parsePriorityOption(args, "--priority", "-p")
	if err != nil {
		return err
	}
	dependsOn := parseCSV(parseOption(args, "--depends-on", "-d"))
	tags := parseCSV(parseOption(args, "--tags"))
	body := parseOption(args, "--body", "-b")

	parsedEpicID, err := models.ParseTaskPath(epicID)
	if err != nil || !parsedEpicID.IsEpic() {
		return fmt.Errorf("invalid epic id: %s", epicID)
	}

	l := loader.New()
	tree, err := l.Load("metadata", true, true)
	if err != nil {
		return err
	}

	epic := tree.FindEpic(parsedEpicID.FullID())
	if epic == nil {
		return fmt.Errorf("Epic not found: %s", parsedEpicID.FullID())
	}

	phase := tree.FindPhase(parsedEpicID.PhaseID())
	if phase == nil {
		return fmt.Errorf("Epic not found: %s", parsedEpicID.FullID())
	}
	milestone := tree.FindMilestone(parsedEpicID.MilestoneID())
	if milestone == nil {
		return fmt.Errorf("Epic not found: %s", parsedEpicID.FullID())
	}
	if phase.Locked {
		return fmt.Errorf(
			"Phase %s has been closed and cannot accept new tasks. The agent should create a new epic.",
			phase.ID,
		)
	}
	if milestone.Locked {
		return fmt.Errorf(
			"Milestone %s has been closed and cannot accept new tasks. The agent should create a new epic.",
			milestone.ID,
		)
	}
	if epic.Locked {
		return fmt.Errorf(
			"Epic %s has been closed and cannot accept new tasks. The agent should create a new epic.",
			epic.ID,
		)
	}

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	shortTaskIDs := make([]string, 0, len(epic.Tasks))
	for _, task := range epic.Tasks {
		shortTaskIDs = append(shortTaskIDs, strings.TrimPrefix(task.ID, parsedEpicID.FullID()+"."))
	}
	nextTaskID := models.NextTaskID(shortTaskIDs)

	epicDir := filepath.Join(dataDir, phase.Path, milestone.Path, epic.Path)
	if err := os.MkdirAll(epicDir, 0o755); err != nil {
		return fmt.Errorf("failed to create epic directory: %w", err)
	}
	slug := models.Slugify(title, models.DirectoryNameWidth*15)
	taskFile := fmt.Sprintf("%s-%s.todo", nextTaskID, slug)
	taskPath := filepath.Join(epicDir, taskFile)

	frontmatter := map[string]any{
		"id":             parsedEpicID.FullID() + "." + nextTaskID,
		"title":          title,
		"status":         string(models.StatusPending),
		"estimate_hours": estimate,
		"complexity":     complexity,
		"priority":       priority,
		"depends_on":     dependsOn,
		"tags":           tags,
	}
	bodyText := body
	if bodyText == "" {
		bodyText = fmt.Sprintf(
			"\n# %s\n\n## Requirements\n\n- TODO: Add requirements\n\n## Acceptance Criteria\n\n- TODO: Add acceptance criteria\n",
			title,
		)
	}
	payload, err := yaml.Marshal(frontmatter)
	if err != nil {
		return fmt.Errorf("failed to build task frontmatter: %w", err)
	}
	content := fmt.Sprintf("---\n%s---\n%s", string(payload), bodyText)
	if err := os.WriteFile(taskPath, []byte(content), 0o644); err != nil {
		return fmt.Errorf("failed to write %s: %w", taskPath, err)
	}

	epicIndexPath := filepath.Join(epicDir, "index.yaml")
	epicIndex, err := readYAMLMapFile(epicIndexPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	if epicIndex == nil {
		epicIndex = map[string]interface{}{
			"tasks": []map[string]interface{}{},
		}
	}
	appendToList(epicIndex, "tasks", map[string]interface{}{
		"id":             nextTaskID,
		"file":           taskFile,
		"title":          title,
		"status":         string(models.StatusPending),
		"estimate_hours": estimate,
		"complexity":     complexity,
		"priority":       priority,
		"depends_on":     dependsOn,
	})
	if err := writeYAMLMapFile(epicIndexPath, epicIndex); err != nil {
		return err
	}

	fmt.Printf("Created task: %s\n", parsedEpicID.FullID()+"."+nextTaskID)
	if body == "" {
		fmt.Println("IMPORTANT: You MUST fill in the .todo file that was created.")
	}
	return nil
}

func runAddEpic(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	milestoneID := firstPositionalArg(args, map[string]bool{
		"--title":       true,
		"-T":            true,
		"--name":        true,
		"-n":            true,
		"--estimate":    true,
		"-e":            true,
		"--complexity":  true,
		"-c":            true,
		"--depends-on":  true,
		"-d":            true,
		"--description": true,
	})
	if milestoneID == "" {
		return errors.New("add-epic requires MILESTONE_ID")
	}
	title := parseOption(args, "--title", "-T", "--name", "-n")
	if strings.TrimSpace(title) == "" {
		return errors.New("add-epic requires --title")
	}
	estimate, err := parseFloatOptionWithDefault(args, 4, "--estimate", "-e")
	if err != nil {
		return err
	}
	complexity, err := parseComplexityOption(args, "--complexity", "-c")
	if err != nil {
		return err
	}
	dependsOn := parseCSV(parseOption(args, "--depends-on", "-d"))
	description := parseOption(args, "--description")

	parsedMilestoneID, err := models.ParseTaskPath(milestoneID)
	if err != nil || !parsedMilestoneID.IsMilestone() {
		return fmt.Errorf("invalid milestone id: %s", milestoneID)
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	milestone := tree.FindMilestone(parsedMilestoneID.FullID())
	if milestone == nil {
		return fmt.Errorf("Milestone not found: %s", parsedMilestoneID.FullID())
	}
	phase := tree.FindPhase(parsedMilestoneID.PhaseID())
	if phase == nil {
		return fmt.Errorf("Milestone not found: %s", parsedMilestoneID.FullID())
	}
	if phase.Locked {
		return fmt.Errorf(
			"Phase %s has been closed and cannot accept new epics. Create a new phase.",
			phase.ID,
		)
	}
	if milestone.Locked {
		return fmt.Errorf(
			"Milestone %s has been closed and cannot accept new epics. The agent should create a new epic.",
			milestone.ID,
		)
	}

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	existingEpicIDs := make([]string, 0, len(milestone.Epics))
	for _, epicRef := range milestone.Epics {
		short := strings.TrimPrefix(epicRef.ID, parsedMilestoneID.FullID()+".")
		if short == epicRef.ID {
			short = epicRef.ID
		}
		existingEpicIDs = append(existingEpicIDs, short)
	}
	nextEpicID := models.NextEpicID(existingEpicIDs)
	nextEpicNumber := idSuffixNumber(nextEpicID, "E")
	dirName := fmt.Sprintf("%02d-%s", nextEpicNumber, models.Slugify(title, models.DirectoryNameWidth*15))
	epicDir := filepath.Join(dataDir, phase.Path, milestone.Path, dirName)
	if err := os.MkdirAll(epicDir, 0o755); err != nil {
		return fmt.Errorf("failed to create epic directory: %w", err)
	}

	epicIndexPath := filepath.Join(epicDir, "index.yaml")
	epicData := map[string]any{
		"id":             fmt.Sprintf("%s.%s", parsedMilestoneID.FullID(), nextEpicID),
		"name":           title,
		"status":         string(models.StatusPending),
		"locked":         false,
		"estimate_hours": estimate,
		"complexity":     complexity,
		"depends_on":     dependsOn,
		"tasks":          []any{},
	}
	if err := writeYAMLMapFile(epicIndexPath, epicData); err != nil {
		return err
	}

	milestoneIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path, "index.yaml")
	milestoneIndex, err := readYAMLMapFile(milestoneIndexPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	if milestoneIndex == nil {
		milestoneIndex = map[string]interface{}{}
	}
	appendToList(milestoneIndex, "epics", map[string]interface{}{
		"id":             nextEpicID,
		"name":           title,
		"path":           dirName,
		"status":         string(models.StatusPending),
		"locked":         false,
		"estimate_hours": estimate,
		"complexity":     complexity,
		"depends_on":     dependsOn,
		"description":    description,
	})
	if err := writeYAMLMapFile(milestoneIndexPath, milestoneIndex); err != nil {
		return err
	}

	fmt.Printf("Created epic: %s\n", parsedMilestoneID.FullID()+"."+nextEpicID)
	return nil
}

func runAddMilestone(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	phaseID := firstPositionalArg(args, map[string]bool{
		"--title":       true,
		"-T":            true,
		"--name":        true,
		"-n":            true,
		"--estimate":    true,
		"-e":            true,
		"--complexity":  true,
		"-c":            true,
		"--depends-on":  true,
		"-d":            true,
		"--description": true,
	})
	if phaseID == "" {
		return errors.New("add-milestone requires PHASE_ID")
	}
	title := parseOption(args, "--title", "-T", "--name", "-n")
	if strings.TrimSpace(title) == "" {
		return errors.New("add-milestone requires --title")
	}
	estimate, err := parseFloatOptionWithDefault(args, 8, "--estimate", "-e")
	if err != nil {
		return err
	}
	complexity, err := parseComplexityOption(args, "--complexity", "-c")
	if err != nil {
		return err
	}
	dependsOn := parseCSV(parseOption(args, "--depends-on", "-d"))
	description := parseOption(args, "--description")

	parsedPhaseID, err := models.ParseTaskPath(phaseID)
	if err != nil || !parsedPhaseID.IsPhase() {
		return fmt.Errorf("invalid phase id: %s", phaseID)
	}
	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	phase := tree.FindPhase(parsedPhaseID.FullID())
	if phase == nil {
		return fmt.Errorf("Phase not found: %s", parsedPhaseID.FullID())
	}
	if phase.Locked {
		return fmt.Errorf("Phase %s has been closed and cannot accept new milestones. Create a new phase.", phase.ID)
	}

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	existingMilestoneIDs := make([]string, 0, len(phase.Milestones))
	for _, milestoneRef := range phase.Milestones {
		short := strings.TrimPrefix(milestoneRef.ID, parsedPhaseID.FullID()+".")
		if short == milestoneRef.ID {
			short = milestoneRef.ID
		}
		existingMilestoneIDs = append(existingMilestoneIDs, short)
	}
	nextMilestoneID := models.NextMilestoneID(existingMilestoneIDs)
	nextMilestoneNumber := idSuffixNumber(nextMilestoneID, "M")
	dirName := fmt.Sprintf("%02d-%s", nextMilestoneNumber, models.Slugify(title, models.DirectoryNameWidth*15))
	msDir := filepath.Join(dataDir, phase.Path, dirName)
	if err := os.MkdirAll(msDir, 0o755); err != nil {
		return fmt.Errorf("failed to create milestone directory: %w", err)
	}

	msIndexPath := filepath.Join(msDir, "index.yaml")
	msIndex := map[string]any{
		"id":             fmt.Sprintf("%s.%s", phase.ID, nextMilestoneID),
		"name":           title,
		"status":         string(models.StatusPending),
		"locked":         false,
		"estimate_hours": estimate,
		"complexity":     complexity,
		"depends_on":     dependsOn,
		"epics":          []any{},
	}
	if err := writeYAMLMapFile(msIndexPath, msIndex); err != nil {
		return err
	}

	phaseIndexPath := filepath.Join(dataDir, phase.Path, "index.yaml")
	phaseIndex, err := readYAMLMapFile(phaseIndexPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	if phaseIndex == nil {
		phaseIndex = map[string]interface{}{}
	}
	appendToList(phaseIndex, "milestones", map[string]interface{}{
		"id":             nextMilestoneID,
		"name":           title,
		"path":           dirName,
		"status":         string(models.StatusPending),
		"locked":         false,
		"estimate_hours": estimate,
		"complexity":     complexity,
		"depends_on":     dependsOn,
		"description":    description,
	})
	if err := writeYAMLMapFile(phaseIndexPath, phaseIndex); err != nil {
		return err
	}

	fmt.Printf("Created milestone: %s\n", fmt.Sprintf("%s.%s", phase.ID, nextMilestoneID))
	return nil
}

func runAddPhase(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	title := parseOption(args, "--title", "-T", "--name", "-n")
	if strings.TrimSpace(title) == "" {
		return errors.New("add-phase requires --title")
	}
	weeks, err := parseIntOptionWithDefault(args, 2, "--weeks", "-w")
	if err != nil {
		return err
	}
	estimate, err := parseFloatOptionWithDefault(args, 40, "--estimate", "-e")
	if err != nil {
		return err
	}
	priority, err := parsePriorityOption(args, "--priority", "-p")
	if err != nil {
		return err
	}
	dependsOn := parseCSV(parseOption(args, "--depends-on", "-d"))
	description := parseOption(args, "--description")

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	rootIndexPath := filepath.Join(dataDir, "index.yaml")
	rootIndex, err := readYAMLMapFile(rootIndexPath)
	if err != nil {
		return err
	}

	phaseIDs := []string{}
	phases, _ := rootIndex["phases"].([]interface{})
	for _, raw := range phases {
		entry, ok := raw.(map[string]interface{})
		if !ok {
			continue
		}
		idValue, ok := entry["id"].(string)
		if !ok || strings.TrimSpace(idValue) == "" {
			continue
		}
		phaseIDs = append(phaseIDs, idValue)
	}
	nextPhaseID := models.NextPhaseID(phaseIDs)
	nextPhaseNumber := idSuffixNumber(nextPhaseID, "P")
	phaseDirName := fmt.Sprintf("%s-%s", models.NumberedDirectoryName(nextPhaseNumber), models.Slugify(title, models.DirectoryNameWidth*15))
	phaseDir := filepath.Join(dataDir, phaseDirName)
	if err := os.MkdirAll(phaseDir, 0o755); err != nil {
		return fmt.Errorf("failed to create phase directory: %w", err)
	}

	phaseIndexPath := filepath.Join(phaseDir, "index.yaml")
	phaseIndexData := map[string]any{
		"id":             nextPhaseID,
		"name":           title,
		"status":         string(models.StatusPending),
		"locked":         false,
		"weeks":          weeks,
		"estimate_hours": estimate,
		"complexity":     "medium",
		"depends_on":     dependsOn,
		"milestones":     []any{},
	}
	if err := writeYAMLMapFile(phaseIndexPath, phaseIndexData); err != nil {
		return err
	}

	appendToList(rootIndex, "phases", map[string]interface{}{
		"id":             nextPhaseID,
		"name":           title,
		"path":           phaseDirName,
		"status":         string(models.StatusPending),
		"weeks":          weeks,
		"estimate_hours": estimate,
		"priority":       priority,
		"depends_on":     dependsOn,
		"description":    description,
		"locked":         false,
	})
	if err := writeYAMLMapFile(rootIndexPath, rootIndex); err != nil {
		return err
	}
	fmt.Printf("Created phase: %s\n", nextPhaseID)
	return nil
}

func runSet(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}

	taskID := firstPositionalArg(args, map[string]bool{})
	if taskID == "" {
		return errors.New("set requires TASK_ID")
	}
	if err := validateTaskID(taskID); err != nil {
		return err
	}

	statusRaw, hasStatus := parseOptionWithPresence(args, "--status")
	priorityRaw, hasPriority := parseOptionWithPresence(args, "--priority")
	complexityRaw, hasComplexity := parseOptionWithPresence(args, "--complexity")
	estimateRaw, hasEstimate := parseOptionWithPresence(args, "--estimate")
	title, hasTitle := parseOptionWithPresence(args, "--title")
	dependsOnRaw, hasDependsOn := parseOptionWithPresence(args, "--depends-on")
	tagsRaw, hasTags := parseOptionWithPresence(args, "--tags")
	reason := parseOption(args, "--reason")

	hasAny := hasStatus || hasPriority || hasComplexity || hasEstimate || hasTitle || hasDependsOn || hasTags
	if !hasAny {
		return errors.New("set requires at least one property flag")
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	task := tree.FindTask(taskID)
	if task == nil {
		return fmt.Errorf("Task not found: %s", taskID)
	}

	if hasPriority {
		priority, err := models.ParsePriority(priorityRaw)
		if err != nil {
			return err
		}
		task.Priority = priority
	}
	if hasComplexity {
		complexity, err := models.ParseComplexity(complexityRaw)
		if err != nil {
			return err
		}
		task.Complexity = complexity
	}
	if hasEstimate {
		raw, err := strconv.ParseFloat(estimateRaw, 64)
		if err != nil {
			return fmt.Errorf("invalid --estimate: %s", estimateRaw)
		}
		task.EstimateHours = raw
	}
	if hasTitle {
		task.Title = title
	}
	if hasDependsOn {
		task.DependsOn = parseCSV(dependsOnRaw)
	}
	if hasTags {
		task.Tags = parseCSV(tagsRaw)
	}
	if hasStatus {
		next, err := models.ParseStatus(statusRaw)
		if err != nil {
			return err
		}
		if err := applyTaskStatusTransition(task, next, reason); err != nil {
			return err
		}
	}

	if err := saveTaskState(*task, tree); err != nil {
		return err
	}
	fmt.Printf("Updated: %s\n", task.ID)
	return nil
}

func runUpdate(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	pos := []string{}
	for _, arg := range args {
		if strings.HasPrefix(arg, "-") {
			continue
		}
		pos = append(pos, arg)
	}
	if len(pos) == 0 {
		return errors.New("update requires TASK_ID")
	}
	if len(pos) == 1 {
		return errors.New("update requires TASK_ID STATUS")
	}
	taskID := pos[0]
	rawStatus := pos[1]
	reason := parseOption(args, "--reason")

	if err := validateTaskID(taskID); err != nil {
		return err
	}
	nextStatus, err := models.ParseStatus(rawStatus)
	if err != nil {
		return err
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	task := tree.FindTask(taskID)
	if task == nil {
		return fmt.Errorf("Task not found: %s", taskID)
	}
	if err := applyTaskStatusTransition(task, nextStatus, reason); err != nil {
		return err
	}
	if err := saveTaskState(*task, tree); err != nil {
		return err
	}
	fmt.Printf("Updated: %s -> %s\n", task.ID, task.Status)
	return nil
}

func runUndone(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	itemID := firstPositionalArg(args, map[string]bool{})
	if itemID == "" {
		return errors.New("undone requires ITEM_ID")
	}
	if err := validateTaskID(itemID); err != nil {
		return err
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}

	if task := tree.FindTask(itemID); task != nil {
		resetTaskToPending(task)
		if err := saveTaskState(*task, tree); err != nil {
			return err
		}
		fmt.Printf("Marked not done: %s\n", task.ID)
		fmt.Printf("Reset tasks: 1\n")
		return nil
	}

	path, err := models.ParseTaskPath(itemID)
	if err != nil {
		return errors.New("undone supports only task, phase, milestone, or epic IDs")
	}

	switch path.Depth() {
	case 1:
		return setPhaseNotDone(path, tree)
	case 2:
		return setMilestoneNotDone(path, tree)
	case 3:
		return setEpicNotDone(path, tree)
	default:
		return errors.New("undone supports only task, phase, milestone, or epic IDs")
	}
}

func resetTaskToPending(task *models.Task) {
	task.Status = models.StatusPending
	task.ClaimedBy = ""
	task.ClaimedAt = nil
	task.StartedAt = nil
	task.CompletedAt = nil
	task.DurationMinutes = nil
	task.Reason = ""
}

func setPhaseNotDone(path models.TaskPath, tree models.TaskTree) error {
	phase := tree.FindPhase(path.FullID())
	if phase == nil {
		return fmt.Errorf("Phase not found: %s", path.FullID())
	}
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}

	rootPath := filepath.Join(dataDir, "index.yaml")
	rootIndex, err := readYAMLMapFile(rootPath)
	if err != nil {
		return err
	}
	phases, ok := rootIndex["phases"].([]interface{})
	if ok {
		for _, entryRaw := range phases {
			entry, ok := entryRaw.(map[string]interface{})
			if !ok {
				continue
			}
			idValue := asString(entry["id"])
			if idValue == phase.ID {
				entry["status"] = string(models.StatusPending)
				break
			}
		}
	}
	if err := writeYAMLMapFile(rootPath, rootIndex); err != nil {
		return err
	}

	phaseIndexPath := filepath.Join(dataDir, phase.Path, "index.yaml")
	phaseIndex, err := readYAMLMapFile(phaseIndexPath)
	if err != nil {
		return err
	}
	phaseIndex["status"] = string(models.StatusPending)
	if milestoneEntries, ok := phaseIndex["milestones"].([]interface{}); ok {
		for _, raw := range milestoneEntries {
			msEntry, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			msEntry["status"] = string(models.StatusPending)
		}
	}
	if err := writeYAMLMapFile(phaseIndexPath, phaseIndex); err != nil {
		return err
	}

	resetCount := 0
	for _, milestone := range phase.Milestones {
		milestoneIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path, "index.yaml")
		milestoneIndex, err := readYAMLMapFile(milestoneIndexPath)
		if err != nil {
			return err
		}
		milestoneIndex["status"] = string(models.StatusPending)
		if err := writeYAMLMapFile(milestoneIndexPath, milestoneIndex); err != nil {
			return err
		}
		milestoneEntry, ok := milestoneIndex["epics"].([]interface{})
		if ok {
			for _, raw := range milestoneEntry {
				epicEntry, ok := raw.(map[string]interface{})
				if !ok {
					continue
				}
				epicEntry["status"] = string(models.StatusPending)
			}
		}
		epicIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path)
		for _, epic := range milestone.Epics {
			epicIndex, err := readYAMLMapFile(filepath.Join(epicIndexPath, epic.Path, "index.yaml"))
			if err != nil {
				return err
			}
			epicIndex["status"] = string(models.StatusPending)
			if err := writeYAMLMapFile(filepath.Join(epicIndexPath, epic.Path, "index.yaml"), epicIndex); err != nil {
				return err
			}
			for i := range epic.Tasks {
				task := &epic.Tasks[i]
				resetTaskToPending(task)
				if err := saveTaskState(*task, tree); err != nil {
					return err
				}
				resetCount++
			}
		}
	}
	fmt.Printf("Marked not done: %s\n", path.FullID())
	fmt.Printf("Reset tasks: %d\n", resetCount)
	return nil
}

func setMilestoneNotDone(path models.TaskPath, tree models.TaskTree) error {
	milestone := tree.FindMilestone(path.FullID())
	if milestone == nil {
		return fmt.Errorf("Milestone not found: %s", path.FullID())
	}
	phase := tree.FindPhase(path.Phase)
	if phase == nil {
		return fmt.Errorf("Phase not found: %s", path.Phase)
	}
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	phaseIndexPath := filepath.Join(dataDir, phase.Path, "index.yaml")
	phaseIndex, err := readYAMLMapFile(phaseIndexPath)
	if err != nil {
		return err
	}
	if entries, ok := phaseIndex["milestones"].([]interface{}); ok {
		for _, raw := range entries {
			entry, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			if asString(entry["id"]) == path.Milestone {
				entry["status"] = string(models.StatusPending)
				break
			}
		}
	}
	if err := writeYAMLMapFile(phaseIndexPath, phaseIndex); err != nil {
		return err
	}

	milestoneIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path, "index.yaml")
	milestoneIndex, err := readYAMLMapFile(milestoneIndexPath)
	if err != nil {
		return err
	}
	milestoneIndex["status"] = string(models.StatusPending)
	entries, ok := milestoneIndex["epics"].([]interface{})
	if ok {
		for _, raw := range entries {
			if entry, ok := raw.(map[string]interface{}); ok {
				entry["status"] = string(models.StatusPending)
			}
		}
	}
	if err := writeYAMLMapFile(milestoneIndexPath, milestoneIndex); err != nil {
		return err
	}

	resetCount := 0
	for _, epic := range milestone.Epics {
		epicIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path, epic.Path, "index.yaml")
		epicIndex, err := readYAMLMapFile(epicIndexPath)
		if err != nil {
			return err
		}
		epicIndex["status"] = string(models.StatusPending)
		if err := writeYAMLMapFile(epicIndexPath, epicIndex); err != nil {
			return err
		}
		for i := range epic.Tasks {
			task := &epic.Tasks[i]
			resetTaskToPending(task)
			if err := saveTaskState(*task, tree); err != nil {
				return err
			}
			resetCount++
		}
	}
	fmt.Printf("Marked not done: %s\n", path.FullID())
	fmt.Printf("Reset tasks: %d\n", resetCount)
	return nil
}

func setEpicNotDone(path models.TaskPath, tree models.TaskTree) error {
	epic := tree.FindEpic(path.FullID())
	if epic == nil {
		return fmt.Errorf("Epic not found: %s", path.FullID())
	}
	phase := tree.FindPhase(path.Phase)
	if phase == nil {
		return fmt.Errorf("Phase not found: %s", path.Phase)
	}
	milestone := tree.FindMilestone(path.MilestoneID())
	if milestone == nil {
		return fmt.Errorf("Milestone not found: %s", path.MilestoneID())
	}

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	milestoneIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path, "index.yaml")
	milestoneIndex, err := readYAMLMapFile(milestoneIndexPath)
	if err != nil {
		return err
	}
	if entries, ok := milestoneIndex["epics"].([]interface{}); ok {
		for _, raw := range entries {
			entry, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			if asString(entry["id"]) == path.Epic {
				entry["status"] = string(models.StatusPending)
				break
			}
		}
	}
	if err := writeYAMLMapFile(milestoneIndexPath, milestoneIndex); err != nil {
		return err
	}

	epicIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path, epic.Path, "index.yaml")
	epicIndex, err := readYAMLMapFile(epicIndexPath)
	if err != nil {
		return err
	}
	epicIndex["status"] = string(models.StatusPending)
	if err := writeYAMLMapFile(epicIndexPath, epicIndex); err != nil {
		return err
	}

	for i := range epic.Tasks {
		task := &epic.Tasks[i]
		resetTaskToPending(task)
		if err := saveTaskState(*task, tree); err != nil {
			return err
		}
	}
	fmt.Printf("Marked not done: %s\n", path.FullID())
	fmt.Printf("Reset tasks: %d\n", len(epic.Tasks))
	return nil
}

func applyTaskStatusTransition(task *models.Task, nextStatus models.Status, reason string) error {
	if err := models.ValidateStatusTransition(task.Status, nextStatus); err != nil {
		return err
	}

	switch nextStatus {
	case models.StatusBlocked, models.StatusRejected, models.StatusCancelled:
		if reason == "" {
			return fmt.Errorf("reason required when marking task %s as %s", task.ID, nextStatus)
		}
		task.Reason = reason
	case models.StatusPending:
		task.ClaimedBy = ""
		task.ClaimedAt = nil
		task.Reason = ""
	default:
		task.Reason = ""
	}

	task.Status = nextStatus

	if nextStatus == models.StatusDone && task.CompletedAt == nil {
		now := time.Now().UTC()
		task.CompletedAt = &now
	}

	return nil
}

func saveTaskState(task models.Task, tree models.TaskTree) error {
	if task.File == "" {
		return fmt.Errorf("Task %s has no file path", task.ID)
	}
	taskPath, err := resolveTaskFilePath(task.File)
	if err != nil {
		return err
	}

	frontmatter, body, err := readTodoFrontmatter(task.ID, taskPath)
	if err != nil {
		return err
	}
	frontmatter["title"] = task.Title
	frontmatter["status"] = string(task.Status)
	frontmatter["estimate_hours"] = task.EstimateHours
	frontmatter["complexity"] = string(task.Complexity)
	frontmatter["priority"] = string(task.Priority)
	frontmatter["depends_on"] = task.DependsOn
	frontmatter["tags"] = task.Tags
	if strings.TrimSpace(task.ClaimedBy) != "" {
		frontmatter["claimed_by"] = task.ClaimedBy
	} else {
		delete(frontmatter, "claimed_by")
	}
	if task.ClaimedAt != nil {
		frontmatter["claimed_at"] = formatTimeForTodo(task.ClaimedAt)
	} else {
		delete(frontmatter, "claimed_at")
	}
	frontmatter["started_at"] = formatTimeForTodo(task.StartedAt)
	frontmatter["completed_at"] = formatTimeForTodo(task.CompletedAt)
	if task.Reason != "" {
		frontmatter["reason"] = task.Reason
	} else {
		delete(frontmatter, "reason")
	}
	if task.DurationMinutes != nil {
		frontmatter["duration_minutes"] = *task.DurationMinutes
	} else {
		delete(frontmatter, "duration_minutes")
	}

	serialized, err := yaml.Marshal(frontmatter)
	if err != nil {
		return err
	}
	if err := os.WriteFile(taskPath, []byte(fmt.Sprintf("---\n%s---\n%s", string(serialized), body)), 0o644); err != nil {
		return err
	}
	return writeTaskIndex(task, tree)
}

func readTodoFrontmatter(taskID, taskFile string) (map[string]interface{}, string, error) {
	taskFilePath := taskFile
	if !filepath.IsAbs(taskFilePath) {
		dataDir, err := ensureDataRoot()
		if err != nil {
			return nil, "", err
		}
		taskFilePath = filepath.Join(dataDir, taskFilePath)
	}
	raw, err := os.ReadFile(taskFilePath)
	if err != nil {
		return nil, "", err
	}
	lines := strings.Split(string(raw), "\n")
	if len(lines) == 0 || strings.TrimSpace(lines[0]) != "---" {
		return nil, "", fmt.Errorf("missing frontmatter: %s", taskID)
	}
	end := -1
	for i := 1; i < len(lines); i++ {
		if strings.TrimSpace(lines[i]) == "---" {
			end = i
			break
		}
	}
	if end < 0 {
		return nil, "", fmt.Errorf("invalid frontmatter in %s", taskID)
	}
	frontmatterText := strings.TrimSpace(strings.Join(lines[1:end], "\n"))
	body := ""
	if end+1 < len(lines) {
		body = strings.Join(lines[end+1:], "\n")
	}

	frontmatter := map[string]interface{}{}
	if frontmatterText != "" {
		if err := yaml.Unmarshal([]byte(frontmatterText), &frontmatter); err != nil {
			return nil, "", err
		}
	}
	return frontmatter, body, nil
}

func writeTaskIndex(task models.Task, tree models.TaskTree) error {
	shortID := task.ID
	if strings.Count(task.ID, ".") >= 1 {
		shortID = task.ID[strings.LastIndex(task.ID, ".")+1:]
	}
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}

	if strings.HasPrefix(task.File, "bugs/") {
		path := filepath.Join(dataDir, "bugs/index.yaml")
		index, err := readYAMLMapFile(path)
		if err != nil {
			return err
		}
		updateTaskIndexEntry(index["bugs"], shortID, task)
		return writeYAMLMapFile(path, index)
	}
	if strings.HasPrefix(task.File, "ideas/") {
		path := filepath.Join(dataDir, "ideas/index.yaml")
		index, err := readYAMLMapFile(path)
		if err != nil {
			return err
		}
		updateTaskIndexEntry(index["ideas"], shortID, task)
		return writeYAMLMapFile(path, index)
	}

	phase := tree.FindPhase(task.PhaseID)
	if phase == nil {
		return fmt.Errorf("Phase not found: %s", task.PhaseID)
	}
	milestone := tree.FindMilestone(task.MilestoneID)
	if milestone == nil {
		return fmt.Errorf("Milestone not found: %s", task.MilestoneID)
	}
	epic := tree.FindEpic(task.EpicID)
	if epic == nil {
		return fmt.Errorf("Epic not found: %s", task.EpicID)
	}
	phaseDir := filepath.Join(dataDir, phase.Path)
	if _, err := os.Stat(phaseDir); err != nil {
		return err
	}
	epicIndexPath := filepath.Join(phaseDir, milestone.Path, epic.Path, "index.yaml")
	index, err := readYAMLMapFile(epicIndexPath)
	if err != nil {
		return err
	}
	updateTaskIndexEntry(index["tasks"], shortID, task)
	return writeYAMLMapFile(epicIndexPath, index)
}

func updateTaskIndexEntry(raw any, taskShortID string, task models.Task) {
	taskEntries := toMapList(raw)
	for _, entry := range taskEntries {
		if asString(entry["id"]) != taskShortID {
			continue
		}
		entry["title"] = task.Title
		entry["status"] = string(task.Status)
		entry["estimate_hours"] = task.EstimateHours
		entry["complexity"] = string(task.Complexity)
		entry["priority"] = string(task.Priority)
		entry["depends_on"] = task.DependsOn
		entry["tags"] = task.Tags
		entry["file"] = filepath.Base(task.File)
	}
}

func toMapList(raw any) []map[string]interface{} {
	switch entries := raw.(type) {
	case []map[string]interface{}:
		return entries
	case []interface{}:
		out := make([]map[string]interface{}, 0, len(entries))
		for _, item := range entries {
			entry, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			out = append(out, entry)
		}
		return out
	default:
		return []map[string]interface{}{}
	}
}

func formatTimeForTodo(value *time.Time) any {
	if value == nil {
		return nil
	}
	return value.Format(time.RFC3339)
}

func asString(value any) string {
	s, ok := value.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(s)
}

func parseOptionWithPresence(args []string, key string) (string, bool) {
	for i, arg := range args {
		if arg == key {
			if i+1 >= len(args) {
				return "", true
			}
			return args[i+1], true
		}
		if strings.HasPrefix(arg, key+"=") {
			return strings.TrimPrefix(arg, key+"="), true
		}
	}
	return "", false
}

func parseFlag(args []string, flags ...string) bool {
	for _, arg := range args {
		for _, key := range flags {
			if arg == key {
				return true
			}
			if strings.HasPrefix(arg, key+"=") {
				value := strings.TrimSpace(strings.ToLower(strings.TrimPrefix(arg, key+"=")))
				if value == "" {
					continue
				}
				return value == "1" || value == "true" || value == "yes" || value == "on"
			}
		}
	}
	return false
}

func parseIntOptionWithDefault(args []string, fallback int, keys ...string) (int, error) {
	keyName := keys[0]
	raw, found := "", false
	for _, key := range keys {
		value, ok := parseOptionWithPresence(args, key)
		if ok {
			raw = value
			found = true
			break
		}
	}
	if !found || strings.TrimSpace(raw) == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return 0, fmt.Errorf("invalid %s: %s", keyName, raw)
	}
	return value, nil
}

func runList(command string, args []string) error {
	return runListCore(command, args)
}

func runListCore(command string, args []string) error {
	if err := validateAllowedFlags(
		args,
		map[string]bool{
			"--status":             true,
			"--critical":           true,
			"--available":          true,
			"--complexity":         true,
			"--priority":           true,
			"--progress":           true,
			"--json":               true,
			"--all":                true,
			"--unfinished":         true,
			"--bugs":               true,
			"--ideas":              true,
			"--show-completed":     true,
			"--show-completed-aux": true,
			"--phase":              true,
			"--milestone":          true,
			"--epic":               true,
			"--help":               true,
		},
	); err != nil {
		return err
	}

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	if command == commands.CmdLs {
		return runLsCore(args, dataDir)
	}

	scopeArgs := positionalArgs(args, map[string]bool{
		"--status":     true,
		"--available":  true,
		"--complexity": true,
		"--priority":   true,
		"--phase":      true,
		"--milestone":  true,
		"--epic":       true,
	})
	if len(scopeArgs) > 1 {
		return fmt.Errorf("%s supports at most one positional scope", command)
	}

	if parseFlag(args, "--critical") {
		// Reserved for historical parity with Python CLI; progress output remains explicit via --progress.
	}

	outputJSON := parseFlag(args, "--json")
	statusFilterRaw := parseOption(args, "--status")
	showAll := parseFlag(args, "--all")
	unfinished := parseFlag(args, "--unfinished")
	bugsOnly := parseFlag(args, "--bugs")
	ideasOnly := parseFlag(args, "--ideas")
	availableOnly := parseFlag(args, "--available")
	showCompletedAux := parseFlag(args, "--show-completed-aux")
	showProgress := parseFlag(args, "--progress")
	phaseScope := parseOption(args, "--phase")
	milestoneScope := parseOption(args, "--milestone")
	epicScope := parseOption(args, "--epic")
	complexityRaw := strings.TrimSpace(parseOption(args, "--complexity"))
	priorityRaw := strings.TrimSpace(parseOption(args, "--priority"))

	statusFilter := []string{}
	for _, item := range parseCSV(statusFilterRaw) {
		status, err := models.ParseStatus(item)
		if err != nil {
			return err
		}
		statusFilter = append(statusFilter, string(status))
	}

	var complexityFilter models.Complexity
	hasComplexityFilter := false
	if complexityRaw != "" {
		value, err := models.ParseComplexity(complexityRaw)
		if err != nil {
			return err
		}
		complexityFilter = value
		hasComplexityFilter = true
	}

	var priorityFilter models.Priority
	hasPriorityFilter := false
	if priorityRaw != "" {
		value, err := models.ParsePriority(priorityRaw)
		if err != nil {
			return err
		}
		priorityFilter = value
		hasPriorityFilter = true
	}

	scoped := false
	scopeType := ""
	scope := ""
	if phaseScope != "" {
		scope = phaseScope
		scopeType = "phase"
		scoped = true
	} else if milestoneScope != "" {
		scope = milestoneScope
		scopeType = "milestone"
		scoped = true
	} else if epicScope != "" {
		scope = epicScope
		scopeType = "epic"
		scoped = true
	} else if len(scopeArgs) == 1 {
		scope = scopeArgs[0]
		scoped = true
	}

	includeNormal := !bugsOnly && !ideasOnly
	includeBugs := bugsOnly || (!bugsOnly && !ideasOnly)
	includeIdeas := ideasOnly || (!bugsOnly && !ideasOnly)
	if scoped {
		includeNormal = true
		includeBugs = false
		includeIdeas = false
	}

	effectiveShowCompletedAux := showCompletedAux || (showAll && (bugsOnly || ideasOnly))
	if scoped {
		effectiveShowCompletedAux = false
	}

	tree, err := loader.New().Load("metadata", includeBugs, includeIdeas)
	if err != nil {
		return err
	}
	if !outputJSON {
		warnMissingTaskFiles(tree, dataDir)
	}
	calculator := critical_path.NewCriticalPathCalculator(tree, map[string]float64{})
	criticalPath, nextAvailable, err := calculator.Calculate()
	if err != nil {
		return err
	}
	_ = nextAvailable

	scopedPhases, scopedTasks, scopeDepth, scopeID := resolveListScope(tree, scope, scopeType)
	if scope != "" && len(scopedPhases) == 0 {
		if scopeType == "phase" {
			if strings.TrimSpace(scopeID) == "" {
				scopeID = scope
			}
			fmt.Printf("Phase not found: %s\n", scopeID)
			return nil
		}
		if scopeType == "milestone" {
			if strings.TrimSpace(scopeID) == "" {
				scopeID = scope
			}
			fmt.Printf("Milestone not found: %s\n", scopeID)
			return nil
		}
		if scopeType == "epic" {
			if strings.TrimSpace(scopeID) == "" {
				scopeID = scope
			}
			fmt.Printf("Epic not found: %s\n", scopeID)
			return nil
		}
		if strings.TrimSpace(scopeID) == "" {
			scopeID = scope
		}
		fmt.Printf("No list nodes found for path query: %s\n", scopeID)
		return nil
	}
	if !scoped {
		scopedTasks = allTaskIDs(tree)
	}

	taskMatches := func(task models.Task) bool {
		if len(statusFilter) > 0 && !containsString(statusFilter, string(task.Status)) {
			return false
		}
		if hasComplexityFilter && task.Complexity != complexityFilter {
			return false
		}
		if hasPriorityFilter && task.Priority != priorityFilter {
			return false
		}
		if !showAll && !unfinished && isCompletedStatus(task.Status) {
			return false
		}
		if scoped && !scopedTaskSetContains(task.ID, scopedTasks) {
			return false
		}
		if unfinished && isCompletedStatus(task.Status) {
			return false
		}
		return true
	}

	if showProgress {
		return renderListProgress(tree, criticalPath, scoped, scopedPhases, phaseScope, milestoneScope, epicScope, scopeType, scopeDepth, taskMatches)
	}

	if availableOnly {
		return renderListAvailable(tree, calculator, outputJSON, scopedTasks, taskMatches, criticalPath, includeNormal, includeBugs, includeIdeas, effectiveShowCompletedAux)
	}

	if outputJSON {
		return renderListJSON(tree, scoped, scopedPhases, includeNormal, includeBugs, includeIdeas, showAll, unfinished, effectiveShowCompletedAux, taskMatches, criticalPath, nextAvailable, hasComplexityFilter, hasPriorityFilter, complexityFilter, priorityFilter, scopedTasks, statusFilter)
	}

	return renderListText(command, tree, scoped, scopedPhases, scopedTasks, scopeType, scopeDepth, taskMatches, criticalPath, showAll)
}

func runLsCore(args []string, dataDir string) error {
	if err := validateAllowedFlags(args, map[string]bool{}); err != nil {
		return err
	}

	positional := positionalArgs(args, map[string]bool{})
	if len(positional) > 1 {
		return errors.New("ls accepts at most one scope")
	}
	scope := ""
	if len(positional) == 1 {
		scope = positional[0]
	}
	tree, err := loader.New().Load("metadata", false, false)
	if err != nil {
		return err
	}

	if scope == "" {
		if len(tree.Phases) == 0 {
			fmt.Println("No phases found.")
			return nil
		}
		for _, phase := range tree.Phases {
			stats := getTaskStatsForPhase(phase)
			fmt.Printf(
				"%s: %s [%s] %d/%d tasks done (in_progress=%d, blocked=%d)\n",
				phase.ID,
				phase.Name,
				string(phase.Status),
				stats.done,
				stats.total,
				stats.inProgress,
				stats.blocked,
			)
		}
		return nil
	}

	if isBugLikeID(scope) || isIdeaLikeID(scope) {
		return fmt.Errorf("ls does not support bug/idea IDs. Use: backlog show %s", scope)
	}

	phasePath, err := models.ParseTaskPath(scope)
	if err != nil {
		if strings.Contains(scope, "--") {
			return validateScopeOrID(scope)
		}
		return fmt.Errorf("Invalid path format: %s", scope)
	}

	if phasePath.IsPhase() {
		phase := tree.FindPhase(phasePath.FullID())
		if phase == nil {
			return fmt.Errorf("Phase not found: %s", scope)
		}
		if len(phase.Milestones) == 0 {
			fmt.Printf("Phase %s has no milestones.\n", scope)
			return nil
		}
		for _, milestone := range phase.Milestones {
			stats := getTaskStatsForMilestone(milestone)
			fmt.Printf(
				"%s: %s [%s] %d/%d tasks done (in_progress=%d, blocked=%d)\n",
				milestone.ID,
				milestone.Name,
				string(milestone.Status),
				stats.done,
				stats.total,
				stats.inProgress,
				stats.blocked,
			)
		}
		return nil
	}

	if phasePath.IsMilestone() {
		milestone := findMilestone(tree, scope)
		if milestone == nil {
			return fmt.Errorf("Milestone not found: %s", scope)
		}
		if len(milestone.Epics) == 0 {
			fmt.Printf("Milestone %s has no epics.\n", scope)
			return nil
		}
		for _, epic := range milestone.Epics {
			stats := getTaskStatsForEpic(epic)
			fmt.Printf(
				"%s: %s [%s] %d/%d tasks done (in_progress=%d, blocked=%d)\n",
				epic.ID,
				epic.Name,
				string(epic.Status),
				stats.done,
				stats.total,
				stats.inProgress,
				stats.blocked,
			)
		}
		return nil
	}

	if phasePath.IsEpic() {
		epic := findEpic(tree, scope)
		if epic == nil {
			return fmt.Errorf("Epic not found: %s", scope)
		}
		if len(epic.Tasks) == 0 {
			fmt.Printf("Epic %s has no tasks.\n", scope)
			return nil
		}
		for _, task := range epic.Tasks {
			fmt.Printf(
				"%s: %s [%s] %.0f\n",
				task.ID,
				task.Title,
				string(task.Status),
				task.EstimateHours,
			)
		}
		return nil
	}

	task := tree.FindTask(scope)
	if task == nil {
		return fmt.Errorf("Task not found: %s", scope)
	}
	if err := printTaskSummary(task, dataDir); err != nil {
		return err
	}
	return nil
}

func warnMissingTaskFiles(tree models.TaskTree, dataDir string) {
	const warningLimit = 5
	missing := []models.Task{}
	for _, task := range findAllTasksInTree(tree) {
		if strings.TrimSpace(task.File) == "" {
			continue
		}
		taskFile := filepath.Join(dataDir, task.File)
		if _, err := os.Stat(taskFile); err != nil {
			missing = append(missing, task)
		}
	}
	if len(missing) == 0 {
		return
	}

	fmt.Printf("Warning: %d task file(s) referenced in index are missing.\n", len(missing))
	for i := 0; i < len(missing) && i < warningLimit; i++ {
		task := missing[i]
		fmt.Printf("  - %s: %s\n", task.ID, filepath.Join(dataDir, task.File))
	}
	if len(missing) > warningLimit {
		fmt.Printf("  ... and %d more\n", len(missing)-warningLimit)
	}
	fmt.Println()
}

func runShow(args []string) error {
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	for _, raw := range args {
		if strings.HasPrefix(raw, "--") {
			if err := validateScopeOrID(raw); err != nil {
				return err
			}
		}
	}
	ids := positionalArgs(args, map[string]bool{})
	if len(ids) == 0 {
		ctx, err := taskcontext.GetCurrentTask(dataDir)
		if err != nil {
			return err
		}
		if strings.TrimSpace(ctx) == "" {
			fmt.Println("No task specified and no current working task set.")
			fmt.Println("Use 'work <task-id>' to set a working task.")
			return nil
		}
		ids = []string{ctx}
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	loaderInstance := loader.New()

	for idx, id := range ids {
		if idx > 0 {
			fmt.Println()
			fmt.Println(strings.Repeat("═", 60))
		}

		if isBugLikeID(id) || isIdeaLikeID(id) {
			auxTask, err := findAuxiliaryTask(tree, id)
			if err != nil {
				return err
			}
			renderBugOrIdeaDetail(*auxTask, isIdeaLikeID(id) && auxTask.Status == models.StatusPending, dataDir)
			continue
		}
		scopePath, err := models.ParseTaskPath(id)
		if err != nil {
			return fmt.Errorf("Invalid path format: %s", id)
		}

		scopeTree, err := loaderInstance.LoadScope(id, "metadata", false, false, false)
		if err != nil {
			return fmt.Errorf("Invalid path format: %s", id)
		}

		if err := showScopedItem(scopeTree, id, &scopePath, dataDir); err != nil {
			return err
		}
	}

	return nil
}

func runNext(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if err := validateAllowedFlags(args, map[string]bool{"--json": true}); err != nil {
		return err
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	cfg := map[string]float64{}
	calculator := critical_path.NewCriticalPathCalculator(tree, cfg)
	criticalPath, nextAvailable, err := calculator.Calculate()
	if err != nil {
		return err
	}
	if strings.TrimSpace(nextAvailable) == "" {
		fmt.Println("No available tasks found.")
		return nil
	}

	task := tree.FindTask(nextAvailable)
	if task == nil {
		return fmt.Errorf("Task not found: %s", nextAvailable)
	}

	if parseFlag(args, "--json") {
		payload := map[string]interface{}{
			"id":               task.ID,
			"title":            task.Title,
			"file":             task.File,
			"file_exists":      taskFileExists(task.File),
			"estimate_hours":   task.EstimateHours,
			"complexity":       string(task.Complexity),
			"status":           string(task.Status),
			"priority":         string(task.Priority),
			"on_critical_path": false,
			"grab_additional":  []string{},
		}
		for _, id := range criticalPath {
			if id == task.ID {
				payload["on_critical_path"] = true
				break
			}
		}
		grabbable, err := findGrabCandidates(*task, calculator, tree)
		if err == nil {
			additional := make([]string, 0, len(grabbable))
			for _, id := range grabbable {
				candidate := tree.FindTask(id)
				if candidate == nil || !taskFileExists(candidate.File) {
					continue
				}
				additional = append(additional, id)
			}
			payload["grab_additional"] = additional
		}
		raw, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	fmt.Printf("%s: %s\n", task.ID, task.Title)
	return nil
}

func runLog(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if err := validateAllowedFlags(args, map[string]bool{"--limit": true, "--json": true}); err != nil {
		return err
	}

	limit, err := parseIntOptionWithDefault(args, 20, "--limit")
	if err != nil {
		return err
	}
	if limit <= 0 {
		return fmt.Errorf("--limit must be a positive integer")
	}

	tree, err := loader.New().Load("metadata", false, false)
	if err != nil {
		return err
	}

	events := collectLogEvents(tree)
	if len(events) > limit {
		events = events[:limit]
	}

	if parseFlag(args, "--json") {
		payload := make([]logEventPayload, 0, len(events))
		for _, event := range events {
			payload = append(payload, logEventPayload{
				TaskID:    event.TaskID,
				Title:     event.Title,
				Event:     event.Event,
				Kind:      logEventKind(event.Event),
				Timestamp: event.Timestamp,
				Actor:     event.Actor,
			})
		}
		raw, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	if len(events) == 0 {
		fmt.Println("No recent activity found.")
		return nil
	}

	fmt.Println("Recent Activity Log")
	for _, event := range events {
		actor := ""
		if event.Actor != nil {
			actor = " (" + *event.Actor + ")"
		}
		age := formatRelativeTime(event.Timestamp)
		fmt.Printf("%s [%s] [%s] %s%s\n", logEventIcon(event.Event), logEventKind(event.Event), event.Event, event.TaskID, actor)
		fmt.Printf("  %s\n", event.Title)
		fmt.Printf("  %s (%s)\n\n", event.Timestamp.Format(time.RFC3339), age)
	}
	return nil
}

func logEventKind(eventType string) string {
	if eventType == "added" {
		return "created"
	}
	return "updated"
}

func logEventIcon(eventType string) string {
	switch eventType {
	case "completed":
		return "✓"
	case "started":
		return "▶"
	case "claimed":
		return "✎"
	default:
		return "✚"
	}
}

func formatRelativeTime(ts time.Time) string {
	delta := time.Since(ts)
	seconds := int(delta.Seconds())
	if seconds < 60 {
		return fmt.Sprintf("%ds ago", seconds)
	}
	minutes := seconds / 60
	if minutes < 60 {
		return fmt.Sprintf("%dm ago", minutes)
	}
	hours := minutes / 60
	if hours < 24 {
		return fmt.Sprintf("%dh ago", hours)
	}
	days := hours / 24
	if days < 7 {
		return fmt.Sprintf("%dd ago", days)
	}
	return fmt.Sprintf("%dw ago", days/7)
}

func collectLogEvents(tree models.TaskTree) []logEvent {
	events := []logEvent{}
	for _, task := range findAllTasksInTree(tree) {
		taskFile, err := resolveTaskFilePath(task.File)
		if err != nil {
			taskFile = ""
		}

		if task.CompletedAt != nil {
			events = append(events, logEvent{
				TaskID:    task.ID,
				Title:     task.Title,
				Event:     "completed",
				Timestamp: *task.CompletedAt,
				Actor:     logEventActor(task),
			})
		}
		if task.StartedAt != nil {
			events = append(events, logEvent{
				TaskID:    task.ID,
				Title:     task.Title,
				Event:     "started",
				Timestamp: *task.StartedAt,
				Actor:     logEventActor(task),
			})
		}
		if task.ClaimedAt != nil {
			events = append(events, logEvent{
				TaskID:    task.ID,
				Title:     task.Title,
				Event:     "claimed",
				Timestamp: *task.ClaimedAt,
				Actor:     logEventActor(task),
			})
		}

		if task.ClaimedAt == nil && task.StartedAt == nil && task.CompletedAt == nil && taskFile != "" {
			info, err := os.Stat(taskFile)
			if err == nil {
				events = append(events, logEvent{
					TaskID:    task.ID,
					Title:     task.Title,
					Event:     "added",
					Timestamp: info.ModTime().UTC(),
					Actor:     nil,
				})
			}
		}
	}

	sort.SliceStable(events, func(i, j int) bool {
		if !events[i].Timestamp.Equal(events[j].Timestamp) {
			return events[i].Timestamp.After(events[j].Timestamp)
		}
		order := map[string]int{"added": 0, "claimed": 1, "started": 2, "completed": 3}
		return order[events[i].Event] > order[events[j].Event]
	})
	return events
}

func logEventActor(task models.Task) *string {
	if strings.TrimSpace(task.ClaimedBy) == "" {
		return nil
	}
	actor := task.ClaimedBy
	return &actor
}

func runTree(args []string) error {
	if err := validateAllowedFlags(args, map[string]bool{"--json": true, "--unfinished": true, "--show-completed-aux": true, "--details": true, "--depth": true}); err != nil {
		return err
	}

	depth, err := parseIntOptionWithDefault(args, 4, "--depth")
	if err != nil {
		return err
	}
	if depth <= 0 {
		return fmt.Errorf("--depth must be a positive integer")
	}

	outputJSON := parseFlag(args, "--json")
	unfinished := parseFlag(args, "--unfinished")
	showCompletedAux := parseFlag(args, "--show-completed-aux")
	showDetails := parseFlag(args, "--details")

	pathArgs := positionalArgs(args, map[string]bool{"--depth": true})
	if len(pathArgs) > 1 {
		return errors.New("tree accepts at most one path query")
	}

	var pathQuery *models.PathQuery
	if len(pathArgs) == 1 {
		parsed, err := models.ParsePathQuery(pathArgs[0])
		if err != nil {
			return err
		}
		pathQuery = &parsed
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}

	cfg := map[string]float64{}
	calculator := critical_path.NewCriticalPathCalculator(tree, cfg)
	criticalPath, nextAvailable, err := calculator.Calculate()
	if err != nil {
		return err
	}

	filteredPhases := tree.Phases
	if pathQuery != nil {
		filteredPhases = filterPhasesByPathQuery(tree.Phases, *pathQuery)
	}

	if outputJSON {
		if unfinished {
			filteredPhases = filterUnfinishedPhases(filteredPhases)
		}
		output := mapTreePayload(filteredPhases, criticalPath, nextAvailable, depth, showDetails, unfinished, showCompletedAux)
		for _, bug := range tree.Bugs {
			if includeCompletionAux(bug.Status, unfinished, showCompletedAux) {
				output.Bugs = append(output.Bugs, treeTaskFromTask(bug, criticalPath))
			}
		}
		for _, idea := range tree.Ideas {
			if includeCompletionAux(idea.Status, unfinished, showCompletedAux) {
				output.Ideas = append(output.Ideas, treeTaskFromTask(idea, criticalPath))
			}
		}
		raw, err := json.MarshalIndent(output, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	if unfinished {
		filteredPhases = filterUnfinishedPhases(filteredPhases)
	}

	bugsToShow := []models.Task{}
	for _, bug := range tree.Bugs {
		if includeCompletionAux(bug.Status, unfinished, showCompletedAux) {
			bugsToShow = append(bugsToShow, bug)
		}
	}
	ideasToShow := []models.Task{}
	for _, idea := range tree.Ideas {
		if includeCompletionAux(idea.Status, unfinished, showCompletedAux) {
			ideasToShow = append(ideasToShow, idea)
		}
	}
	hasAux := len(bugsToShow) > 0 || len(ideasToShow) > 0

	for i, phase := range filteredPhases {
		isLast := i == len(filteredPhases)-1 && !hasAux
		lines := renderTreePhase(phase, isLast, "", criticalPath, unfinished, showDetails, depth, 1)
		for _, line := range lines {
			fmt.Println(line)
		}
	}

	if pathQuery != nil && len(filteredPhases) == 0 && !hasAux {
		fmt.Printf("No tree nodes found for path query: %s\n", pathQuery.Raw)
	}

	if len(bugsToShow) > 0 {
		bugsDone := 0
		for _, bug := range bugsToShow {
			if bug.Status == models.StatusDone {
				bugsDone++
			}
		}
		branch := "└── "
		continuation := "    "
		if len(ideasToShow) > 0 {
			branch = "├── "
			continuation = "│   "
		}
		fmt.Printf("%sBugs (%d/%d)\n", branch, bugsDone, len(bugsToShow))
		for i, bug := range bugsToShow {
			isLast := i == len(bugsToShow)-1 && len(ideasToShow) == 0
			fmt.Printf("%s\n", renderTreeTaskLine(bug, continuation, isLast, criticalPath, showDetails))
		}
	}

	if len(ideasToShow) > 0 {
		ideasDone := 0
		for _, idea := range ideasToShow {
			if idea.Status == models.StatusDone {
				ideasDone++
			}
		}
		fmt.Printf("└── Ideas (%d/%d)\n", ideasDone, len(ideasToShow))
		for i, idea := range ideasToShow {
			isLast := i == len(ideasToShow)-1
			fmt.Printf("  %s\n", strings.TrimSuffix(renderTreeTaskLine(idea, "", isLast, criticalPath, showDetails), "\n"))
		}
	}

	return nil
}

func runDash(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if err := validateAllowedFlags(args, map[string]bool{"--json": true}); err != nil {
		return err
	}
	outputJSON := parseFlag(args, "--json")

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	ctx, err := taskcontext.LoadContext(dataDir)
	if err != nil {
		return err
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}

	cfg := map[string]float64{}
	calculator := critical_path.NewCriticalPathCalculator(tree, cfg)
	criticalPath, nextAvailable, err := calculator.Calculate()
	if err != nil {
		return err
	}

	currentTaskID := strings.TrimSpace(ctx.CurrentTask)
	if currentTaskID == "" {
		currentTaskID = strings.TrimSpace(ctx.PrimaryTask)
	}
	currentTask := tree.FindTask(currentTaskID)
	currentAgent := strings.TrimSpace(ctx.Agent)
	if currentAgent == "" {
		currentAgent = "unknown"
	}

	allTasks := findAllTasksInTree(tree)
	normalTasks := findNormalTasksInTree(tree)

	totalInProgress, totalBlocked := 0, 0
	for _, task := range allTasks {
		switch task.Status {
		case models.StatusInProgress:
			totalInProgress++
		case models.StatusBlocked:
			totalBlocked++
		}
	}
	dashboardDone, dashboardTasks := 0, 0
	for _, task := range normalTasks {
		if task.Status == models.StatusDone {
			dashboardDone++
		}
	}
	for _, phase := range tree.Phases {
		stats := getTaskStatsForPhase(phase)
		dashboardTasks += stats.total
	}
	totalPct := 0.0
	if dashboardTasks > 0 {
		totalPct = (float64(dashboardDone) / float64(dashboardTasks)) * 100
	}

	phases := []dashPhaseProgressPayload{}
	completedPhases := []string{}
	for _, phase := range tree.Phases {
		stats := getTaskStatsForPhase(phase)
		if stats.total <= 0 {
			continue
		}
		pct := 0.0
		if stats.total > 0 {
			pct = (float64(stats.done) / float64(stats.total)) * 100
		}
		phases = append(phases, dashPhaseProgressPayload{
			ID:              phase.ID,
			Name:            phase.Name,
			Done:            stats.done,
			Total:           stats.total,
			InProgress:      stats.inProgress,
			Blocked:         stats.blocked,
			PercentComplete: pct,
		})
		if stats.done == stats.total && stats.total > 0 {
			completedPhases = append(completedPhases, fmt.Sprintf("%s (%d)", phase.ID, stats.total))
		}
	}

	remainingOnPath := []string{}
	remainingHours := 0.0
	for _, id := range criticalPath {
		task := tree.FindTask(id)
		if task == nil || task.Status == models.StatusDone {
			continue
		}
		remainingOnPath = append(remainingOnPath, id)
		remainingHours += task.EstimateHours
	}

	criticalPathPayload := dashCriticalPathPayload{
		Tasks:          remainingOnPath,
		RemainingCount: len(remainingOnPath),
		RemainingHours: remainingHours,
		AllComplete:    len(remainingOnPath) == 0,
	}
	if strings.TrimSpace(nextAvailable) != "" {
		criticalPathPayload.NextID = nextAvailable
		if nextTask := tree.FindTask(nextAvailable); nextTask != nil {
			criticalPathPayload.NextTitle = nextTask.Title
		}
	}

	activeSessions := 0
	sessions, sessionsErr := taskcontext.LoadSessions(dataDir)
	if sessionsErr == nil {
		now := time.Now().UTC()
		for _, session := range sessions {
			if session.Agent == "" || session.LastHeartbeat == "" {
				continue
			}
			lastSeen, parseErr := time.Parse(time.RFC3339, session.LastHeartbeat)
			if parseErr != nil {
				continue
			}
			if now.Sub(lastSeen) <= 15*time.Minute {
				activeSessions++
			}
		}
	}

	staleClaimsCount := len(staleClaims(allTasks, 60, 120))

	currentTaskPayload := (*dashCurrentTaskPayload)(nil)
	if strings.TrimSpace(currentTaskID) != "" {
		currentTaskPayload = &dashCurrentTaskPayload{
			ID:          currentTaskID,
			Agent:       currentAgent,
			WorkingTask: true,
			Found:       currentTask != nil,
		}
		if currentTask != nil {
			currentTaskPayload.Title = currentTask.Title
			currentTaskPayload.File = currentTask.File
			currentTaskPayload.FileExists = taskFileExists(currentTask.File)
		}
	}

	if outputJSON {
		payload := dashJSON{
			Agent:           currentAgent,
			CurrentTask:     currentTaskPayload,
			Overall:         dashOverallPayload{Done: dashboardDone, Total: dashboardTasks, InProgress: totalInProgress, Blocked: totalBlocked, Percent: totalPct},
			Phases:          phases,
			CompletedPhases: completedPhases,
			CriticalPath:    criticalPathPayload,
			Status: dashStatusPayload{
				InProgress:    totalInProgress,
				Blocked:       totalBlocked,
				StaleClaims:   staleClaimsCount,
				ActiveSession: activeSessions,
			},
		}
		raw, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	fmt.Println()
	fmt.Println("Current Task")
	if currentTask != nil {
		fmt.Printf("  %s: %s\n", currentTask.ID, currentTask.Title)
		fmt.Printf("  Agent: %s\n", currentAgent)
		if !taskFileExists(currentTask.File) {
			fmt.Printf("  Task file missing: %s\n", currentTask.File)
		}
	} else if strings.TrimSpace(currentTaskID) != "" {
		fmt.Printf("  Working task '%s' not found\n", currentTaskID)
	} else {
		fmt.Println("  No current working task set.")
	}
	fmt.Println()

	fmt.Println("Progress:")
	fmt.Printf("  Total: %s %5.1f%% (%d/%d)\n", makeProgressBar(dashboardDone, dashboardTasks), totalPct, dashboardDone, dashboardTasks)

	for _, phase := range phases {
		fmt.Printf("  %s: %s %5.1f%% (%d/%d)\n", phase.ID, makeProgressBar(phase.Done, phase.Total), phase.PercentComplete, phase.Done, phase.Total)
	}
	if len(completedPhases) > 0 {
		fmt.Printf("  Completed Phases: %s\n", strings.Join(completedPhases, ", "))
	}

	fmt.Println()
	fmt.Println("Critical Path:")
	if len(remainingOnPath) == 0 {
		fmt.Println("  ✓ All critical path tasks complete")
	} else {
		maxDisplay := 5
		show := len(remainingOnPath)
		if show > maxDisplay {
			show = maxDisplay
		}
		fmt.Printf("  %s", strings.Join(remainingOnPath[:show], " -> "))
		if len(remainingOnPath) > maxDisplay {
			fmt.Println(" -> ...")
		} else {
			fmt.Println()
		}
		fmt.Printf("  %d tasks, ~%.0fh remaining\n", len(remainingOnPath), remainingHours)
	}

	if strings.TrimSpace(nextAvailable) != "" {
		if nextTask := tree.FindTask(nextAvailable); nextTask != nil {
			fmt.Printf("  Next: %s - %s\n", nextTask.ID, nextTask.Title)
		}
	}

	fmt.Println()
	fmt.Println("Status:")
	fmt.Printf("  In progress: %d\n", totalInProgress)
	if totalBlocked > 0 {
		fmt.Printf("  Blocked: %d\n", totalBlocked)
	}
	if staleClaimsCount > 0 {
		fmt.Printf("  Stale claims: %d\n", staleClaimsCount)
	}
	if activeSessions > 0 {
		fmt.Printf("  Active Sessions: %d\n", activeSessions)
	}
	fmt.Println()

	return nil
}

func runAdmin(args []string) error {
	if err := validateAllowedFlags(args, map[string]bool{"--help": true, "--json": true}); err != nil {
		return err
	}
	if parseFlag(args, "--help") {
		fmt.Println("Usage: backlog admin")
		fmt.Println("The admin command is not implemented in the Go client.")
		return nil
	}
	if parseFlag(args, "--json") {
		payload := adminJSONPayload{
			Command:     "admin",
			Implemented: false,
			Message:     "admin command is not implemented in the Go client.",
			Guidance:    "Use `backlog dash` to inspect current project status.",
		}
		raw, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}
	fmt.Println("admin command is not implemented in the Go client.")
	fmt.Println("Use `backlog dash` to inspect current project status.")
	return nil
}

func runAgents(args []string) error {
	if err := validateAllowedFlags(args, map[string]bool{"--profile": true}); err != nil {
		return err
	}

	profile := strings.TrimSpace(parseOption(args, "--profile"))
	if profile == "" {
		profile = "all"
	}

	order := []string{}
	switch profile {
	case "all":
		order = []string{"short", "medium", "long"}
	case "short", "medium", "long":
		order = []string{profile}
	default:
		return fmt.Errorf("Invalid profile: %s", profile)
	}

	for i, key := range order {
		snippet, ok := agentsSnippets[key]
		if !ok {
			return fmt.Errorf("Invalid profile: %s", profile)
		}
		if i > 0 {
			fmt.Printf("\n%s\n\n", strings.Repeat("=", 72))
		}
		fmt.Print(snippet)
	}
	return nil
}

func runLock(args []string, locked bool) error {
	if err := validateAllowedFlags(args, map[string]bool{}); err != nil {
		return err
	}

	commandName := "lock"
	if !locked {
		commandName = "unlock"
	}
	itemID := firstPositionalArg(args, map[string]bool{})
	if itemID == "" {
		return fmt.Errorf("%s requires ITEM_ID", commandName)
	}

	parts := strings.Split(itemID, ".")
	if len(parts) < 1 || len(parts) > 3 {
		return errors.New("lock/unlock supports only phase, milestone, or epic IDs")
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	desired := locked

	canonicalID := ""
	switch len(parts) {
	case 1:
		phase := tree.FindPhase(parts[0])
		if phase == nil {
			return fmt.Errorf("Phase not found: %s", itemID)
		}
		canonicalID = phase.ID

		rootPath := filepath.Join(dataDir, "index.yaml")
		rootIndex, err := readYAMLMapFile(rootPath)
		if err != nil {
			return err
		}
		for _, raw := range asSlice(rootIndex["phases"]) {
			entry, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			if tree.IDsMatch(asString(entry["id"]), phase.ID) || asString(entry["id"]) == parts[0] {
				entry["locked"] = desired
				break
			}
		}
		if err := writeYAMLMapFile(rootPath, rootIndex); err != nil {
			return err
		}

		phaseIndexPath := filepath.Join(dataDir, phase.Path, "index.yaml")
		if _, err := os.Stat(phaseIndexPath); err == nil {
			phaseIndex, err := readYAMLMapFile(phaseIndexPath)
			if err != nil {
				return err
			}
			phaseIndex["locked"] = desired
			if err := writeYAMLMapFile(phaseIndexPath, phaseIndex); err != nil {
				return err
			}
		}
	case 2:
		milestoneID := parts[0] + "." + parts[1]
		milestone := tree.FindMilestone(milestoneID)
		if milestone == nil {
			return fmt.Errorf("Milestone not found: %s", itemID)
		}
		phase := tree.FindPhase(milestone.PhaseID)
		if phase == nil {
			return fmt.Errorf("Phase not found for milestone: %s", itemID)
		}
		canonicalID = milestone.ID

		phaseIndexPath := filepath.Join(dataDir, phase.Path, "index.yaml")
		phaseIndex, err := readYAMLMapFile(phaseIndexPath)
		if err != nil {
			return err
		}
		for _, raw := range asSlice(phaseIndex["milestones"]) {
			entry, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			if tree.IDsMatch(asString(entry["id"]), milestone.ID) || asString(entry["id"]) == parts[1] {
				entry["locked"] = desired
				break
			}
		}
		if err := writeYAMLMapFile(phaseIndexPath, phaseIndex); err != nil {
			return err
		}

		msIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path, "index.yaml")
		if _, err := os.Stat(msIndexPath); err == nil {
			msIndex, err := readYAMLMapFile(msIndexPath)
			if err != nil {
				return err
			}
			msIndex["locked"] = desired
			if err := writeYAMLMapFile(msIndexPath, msIndex); err != nil {
				return err
			}
		}
	case 3:
		epicID := parts[0] + "." + parts[1] + "." + parts[2]
		epic := tree.FindEpic(epicID)
		if epic == nil {
			return fmt.Errorf("Epic not found: %s", itemID)
		}
		milestone := tree.FindMilestone(epic.MilestoneID)
		phase := tree.FindPhase(epic.PhaseID)
		if milestone == nil || phase == nil {
			return fmt.Errorf("Could not resolve parent paths for epic: %s", itemID)
		}
		canonicalID = epic.ID

		msIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path, "index.yaml")
		msIndex, err := readYAMLMapFile(msIndexPath)
		if err != nil {
			return err
		}
		for _, raw := range asSlice(msIndex["epics"]) {
			entry, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			if tree.IDsMatch(asString(entry["id"]), epic.ID) || asString(entry["id"]) == parts[2] {
				entry["locked"] = desired
				break
			}
		}
		if err := writeYAMLMapFile(msIndexPath, msIndex); err != nil {
			return err
		}

		epicIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path, epic.Path, "index.yaml")
		if _, err := os.Stat(epicIndexPath); err == nil {
			epicIndex, err := readYAMLMapFile(epicIndexPath)
			if err != nil {
				return err
			}
			epicIndex["locked"] = desired
			if err := writeYAMLMapFile(epicIndexPath, epicIndex); err != nil {
				return err
			}
		}
	default:
		return errors.New("lock/unlock supports only phase, milestone, or epic IDs")
	}

	action := "Locked"
	if !locked {
		action = "Unlocked"
	}
	fmt.Printf("%s: %s\n", action, canonicalID)
	return nil
}

func runIdea(args []string) error {
	if err := validateAllowedFlags(args, map[string]bool{}); err != nil {
		return err
	}

	title := strings.TrimSpace(strings.Join(args, " "))
	if title == "" {
		return errors.New("idea requires IDEA_TEXT")
	}

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	ideasDir := filepath.Join(dataDir, "ideas")
	indexPath := filepath.Join(ideasDir, "index.yaml")
	next, err := nextAuxNumber(indexPath, "ideas", "I")
	if err != nil {
		return err
	}

	ideaID := fmt.Sprintf("I%03d", next)
	slug := models.Slugify(title, models.DirectoryNameWidth*15)
	if slug == "" {
		slug = "idea"
	}
	filename := fmt.Sprintf("%s-%s.todo", ideaID, slug)
	relFile := filepath.ToSlash(filepath.Join("ideas", filename))
	filePath := filepath.Join(ideasDir, filename)

	frontmatter := map[string]interface{}{
		"id":             ideaID,
		"title":          title,
		"status":         "pending",
		"estimate_hours": 10.0,
		"complexity":     "medium",
		"priority":       "medium",
		"depends_on":     []string{},
		"tags":           []string{"idea", "planning"},
	}
	body := fmt.Sprintf(
		"\n# Idea Intake: %s\n\n## Original Idea\n\n%s\n\n## Planning Task (Equivalent of /plan-task)\n\n- Run `/plan-task \"%s\"` to decompose this idea into actionable work.\n- Confirm placement in the current `.tasks` hierarchy before creating work items.\n\n## Ingest Plan Into .tasks\n\n- Create implementation items with `tasks add` and related hierarchy commands (`tasks add-epic`, `tasks add-milestone`, `tasks add-phase`) as needed.\n- Create follow-up defects with `tasks bug` when bug-style work is identified.\n- Record all created IDs below and wire dependencies.\n\n## Created Work Items\n\n- Add created task IDs\n- Add created bug IDs (if any)\n\n## Completion Criteria\n\n- Idea has been decomposed into concrete `.tasks` work items.\n- New items include clear acceptance criteria and dependencies.\n- This idea intake is updated with created IDs and marked done.\n",
		title,
		title,
		title,
	)
	if err := writeTodoWithFrontmatter(filePath, frontmatter, body); err != nil {
		return err
	}

	index, err := readYAMLMapFile(indexPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	if index == nil {
		index = map[string]interface{}{"ideas": []interface{}{}}
	}
	appendToList(index, "ideas", map[string]interface{}{
		"id":   ideaID,
		"file": filename,
	})
	if err := writeYAMLMapFile(indexPath, index); err != nil {
		return err
	}

	fmt.Printf("Created idea: %s\n", ideaID)
	fmt.Printf("File: %s/%s\n", filepath.Base(dataDir), relFile)
	fmt.Println("IMPORTANT: This intake tracks planning work; run `/plan-task` on the idea and ingest resulting items with tasks commands.")
	return nil
}

func runBug(args []string) error {
	if err := validateAllowedFlags(args, map[string]bool{
		"--title":      true,
		"-T":           true,
		"--estimate":   true,
		"-e":           true,
		"--complexity": true,
		"-c":           true,
		"--priority":   true,
		"-p":           true,
		"--depends-on": true,
		"-d":           true,
		"--tags":       true,
		"--simple":     true,
		"-s":           true,
		"--body":       true,
		"-b":           true,
	}); err != nil {
		return err
	}

	title := strings.TrimSpace(parseOption(args, "--title", "-T"))
	optionNamesWithValue := map[string]bool{
		"--title":      true,
		"-T":           true,
		"--priority":   true,
		"-p":           true,
		"--estimate":   true,
		"-e":           true,
		"--complexity": true,
		"-c":           true,
		"--depends-on": true,
		"-d":           true,
		"--tags":       true,
		"--body":       true,
		"-b":           true,
	}
	positional := positionalArgs(args, optionNamesWithValue)
	positionalTitle := strings.TrimSpace(strings.Join(positional, " "))

	estimate, err := parseFloatOptionWithDefault(args, 1, "--estimate", "-e")
	if err != nil {
		return err
	}
	complexity, err := parseComplexityOption(args, "--complexity", "-c")
	if err != nil {
		return err
	}

	priority := models.PriorityHigh
	if rawPriority := strings.TrimSpace(parseOption(args, "--priority", "-p")); rawPriority != "" {
		parsedPriority, err := models.ParsePriority(rawPriority)
		if err != nil {
			return err
		}
		priority = parsedPriority
	}

	dependsOn := parseCSV(parseOption(args, "--depends-on", "-d"))
	tags := parseCSV(parseOption(args, "--tags"))
	simple := parseFlag(args, "--simple", "-s")
	body := parseOption(args, "--body", "-b")

	if title == "" && positionalTitle != "" {
		title = positionalTitle
		simple = true
	}
	if title == "" {
		return errors.New("bug requires --title or description text")
	}

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	bugsDir := filepath.Join(dataDir, "bugs")
	indexPath := filepath.Join(bugsDir, "index.yaml")
	next, err := nextAuxNumber(indexPath, "bugs", "B")
	if err != nil {
		return err
	}

	bugID := fmt.Sprintf("B%03d", next)
	slug := models.Slugify(title, models.DirectoryNameWidth*15)
	if slug == "" {
		slug = "bug"
	}
	filename := fmt.Sprintf("%s-%s.todo", bugID, slug)
	filePath := filepath.Join(bugsDir, filename)

	bodyText := body
	if bodyText == "" {
		if simple {
			bodyText = fmt.Sprintf("\n%s\n", title)
		} else {
			bodyText = fmt.Sprintf(
				"\n# %s\n\n## Steps to Reproduce\n\n1. TODO: Add steps\n\n## Expected Behavior\n\nTODO: Describe expected behavior\n\n## Actual Behavior\n\nTODO: Describe actual behavior\n",
				title,
			)
		}
	}

	frontmatter := map[string]interface{}{
		"id":             bugID,
		"title":          title,
		"status":         "pending",
		"estimate_hours": estimate,
		"complexity":     string(complexity),
		"priority":       string(priority),
		"depends_on":     dependsOn,
		"tags":           tags,
	}
	if err := writeTodoWithFrontmatter(filePath, frontmatter, bodyText); err != nil {
		return err
	}

	index, err := readYAMLMapFile(indexPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	if index == nil {
		index = map[string]interface{}{"bugs": []interface{}{}}
	}
	appendToList(index, "bugs", map[string]interface{}{
		"file": filename,
	})
	if err := writeYAMLMapFile(indexPath, index); err != nil {
		return err
	}

	fmt.Printf("Created bug: %s\n", bugID)
	if !simple && strings.TrimSpace(body) == "" {
		fmt.Println("IMPORTANT: You MUST fill in the .todo file that was created.")
	}
	return nil
}

func runFixed(args []string) error {
	if err := validateAllowedFlags(args, map[string]bool{
		"--title":       true,
		"-T":            true,
		"--description": true,
		"--desc":        true,
		"--at":          true,
		"--tags":        true,
		"--body":        true,
		"-b":            true,
	}); err != nil {
		return err
	}

	title := strings.TrimSpace(parseOption(args, "--title", "-T"))
	optionNamesWithValue := map[string]bool{
		"--title":       true,
		"-T":            true,
		"--description": true,
		"--desc":        true,
		"--at":          true,
		"--tags":        true,
		"--body":        true,
		"-b":            true,
	}
	positional := positionalArgs(args, optionNamesWithValue)
	positionalTitle := strings.TrimSpace(strings.Join(positional, " "))
	if title == "" && positionalTitle != "" {
		title = positionalTitle
	}
	if title == "" {
		return errors.New("fixed requires --title or FIX_TEXT")
	}

	description := strings.TrimSpace(parseOption(args, "--description", "--desc"))
	if description == "" {
		description = title
	}
	atRaw := strings.TrimSpace(parseOption(args, "--at"))
	timestamp, err := parseFixedTimestamp(atRaw)
	if err != nil {
		return err
	}

	tags := parseCSV(parseOption(args, "--tags"))
	body := parseOption(args, "--body", "-b")

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	fixesDir := filepath.Join(dataDir, "fixes")
	indexPath := filepath.Join(fixesDir, "index.yaml")
	next, err := nextAuxNumber(indexPath, "fixes", "F")
	if err != nil {
		return err
	}

	fixedID := fmt.Sprintf("F%03d", next)
	monthDir := timestamp.UTC().Format("2006-01")
	slug := models.Slugify(title, models.DirectoryNameWidth*15)
	if slug == "" {
		slug = "fixed"
	}
	filename := fmt.Sprintf("%s-%s.todo", fixedID, slug)
	monthPath := filepath.Join(fixesDir, monthDir)
	filePath := filepath.Join(monthPath, filename)
	relativeFile := filepath.ToSlash(filepath.Join("fixes", monthDir, filename))

	frontmatter := map[string]interface{}{
		"id":             fixedID,
		"type":           "fixed",
		"title":          title,
		"description":    description,
		"status":         "done",
		"estimate_hours": 0.0,
		"complexity":     "low",
		"priority":       "low",
		"depends_on":     []string{},
		"tags":           tags,
		"created_at":     timestamp.UTC().Format(time.RFC3339),
		"completed_at":   timestamp.UTC().Format(time.RFC3339),
	}
	if err := writeTodoWithFrontmatter(filePath, frontmatter, body); err != nil {
		return err
	}

	index, err := readYAMLMapFile(indexPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	if index == nil {
		index = map[string]interface{}{"fixes": []interface{}{}}
	}
	appendToList(index, "fixes", map[string]interface{}{
		"id":   fixedID,
		"file": filepath.ToSlash(filepath.Join(monthDir, filename)),
	})
	if err := writeYAMLMapFile(indexPath, index); err != nil {
		return err
	}

	fmt.Printf("Created fixed: %s\n", fixedID)
	fmt.Printf("File: %s/%s\n", filepath.Base(dataDir), relativeFile)
	if len(tags) > 0 {
		fmt.Printf("Tags: %s\n", strings.Join(tags, ", "))
	}
	return nil
}

func runMigrate(args []string) error {
	if err := validateAllowedFlags(args, map[string]bool{
		"--force":      true,
		"-f":           true,
		"--no-symlink": true,
	}); err != nil {
		return err
	}

	force := parseFlag(args, "--force", "-f")
	createSymlink := !parseFlag(args, "--no-symlink")

	cwd, err := os.Getwd()
	if err != nil {
		return err
	}
	tasksPath := filepath.Join(cwd, config.TasksDir)
	backlogPath := filepath.Join(cwd, config.BacklogDir)

	if info, err := os.Stat(backlogPath); err == nil && info.IsDir() {
		if isSymlinkTo(tasksPath, backlogPath) {
			fmt.Println("✓ Already migrated (.tasks is symlink to .backlog)")
			return nil
		}
		if tasksInfo, err := os.Lstat(tasksPath); err == nil && tasksInfo.Mode()&os.ModeSymlink == 0 {
			if !force {
				return errors.New("Both .tasks/ and .backlog/ exist. Use --force to proceed.")
			}
			fmt.Println("✓ Both directories exist (force mode - using .backlog/)")
			return nil
		}
		fmt.Println("✓ Already migrated (.backlog/ exists)")
		return nil
	}

	if _, err := os.Stat(tasksPath); err != nil {
		if os.IsNotExist(err) {
			return errors.New("No .tasks/ directory found to migrate")
		}
		return err
	}

	if err := os.Rename(tasksPath, backlogPath); err != nil {
		return fmt.Errorf("Failed to rename .tasks/ to .backlog/: %w", err)
	}
	if createSymlink {
		if err := os.Symlink(config.BacklogDir, tasksPath); err != nil {
			return fmt.Errorf("Migrated but failed to create symlink: %w", err)
		}
	}

	updated := []string{}
	for _, mdPath := range migrationMarkdownFiles(cwd) {
		changed, err := updateMarkdownForMigration(mdPath)
		if err != nil {
			continue
		}
		if changed {
			updated = append(updated, filepath.Base(mdPath))
		}
	}
	sort.Strings(updated)

	message := "Migrated .tasks/ -> .backlog/"
	if createSymlink {
		message += " (with symlink)"
	}
	if len(updated) > 0 {
		message += "\nUpdated doc files: " + strings.Join(updated, ", ")
	}
	fmt.Printf("✓ %s\n", message)
	return nil
}

func writeTodoWithFrontmatter(path string, frontmatter map[string]interface{}, body string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", filepath.Dir(path), err)
	}
	payload, err := yaml.Marshal(frontmatter)
	if err != nil {
		return fmt.Errorf("failed to serialize frontmatter for %s: %w", path, err)
	}
	content := fmt.Sprintf("---\n%s---\n%s", string(payload), body)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return fmt.Errorf("failed to write %s: %w", path, err)
	}
	return nil
}

func nextAuxNumber(indexPath, listKey, prefix string) (int, error) {
	index, err := readYAMLMapFile(indexPath)
	if err != nil {
		if os.IsNotExist(err) {
			return 1, nil
		}
		return 0, err
	}
	maxID := 0
	for _, raw := range asSlice(index[listKey]) {
		switch entry := raw.(type) {
		case map[string]interface{}:
			if n := prefixedNumber(asString(entry["id"]), prefix); n > maxID {
				maxID = n
			}
			if n := prefixedNumber(filepath.Base(asString(entry["file"])), prefix); n > maxID {
				maxID = n
			}
		case string:
			if n := prefixedNumber(filepath.Base(entry), prefix); n > maxID {
				maxID = n
			}
		}
	}
	return maxID + 1, nil
}

func prefixedNumber(value, prefix string) int {
	raw := strings.TrimSpace(value)
	if raw == "" {
		return 0
	}
	upperRaw := strings.ToUpper(raw)
	upperPrefix := strings.ToUpper(prefix)
	if !strings.HasPrefix(upperRaw, upperPrefix) {
		return 0
	}
	digits := strings.Builder{}
	for _, r := range raw[len(prefix):] {
		if r < '0' || r > '9' {
			break
		}
		digits.WriteRune(r)
	}
	if digits.Len() == 0 {
		return 0
	}
	n, err := strconv.Atoi(digits.String())
	if err != nil {
		return 0
	}
	return n
}

func parseFixedTimestamp(raw string) (time.Time, error) {
	if strings.TrimSpace(raw) == "" {
		return time.Now().UTC(), nil
	}
	normalized := strings.TrimSpace(raw)
	hasTimezone := regexp.MustCompile(`[zZ]|[+-]\d{2}:\d{2}$`).MatchString(normalized)
	if !hasTimezone {
		normalized += "Z"
	}
	timestamp, err := time.Parse(time.RFC3339, normalized)
	if err != nil {
		return time.Time{}, errors.New("fixed --at must be an ISO 8601 timestamp")
	}
	return timestamp.UTC(), nil
}

func migrationMarkdownFiles(root string) []string {
	candidates := []string{
		filepath.Join(root, "AGENTS.md"),
		filepath.Join(root, "CLAUDE.md"),
	}
	if topLevel, err := filepath.Glob(filepath.Join(root, "*.md")); err == nil {
		candidates = append(candidates, topLevel...)
	}

	skip := map[string]bool{
		"README.md":       true,
		"PARITY_DIFFS.md": true,
	}
	seen := map[string]bool{}
	out := []string{}
	for _, candidate := range candidates {
		base := filepath.Base(candidate)
		if skip[base] {
			continue
		}
		if seen[candidate] {
			continue
		}
		info, err := os.Stat(candidate)
		if err != nil || info.IsDir() {
			continue
		}
		seen[candidate] = true
		out = append(out, candidate)
	}
	sort.Strings(out)
	return out
}

func updateMarkdownForMigration(path string) (bool, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return false, nil
	}
	content := string(raw)
	if strings.Contains(content, migrationComment) {
		return false, nil
	}

	updated := content
	for _, command := range migrationKnownCommands {
		updated = strings.ReplaceAll(updated, "`tasks "+command, "`backlog "+command)
		updated = strings.ReplaceAll(updated, "    tasks "+command, "    backlog "+command)
		updated = strings.ReplaceAll(updated, "- tasks "+command, "- backlog "+command)
	}
	updated = strings.ReplaceAll(updated, "`tasks --", "`backlog --")
	updated = strings.ReplaceAll(updated, "`tasks [", "`backlog [")
	updated = strings.ReplaceAll(updated, "python -m tasks", "python -m backlog")
	updated = strings.ReplaceAll(updated, "./tasks.py", "./backlog.py")
	updated = strings.ReplaceAll(updated, "`tasks/`", "`backlog/`")
	updated = strings.ReplaceAll(updated, "\"tasks/", "\"backlog/")

	if updated == content {
		return false, nil
	}
	if err := os.WriteFile(path, []byte(migrationComment+updated), 0o644); err != nil {
		return false, err
	}
	return true, nil
}

func isSymlinkTo(path string, target string) bool {
	info, err := os.Lstat(path)
	if err != nil || info.Mode()&os.ModeSymlink == 0 {
		return false
	}
	linkTarget, err := os.Readlink(path)
	if err != nil {
		return false
	}
	if linkTarget == target {
		return true
	}

	resolvedLink := linkTarget
	if !filepath.IsAbs(resolvedLink) {
		resolvedLink = filepath.Join(filepath.Dir(path), resolvedLink)
	}
	absLink, err := filepath.Abs(resolvedLink)
	if err != nil {
		return false
	}
	absTarget, err := filepath.Abs(target)
	if err != nil {
		return false
	}
	return filepath.Clean(absLink) == filepath.Clean(absTarget)
}

func staleClaims(tasks []models.Task, warnAfterMinutes int, errorAfterMinutes int) []models.Task {
	now := time.Now().UTC()
	out := []models.Task{}
	for _, task := range tasks {
		if task.Status != models.StatusInProgress || task.ClaimedAt == nil {
			continue
		}
		minutes := now.Sub(*task.ClaimedAt).Minutes()
		if minutes >= float64(errorAfterMinutes) || minutes >= float64(warnAfterMinutes) {
			out = append(out, task)
		}
	}
	return out
}

func makeProgressBar(done, total int) string {
	const width = 20
	if total <= 0 {
		return strings.Repeat("░", width)
	}
	filled := int((float64(done) / float64(total)) * width)
	if filled > width {
		filled = width
	}
	return strings.Repeat("█", filled) + strings.Repeat("░", width-filled)
}

func filterPhasesByPathQuery(phases []models.Phase, query models.PathQuery) []models.Phase {
	filtered := []models.Phase{}
	for _, phase := range phases {
		if filteredPhase := filterPhaseByPathQuery(phase, query); filteredPhase != nil {
			filtered = append(filtered, *filteredPhase)
		}
	}
	return filtered
}

func filterPhaseByPathQuery(phase models.Phase, query models.PathQuery) *models.Phase {
	milestones := []models.Milestone{}
	for _, milestone := range phase.Milestones {
		if filteredMilestone := filterMilestoneByPathQuery(milestone, query); filteredMilestone != nil {
			milestones = append(milestones, *filteredMilestone)
		}
	}
	if !query.Matches(phase.ID) && len(milestones) == 0 {
		return nil
	}
	out := phase
	out.Milestones = milestones
	return &out
}

func filterMilestoneByPathQuery(milestone models.Milestone, query models.PathQuery) *models.Milestone {
	epics := []models.Epic{}
	for _, epic := range milestone.Epics {
		if filteredEpic := filterEpicByPathQuery(epic, query); filteredEpic != nil {
			epics = append(epics, *filteredEpic)
		}
	}
	if !query.Matches(milestone.ID) && len(epics) == 0 {
		return nil
	}
	out := milestone
	out.Epics = epics
	return &out
}

func filterEpicByPathQuery(epic models.Epic, query models.PathQuery) *models.Epic {
	tasks := make([]models.Task, 0, len(epic.Tasks))
	for _, task := range epic.Tasks {
		if query.Matches(task.ID) {
			tasks = append(tasks, task)
		}
	}
	if !query.Matches(epic.ID) && len(tasks) == 0 {
		return nil
	}
	out := epic
	out.Tasks = tasks
	return &out
}

func filterUnfinishedPhases(phases []models.Phase) []models.Phase {
	filtered := []models.Phase{}
	for _, phase := range phases {
		if !hasUnfinishedMilestones(phase) {
			continue
		}
		filteredMilestones := []models.Milestone{}
		for _, milestone := range phase.Milestones {
			if !hasUnfinishedEpics(milestone) {
				continue
			}
			filteredMilestones = append(filteredMilestones, milestone)
		}
		if len(filteredMilestones) == 0 {
			continue
		}
		filteredPhase := phase
		filteredPhase.Milestones = filteredMilestones
		filtered = append(filtered, filteredPhase)
	}
	return filtered
}

func mapTreePayload(phases []models.Phase, criticalPath []string, nextAvailable string, maxDepth int, showDetails bool, unfinished bool, showCompletedAux bool) treePayload {
	_ = showDetails
	output := treePayload{
		CriticalPath:     criticalPath,
		NextAvailable:    nextAvailable,
		MaxDepth:         maxDepth,
		ShowDetails:      showDetails,
		UnfinishedOnly:   unfinished,
		ShowCompletedAux: showCompletedAux,
	}

	for _, phase := range phases {
		filteredMilestones := []treeMilestonePayload{}
		for _, milestone := range phase.Milestones {
			if unfinished && !hasUnfinishedEpics(milestone) {
				continue
			}
			filteredEpics := []treeEpicPayload{}
			for _, epic := range milestone.Epics {
				if unfinished && !hasUnfinishedTasks(epic.Tasks) {
					continue
				}
				filteredTasks := epic.Tasks
				if unfinished {
					filteredTasks = []models.Task{}
					for _, task := range epic.Tasks {
						if task.Status == models.StatusDone || task.Status == models.StatusCancelled || task.Status == models.StatusRejected {
							continue
						}
						filteredTasks = append(filteredTasks, task)
					}
				}
				treeEpic := treeEpicPayloadFromEpic(epic, filteredTasks, criticalPath)
				treeEpic.Tasks = filteredTasksPayload(filteredTasks, criticalPath)
				filteredEpics = append(filteredEpics, *treeEpic)
			}
			filteredMilestone := treeMilestonePayloadFromMilestone(milestone, filteredEpics)
			filteredMilestones = append(filteredMilestones, *filteredMilestone)
		}
		output.Phases = append(output.Phases, *treePhasePayloadFromPhase(phase, filteredMilestones))
	}

	return output
}

func treePhasePayloadFromPhase(phase models.Phase, milestones []treeMilestonePayload) *treePhasePayload {
	stats := getTaskStatsForPhase(phase)
	phaseMilestones := []treeMilestonePayload{}
	for _, milestone := range milestones {
		phaseMilestones = append(phaseMilestones, milestone)
	}
	return &treePhasePayload{
		ID:         phase.ID,
		Name:       phase.Name,
		Status:     string(phase.Status),
		Stats:      map[string]int{"done": stats.done, "total": stats.total, "in_progress": stats.inProgress, "blocked": stats.blocked},
		Milestones: phaseMilestones,
	}
}

func treeMilestonePayloadFromMilestone(milestone models.Milestone, epics []treeEpicPayload) *treeMilestonePayload {
	stats := getTaskStatsForMilestone(milestone)
	milestoneEpics := []treeEpicPayload{}
	for _, epic := range epics {
		milestoneEpics = append(milestoneEpics, epic)
	}
	return &treeMilestonePayload{
		ID:     milestone.ID,
		Name:   milestone.Name,
		Status: string(milestone.Status),
		Stats:  map[string]int{"done": stats.done, "total": stats.total, "in_progress": stats.inProgress, "blocked": stats.blocked},
		Epics:  milestoneEpics,
	}
}

func treeEpicPayloadFromEpic(epic models.Epic, tasks []models.Task, _ []string) *treeEpicPayload {
	items := []treeTask{}
	for _, task := range tasks {
		items = append(items, treeTaskFromTask(task, nil))
	}
	return &treeEpicPayload{
		ID:     epic.ID,
		Name:   epic.Name,
		Status: string(epic.Status),
		Tasks:  items,
	}
}

func filteredTasksPayload(tasks []models.Task, criticalPath []string) []treeTask {
	out := []treeTask{}
	for _, task := range tasks {
		out = append(out, treeTaskFromTask(task, criticalPath))
	}
	return out
}

func treeTaskFromTask(task models.Task, criticalPath []string) treeTask {
	claimedBy := task.ClaimedBy
	if claimedBy == "" {
		claimedBy = ""
	}
	pathTask := treeTask{
		ID:          task.ID,
		Title:       task.Title,
		Status:      string(task.Status),
		File:        task.File,
		FileExists:  taskFileExists(task.File),
		Estimate:    task.EstimateHours,
		Complexity:  string(task.Complexity),
		Priority:    string(task.Priority),
		DependsOn:   append([]string{}, task.DependsOn...),
		ClaimedBy:   nil,
		ClaimedAt:   task.ClaimedAt,
		StartedAt:   task.StartedAt,
		CompletedAt: task.CompletedAt,
		OnCritical:  false,
	}
	if claimedBy != "" {
		value := claimedBy
		pathTask.ClaimedBy = &value
	}
	if criticalPath != nil {
		for _, id := range criticalPath {
			if id == task.ID {
				pathTask.OnCritical = true
				break
			}
		}
	}
	return pathTask
}

func renderTreePhase(phase models.Phase, isLast bool, prefix string, criticalPath []string, unfinished bool, showDetails bool, maxDepth int, currentDepth int) []string {
	stats := getTaskStatsForPhase(phase)
	branch := "├── "
	continuation := "│   "
	if isLast {
		branch = "└── "
		continuation = "    "
	}
	lines := []string{fmt.Sprintf("%s% s%s (%d/%d) [%s]", prefix, branch, phase.Name, stats.done, stats.total, phase.Status)}
	if currentDepth >= maxDepth {
		return lines
	}

	milestones := phase.Milestones
	if unfinished {
		milestones = []models.Milestone{}
		for _, milestone := range phase.Milestones {
			if hasUnfinishedEpics(milestone) {
				milestones = append(milestones, milestone)
			}
		}
	}

	for i, milestone := range milestones {
		milestoneIsLast := i == len(milestones)-1
		lines = append(lines, renderTreeMilestone(milestone, milestoneIsLast, prefix+continuation, criticalPath, unfinished, showDetails, maxDepth, currentDepth+1)...)
	}
	return lines
}

func renderTreeMilestone(milestone models.Milestone, isLast bool, prefix string, criticalPath []string, unfinished bool, showDetails bool, maxDepth int, currentDepth int) []string {
	stats := getTaskStatsForMilestone(milestone)
	branch := "├── "
	continuation := "│   "
	if isLast {
		branch = "└── "
		continuation = "    "
	}
	lines := []string{fmt.Sprintf("%s% s%s (%d/%d) [%s]", prefix, branch, milestone.Name, stats.done, stats.total, milestone.Status)}
	if currentDepth >= maxDepth {
		return lines
	}

	epics := milestone.Epics
	if unfinished {
		epics = []models.Epic{}
		for _, epic := range milestone.Epics {
			if hasUnfinishedTasks(epic.Tasks) {
				epics = append(epics, epic)
			}
		}
	}
	for i, epic := range epics {
		isLastEpic := i == len(epics)-1
		lines = append(lines, renderTreeEpic(epic, isLastEpic, prefix+continuation, criticalPath, unfinished, showDetails, maxDepth, currentDepth+1)...)
	}
	return lines
}

func renderTreeEpic(epic models.Epic, isLast bool, prefix string, criticalPath []string, unfinished bool, showDetails bool, maxDepth int, currentDepth int) []string {
	stats := getTaskStatsForEpic(epic)
	branch := "├── "
	continuation := "│   "
	if isLast {
		branch = "└── "
		continuation = "    "
	}
	lines := []string{fmt.Sprintf("%s%s%s (%d/%d) [%s]", prefix, branch, epic.Name, stats.done, stats.total, epic.Status)}
	if currentDepth >= maxDepth {
		return lines
	}

	tasks := epic.Tasks
	if unfinished {
		tasks = filterUnfinishedTasks(epic.Tasks)
	}
	for i, task := range tasks {
		isLastTask := i == len(tasks)-1
		lines = append(lines, renderTreeTaskLine(task, prefix+continuation, isLastTask, criticalPath, showDetails))
	}
	return lines
}

func renderTreeTaskLine(task models.Task, prefix string, isLast bool, criticalPath []string, showDetails bool) string {
	branch := "├── "
	if isLast {
		branch = "└── "
	}
	line := fmt.Sprintf("%s%s%s %s: %s", prefix, branch, statusIcon(task.Status), task.ID, task.Title)
	if !showDetails {
		if isTaskOnCriticalPath(task.ID, criticalPath) {
			line += " ★"
		}
		return line
	}
	details := []string{}
	if task.EstimateHours > 0 {
		details = append(details, fmt.Sprintf("(%.2fh)", task.EstimateHours))
	}
	if task.Status != "" {
		details = append(details, fmt.Sprintf("[%s]", task.Status))
	}
	if task.ClaimedBy != "" {
		details = append(details, "@"+task.ClaimedBy)
	}
	if len(task.DependsOn) > 0 {
		details = append(details, "depends:"+strings.Join(task.DependsOn, ","))
	}
	if isTaskOnCriticalPath(task.ID, criticalPath) {
		details = append(details, "★")
	}
	if len(details) > 0 {
		line += " " + strings.Join(details, " ")
	}
	return line
}

func isTaskOnCriticalPath(taskID string, criticalPath []string) bool {
	for _, id := range criticalPath {
		if id == taskID {
			return true
		}
	}
	return false
}

func filterUnfinishedTasks(tasks []models.Task) []models.Task {
	filtered := []models.Task{}
	for _, task := range tasks {
		if isCompletedStatus(task.Status) {
			continue
		}
		filtered = append(filtered, task)
	}
	return filtered
}

func runPreview(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if err := validateAllowedFlags(args, map[string]bool{"--json": true}); err != nil {
		return err
	}

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	cfg := map[string]float64{}
	calculator := critical_path.NewCriticalPathCalculator(tree, cfg)
	criticalPath, _, err := calculator.Calculate()
	if err != nil {
		return err
	}
	available := calculator.FindAllAvailable()
	if len(available) == 0 {
		fmt.Println("No available tasks found.")
		return nil
	}
	ordered := prioritizeTaskIDs(tree, criticalPath, available)

	normal := []previewTaskPayload{}
	bugs := []previewTaskPayload{}
	ideas := []previewTaskPayload{}
	for _, taskID := range ordered {
		task := tree.FindTask(taskID)
		if task == nil {
			continue
		}
		payload := buildPreviewTaskPayload(*task, criticalPath, calculator, tree, !parseFlag(args, "--json"), dataDir)
		if isBugLikeID(task.ID) {
			if len(bugs) < previewAuxLimit {
				bugs = append(bugs, payload)
			}
			continue
		}
		if isIdeaLikeID(task.ID) {
			if len(ideas) < previewAuxLimit {
				ideas = append(ideas, payload)
			}
			continue
		}
		if len(normal) < previewDisplayLimit {
			normal = append(normal, payload)
		}
		if len(normal) >= previewDisplayLimit && len(bugs) >= previewAuxLimit && len(ideas) >= previewAuxLimit {
			break
		}
	}

	if parseFlag(args, "--json") {
		output := map[string]interface{}{
			"critical_path":  criticalPath,
			"normal":         normal,
			"bugs":           bugs,
			"ideas":          ideas,
			"next_available": firstPlannedTask(ordered),
		}
		raw, err := json.MarshalIndent(output, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	printPreviewItems := func(label string, items []previewTaskPayload) {
		if len(items) == 0 {
			return
		}
		fmt.Printf("\n%s (%d)\n", label, len(items))
		for _, item := range items {
			critical := "  "
			if item.OnCritical {
				critical = "★ "
			}
			path := item.Path
			if strings.TrimSpace(path) == "" {
				path = item.File
			}
			fmt.Printf("%s%s %s: %s\n", critical, item.ID, critical, item.Title)
			fmt.Printf("  File: %s | Estimate: %.2fh | %s / %s\n", path, item.EstimateHours, item.Priority, item.Complexity)
			if len(item.GrabAdditional) > 0 {
				fmt.Printf("  If you run `backlog grab`, you would also get: %s\n", strings.Join(item.GrabAdditional, ", "))
			} else {
				fmt.Println("  If you run `backlog grab`, you get this task only.")
			}
		}
	}

	fmt.Println()
	fmt.Println("Preview available work:")
	printPreviewItems("Normal Tasks", normal)
	printPreviewItems("Bugs", bugs)
	printPreviewItems("Ideas", ideas)
	if len(normal) > 0 || len(bugs) > 0 || len(ideas) > 0 {
		fmt.Println("\n★ = On critical path")
	}
	return nil
}

func firstPlannedTask(taskIDs []string) string {
	if len(taskIDs) == 0 {
		return ""
	}
	for _, id := range taskIDs {
		if !isBugLikeID(id) && !isIdeaLikeID(id) {
			return id
		}
	}
	return taskIDs[0]
}

func buildPreviewTaskPayload(task models.Task, criticalPath []string, calc *critical_path.CriticalPathCalculator, tree models.TaskTree, includePath bool, dataDir string) previewTaskPayload {
	payload := previewTaskPayload{
		ID:            task.ID,
		Title:         task.Title,
		Status:        string(task.Status),
		File:          task.File,
		FileExists:    taskFileExists(task.File),
		EstimateHours: task.EstimateHours,
		Complexity:    string(task.Complexity),
		Priority:      string(task.Priority),
		OnCritical:    false,
	}
	for _, id := range criticalPath {
		if id == task.ID {
			payload.OnCritical = true
			break
		}
	}
	if includePath {
		payload.Path = filepath.Join(dataDir, task.File)
	}
	ids, err := findGrabCandidates(task, calc, tree)
	if err != nil {
		return payload
	}
	for _, id := range ids {
		candidate := tree.FindTask(id)
		if candidate == nil {
			continue
		}
		if !taskFileExists(candidate.File) {
			continue
		}
		payload.GrabAdditional = append(payload.GrabAdditional, id)
	}
	return payload
}

func findGrabCandidates(task models.Task, calc *critical_path.CriticalPathCalculator, _ models.TaskTree) ([]string, error) {
	if isBugLikeID(task.ID) {
		return calc.FindAdditionalBugs(task.ID, grabBugAdditionalMax)
	}
	return calc.FindSiblingTasks(task.ID, grabSiblingAdditionalMax)
}

func taskFileExists(raw string) bool {
	taskPath, err := resolveTaskFilePath(raw)
	if err != nil {
		return false
	}
	_, err = os.Stat(taskPath)
	return err == nil
}

func runGrab(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if err := validateAllowedFlags(
		args,
		map[string]bool{
			"--agent":       true,
			"--scope":       true,
			"--single":      true,
			"--multi":       true,
			"--siblings":    true,
			"--no-siblings": true,
			"--count":       true,
			"--no-content":  true,
		},
	); err != nil {
		return err
	}

	taskIDs := []string{}
	for i := 0; i < len(args); i++ {
		arg := args[i]
		if arg == "--agent" || arg == "--scope" || arg == "--count" {
			i++
			continue
		}
		if arg == "--single" || arg == "--multi" || arg == "--siblings" || arg == "--no-siblings" || arg == "--no-content" {
			continue
		}
		if strings.HasPrefix(arg, "--agent=") || strings.HasPrefix(arg, "--scope=") || strings.HasPrefix(arg, "--count=") {
			continue
		}
		if strings.HasPrefix(arg, "-") {
			continue
		}
		taskIDs = append(taskIDs, arg)
	}

	agent := parseOption(args, "--agent")
	if strings.TrimSpace(agent) == "" {
		agent = "cli-user"
	}
	single := parseFlag(args, "--single")
	multi := parseFlag(args, "--multi")
	includeSiblings := !parseFlag(args, "--no-siblings")
	count := grabSiblingAdditionalMax
	if rawCount := strings.TrimSpace(parseOption(args, "--count")); rawCount != "" {
		parsed, err := parseIntOptionWithDefault(args, grabSiblingAdditionalMax, "--count")
		if err != nil {
			return err
		}
		if parsed > 0 {
			count = parsed
		}
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}

	if len(taskIDs) > 0 {
		claimed := []models.Task{}
		for _, id := range taskIDs {
			if err := validateTaskID(id); err != nil {
				return err
			}
			task := findTask(tree, id)
			if task == nil {
				return fmt.Errorf("Task not found: %s", id)
			}
			if _, err := resolveTaskFilePath(task.File); err != nil || !taskFileExists(task.File) {
				return fmt.Errorf("Cannot claim %s because the task file is missing.", task.ID)
			}
			if task.Status != models.StatusPending {
				return fmt.Errorf("Cannot claim task %s: task is %s, not pending", task.ID, task.Status)
			}
			if task.ClaimedBy != "" {
				return fmt.Errorf("Task %s is already claimed by %s", task.ID, task.ClaimedBy)
			}
			if err := claimTaskInTree(task, agent, time.Now().UTC(), tree); err != nil {
				return err
			}
			if len(taskIDs) == 1 {
				fmt.Printf("Claimed: %s\n", task.ID)
			} else {
				fmt.Printf("✓ Claimed: %s - %s\n", task.ID, task.Title)
			}
			claimed = append(claimed, *task)
		}
		if len(taskIDs) > 1 {
			additional := make([]string, 0, len(claimed)-1)
			for _, t := range claimed[1:] {
				additional = append(additional, t.ID)
			}
			if err := taskcontext.SetMultiTaskContext(dataDir, agent, claimed[0].ID, additional); err != nil {
				return err
			}
			fmt.Printf("\nWorking on: %s\n", claimed[0].ID)
		} else {
			if err := taskcontext.SetCurrentTask(dataDir, claimed[0].ID, agent); err != nil {
				return err
			}
			fmt.Printf("Working on: %s\n", claimed[0].ID)
		}
		return nil
	}

	cfg := map[string]float64{}
	calculator := critical_path.NewCriticalPathCalculator(tree, cfg)
	criticalPath, nextAvailable, err := calculator.Calculate()
	if err != nil {
		return err
	}
	if strings.TrimSpace(nextAvailable) == "" {
		fmt.Println("No available tasks found.")
		return nil
	}

	scope := strings.TrimSpace(parseOption(args, "--scope"))
	if scope != "" {
		available := calculator.FindAllAvailable()
		filtered := []string{}
		for _, id := range available {
			if strings.HasPrefix(id, scope) {
				filtered = append(filtered, id)
			}
		}
		filtered = prioritizeTaskIDs(tree, criticalPath, filtered)
		if len(filtered) == 0 {
			fmt.Printf("No available tasks in scope '%s'\n", scope)
			return nil
		}
		nextAvailable = filtered[0]
	}

	primary := tree.FindTask(nextAvailable)
	if primary == nil {
		return fmt.Errorf("Task not found: %s", nextAvailable)
	}
	if _, err := resolveTaskFilePath(primary.File); err != nil || !taskFileExists(primary.File) {
		return fmt.Errorf("Cannot claim %s because the task file is missing.", primary.ID)
	}
	if err := claimTaskInTree(primary, agent, time.Now().UTC(), tree); err != nil {
		return err
	}

	additional := []models.Task{}
	if !single {
		candidateIDs := []string{}
		if multi {
			candidateIDs, err = findIndependentCandidates(tree, calculator, *primary, count)
		} else if includeSiblings {
			candidateIDs, err = findGrabCandidates(*primary, calculator, tree)
		}
		if err != nil {
			return err
		}

		additionalLimit := count
		if additionalLimit < 0 {
			additionalLimit = 0
		}
		for _, id := range candidateIDs {
			if len(additional) >= additionalLimit {
				break
			}
			task := findTask(tree, id)
			if task == nil {
				continue
			}
			if task.Status != models.StatusPending || task.ClaimedBy != "" {
				continue
			}
			if !taskFileExists(task.File) {
				continue
			}
			if err := claimTaskInTree(task, agent, time.Now().UTC(), tree); err != nil {
				return err
			}
			additional = append(additional, *task)
		}
	}

	if len(additional) > 0 {
		additionalIDs := make([]string, len(additional))
		for i, task := range additional {
			additionalIDs[i] = task.ID
		}
		if multi || isBugLikeID(primary.ID) {
			if err := taskcontext.SetMultiTaskContext(dataDir, agent, primary.ID, additionalIDs); err != nil {
				return err
			}
		} else {
			if err := taskcontext.SetSiblingTaskContext(dataDir, agent, primary.ID, additionalIDs); err != nil {
				return err
			}
		}
		fmt.Printf("Grabbed: %s - %s\n", primary.ID, primary.Title)
		fmt.Printf("Also grabbed %d additional task(s): %s\n", len(additional), strings.Join(additionalIDs, ", "))
		return nil
	}

	if err := taskcontext.SetCurrentTask(dataDir, primary.ID, agent); err != nil {
		return err
	}
	fmt.Printf("Grabbed: %s - %s\n", primary.ID, primary.Title)
	return nil
}

func prioritizeTaskIDs(tree models.TaskTree, criticalPath []string, taskIDs []string) []string {
	cpPos := map[string]int{}
	for i, id := range criticalPath {
		cpPos[id] = i
	}

	maxPos := int(^uint(0) >> 1)
	type rankedTask struct {
		id           string
		originalPos  int
		typeRank     int
		priorityRank int
		onCritical   int
		cpPos        int
	}

	ranked := make([]rankedTask, 0, len(taskIDs))
	for idx, id := range taskIDs {
		task := tree.FindTask(id)
		if task == nil {
			continue
		}
		ranked = append(ranked, rankedTask{
			id:           task.ID,
			originalPos:  idx,
			typeRank:     prioritizeTaskType(task.ID),
			priorityRank: prioritizeTaskPriority(task.Priority),
			onCritical:   boolToInt(containsTaskID(criticalPath, task.ID)),
			cpPos: func() int {
				if value, ok := cpPos[task.ID]; ok {
					return value
				}
				return maxPos
			}(),
		})
	}

	sort.SliceStable(ranked, func(i, j int) bool {
		a, b := ranked[i], ranked[j]
		if a.typeRank != b.typeRank {
			return a.typeRank < b.typeRank
		}
		if a.priorityRank != b.priorityRank {
			return a.priorityRank < b.priorityRank
		}
		if a.onCritical != b.onCritical {
			return a.onCritical < b.onCritical
		}
		if a.cpPos != b.cpPos {
			return a.cpPos < b.cpPos
		}
		return a.originalPos < b.originalPos
	})

	out := make([]string, 0, len(ranked))
	for _, item := range ranked {
		out = append(out, item.id)
	}
	return out
}

func prioritizeTaskType(id string) int {
	if isBugLikeID(id) {
		return 0
	}
	if isIdeaLikeID(id) {
		return 2
	}
	return 1
}

func prioritizeTaskPriority(priority models.Priority) int {
	switch priority {
	case models.PriorityCritical:
		return 0
	case models.PriorityHigh:
		return 1
	case models.PriorityMedium:
		return 2
	case models.PriorityLow:
		return 3
	default:
		return 4
	}
}

func boolToInt(v bool) int {
	if v {
		return 0
	}
	return 1
}

func containsString(items []string, value string) bool {
	return containsTaskID(items, value)
}

func containsTaskID(items []string, value string) bool {
	for _, item := range items {
		if item == value {
			return true
		}
	}
	return false
}

func findIndependentCandidates(tree models.TaskTree, calc *critical_path.CriticalPathCalculator, primary models.Task, count int) ([]string, error) {
	if count <= 0 {
		return []string{}, nil
	}
	available := calc.FindAllAvailable()
	criticalPath, _, err := calc.Calculate()
	if err != nil {
		return nil, err
	}
	filtered := []string{}
	for _, id := range available {
		if id == primary.ID {
			continue
		}
		task := tree.FindTask(id)
		if task == nil {
			continue
		}
		if strings.TrimSpace(task.EpicID) == "" || task.EpicID == primary.EpicID {
			continue
		}
		filtered = append(filtered, id)
	}
	return prioritizeTaskIDs(tree, criticalPath, filtered), nil
}

func claimTaskInTree(task *models.Task, agent string, now time.Time, tree models.TaskTree) error {
	task.Status = models.StatusInProgress
	task.ClaimedBy = agent
	task.ClaimedAt = &now
	task.StartedAt = &now
	return saveTaskState(*task, tree)
}

func positionalArgs(args []string, valueTakingFlags map[string]bool) []string {
	out := []string{}
	for i := 0; i < len(args); i++ {
		arg := args[i]
		if !strings.HasPrefix(arg, "-") {
			out = append(out, arg)
			continue
		}
		if strings.Contains(arg, "=") {
			continue
		}
		if valueTakingFlags[arg] && i+1 < len(args) {
			i++
		}
	}
	return out
}

func validateAllowedFlags(args []string, allowed map[string]bool) error {
	for i := 0; i < len(args); i++ {
		arg := args[i]
		if !strings.HasPrefix(arg, "-") {
			continue
		}
		if arg == "--" {
			break
		}
		flag, _ := splitOption(arg)
		if !allowed[flag] {
			return fmt.Errorf("unexpected flag: %s", flag)
		}
	}
	return nil
}

type taskStats struct {
	done       int
	total      int
	inProgress int
	blocked    int
}

func allTaskIDs(tree models.TaskTree) []string {
	ids := []string{}
	for _, phase := range tree.Phases {
		ids = append(ids, phase.ID)
		for _, milestone := range phase.Milestones {
			ids = append(ids, milestone.ID)
			for _, epic := range milestone.Epics {
				ids = append(ids, epic.ID)
				for _, task := range epic.Tasks {
					ids = append(ids, task.ID)
				}
			}
		}
	}
	for _, bug := range tree.Bugs {
		ids = append(ids, bug.ID)
	}
	for _, idea := range tree.Ideas {
		ids = append(ids, idea.ID)
	}
	return ids
}

func scopedTaskSetContains(candidate string, scope []string) bool {
	if len(scope) == 0 {
		return false
	}
	for _, item := range scope {
		if item == candidate {
			return true
		}
	}
	return false
}

func isCompletedStatus(status models.Status) bool {
	return status == models.StatusDone || status == models.StatusRejected || status == models.StatusCancelled
}

func includeCompletionAux(status models.Status, unfinished bool, showCompletedAux bool) bool {
	if unfinished {
		return !isCompletedStatus(status)
	}
	if showCompletedAux {
		return true
	}
	return !isCompletedStatus(status)
}

func isBugLikeID(value string) bool {
	return regexp.MustCompile(`^B\d+$`).MatchString(value)
}

func isIdeaLikeID(value string) bool {
	return regexp.MustCompile(`^I\d+$`).MatchString(value)
}

func parsePhaseTaskStats(items []models.Task) taskStats {
	stats := taskStats{}
	for _, task := range items {
		stats.total++
		switch task.Status {
		case models.StatusDone:
			stats.done++
		case models.StatusInProgress:
			stats.inProgress++
		case models.StatusBlocked:
			stats.blocked++
		}
	}
	return stats
}

func getTaskStatsForPhase(phase models.Phase) taskStats {
	tasks := []models.Task{}
	for _, milestone := range phase.Milestones {
		for _, epic := range milestone.Epics {
			tasks = append(tasks, epic.Tasks...)
		}
	}
	return parsePhaseTaskStats(tasks)
}

func getTaskStatsForMilestone(milestone models.Milestone) taskStats {
	tasks := []models.Task{}
	for _, epic := range milestone.Epics {
		tasks = append(tasks, epic.Tasks...)
	}
	return parsePhaseTaskStats(tasks)
}

func getTaskStatsForEpic(epic models.Epic) taskStats {
	return parsePhaseTaskStats(epic.Tasks)
}

func resolveListScope(tree models.TaskTree, rawScope string, scopeType string) ([]models.Phase, []string, int, string) {
	if strings.TrimSpace(rawScope) == "" {
		return nil, nil, 0, ""
	}

	if scopeType == "phase" {
		return resolveListScopeByPhase(tree, rawScope)
	}
	if scopeType == "milestone" {
		return resolveListScopeByMilestone(tree, rawScope)
	}
	if scopeType == "epic" {
		return resolveListScopeByEpic(tree, rawScope)
	}

	taskPath, err := models.ParseTaskPath(rawScope)
	if err != nil {
		if phase := tree.FindPhase(rawScope); phase != nil {
			return resolveListScopeByPhase(tree, phase.ID)
		}
		if milestone := findMilestone(tree, rawScope); milestone != nil {
			return resolveListScopeByMilestone(tree, milestone.ID)
		}
		if epic := findEpic(tree, rawScope); epic != nil {
			return resolveListScopeByEpic(tree, epic.ID)
		}
		return nil, nil, 0, rawScope
	}

	if !taskPath.IsPhase() && !taskPath.IsMilestone() && !taskPath.IsEpic() && !taskPath.IsTask() {
		return nil, nil, 0, rawScope
	}

	switch taskPath.Depth() {
	case 1:
		return resolveListScopeByPhase(tree, taskPath.FullID())
	case 2:
		return resolveListScopeByMilestone(tree, taskPath.FullID())
	case 3:
		return resolveListScopeByEpic(tree, taskPath.FullID())
	default:
		return nil, nil, 0, rawScope
	}
}

func resolveListScopeByPhase(tree models.TaskTree, rawScope string) ([]models.Phase, []string, int, string) {
	phaseNode := tree.FindPhase(rawScope)
	if phaseNode == nil {
		return nil, nil, 1, rawScope
	}
	phase := *phaseNode
	return []models.Phase{phase}, collectPhaseTaskIDs(phase), 1, phase.ID
}

func resolveListScopeByMilestone(tree models.TaskTree, rawScope string) ([]models.Phase, []string, int, string) {
	milestoneNode := findMilestone(tree, rawScope)
	if milestoneNode == nil {
		return nil, nil, 2, rawScope
	}
	phase := tree.FindPhase(milestoneNode.PhaseID)
	if phase == nil {
		return nil, nil, 2, milestoneNode.ID
	}
	filteredPhase := *phase
	filteredMilestones := []models.Milestone{}
	for _, milestone := range phase.Milestones {
		if tree.IDsMatch(milestone.ID, milestoneNode.ID) {
			filteredMilestones = append(filteredMilestones, milestone)
		}
	}
	filteredPhase.Milestones = filteredMilestones
	if len(filteredPhase.Milestones) == 0 {
		return nil, nil, 2, milestoneNode.ID
	}
	return []models.Phase{filteredPhase}, collectMilestoneTaskIDs(*milestoneNode), 2, milestoneNode.ID
}

func resolveListScopeByEpic(tree models.TaskTree, rawScope string) ([]models.Phase, []string, int, string) {
	epic := findEpic(tree, rawScope)
	if epic == nil {
		return nil, nil, 3, rawScope
	}
	phase := tree.FindPhase(epic.PhaseID)
	if phase == nil {
		return nil, nil, 3, epic.ID
	}
	filteredPhase := *phase
	filteredMilestones := []models.Milestone{}
	filteredTaskIDs := []string{}
	for _, milestone := range phase.Milestones {
		if milestone.ID == "" || (!tree.IDsMatch(milestone.ID, epic.MilestoneID) && milestone.ID != epic.MilestoneID) {
			continue
		}
		filteredMilestone := milestone
		filteredEpics := []models.Epic{}
		for _, scopedEpic := range milestone.Epics {
			if !tree.IDsMatch(scopedEpic.ID, epic.ID) {
				continue
			}
			filteredEpics = append(filteredEpics, scopedEpic)
			filteredTaskIDs = append(filteredTaskIDs, collectEpicTaskIDs(scopedEpic)...)
		}
		if len(filteredEpics) > 0 {
			filteredMilestone.Epics = filteredEpics
			filteredMilestones = append(filteredMilestones, filteredMilestone)
		}
	}
	filteredPhase.Milestones = filteredMilestones
	if len(filteredPhase.Milestones) == 0 {
		return nil, nil, 3, epic.ID
	}
	return []models.Phase{filteredPhase}, filteredTaskIDs, 3, epic.ID
}

func collectPhaseTaskIDs(phase models.Phase) []string {
	out := []string{}
	for _, milestone := range phase.Milestones {
		out = append(out, collectMilestoneTaskIDs(milestone)...)
	}
	return out
}

func collectMilestoneTaskIDs(milestone models.Milestone) []string {
	out := []string{}
	for _, epic := range milestone.Epics {
		out = append(out, collectEpicTaskIDs(epic)...)
	}
	return out
}

func collectEpicTaskIDs(epic models.Epic) []string {
	out := []string{}
	for _, task := range epic.Tasks {
		out = append(out, task.ID)
	}
	return out
}

func hasUnfinishedMilestones(phase models.Phase) bool {
	for _, milestone := range phase.Milestones {
		if hasUnfinishedEpics(milestone) {
			return true
		}
	}
	return false
}

func hasUnfinishedEpics(milestone models.Milestone) bool {
	for _, epic := range milestone.Epics {
		if hasUnfinishedTasks(epic.Tasks) {
			return true
		}
	}
	return false
}

func hasUnfinishedTasks(tasks []models.Task) bool {
	for _, task := range tasks {
		if !isCompletedStatus(task.Status) {
			return true
		}
	}
	return false
}

func renderListProgress(tree models.TaskTree, criticalPath []string, scoped bool, scopedPhases []models.Phase, _ string, _ string, _ string, _ string, _ int, taskMatches func(models.Task) bool) error {
	phases := tree.Phases
	if scoped {
		phases = scopedPhases
	}
	if len(phases) == 0 {
		fmt.Println("No list nodes found for path query: unknown")
		return nil
	}

	fmt.Println("Project Progress")
	allTasks := findAllTasksInTree(tree)
	for _, phase := range phases {
		phaseTasks := collectPhaseTaskIDs(phase)
		counts := parsePhaseTaskStats(filterTasksByIDs(phaseTasks, allTasks, taskMatches))
		fmt.Printf("%s (%d/%d done, in_progress=%d, blocked=%d)\n", phase.ID, counts.done, counts.total, counts.inProgress, counts.blocked)
		bugMarker := ""
		for _, id := range criticalPath {
			if strings.HasPrefix(id, phase.ID) {
				bugMarker = "★"
				break
			}
		}
		if bugMarker != "" {
			fmt.Println("  on critical path")
		}
	}
	return nil
}

func filterTasksByIDs(taskIDs []string, allTasks []models.Task, taskMatches func(models.Task) bool) []models.Task {
	set := map[string]struct{}{}
	for _, id := range taskIDs {
		if strings.TrimSpace(id) != "" {
			set[id] = struct{}{}
		}
	}
	if taskMatches == nil {
		taskMatches = func(_ models.Task) bool {
			return true
		}
	}
	out := []models.Task{}
	for _, task := range allTasks {
		if _, ok := set[task.ID]; !ok {
			continue
		}
		if !taskMatches(task) {
			continue
		}
		out = append(out, task)
	}
	return out
}

func renderListAvailable(tree models.TaskTree, calculator *critical_path.CriticalPathCalculator, outputJSON bool, scopedTasks []string, taskMatches func(models.Task) bool, criticalPath []string, includeNormal, includeBugs, includeIdeas bool, _ bool) error {
	scoped := map[string]struct{}{}
	for _, id := range scopedTasks {
		scoped[id] = struct{}{}
	}

	filtered := []models.Task{}
	for _, taskID := range calculator.FindAllAvailable() {
		task := findTask(tree, taskID)
		if task == nil {
			continue
		}
		if !taskMatches(*task) {
			continue
		}
		if !includeNormal {
			if isBugLikeID(task.ID) && !includeBugs {
				continue
			}
			if isIdeaLikeID(task.ID) && !includeIdeas {
				continue
			}
			if !isBugLikeID(task.ID) && !isIdeaLikeID(task.ID) {
				continue
			}
		}
		if len(scoped) > 0 {
			if _, ok := scoped[task.ID]; !ok {
				continue
			}
		}
		filtered = append(filtered, *task)
	}

	if outputJSON {
		type availableJSON struct {
			ID            string  `json:"id"`
			Title         string  `json:"title"`
			EstimateHours float64 `json:"estimate_hours"`
			Complexity    string  `json:"complexity"`
			Priority      string  `json:"priority"`
			OnCritical    bool    `json:"on_critical_path"`
		}
		out := make([]availableJSON, 0, len(filtered))
		for _, task := range filtered {
			out = append(out, availableJSON{
				ID:            task.ID,
				Title:         task.Title,
				EstimateHours: task.EstimateHours,
				Complexity:    string(task.Complexity),
				Priority:      string(task.Priority),
				OnCritical:    containsString(criticalPath, task.ID),
			})
		}
		raw, err := json.MarshalIndent(map[string]any{
			"available": out,
		}, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	if len(filtered) == 0 {
		fmt.Println("No available tasks found.")
		return nil
	}
	grouped := map[string][]models.Task{}
	bugs := []models.Task{}
	ideas := []models.Task{}
	for _, task := range filtered {
		if isBugLikeID(task.ID) {
			bugs = append(bugs, task)
			continue
		}
		if isIdeaLikeID(task.ID) {
			ideas = append(ideas, task)
			continue
		}
		phaseID := ""
		p, err := task.TaskPath()
		if err == nil {
			phaseID = p.Phase
		}
		grouped[phaseID] = append(grouped[phaseID], task)
	}

	for _, phase := range tree.Phases {
		tasks := grouped[phase.ID]
		if len(tasks) == 0 {
			continue
		}
		fmt.Printf("%s (%d available)\n", phase.Name, len(tasks))
		for _, task := range tasks {
			critical := "  "
			if containsString(criticalPath, task.ID) {
				critical = "★ "
			}
			fmt.Printf("%s%s: %s\n", critical, task.ID, task.Title)
		}
	}
	if len(bugs) > 0 {
		fmt.Printf("Bugs (%d available)\n", len(bugs))
		for _, task := range bugs {
			critical := "  "
			if containsString(criticalPath, task.ID) {
				critical = "★ "
			}
			fmt.Printf("%s%s: %s\n", critical, task.ID, task.Title)
		}
	}
	if len(ideas) > 0 {
		fmt.Printf("Ideas (%d available)\n", len(ideas))
		for _, task := range ideas {
			critical := "  "
			if containsString(criticalPath, task.ID) {
				critical = "★ "
			}
			fmt.Printf("%s%s: %s\n", critical, task.ID, task.Title)
		}
	}
	return nil
}

func renderListJSON(tree models.TaskTree, scoped bool, scopedPhases []models.Phase, includeNormal, includeBugs, includeIdeas, showAll, unfinished, showCompletedAux bool, taskMatches func(models.Task) bool, criticalPath []string, nextAvailable string, hasComplexityFilter, hasPriorityFilter bool, complexityFilter models.Complexity, priorityFilter models.Priority, scopedTasks []string, statusFilter []string) error {
	_ = showAll
	phasesSource := scopedPhases
	if phasesSource == nil {
		if includeNormal {
			phasesSource = tree.Phases
		} else {
			phasesSource = []models.Phase{}
		}
	}

	scopedSet := map[string]struct{}{}
	for _, id := range scopedTasks {
		scopedSet[id] = struct{}{}
	}

	filteredNormal := []models.Task{}
	for _, phase := range phasesSource {
		for _, milestone := range phase.Milestones {
			for _, epic := range milestone.Epics {
				for _, task := range epic.Tasks {
					if !taskMatches(task) {
						continue
					}
					if len(scopedSet) > 0 {
						if _, ok := scopedSet[task.ID]; !ok {
							continue
						}
					}
					filteredNormal = append(filteredNormal, task)
				}
			}
		}
	}
	type taskJSON struct {
		ID            string  `json:"id"`
		Title         string  `json:"title"`
		Status        string  `json:"status"`
		EstimateHours float64 `json:"estimate_hours"`
		Complexity    string  `json:"complexity"`
		Priority      string  `json:"priority"`
		OnCritical    bool    `json:"on_critical_path"`
	}

	output := map[string]any{
		"critical_path":  criticalPath,
		"next_available": nextAvailable,
	}
	if hasComplexityFilter {
		output["filter"] = map[string]any{"complexity": string(complexityFilter)}
	}
	if hasPriorityFilter {
		if _, ok := output["filter"]; !ok {
			output["filter"] = map[string]any{}
		}
		filter := output["filter"].(map[string]any)
		filter["priority"] = string(priorityFilter)
	}

	phasesOut := []map[string]any{}
	for _, phase := range phasesSource {
		phaseTasks := []taskJSON{}
		milestonesOut := []map[string]any{}
		for _, milestone := range phase.Milestones {
			if unfinished {
				unfinishedEpic := false
				for _, epic := range milestone.Epics {
					if hasUnfinishedTasks(epic.Tasks) {
						unfinishedEpic = true
						break
					}
				}
				if !unfinishedEpic {
					continue
				}
			}
			for _, epic := range milestone.Epics {
				if unfinished && !hasUnfinishedTasks(epic.Tasks) {
					continue
				}
				for _, task := range epic.Tasks {
					if !taskMatches(task) {
						continue
					}
					phaseTasks = append(phaseTasks, taskJSON{
						ID:            task.ID,
						Title:         task.Title,
						Status:        string(task.Status),
						EstimateHours: task.EstimateHours,
						Complexity:    string(task.Complexity),
						Priority:      string(task.Priority),
						OnCritical:    containsString(criticalPath, task.ID),
					})
				}
			}
			stats := getTaskStatsForMilestone(milestone)
			milestonesOut = append(milestonesOut, map[string]any{
				"id":     milestone.ID,
				"name":   milestone.Name,
				"status": string(milestone.Status),
				"stats":  map[string]int{"done": stats.done, "total": stats.total, "in_progress": stats.inProgress, "blocked": stats.blocked},
			})
		}
		stats := getTaskStatsForPhase(phase)
		ph := map[string]any{
			"id":     phase.ID,
			"name":   phase.Name,
			"status": string(phase.Status),
			"stats": map[string]int{
				"done":        stats.done,
				"total":       stats.total,
				"in_progress": stats.inProgress,
				"blocked":     stats.blocked,
			},
			"milestones": milestonesOut,
		}
		phasesOut = append(phasesOut, ph)
	}
	output["phases"] = phasesOut

	outputTasks := []taskJSON{}
	for _, task := range filteredNormal {
		if len(statusFilter) > 0 && !containsString(statusFilter, string(task.Status)) {
			continue
		}
		outputTasks = append(outputTasks, taskJSON{
			ID:            task.ID,
			Title:         task.Title,
			Status:        string(task.Status),
			EstimateHours: task.EstimateHours,
			Complexity:    string(task.Complexity),
			Priority:      string(task.Priority),
			OnCritical:    containsString(criticalPath, task.ID),
		})
	}
	output["tasks"] = outputTasks

	bugs := []taskJSON{}
	for _, bug := range tree.Bugs {
		if !includeBugs {
			continue
		}
		if !includeCompletionAux(bug.Status, unfinished, showCompletedAux) {
			continue
		}
		bugs = append(bugs, taskJSON{
			ID:            bug.ID,
			Title:         bug.Title,
			Status:        string(bug.Status),
			EstimateHours: bug.EstimateHours,
			Priority:      string(bug.Priority),
			OnCritical:    containsString(criticalPath, bug.ID),
		})
	}
	output["bugs"] = bugs

	ideas := []taskJSON{}
	for _, idea := range tree.Ideas {
		if !includeIdeas {
			continue
		}
		if !includeCompletionAux(idea.Status, unfinished, showCompletedAux) {
			continue
		}
		ideas = append(ideas, taskJSON{
			ID:            idea.ID,
			Title:         idea.Title,
			Status:        string(idea.Status),
			EstimateHours: idea.EstimateHours,
			Priority:      string(idea.Priority),
			OnCritical:    containsString(criticalPath, idea.ID),
		})
	}
	output["ideas"] = ideas

	out, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		return err
	}
	fmt.Println(string(out))
	return nil
}

func renderListText(command string, tree models.TaskTree, scoped bool, scopedPhases []models.Phase, scopedTasks []string, _ string, _ int, taskMatches func(models.Task) bool, criticalPath []string, showAll bool) error {
	_ = showAll
	fmt.Printf("Critical Path: %s\n", strings.Join(criticalPath[:min(len(criticalPath), 10)], " -> "))

	phases := tree.Phases
	if scoped {
		phases = scopedPhases
	}
	for _, phase := range phases {
		stats := parsePhaseTaskStats([]models.Task{})
		for _, milestone := range phase.Milestones {
			for _, epic := range milestone.Epics {
				stats.total += len(epic.Tasks)
				for _, task := range epic.Tasks {
					if !taskMatches(task) {
						continue
					}
					switch task.Status {
					case models.StatusDone:
						stats.done++
					case models.StatusInProgress:
						stats.inProgress++
					case models.StatusBlocked:
						stats.blocked++
					}
				}
			}
		}
		if scopedTasks != nil && stats.total == 0 && len(scopedTasks) > 0 {
			continue
		}
		milestoneLines := []string{}
		for _, milestone := range phase.Milestones {
			milestoneDone := 0
			milestoneTotal := 0
			for _, epic := range milestone.Epics {
				for _, task := range epic.Tasks {
					if !taskMatches(task) {
						continue
					}
					milestoneTotal++
					if task.Status == models.StatusDone {
						milestoneDone++
					}
				}
			}
			if milestoneTotal == 0 {
				continue
			}
			milestoneLines = append(milestoneLines, fmt.Sprintf("  %s (%d/%d tasks done)", milestone.Name, milestoneDone, milestoneTotal))
		}
		fmt.Printf("%s (%d/%d tasks done)\n", phase.Name, stats.done, stats.total)
		limit := 5
		for i, line := range milestoneLines {
			if i >= limit {
				fmt.Printf("  ... and %d more milestones\n", len(milestoneLines)-limit)
				break
			}
			fmt.Println(line)
		}
		fmt.Println()
	}

	bugs := []models.Task{}
	for _, bug := range tree.Bugs {
		if bug.ID == "" {
			continue
		}
		if taskMatches(bug) {
			bugs = append(bugs, bug)
		}
	}
	if len(bugs) > 0 {
		done := 0
		for _, bug := range bugs {
			if bug.Status == models.StatusDone {
				done++
			}
		}
		fmt.Printf("Bugs (%d/%d done)\n", done, len(bugs))
		for i, bug := range bugs {
			prefix := "  ├── "
			if i == len(bugs)-1 {
				prefix = "  └── "
			}
			icon := statusIcon(bug.Status)
			critical := ""
			if containsString(criticalPath, bug.ID) {
				critical = "★ "
			}
			fmt.Printf("%s%s%s: %s [%s]\n", prefix, icon, critical, bug.ID, bug.Title)
		}
	}

	ideas := []models.Task{}
	for _, idea := range tree.Ideas {
		if idea.ID == "" {
			continue
		}
		if taskMatches(idea) {
			ideas = append(ideas, idea)
		}
	}
	if len(ideas) > 0 {
		done := 0
		for _, idea := range ideas {
			if idea.Status == models.StatusDone {
				done++
			}
		}
		fmt.Printf("Ideas (%d/%d done)\n", done, len(ideas))
		for i, idea := range ideas {
			prefix := "  ├── "
			if i == len(ideas)-1 {
				prefix = "  └── "
			}
			icon := statusIcon(idea.Status)
			critical := ""
			if containsString(criticalPath, idea.ID) {
				critical = "★ "
			}
			fmt.Printf("%s%s%s: %s [%s]\n", prefix, icon, critical, idea.ID, idea.Title)
		}
	}
	return nil
}

func renderBugOrIdeaDetail(task models.Task, showInstructions bool, dataDir string) {
	fmt.Printf("%s: %s\nstatus=%s estimate=%.2f\n", task.ID, task.Title, task.Status, task.EstimateHours)
	if showInstructions {
		fmt.Println("Idea instructions: evaluate feasibility and create concrete tasks in backlog.")
	}
	file := filepath.Join(dataDir, task.File)
	if task.File != "" {
		fmt.Printf("File: %s\n", file)
	}
}

func showScopedItem(tree models.TaskTree, id string, scopePath *models.TaskPath, dataDir string) error {
	if scopePath == nil {
		parsed, err := models.ParseTaskPath(id)
		if err != nil {
			return fmt.Errorf("Invalid path format: %s", id)
		}
		scopePath = &parsed
	}
	parent := scopePath.Parent()
	scopeHint := ""
	if parent != nil {
		scopeHint = parent.FullID()
	}
	switch {
	case scopePath.IsPhase():
		phase := tree.FindPhase(scopePath.FullID())
		if phase == nil {
			return showNotFound("Phase", id, scopeHint)
		}
		stats := getTaskStatsForPhase(*phase)
		fmt.Printf("%s: %s\n", phase.ID, phase.Name)
		fmt.Printf("Status: %s\n", phase.Status)
		fmt.Printf("Done: %d / %d\n", stats.done, stats.total)
		return nil
	case scopePath.IsMilestone():
		milestone := findMilestone(tree, scopePath.FullID())
		if milestone == nil {
			return showNotFound("Milestone", id, scopeHint)
		}
		stats := getTaskStatsForMilestone(*milestone)
		fmt.Printf("%s: %s\n", milestone.ID, milestone.Name)
		fmt.Printf("Status: %s\n", milestone.Status)
		fmt.Printf("Done: %d / %d\n", stats.done, stats.total)
		return nil
	case scopePath.IsEpic():
		epic := findEpic(tree, scopePath.FullID())
		if epic == nil {
			return showNotFound("Epic", id, scopeHint)
		}
		stats := getTaskStatsForEpic(*epic)
		fmt.Printf("%s: %s\n", epic.ID, epic.Name)
		fmt.Printf("Status: %s\n", epic.Status)
		fmt.Printf("Done: %d / %d\n", stats.done, stats.total)
		return nil
	case scopePath.IsTask():
		task := findTask(tree, scopePath.FullID())
		if task == nil {
			return showNotFound("Task", id, scopeHint)
		}
		renderTaskDetail(*task, dataDir)
		return nil
	default:
		return showNotFound("Task", id, scopeHint)
	}
}

func showNotFound(itemType, itemID, scopeHint string) error {
	fmt.Printf("Error: %s not found: %s\n", itemType, itemID)
	if scopeHint != "" {
		fmt.Printf("Tip: Use 'backlog tree %s' to verify available IDs.\n", scopeHint)
	} else {
		fmt.Println("Tip: Use 'backlog tree' to list available IDs.")
	}
	return fmt.Errorf("%s not found", itemType)
}

func phasePathFromID(raw string) *models.TaskPath {
	candidate := strings.TrimSpace(raw)
	if candidate == "" {
		return nil
	}
	if strings.HasPrefix(candidate, ".") {
		candidate = strings.TrimPrefix(candidate, ".")
	}
	if !strings.Contains(candidate, ".") {
		return nil
	}
	path, err := models.ParseTaskPath(candidate)
	if err != nil {
		return nil
	}
	return &path
}

func findMilestone(tree models.TaskTree, id string) *models.Milestone {
	return tree.FindMilestone(id)
}

func findEpic(tree models.TaskTree, id string) *models.Epic {
	return tree.FindEpic(id)
}

func findTask(tree models.TaskTree, id string) *models.Task {
	if tree.IDsMatch(id, "") {
		return nil
	}
	if task := tree.FindTask(id); task != nil {
		return task
	}
	for i := range tree.Phases {
		phase := &tree.Phases[i]
		for j := range phase.Milestones {
			milestone := &phase.Milestones[j]
			for k := range milestone.Epics {
				epic := &milestone.Epics[k]
				for l := range epic.Tasks {
					task := &epic.Tasks[l]
					if tree.IDsMatch(task.ID, id) {
						return task
					}
				}
			}
		}
	}
	for i := range tree.Bugs {
		task := &tree.Bugs[i]
		if tree.IDsMatch(task.ID, id) {
			return task
		}
	}
	for i := range tree.Ideas {
		task := &tree.Ideas[i]
		if tree.IDsMatch(task.ID, id) {
			return task
		}
	}
	return nil
}

func findAuxiliaryTask(tree models.TaskTree, id string) (*models.Task, error) {
	if task := findTask(tree, id); task != nil {
		return task, nil
	}
	return nil, fmt.Errorf("Task not found: %s", id)
}

func findAllTasksInTree(tree models.TaskTree) []models.Task {
	out := []models.Task{}
	for _, phase := range tree.Phases {
		for _, milestone := range phase.Milestones {
			for _, epic := range milestone.Epics {
				out = append(out, epic.Tasks...)
			}
		}
	}
	out = append(out, tree.Bugs...)
	out = append(out, tree.Ideas...)
	return out
}

func findNormalTasksInTree(tree models.TaskTree) []models.Task {
	out := []models.Task{}
	for _, phase := range tree.Phases {
		for _, milestone := range phase.Milestones {
			for _, epic := range milestone.Epics {
				out = append(out, epic.Tasks...)
			}
		}
	}
	return out
}

func printTaskSummary(task *models.Task, dataDir string) error {
	taskPath := filepath.Join(dataDir, task.File)
	frontmatter, body, err := readTodoFrontmatter(task.ID, task.File)
	if err != nil {
		fmt.Println("Task file missing")
		fmt.Printf("Task: %s - %s\n", task.ID, task.Title)
		fmt.Println("Frontmatter:")
		fmt.Println("  (unavailable)")
		if strings.TrimSpace(taskPath) != "" {
			fmt.Printf("Missing: %s\n", taskPath)
		}
		return nil
	}
	fmt.Printf("Task: %s - %s\n", task.ID, task.Title)
	fmt.Println("Frontmatter:")
	if len(frontmatter) > 0 {
		out, err := yaml.Marshal(frontmatter)
		if err != nil {
			return err
		}
		fmt.Println(strings.TrimSpace(string(out)))
	} else {
		fmt.Println("  (unavailable)")
	}
	fmt.Printf("Body length: %d\n", len(body))
	fmt.Printf("Run 'backlog show %s' for full details.\n", task.ID)
	return nil
}

func renderTaskDetail(task models.Task, dataDir string) {
	fmt.Printf("Task: %s\n", task.ID)
	fmt.Printf("Title: %s\n", task.Title)
	fmt.Printf("Status: %s\n", task.Status)
	fmt.Printf("Estimate: %.2f\n", task.EstimateHours)
	fmt.Printf("Complexity: %s\n", task.Complexity)
	fmt.Printf("Priority: %s\n", task.Priority)
	if task.ClaimedBy != "" {
		fmt.Printf("Claimed by: %s\n", task.ClaimedBy)
	}
	fmt.Printf("File: %s\n", filepath.Join(dataDir, task.File))
}

func statusIcon(status models.Status) string {
	switch status {
	case models.StatusDone:
		return "✓ "
	case models.StatusInProgress:
		return "→ "
	case models.StatusPending:
		return "[ ] "
	case models.StatusBlocked:
		return "✗ "
	default:
		return "X "
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func runClaim(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if err := validateAllowedFlags(args, map[string]bool{
		"--agent":      true,
		"--force":      true,
		"--no-content": true,
	}); err != nil {
		return err
	}

	taskIDs := positionalArgs(args, map[string]bool{
		"--agent":      true,
		"--force":      false,
		"--no-content": false,
	})
	if len(taskIDs) == 0 {
		return errors.New("claim requires at least one TASK_ID")
	}
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	agent := parseOption(args, "--agent")
	if strings.TrimSpace(agent) == "" {
		agent = "cli-user"
	}
	force := parseFlag(args, "--force")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}

	hasContext := false
	for _, id := range taskIDs {
		if err := validateTaskID(id); err != nil {
			return err
		}
		task := tree.FindTask(id)
		if task == nil {
			return fmt.Errorf("Task not found: %s", id)
		}
		taskFilePath, err := resolveTaskFilePath(task.File)
		if err != nil {
			return err
		}
		if _, err := os.Stat(taskFilePath); err != nil {
			return fmt.Errorf("Cannot claim %s because the task file is missing.", task.ID)
		}
		if task.ClaimedBy != "" && !force {
			return fmt.Errorf("Task %s is already claimed by %s", task.ID, task.ClaimedBy)
		}
		if task.Status != models.StatusPending {
			return fmt.Errorf("Cannot claim task %s: task is %s, not pending", task.ID, task.Status)
		}

		task.Status = models.StatusInProgress
		task.ClaimedBy = agent
		now := time.Now().UTC()
		task.ClaimedAt = &now
		task.StartedAt = &now

		if err := saveTaskState(*task, tree); err != nil {
			return err
		}

		if !hasContext {
			if err := taskcontext.SetCurrentTask(dataDir, task.ID, agent); err != nil {
				return err
			}
			hasContext = true
		}

		if len(taskIDs) == 1 {
			fmt.Printf("Claimed: %s\n", task.ID)
		} else {
			fmt.Printf("✓ Claimed: %s - %s\n", task.ID, task.Title)
		}
	}
	return nil
}

func runCycle(args []string) error {
	if _, err := ensureDataDir(); err != nil {
		return err
	}
	if err := validateAllowedFlags(args, map[string]bool{"--agent": true, "--no-content": true}); err != nil {
		return err
	}
	taskID := firstPositionalArg(args, map[string]bool{
		"--agent":      true,
		"--no-content": true,
	})
	agent := strings.TrimSpace(parseOption(args, "--agent"))
	if strings.TrimSpace(agent) == "" {
		agent = "cli-user"
	}
	dataDir, err := ensureDataDir()
	if err != nil {
		return err
	}
	if strings.TrimSpace(taskID) == "" {
		ctx, err := taskcontext.LoadContext(dataDir)
		if err != nil {
			return err
		}
		if ctx.Agent != "" && ctx.Agent != agent {
			return errors.New("No task ID provided and no current working task set.")
		}
		taskID = ctx.CurrentTask
		if taskID == "" {
			taskID = ctx.PrimaryTask
		}
		if taskID == "" {
			return errors.New("No task ID provided and no current working task set.")
		}
	}
	if err := validateTaskID(taskID); err != nil {
		return err
	}
	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	task := findTask(tree, taskID)
	if task == nil {
		return fmt.Errorf("Task not found: %s", taskID)
	}

	if task.Status != models.StatusDone {
		if task.StartedAt != nil {
			duration := time.Since(*task.StartedAt).Minutes()
			task.DurationMinutes = &duration
		}
		if err := applyTaskStatusTransition(task, models.StatusDone, ""); err != nil {
			return err
		}
		if err := saveTaskState(*task, tree); err != nil {
			return err
		}
	}

	completion, err := setItemDone(*task, tree)
	if err != nil {
		return err
	}
	fmt.Printf("Completed: %s - %s\n", task.ID, task.Title)
	if task.DurationMinutes != nil {
		fmt.Printf("Duration: %d minutes\n", int(*task.DurationMinutes))
	}
	printCompletionNotice(tree, *task, completion)

	if completion.EpicCompleted || completion.MilestoneCompleted || completion.PhaseCompleted {
		if err := taskcontext.ClearContext(dataDir); err != nil {
			return err
		}
		fmt.Println("Review Required")
		fmt.Println("Please review the completed work before continuing.")
		fmt.Println("Run 'backlog grab' after review.")
		return nil
	}

	if handled, err := advanceCycleContext(task.ID, agent, dataDir); err != nil {
		return err
	} else if handled {
		return nil
	}

	cfg := map[string]float64{}
	refreshedTree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	calculator := critical_path.NewCriticalPathCalculator(refreshedTree, cfg)
	_, nextAvailable, err := calculator.Calculate()
	if err != nil {
		return err
	}
	if strings.TrimSpace(nextAvailable) == "" {
		dataDir, err := ensureDataDir()
		if err != nil {
			return err
		}
		if err := taskcontext.ClearContext(dataDir); err != nil {
			return err
		}
		fmt.Println("No more available tasks.")
		return nil
	}
	return grabTaskByID(refreshedTree, *calculator, nextAvailable, dataDirFromContext(), agent)
}

func advanceCycleContext(taskID string, agent string, dataDir string) (bool, error) {
	ctx, err := taskcontext.LoadContext(dataDir)
	if err != nil {
		return false, err
	}
	if ctx.Agent != "" && ctx.Agent != agent {
		return false, nil
	}

	switch ctx.Mode {
	case "siblings":
		if strings.TrimSpace(ctx.PrimaryTask) == "" {
			return false, nil
		}
		if taskID != ctx.PrimaryTask && !taskIDInList(ctx.SiblingTasks, taskID) {
			return false, nil
		}

		primary := ctx.PrimaryTask
		siblings := append([]string{}, ctx.SiblingTasks...)
		if taskID == primary {
			if len(siblings) == 0 {
				return false, nil
			}
			newPrimary := siblings[0]
			remaining := siblings[1:]
			if len(remaining) > 0 {
				if err := taskcontext.SetSiblingTaskContext(dataDir, agent, newPrimary, remaining); err != nil {
					return false, err
				}
			} else {
				if err := taskcontext.SetCurrentTask(dataDir, newPrimary, agent); err != nil {
					return false, err
				}
			}
			fmt.Printf("Primary sibling completed. Next sibling: %s\n", newPrimary)
			return true, nil
		}

		remaining := removeTaskFromList(siblings, taskID)
		if len(remaining) > 0 {
			if err := taskcontext.SetSiblingTaskContext(dataDir, agent, primary, remaining); err != nil {
				return false, err
			}
		} else {
			if err := taskcontext.SetCurrentTask(dataDir, primary, agent); err != nil {
				return false, err
			}
		}
		fmt.Printf("Sibling task completed. Returning to primary: %s\n", primary)
		return true, nil

	case "multi":
		if strings.TrimSpace(ctx.PrimaryTask) == "" {
			return false, nil
		}
		if taskID != ctx.PrimaryTask && !taskIDInList(ctx.AdditionalTasks, taskID) {
			return false, nil
		}

		primary := ctx.PrimaryTask
		additional := append([]string{}, ctx.AdditionalTasks...)
		if taskID == primary {
			if len(additional) == 0 {
				return false, nil
			}
			newPrimary := additional[0]
			remaining := additional[1:]
			if len(remaining) > 0 {
				if err := taskcontext.SetMultiTaskContext(dataDir, agent, newPrimary, remaining); err != nil {
					return false, err
				}
			} else {
				if err := taskcontext.SetCurrentTask(dataDir, newPrimary, agent); err != nil {
					return false, err
				}
			}
			fmt.Printf("Primary task completed. Additional tasks still active.\n")
			fmt.Printf("New primary task: %s\n", newPrimary)
			return true, nil
		}

		remaining := removeTaskFromList(additional, taskID)
		if len(remaining) > 0 {
			if err := taskcontext.SetMultiTaskContext(dataDir, agent, primary, remaining); err != nil {
				return false, err
			}
		} else {
			if err := taskcontext.SetCurrentTask(dataDir, primary, agent); err != nil {
				return false, err
			}
		}
		fmt.Printf("Additional task completed. Returning to primary: %s\n", primary)
		return true, nil
	}
	return false, nil
}

func taskIDInList(list []string, target string) bool {
	for _, value := range list {
		if value == target {
			return true
		}
	}
	return false
}

func removeTaskFromList(list []string, target string) []string {
	out := make([]string, 0, len(list))
	for _, value := range list {
		if value == target {
			continue
		}
		out = append(out, value)
	}
	return out
}

func grabTaskByID(tree models.TaskTree, calc critical_path.CriticalPathCalculator, taskID string, dataDir string, agent string) error {
	primary := tree.FindTask(taskID)
	if primary == nil {
		return fmt.Errorf("Task not found: %s", taskID)
	}
	if _, err := resolveTaskFilePath(primary.File); err != nil || !taskFileExists(primary.File) {
		return fmt.Errorf("Cannot claim %s because the task file is missing.", primary.ID)
	}
	if err := claimTaskInTree(primary, agent, time.Now().UTC(), tree); err != nil {
		return err
	}

	candidateIDs, err := findGrabCandidates(*primary, &calc, tree)
	if err != nil {
		return err
	}
	additional := []models.Task{}
	for _, candidateID := range candidateIDs {
		if len(additional) >= grabSiblingAdditionalMax {
			break
		}
		candidate := findTask(tree, candidateID)
		if candidate == nil {
			continue
		}
		if candidate.Status != models.StatusPending || candidate.ClaimedBy != "" {
			continue
		}
		if !taskFileExists(candidate.File) {
			continue
		}
		if err := claimTaskInTree(candidate, agent, time.Now().UTC(), tree); err != nil {
			return err
		}
		additional = append(additional, *candidate)
	}

	if len(additional) > 0 {
		additionalIDs := make([]string, len(additional))
		for i, item := range additional {
			additionalIDs[i] = item.ID
		}
		if isBugLikeID(primary.ID) {
			if err := taskcontext.SetMultiTaskContext(dataDir, agent, primary.ID, additionalIDs); err != nil {
				return err
			}
		} else {
			if err := taskcontext.SetSiblingTaskContext(dataDir, agent, primary.ID, additionalIDs); err != nil {
				return err
			}
		}
		fmt.Printf("Grabbed: %s - %s\n", primary.ID, primary.Title)
		fmt.Printf("Also grabbed %d additional task(s): %s\n", len(additional), strings.Join(additionalIDs, ", "))
		return nil
	}

	if err := taskcontext.SetCurrentTask(dataDir, primary.ID, agent); err != nil {
		return err
	}
	fmt.Printf("Grabbed: %s - %s\n", primary.ID, primary.Title)
	return nil
}

func setItemDone(task models.Task, tree models.TaskTree) (completionNotice, error) {
	if strings.TrimSpace(task.EpicID) == "" || strings.TrimSpace(task.MilestoneID) == "" || strings.TrimSpace(task.PhaseID) == "" {
		return completionNotice{}, nil
	}

	epic := tree.FindEpic(task.EpicID)
	milestone := tree.FindMilestone(task.MilestoneID)
	phase := tree.FindPhase(task.PhaseID)
	if epic == nil {
		return completionNotice{}, fmt.Errorf("Epic not found: %s", task.EpicID)
	}
	if milestone == nil {
		return completionNotice{}, fmt.Errorf("Milestone not found: %s", task.MilestoneID)
	}
	if phase == nil {
		return completionNotice{}, fmt.Errorf("Phase not found: %s", task.PhaseID)
	}

	epicCompleted := true
	for _, child := range epic.Tasks {
		if child.Status != models.StatusDone {
			epicCompleted = false
			break
		}
	}

	milestoneCompleted := true
	for _, childEpic := range milestone.Epics {
		for _, childTask := range childEpic.Tasks {
			if childTask.Status != models.StatusDone {
				milestoneCompleted = false
				break
			}
		}
		if !milestoneCompleted {
			break
		}
	}

	phaseCompleted := true
	for _, childMilestone := range phase.Milestones {
		for _, childEpic := range childMilestone.Epics {
			for _, childTask := range childEpic.Tasks {
				if childTask.Status != models.StatusDone {
					phaseCompleted = false
					break
				}
			}
			if !phaseCompleted {
				break
			}
		}
		if !phaseCompleted {
			break
		}
	}

	completion := completionNotice{
		EpicCompleted:      epicCompleted,
		MilestoneCompleted: milestoneCompleted,
		PhaseCompleted:     phaseCompleted,
	}

	dataDir, err := ensureDataDir()
	if err != nil {
		return completionNotice{}, err
	}

	rootPath := filepath.Join(dataDir, "index.yaml")
	rootIndex, err := readYAMLMapFile(rootPath)
	if err != nil {
		return completionNotice{}, err
	}
	phasesRaw := asSlice(rootIndex["phases"])
	for _, raw := range phasesRaw {
		entry, ok := raw.(map[string]interface{})
		if !ok {
			continue
		}
		if !tree.IDsMatch(asString(entry["id"]), phase.ID) {
			continue
		}
		if phaseCompleted {
			entry["status"] = string(models.StatusDone)
			entry["locked"] = true
		}
		break
	}
	if err := writeYAMLMapFile(rootPath, rootIndex); err != nil {
		return completionNotice{}, err
	}

	phaseIndexPath := filepath.Join(dataDir, phase.Path, "index.yaml")
	phaseIndex, err := readYAMLMapFile(phaseIndexPath)
	if err != nil {
		return completionNotice{}, err
	}
	if phaseCompleted {
		phaseIndex["status"] = string(models.StatusDone)
		phaseIndex["locked"] = true
	}
	if milestoneCompleted {
		for _, raw := range asSlice(phaseIndex["milestones"]) {
			entry, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			if tree.IDsMatch(asString(entry["id"]), milestone.ID) {
				entry["status"] = string(models.StatusDone)
				break
			}
		}
	}
	if err := writeYAMLMapFile(phaseIndexPath, phaseIndex); err != nil {
		return completionNotice{}, err
	}

	milestoneIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path, "index.yaml")
	milestoneIndex, err := readYAMLMapFile(milestoneIndexPath)
	if err != nil {
		return completionNotice{}, err
	}
	if milestoneCompleted {
		milestoneIndex["status"] = string(models.StatusDone)
	}
	if epicCompleted {
		for _, raw := range asSlice(milestoneIndex["epics"]) {
			entry, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			if tree.IDsMatch(asString(entry["id"]), epic.ID) {
				entry["status"] = string(models.StatusDone)
				break
			}
		}
	}
	if err := writeYAMLMapFile(milestoneIndexPath, milestoneIndex); err != nil {
		return completionNotice{}, err
	}

	epicIndexPath := filepath.Join(dataDir, phase.Path, milestone.Path, epic.Path, "index.yaml")
	epicIndex, err := readYAMLMapFile(epicIndexPath)
	if err != nil {
		return completionNotice{}, err
	}
	if epicCompleted {
		epicIndex["status"] = string(models.StatusDone)
	}
	if err := writeYAMLMapFile(epicIndexPath, epicIndex); err != nil {
		return completionNotice{}, err
	}

	return completion, nil
}

func printCompletionNotice(tree models.TaskTree, task models.Task, notice completionNotice) {
	if !notice.EpicCompleted && !notice.MilestoneCompleted && !notice.PhaseCompleted {
		return
	}

	if notice.EpicCompleted {
		epic := findEpic(tree, task.EpicID)
		if epic != nil {
			fmt.Printf("════════════════════════════════════════════════════════════════════\n")
			fmt.Printf("EPIC COMPLETE: %s (%s)\n", epic.Name, epic.ID)
			fmt.Printf("Review the completed epic.\n")
			fmt.Println()
		}
	}

	if notice.MilestoneCompleted {
		milestone := findMilestone(tree, task.MilestoneID)
		if milestone != nil && len(milestone.Epics) > 1 {
			fmt.Printf("════════════════════════════════════════════════════════════════════\n")
			fmt.Printf("MILESTONE COMPLETE: %s (%s)\n", milestone.Name, milestone.ID)
			fmt.Printf("Review the completed milestone.\n")
			fmt.Println()
		}
	}

	if notice.PhaseCompleted {
		phase := tree.FindPhase(task.PhaseID)
		if phase != nil {
			fmt.Printf("════════════════════════════════════════════════════════════════════\n")
			fmt.Printf("PHASE COMPLETE: %s (%s)\n", phase.Name, phase.ID)
			fmt.Printf("Review the completed phase.\n")
			fmt.Println()
		}
	}
}

func runWork(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	clearContext := parseFlag(args, "--clear")
	if clearContext {
		if err := taskcontext.ClearContext(dataDir); err != nil {
			return err
		}
		fmt.Println("Cleared working task context.")
		return nil
	}

	targetTask := ""
	for _, arg := range args {
		if strings.HasPrefix(arg, "-") {
			continue
		}
		targetTask = arg
		break
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}

	if targetTask != "" {
		if err := validateTaskID(targetTask); err != nil {
			return err
		}
		task := tree.FindTask(targetTask)
		if task == nil {
			return fmt.Errorf("Task not found: %s", targetTask)
		}
		if err := taskcontext.SetCurrentTask(dataDir, task.ID, ""); err != nil {
			return err
		}
		fmt.Printf("Working task set: %s - %s\n", task.ID, task.Title)
		return nil
	}

	ctx, err := taskcontext.LoadContext(dataDir)
	if err != nil {
		return err
	}
	currentTask := ctx.CurrentTask
	if currentTask == "" {
		currentTask = ctx.PrimaryTask
	}
	if currentTask == "" {
		fmt.Println("No current working task set.")
		return nil
	}

	task := tree.FindTask(currentTask)
	if task == nil {
		fmt.Printf("Working task '%s' not found in tree.\n", currentTask)
		return nil
	}

	fmt.Println("Current Working Task")
	fmt.Printf("ID: %s\n", task.ID)
	fmt.Printf("Title: %s\n", task.Title)
	fmt.Printf("Status: %s\n", task.Status)
	fmt.Printf("Estimate: %.2f hours\n", task.EstimateHours)
	fmt.Printf("File: %s\n", filepath.Join(dataDir, task.File))
	return nil
}

func runMove(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}

	source := firstPositionalArg(args, map[string]bool{
		"--to": true,
	})
	if source == "" {
		return errors.New("move requires SOURCE_ID")
	}
	if err := validateTaskID(source); err != nil {
		return err
	}

	dest := parseOption(args, "--to")
	if dest == "" {
		return errors.New("move requires --to DEST_ID")
	}
	if err := validateTaskID(dest); err != nil {
		return err
	}

	sourcePath, err := models.ParseTaskPath(source)
	if err != nil {
		return fmt.Errorf("invalid task id: %s", source)
	}
	destPath, err := models.ParseTaskPath(dest)
	if err != nil {
		return fmt.Errorf("invalid task id: %s", dest)
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}

	remap := map[string]string{}
	switch {
	case sourcePath.IsTask() && destPath.IsEpic():
		task := tree.FindTask(source)
		if task == nil {
			return fmt.Errorf("Task not found: %s", source)
		}
		destEpic := tree.FindEpic(dest)
		if destEpic == nil {
			return fmt.Errorf("Epic not found: %s", dest)
		}

		srcEpic := tree.FindEpic(task.EpicID)
		srcMilestone := tree.FindMilestone(task.MilestoneID)
		srcPhase := tree.FindPhase(task.PhaseID)
		dstMilestone := tree.FindMilestone(destEpic.MilestoneID)
		dstPhase := tree.FindPhase(destEpic.PhaseID)
		if srcEpic == nil || srcMilestone == nil || srcPhase == nil || dstMilestone == nil || dstPhase == nil {
			return errors.New("Could not resolve source/destination hierarchy paths")
		}

		oldTaskPath, err := resolveTaskFilePath(task.File)
		if err != nil {
			return err
		}
		if _, err := os.Stat(oldTaskPath); err != nil {
			return fmt.Errorf("Task file not found: %s", oldTaskPath)
		}

		srcEpicDir := filepath.Join(dataDir, srcPhase.Path, srcMilestone.Path, srcEpic.Path)
		dstEpicDir := filepath.Join(dataDir, dstPhase.Path, dstMilestone.Path, destEpic.Path)
		srcEpicIndexPath := filepath.Join(srcEpicDir, "index.yaml")
		dstEpicIndexPath := filepath.Join(dstEpicDir, "index.yaml")

		srcEpicIndex, err := readYAMLMapFile(srcEpicIndexPath)
		if err != nil {
			return err
		}
		dstEpicIndex, err := readYAMLMapFile(dstEpicIndexPath)
		if err != nil {
			return err
		}

		nextTask := nextIndexID(extractTaskLeafIDs(dstEpicIndex["tasks"]), "T")
		newTaskShort := fmt.Sprintf("T%03d", nextTask)
		newTaskID := fmt.Sprintf("%s.%s", destEpic.ID, newTaskShort)
		newFilename := fmt.Sprintf("%s-%s.todo", newTaskShort, models.Slugify(task.Title, models.DirectoryNameWidth*15))
		if err := os.Rename(oldTaskPath, filepath.Join(dstEpicDir, newFilename)); err != nil {
			return err
		}

		oldFilename := filepath.Base(oldTaskPath)
		srcTasks := asSlice(srcEpicIndex["tasks"])
		filteredTasks := make([]interface{}, 0, len(srcTasks))
		for _, entry := range srcTasks {
			value, ok := entry.(map[string]interface{})
			if !ok {
				continue
			}
			file := asString(value["file"])
			if file == "" {
				file = asString(value["path"])
			}
			if asString(value["id"]) == sourcePath.Task || asString(value["id"]) == task.ID || file == oldFilename {
				continue
			}
			filteredTasks = append(filteredTasks, entry)
		}
		srcEpicIndex["tasks"] = filteredTasks
		if err := writeYAMLMapFile(srcEpicIndexPath, srcEpicIndex); err != nil {
			return err
		}

		dstTasks := asSlice(dstEpicIndex["tasks"])
		dstTasks = append(dstTasks, map[string]interface{}{
			"id":             newTaskShort,
			"file":           newFilename,
			"title":          task.Title,
			"status":         string(task.Status),
			"estimate_hours": task.EstimateHours,
			"complexity":     string(task.Complexity),
			"priority":       string(task.Priority),
			"depends_on":     task.DependsOn,
		})
		dstEpicIndex["tasks"] = dstTasks
		if err := writeYAMLMapFile(dstEpicIndexPath, dstEpicIndex); err != nil {
			return err
		}

		remap[source] = newTaskID

	case sourcePath.IsEpic() && destPath.IsMilestone():
		srcEpic := tree.FindEpic(source)
		if srcEpic == nil {
			return fmt.Errorf("Epic not found: %s", source)
		}
		dstMilestone := tree.FindMilestone(dest)
		if dstMilestone == nil {
			return fmt.Errorf("Milestone not found: %s", dest)
		}

		srcMilestone := tree.FindMilestone(srcEpic.MilestoneID)
		srcPhase := tree.FindPhase(srcEpic.PhaseID)
		dstPhase := tree.FindPhase(dstMilestone.PhaseID)
		if srcMilestone == nil || srcPhase == nil || dstPhase == nil {
			return errors.New("Could not resolve source/destination hierarchy paths")
		}

		srcEpicDir := filepath.Join(dataDir, srcPhase.Path, srcMilestone.Path, srcEpic.Path)
		srcMsIndexPath := filepath.Join(dataDir, srcPhase.Path, srcMilestone.Path, "index.yaml")
		dstMsDir := filepath.Join(dataDir, dstPhase.Path, dstMilestone.Path)
		dstMsIndexPath := filepath.Join(dstMsDir, "index.yaml")

		dstMilestoneIndex, err := readYAMLMapFile(dstMsIndexPath)
		if err != nil {
			return err
		}
		nextEpic := nextIndexID(extractEpicOrMilestoneLeafIDs(dstMilestoneIndex["epics"], "E"), "E")
		newEpicShort := fmt.Sprintf("E%d", nextEpic)
		newEpicID := fmt.Sprintf("%s.%s", dstMilestone.ID, newEpicShort)
		newEpicDirName := fmt.Sprintf("%02d-%s", nextEpic, models.Slugify(srcEpic.Name, models.DirectoryNameWidth*15))
		if err := os.Rename(srcEpicDir, filepath.Join(dstMsDir, newEpicDirName)); err != nil {
			return err
		}

		srcMsIndex, err := readYAMLMapFile(srcMsIndexPath)
		if err != nil {
			return err
		}
		srcEpics := asSlice(srcMsIndex["epics"])
		filteredEpics := make([]interface{}, 0, len(srcEpics))
		for _, entry := range srcEpics {
			value, ok := entry.(map[string]interface{})
			if !ok {
				continue
			}
			if asString(value["id"]) == source || asString(value["path"]) == srcEpic.Path {
				continue
			}
			filteredEpics = append(filteredEpics, entry)
		}
		srcMsIndex["epics"] = filteredEpics
		if err := writeYAMLMapFile(srcMsIndexPath, srcMsIndex); err != nil {
			return err
		}

		dstMilestones := asSlice(dstMilestoneIndex["epics"])
		dstMilestones = append(dstMilestones, map[string]interface{}{
			"id":             newEpicShort,
			"name":           srcEpic.Name,
			"path":           newEpicDirName,
			"status":         string(srcEpic.Status),
			"estimate_hours": srcEpic.EstimateHours,
			"complexity":     string(srcEpic.Complexity),
			"depends_on":     srcEpic.DependsOn,
			"description":    srcEpic.Description,
		})
		dstMilestoneIndex["epics"] = dstMilestones
		if err := writeYAMLMapFile(dstMsIndexPath, dstMilestoneIndex); err != nil {
			return err
		}

		remap[source] = newEpicID
		for _, task := range srcEpic.Tasks {
			remap[task.ID] = strings.Replace(task.ID, source+".", newEpicID+".", 1)
		}

	case sourcePath.IsMilestone() && destPath.IsPhase():
		srcMilestone := tree.FindMilestone(source)
		if srcMilestone == nil {
			return fmt.Errorf("Milestone not found: %s", source)
		}
		dstPhase := tree.FindPhase(dest)
		if dstPhase == nil {
			return fmt.Errorf("Phase not found: %s", dest)
		}

		srcPhase := tree.FindPhase(srcMilestone.PhaseID)
		if srcPhase == nil {
			return errors.New("Could not resolve source phase")
		}

		srcMsDir := filepath.Join(dataDir, srcPhase.Path, srcMilestone.Path)
		srcPhaseIndexPath := filepath.Join(dataDir, srcPhase.Path, "index.yaml")
		dstPhaseDir := filepath.Join(dataDir, dstPhase.Path)
		dstPhaseIndexPath := filepath.Join(dstPhaseDir, "index.yaml")

		dstPhaseIndex, err := readYAMLMapFile(dstPhaseIndexPath)
		if err != nil {
			return err
		}
		nextMilestone := nextIndexID(extractEpicOrMilestoneLeafIDs(dstPhaseIndex["milestones"], "M"), "M")
		newMilestoneShort := fmt.Sprintf("M%d", nextMilestone)
		newMilestoneID := fmt.Sprintf("%s.%s", dstPhase.ID, newMilestoneShort)
		newMsDirName := fmt.Sprintf("%02d-%s", nextMilestone, models.Slugify(srcMilestone.Name, models.DirectoryNameWidth*15))
		if err := os.Rename(srcMsDir, filepath.Join(dstPhaseDir, newMsDirName)); err != nil {
			return err
		}

		srcPhaseIndex, err := readYAMLMapFile(srcPhaseIndexPath)
		if err != nil {
			return err
		}
		srcMilestones := asSlice(srcPhaseIndex["milestones"])
		filteredMilestones := make([]interface{}, 0, len(srcMilestones))
		for _, entry := range srcMilestones {
			value, ok := entry.(map[string]interface{})
			if !ok {
				continue
			}
			if asString(value["id"]) == source || asString(value["path"]) == srcMilestone.Path {
				continue
			}
			filteredMilestones = append(filteredMilestones, entry)
		}
		srcPhaseIndex["milestones"] = filteredMilestones
		if err := writeYAMLMapFile(srcPhaseIndexPath, srcPhaseIndex); err != nil {
			return err
		}

		dstMilestones := asSlice(dstPhaseIndex["milestones"])
		dstMilestones = append(dstMilestones, map[string]interface{}{
			"id":             newMilestoneShort,
			"name":           srcMilestone.Name,
			"path":           newMsDirName,
			"status":         string(srcMilestone.Status),
			"estimate_hours": srcMilestone.EstimateHours,
			"complexity":     string(srcMilestone.Complexity),
			"depends_on":     srcMilestone.DependsOn,
			"description":    srcMilestone.Description,
		})
		dstPhaseIndex["milestones"] = dstMilestones
		if err := writeYAMLMapFile(dstPhaseIndexPath, dstPhaseIndex); err != nil {
			return err
		}

		remap[source] = newMilestoneID
		for _, epic := range srcMilestone.Epics {
			newEpicID := strings.Replace(epic.ID, source+".", newMilestoneID+".", 1)
			remap[epic.ID] = newEpicID
			for _, task := range epic.Tasks {
				remap[task.ID] = strings.Replace(task.ID, epic.ID+".", newEpicID+".", 1)
			}
		}

	default:
		return errors.New("invalid move: supported moves are task->epic, epic->milestone, milestone->phase")
	}

	if err := applyIdRemap(remap, dataDir); err != nil {
		return err
	}

	fmt.Printf("Moved: %s\n", source)
	fmt.Printf("To: %s\n", dest)
	fmt.Printf("New ID: %s\n", remap[source])
	return nil
}

func runSync() error {
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	cfg := map[string]float64{}
	calculator := critical_path.NewCriticalPathCalculator(tree, cfg)
	criticalPath, nextAvailable, err := calculator.Calculate()
	if err != nil {
		return err
	}

	allTasks := tree.AllTasks()
	totalTasks := 0
	doneTasks := 0
	inProgressTasks := 0
	blockedTasks := 0
	pendingTasks := 0
	for _, task := range allTasks {
		totalTasks++
		switch task.Status {
		case models.StatusDone:
			doneTasks++
		case models.StatusInProgress:
			inProgressTasks++
		case models.StatusBlocked:
			blockedTasks++
		case models.StatusPending:
			pendingTasks++
		}
	}

	rootPath := filepath.Join(dataDir, "index.yaml")
	root, err := readYAMLMapFile(rootPath)
	if err != nil {
		return err
	}
	root["critical_path"] = criticalPath
	if strings.TrimSpace(nextAvailable) == "" {
		root["next_available"] = nil
	} else {
		root["next_available"] = nextAvailable
	}
	root["stats"] = map[string]interface{}{
		"total_tasks": totalTasks,
		"done":        doneTasks,
		"in_progress": inProgressTasks,
		"blocked":     blockedTasks,
		"pending":     pendingTasks,
	}
	if err := writeYAMLMapFile(rootPath, root); err != nil {
		return err
	}
	fmt.Println("Synced")
	return nil
}

func runUnclaim(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	taskID := ""
	for _, arg := range args {
		if strings.HasPrefix(arg, "-") {
			continue
		}
		taskID = arg
		break
	}
	if taskID == "" {
		dataDir, err := ensureDataRoot()
		if err != nil {
			return err
		}
		ctx, err := taskcontext.LoadContext(dataDir)
		if err != nil {
			return err
		}
		taskID = ctx.CurrentTask
		if taskID == "" {
			taskID = ctx.PrimaryTask
		}
	}
	if taskID == "" {
		return errors.New("No task ID provided and no current working task set.")
	}
	if err := validateTaskID(taskID); err != nil {
		return err
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	task := tree.FindTask(taskID)
	if task == nil {
		return fmt.Errorf("Task not found: %s", taskID)
	}

	if task.Status != models.StatusInProgress && task.Status != models.StatusPending {
		fmt.Printf("Task is not in progress: %s\n", task.Status)
		return nil
	}
	if task.Status == models.StatusInProgress {
		if err := applyTaskStatusTransition(task, models.StatusPending, "unclaim"); err != nil {
			return err
		}
	} else if task.ClaimedBy == "" && task.ClaimedAt == nil {
		fmt.Printf("Task is not in progress: %s\n", task.Status)
		return nil
	} else {
		task.ClaimedBy = ""
		task.ClaimedAt = nil
	}

	if err := saveTaskState(*task, tree); err != nil {
		return err
	}
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	if err := taskcontext.ClearContext(dataDir); err != nil {
		return err
	}
	fmt.Printf("Unclaimed: %s - %s\n", task.ID, task.Title)
	return nil
}

func runBlocked(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if err := validateAllowedFlags(
		args,
		map[string]bool{
			"--reason":  true,
			"-r":        true,
			"--agent":   true,
			"--grab":    true,
			"--no-grab": true,
		},
	); err != nil {
		return err
	}

	taskID := firstPositionalArg(args, map[string]bool{
		"--reason":  true,
		"-r":        true,
		"--agent":   true,
		"--grab":    true,
		"--no-grab": false,
	})
	reason := strings.TrimSpace(parseOption(args, "--reason", "-r"))
	if reason == "" {
		return errors.New("blocked requires --reason")
	}

	if taskID == "" {
		dataDir, err := ensureDataRoot()
		if err != nil {
			return err
		}
		ctx, err := taskcontext.LoadContext(dataDir)
		if err != nil {
			return err
		}
		taskID = ctx.CurrentTask
		if taskID == "" {
			taskID = ctx.PrimaryTask
		}
		if taskID == "" {
			return errors.New("No task ID provided and no current working task set.")
		}
	}
	if err := validateTaskID(taskID); err != nil {
		return err
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	task := tree.FindTask(taskID)
	if task == nil {
		return fmt.Errorf("Task not found: %s", taskID)
	}
	if err := applyTaskStatusTransition(task, models.StatusBlocked, reason); err != nil {
		return err
	}
	if err := saveTaskState(*task, tree); err != nil {
		return err
	}

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	if err := taskcontext.ClearContext(dataDir); err != nil {
		return err
	}

	fmt.Printf("Blocked: %s (%s)\n", task.ID, reason)
	if parseFlag(args, "--no-grab") || !parseFlag(args, "--grab") {
		fmt.Println("Tip: Run `backlog grab` to claim the next available task.")
		return nil
	}

	tree, err = loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	cfg := map[string]float64{}
	calculator := critical_path.NewCriticalPathCalculator(tree, cfg)
	_, nextAvailable, err := calculator.Calculate()
	if err != nil {
		return err
	}
	if strings.TrimSpace(nextAvailable) == "" {
		fmt.Println("No available tasks found.")
		return nil
	}
	next := tree.FindTask(nextAvailable)
	if next == nil {
		fmt.Println("No available tasks found.")
		return nil
	}
	if _, err := resolveTaskFilePath(next.File); err != nil || !taskFileExists(next.File) {
		fmt.Printf("Skipping auto-grab: %s has no task file.\n", next.ID)
		return nil
	}

	agent := strings.TrimSpace(parseOption(args, "--agent"))
	if agent == "" {
		agent = "cli-user"
	}
	if err := grabTaskByID(tree, *calculator, next.ID, dataDirFromContext(), agent); err != nil {
		return err
	}
	return nil
}

func runDone(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if err := validateAllowedFlags(args, map[string]bool{
		"--status": true,
		"--force":  true,
		"--verify": true,
	}); err != nil {
		return err
	}

	taskIDs := positionalArgs(args, map[string]bool{
		"--status": true,
		"--force":  false,
		"--verify": false,
	})
	if len(taskIDs) == 0 {
		dataDir, err := ensureDataRoot()
		if err != nil {
			return err
		}
		ctx, err := taskcontext.LoadContext(dataDir)
		if err != nil {
			return err
		}
		taskID := ctx.CurrentTask
		if taskID == "" {
			taskID = ctx.PrimaryTask
		}
		if taskID == "" {
			return errors.New("No task ID provided and no current working task set.")
		}
		taskIDs = []string{taskID}
	}

	for _, taskID := range taskIDs {
		if err := validateTaskID(taskID); err != nil {
			return err
		}
	}

	statusRaw, hasStatus := parseOptionWithPresence(args, "--status")
	if hasStatus {
		if strings.TrimSpace(statusRaw) == "" {
			return errors.New("expected value for --status")
		}
	} else {
		statusRaw = string(models.StatusDone)
	}
	if strings.TrimSpace(statusRaw) == "" {
		statusRaw = string(models.StatusDone)
	}
	status, err := models.ParseStatus(statusRaw)
	if err != nil {
		return err
	}

	force := parseFlag(args, "--force")
	_ = parseFlag(args, "--verify")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	for _, taskID := range taskIDs {
		task := findTask(tree, taskID)
		if task == nil {
			return fmt.Errorf("Task not found: %s", taskID)
		}
		if _, err := resolveTaskFilePath(task.File); err != nil || !taskFileExists(task.File) {
			return fmt.Errorf("no such file: %s", task.File)
		}

		if task.Status == models.StatusDone && status == models.StatusDone {
			fmt.Printf("Already done: %s - %s\n", task.ID, task.Title)
			continue
		}
		if status == models.StatusDone && task.StartedAt != nil {
			duration := time.Since(*task.StartedAt).Minutes()
			task.DurationMinutes = &duration
		}
		if err := applyTaskStatusTransition(task, status, ""); err != nil {
			if force {
				task.Status = status
			} else {
				return err
			}
		}
		if err := saveTaskState(*task, tree); err != nil {
			return err
		}

		if status == models.StatusDone {
			completion := completionNotice{}
			completeNotice, err := setItemDone(*task, tree)
			if err != nil {
				return err
			}
			completion = completeNotice
			printCompletionNotice(tree, *task, completion)
		}

		if status == models.StatusDone {
			fmt.Printf("Completed: %s - %s\n", task.ID, task.Title)
		} else {
			fmt.Printf("Updated: %s - %s\n", task.ID, status)
		}
		if status == models.StatusDone && task.DurationMinutes != nil {
			fmt.Printf("Duration: %d minutes\n", int(*task.DurationMinutes))
		}
	}
	return nil
}

func printCommandNotImplemented(name string) error {
	fmt.Printf("%s command is not implemented yet\n", name)
	return nil
}

func applyIdRemap(remap map[string]string, dataDir string) error {
	if len(remap) == 0 {
		return nil
	}

	if err := filepath.WalkDir(dataDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		base := filepath.Base(path)
		if base == "index.yaml" {
			if err := replaceIDsInYamlFile(path, remap); err != nil {
				return err
			}
			return nil
		}
		if filepath.Ext(path) != ".todo" {
			return nil
		}
		if err := replaceIDsInTodoFrontmatter(path, remap); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}

	for _, runtimeName := range []string{config.ContextFileName, config.SessionsFileName} {
		runtimePath := filepath.Join(dataDir, runtimeName)
		if _, err := os.Stat(runtimePath); err != nil {
			continue
		}
		if err := replaceIDsInYamlFile(runtimePath, remap); err != nil {
			return err
		}
	}
	return nil
}

func replaceIDsInYamlFile(path string, remap map[string]string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	var payload any
	if err := yaml.Unmarshal(raw, &payload); err != nil {
		return err
	}
	updated := replaceValues(payload, remap)
	out, err := yaml.Marshal(updated)
	if err != nil {
		return err
	}
	return os.WriteFile(path, out, 0o644)
}

func replaceIDsInTodoFrontmatter(path string, remap map[string]string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	lines := strings.Split(string(raw), "\n")
	if len(lines) == 0 || strings.TrimSpace(lines[0]) != "---" {
		return nil
	}
	end := -1
	for i := 1; i < len(lines); i++ {
		if strings.TrimSpace(lines[i]) == "---" {
			end = i
			break
		}
	}
	if end < 0 {
		return nil
	}
	frontmatterRaw := strings.TrimSpace(strings.Join(lines[1:end], "\n"))
	frontmatter := map[string]interface{}{}
	if frontmatterRaw != "" {
		if err := yaml.Unmarshal([]byte(frontmatterRaw), &frontmatter); err != nil {
			return err
		}
	}
	body := ""
	if len(lines) > end+1 {
		body = strings.Join(lines[end+1:], "\n")
	}
	updated := replaceValues(frontmatter, remap).(map[string]interface{})
	out, err := yaml.Marshal(updated)
	if err != nil {
		return err
	}
	payload := fmt.Sprintf("---\n%s---\n%s", string(out), body)
	return os.WriteFile(path, []byte(payload), 0o644)
}

func replaceValues(value any, remap map[string]string) any {
	if value == nil {
		return nil
	}
	switch cast := value.(type) {
	case string:
		if replaced, ok := remap[cast]; ok {
			return replaced
		}
		return cast
	case map[string]interface{}:
		out := map[string]interface{}{}
		for key, item := range cast {
			out[key] = replaceValues(item, remap)
		}
		return out
	case []interface{}:
		out := make([]interface{}, 0, len(cast))
		for _, item := range cast {
			out = append(out, replaceValues(item, remap))
		}
		return out
	default:
		return value
	}
}

func nextIndexID(ids []string, prefix string) int {
	max := 0
	prefix = strings.ToUpper(prefix)
	if prefix == "" {
		return max + 1
	}
	for _, id := range ids {
		value := strings.TrimSpace(id)
		if !strings.HasPrefix(value, prefix) {
			continue
		}
		numeric := strings.TrimPrefix(value, prefix)
		if numeric == "" {
			continue
		}
		number, err := strconv.Atoi(numeric)
		if err != nil {
			continue
		}
		if number > max {
			max = number
		}
	}
	return max + 1
}

func asSlice(raw any) []interface{} {
	switch values := raw.(type) {
	case []interface{}:
		return values
	case []map[string]interface{}:
		out := make([]interface{}, 0, len(values))
		for _, value := range values {
			out = append(out, value)
		}
		return out
	default:
		return []interface{}{}
	}
}

func extractTaskLeafIDs(raw any) []string {
	out := []string{}
	for _, entry := range asSlice(raw) {
		if value, ok := entry.(map[string]interface{}); ok {
			if id := asString(value["id"]); id != "" {
				out = append(out, id)
			}
		}
	}
	return out
}

func extractEpicOrMilestoneLeafIDs(raw any, prefix string) []string {
	out := []string{}
	for _, entry := range asSlice(raw) {
		if value, ok := entry.(map[string]interface{}); ok {
			id := asString(value["id"])
			if strings.HasPrefix(id, prefix) {
				out = append(out, id)
			}
		}
	}
	return out
}

func leafID(value string) string {
	parts := strings.Split(value, ".")
	if len(parts) == 0 {
		return value
	}
	return parts[len(parts)-1]
}

func resolveTaskFilePath(taskFile string) (string, error) {
	if taskFile == "" {
		return "", errors.New("Task file path is empty")
	}
	if filepath.IsAbs(taskFile) {
		return taskFile, nil
	}
	dataDir, err := ensureDataRoot()
	if err != nil {
		return "", err
	}
	return filepath.Join(dataDir, taskFile), nil
}

func validateScopeOrID(value string) error {
	if strings.HasPrefix(value, "--") {
		return fmt.Errorf("unexpected flag: %s", value)
	}
	if value == "" {
		return errors.New("invalid identifier")
	}
	return nil
}

var taskIDRe = regexp.MustCompile(`^(?:P\d+(?:\.M\d+(?:\.E\d+(?:\.T\d+)?)?)?|[BI]\d+)$`)

func validateTaskID(raw string) error {
	if raw == "" {
		return errors.New("id is required")
	}
	if strings.HasPrefix(raw, "P") {
		if _, err := models.ParseTaskPath(raw); err != nil {
			return fmt.Errorf("malformed task id: %s", raw)
		}
		return nil
	}
	if taskIDRe.MatchString(raw) {
		return nil
	}
	return fmt.Errorf("malformed task id: %s", raw)
}

func ensureDataRoot() (string, error) {
	dataDir, err := config.DetectDataDir()
	if err != nil {
		return "", err
	}
	return dataDir, nil
}

func ensureDataDir() (string, error) {
	return ensureDataRoot()
}

func dataDirFromContext() string {
	dataDir, err := ensureDataDir()
	if err != nil {
		return ""
	}
	return dataDir
}

func ensureBacklogDataAvailable() error {
	_, err := os.Stat(config.BacklogDir)
	if err == nil {
		return nil
	}
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	return nil
}

func firstPositionalArg(args []string, valueTakingFlags map[string]bool) string {
	for i := 0; i < len(args); i++ {
		arg := args[i]
		if !strings.HasPrefix(arg, "-") {
			return arg
		}
		flag, hasValue := splitOption(arg)
		if hasValue {
			continue
		}
		if valueTakingFlags[flag] && i+1 < len(args) {
			i++
		}
	}
	return ""
}

func splitOption(arg string) (string, bool) {
	if strings.HasPrefix(arg, "--") {
		if idx := strings.Index(arg, "="); idx >= 0 {
			return arg[:idx], true
		}
		return arg, false
	}
	if strings.HasPrefix(arg, "-") && len(arg) > 1 {
		if idx := strings.Index(arg, "="); idx >= 0 {
			return arg[:idx], true
		}
		return arg, false
	}
	return "", false
}

func parseOption(args []string, keys ...string) string {
	for i, arg := range args {
		for _, key := range keys {
			if arg == key {
				if i+1 >= len(args) {
					return ""
				}
				return args[i+1]
			}
			if strings.HasPrefix(arg, key+"=") {
				return strings.TrimPrefix(arg, key+"=")
			}
		}
	}
	return ""
}

func parseFloatOptionWithDefault(args []string, fallback float64, keys ...string) (float64, error) {
	keyName := keys[0]
	raw := parseOption(args, keys...)
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid %s: %s", keyName, raw)
	}
	return value, nil
}

func parseComplexityOption(args []string, names ...string) (models.Complexity, error) {
	raw := parseOption(args, names...)
	if strings.TrimSpace(raw) == "" {
		return models.ComplexityMedium, nil
	}
	return models.ParseComplexity(raw)
}

func parsePriorityOption(args []string, names ...string) (models.Priority, error) {
	raw := parseOption(args, names...)
	if strings.TrimSpace(raw) == "" {
		return models.PriorityMedium, nil
	}
	return models.ParsePriority(raw)
}

func parseCSV(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return []string{}
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		out = append(out, value)
	}
	return out
}

func appendToList(data map[string]interface{}, key string, item map[string]interface{}) {
	if data == nil {
		return
	}
	raw := data[key]
	out := make([]interface{}, 0)
	switch existing := raw.(type) {
	case []interface{}:
		out = append(out, existing...)
	case []map[string]interface{}:
		for _, value := range existing {
			out = append(out, value)
		}
	}
	out = append(out, item)
	data[key] = out
}

func readYAMLMapFile(path string) (map[string]interface{}, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	out := map[string]interface{}{}
	if err := yaml.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("failed to parse %s: %w", path, err)
	}
	return out, nil
}

func writeYAMLMapFile(path string, value map[string]interface{}) error {
	payload, err := yaml.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to serialize %s: %w", path, err)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", filepath.Dir(path), err)
	}
	return os.WriteFile(path, payload, 0o644)
}

func idSuffixNumber(id string, prefix string) int {
	value := strings.TrimPrefix(id, prefix)
	result, err := strconv.Atoi(value)
	if err != nil || result <= 0 {
		return 1
	}
	return result
}

type skillInstallOperation struct {
	Client   string
	Artifact string
	Path     string
	Skill    string
}

func runSkills(args []string) error {
	if len(args) == 0 || parseFlag(args, "--help", "-h") {
		fmt.Println("Usage: backlog skills install [skill_names...] [--scope local|global] [--client codex|claude|opencode|common]")
		return nil
	}

	sub := strings.TrimSpace(args[0])
	if sub != "install" {
		return fmt.Errorf("Unknown skills subcommand: %s", sub)
	}

	rest := args[1:]
	if parseFlag(rest, "--help", "-h") {
		fmt.Println("Usage: backlog skills install [skill_names...] [--scope local|global] [--client codex|claude|opencode|common]")
		return nil
	}
	if err := validateAllowedFlags(rest, map[string]bool{
		"--scope":    true,
		"--client":   true,
		"--artifact": true,
		"--dir":      true,
		"--force":    true,
		"--dry-run":  true,
		"--json":     true,
		"--help":     true,
		"-h":         true,
	}); err != nil {
		return err
	}

	skillNames := positionalArgs(rest, map[string]bool{
		"--scope":    true,
		"--client":   true,
		"--artifact": true,
		"--dir":      true,
	})
	selectedSkills, err := resolveSkillNames(skillNames)
	if err != nil {
		return err
	}

	scope := strings.TrimSpace(parseOption(rest, "--scope"))
	if scope == "" {
		scope = "local"
	}
	if scope != "local" && scope != "global" {
		return fmt.Errorf("Invalid scope: %s", scope)
	}

	clientName := strings.TrimSpace(parseOption(rest, "--client"))
	if clientName == "" {
		clientName = "common"
	}
	clients, err := resolveSkillClients(clientName)
	if err != nil {
		return err
	}

	artifact := strings.TrimSpace(parseOption(rest, "--artifact"))
	if artifact == "" {
		artifact = "skills"
	}
	artifacts, err := resolveSkillArtifacts(artifact)
	if err != nil {
		return err
	}

	outputDir := strings.TrimSpace(parseOption(rest, "--dir"))
	force := parseFlag(rest, "--force")
	dryRun := parseFlag(rest, "--dry-run")
	outputJSON := parseFlag(rest, "--json")

	warnings := []string{}
	ops := make([]skillInstallOperation, 0)
	for _, client := range clients {
		for _, selectedArtifact := range artifacts {
			if client == "codex" && selectedArtifact == "commands" {
				warnings = append(warnings, "codex does not support 'commands' artifacts; skipping.")
				continue
			}

			root, err := resolveSkillTargetRoot(client, scope, selectedArtifact, outputDir)
			if err != nil {
				return err
			}
			for _, skill := range selectedSkills {
				target := ""
				if selectedArtifact == "skills" {
					target = filepath.Join(root, skill, "SKILL.md")
				} else {
					target = filepath.Join(root, skill+".md")
				}
				ops = append(ops, skillInstallOperation{
					Client:   client,
					Artifact: selectedArtifact,
					Path:     target,
					Skill:    skill,
				})
			}
		}
	}

	sort.Slice(ops, func(i, j int) bool {
		return ops[i].Path < ops[j].Path
	})

	if !dryRun && !force {
		conflicts := make([]string, 0)
		for _, op := range ops {
			if _, err := os.Stat(op.Path); err == nil {
				conflicts = append(conflicts, op.Path)
			}
		}
		if len(conflicts) > 0 {
			return fmt.Errorf(
				"Refusing to overwrite existing files (use --force):\n%s",
				strings.Join(conflicts, "\n"),
			)
		}
	}

	writtenCount := 0
	if !dryRun {
		for _, op := range ops {
			if err := os.MkdirAll(filepath.Dir(op.Path), 0o755); err != nil {
				return fmt.Errorf("failed to create directory %s: %w", filepath.Dir(op.Path), err)
			}
			content := ""
			if op.Artifact == "skills" {
				content = skillTemplate(op.Skill)
			} else {
				content = commandTemplate(op.Skill)
			}
			if err := os.WriteFile(op.Path, []byte(content), 0o644); err != nil {
				return fmt.Errorf("failed to write %s: %w", op.Path, err)
			}
			writtenCount++
		}
	}

	operationPayload := make([]map[string]any, 0, len(ops))
	for _, op := range ops {
		action := "written"
		if dryRun {
			action = "planned"
		}
		operationPayload = append(operationPayload, map[string]any{
			"client":   op.Client,
			"artifact": op.Artifact,
			"path":     op.Path,
			"action":   action,
		})
	}
	outputDirValue := any(nil)
	if outputDir != "" {
		outputDirValue = outputDir
	}
	result := map[string]any{
		"skills":     selectedSkills,
		"scope":      scope,
		"client":     clientName,
		"artifact":   artifact,
		"output_dir": outputDirValue,
		"dry_run":    dryRun,
		"force":      force,
		"warnings":   warnings,
		"operations": operationPayload,
		"written_count": func() int {
			if dryRun {
				return 0
			}
			return writtenCount
		}(),
	}

	if outputJSON {
		raw, err := json.MarshalIndent(result, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	if dryRun {
		fmt.Println("Dry run: no files written.")
	} else {
		fmt.Printf("Installed %d file(s).\n", writtenCount)
	}
	for _, warning := range warnings {
		fmt.Printf("Warning: %s\n", warning)
	}
	return nil
}

func resolveSkillNames(names []string) ([]string, error) {
	valid := []string{"plan-task", "plan-ingest", "start-tasks", "backlog-howto"}
	normalized := make([]string, 0, len(names))
	for _, name := range names {
		trimmed := strings.TrimSpace(strings.ToLower(name))
		if trimmed == "" {
			continue
		}
		normalized = append(normalized, trimmed)
	}
	if len(normalized) == 0 || containsString(normalized, "all") {
		return append([]string{}, valid...), nil
	}
	out := make([]string, 0, len(normalized))
	seen := map[string]bool{}
	for _, name := range normalized {
		if !containsString(valid, name) {
			return nil, fmt.Errorf("Invalid skill name: %s", name)
		}
		if seen[name] {
			continue
		}
		seen[name] = true
		out = append(out, name)
	}
	return out, nil
}

func resolveSkillClients(clientName string) ([]string, error) {
	switch clientName {
	case "common":
		return []string{"codex", "claude", "opencode"}, nil
	case "codex", "claude", "opencode":
		return []string{clientName}, nil
	default:
		return nil, fmt.Errorf("Invalid client: %s", clientName)
	}
}

func resolveSkillArtifacts(artifact string) ([]string, error) {
	switch artifact {
	case "both":
		return []string{"skills", "commands"}, nil
	case "skills", "commands":
		return []string{artifact}, nil
	default:
		return nil, fmt.Errorf("Invalid artifact: %s", artifact)
	}
}

func resolveSkillTargetRoot(client string, scope string, artifact string, outputDir string) (string, error) {
	if outputDir != "" {
		return filepath.Join(outputDir, artifact, client), nil
	}
	home := os.Getenv("HOME")
	if strings.TrimSpace(home) == "" {
		derived, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		home = derived
	}

	switch client {
	case "codex":
		if artifact != "skills" {
			return "", fmt.Errorf("codex does not support commands artifacts")
		}
		if scope == "local" {
			return filepath.Join(".agents", "skills"), nil
		}
		codexHome := strings.TrimSpace(os.Getenv("CODEX_HOME"))
		if codexHome != "" {
			return filepath.Join(codexHome, "skills"), nil
		}
		return filepath.Join(home, ".agents", "skills"), nil
	case "claude":
		if scope == "local" {
			return filepath.Join(".claude", artifact), nil
		}
		return filepath.Join(home, ".claude", artifact), nil
	case "opencode":
		if scope == "local" {
			return filepath.Join(".opencode", artifact), nil
		}
		return filepath.Join(home, ".config", "opencode", artifact), nil
	default:
		return "", fmt.Errorf("Unknown client: %s", client)
	}
}

func skillTemplate(name string) string {
	if name == "plan-task" {
		return "---\nname: plan-task\ndescription: plan task\n---\n# plan-task\n"
	}
	if name == "plan-ingest" {
		return "---\nname: plan-ingest\ndescription: plan ingest\n---\n# plan-ingest\n"
	}
	if name == "backlog-howto" {
		return skills.BacklogHowtoSkillMD
	}
	return "---\nname: start-tasks\ndescription: tasks grab and cycle\n---\n# start-tasks\n"
}

func commandTemplate(name string) string {
	if name == "backlog-howto" {
		return fmt.Sprintf(
			"---\ndescription: Backlog overview/manual skill with common workflows and command usage.\n---\n\nLoad the installed `backlog-howto` skill instructions.\n\nSource of truth: `bl_skills/backlog-howto/SKILL.md`\nSkill-Version: %s\n",
			skills.BacklogHowtoSkillVersion,
		)
	}
	return fmt.Sprintf("---\ndescription: %s\n---\n%s\n", name, name)
}
