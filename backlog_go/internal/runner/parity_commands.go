package runner

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/XertroV/tasks/backlog_go/internal/commands"
	taskcontext "github.com/XertroV/tasks/backlog_go/internal/context"
	"github.com/XertroV/tasks/backlog_go/internal/critical_path"
	"github.com/XertroV/tasks/backlog_go/internal/loader"
	"github.com/XertroV/tasks/backlog_go/internal/models"
	"gopkg.in/yaml.v3"
)

type checkIssue struct {
	Code     string `json:"code"`
	Message  string `json:"message"`
	Location string `json:"location,omitempty"`
}

type checkReport struct {
	OK      bool `json:"ok"`
	Summary struct {
		Errors   int `json:"errors"`
		Warnings int `json:"warnings"`
	} `json:"summary"`
	Errors   []checkIssue `json:"errors"`
	Warnings []checkIssue `json:"warnings"`
}

func runSearch(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdSearch)
		return nil
	}
	allowed := map[string]bool{
		"--status":     true,
		"--tags":       true,
		"--complexity": true,
		"--priority":   true,
		"--limit":      true,
		"--json":       true,
		"--help":       true,
		"-h":           true,
	}
	if err := validateAllowedFlagsForUsage(commands.CmdSearch, args, allowed); err != nil {
		return err
	}
	positionals := positionalArgs(args, map[string]bool{
		"--status":     true,
		"--tags":       true,
		"--complexity": true,
		"--priority":   true,
		"--limit":      true,
		"--json":       false,
	})
	if len(positionals) != 1 {
		return printUsageError(commands.CmdSearch, errors.New("search requires exactly one PATTERN argument"))
	}
	pattern := firstPositionalArg(args, map[string]bool{
		"--status":     true,
		"--tags":       true,
		"--complexity": true,
		"--priority":   true,
		"--limit":      true,
		"--json":       false,
	})
	pattern = strings.TrimSpace(pattern)
	if pattern == "" {
		return printUsageError(commands.CmdSearch, errors.New("search requires PATTERN"))
	}

	limit, err := parseIntOptionWithDefault(args, 20, "--limit")
	if err != nil {
		return err
	}
	statusRaw, hasStatus := parseOptionWithPresence(args, "--status")
	complexityRaw, hasComplexity := parseOptionWithPresence(args, "--complexity")
	priorityRaw, hasPriority := parseOptionWithPresence(args, "--priority")
	tagSet := map[string]struct{}{}
	for _, tag := range strings.Split(parseOption(args, "--tags"), ",") {
		value := strings.ToLower(strings.TrimSpace(tag))
		if value != "" {
			tagSet[value] = struct{}{}
		}
	}

	var statusFilter models.Status
	if hasStatus {
		statusFilter, err = models.ParseStatus(statusRaw)
		if err != nil {
			return printUsageError(commands.CmdSearch, err)
		}
	}
	var complexityFilter models.Complexity
	if hasComplexity {
		complexityFilter, err = models.ParseComplexity(complexityRaw)
		if err != nil {
			return printUsageError(commands.CmdSearch, err)
		}
	}
	var priorityFilter models.Priority
	if hasPriority {
		priorityFilter, err = models.ParsePriority(priorityRaw)
		if err != nil {
			return printUsageError(commands.CmdSearch, err)
		}
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	calculator := critical_path.NewCriticalPathCalculator(tree, map[string]float64{})
	criticalPath, _, err := calculator.Calculate()
	if err != nil {
		return err
	}
	availableTaskIDs := taskIDSet(calculator.FindAllAvailable())

	re, err := regexp.Compile("(?i)" + pattern)
	if err != nil {
		return fmt.Errorf("invalid regex pattern: %w", err)
	}

	matches := []models.Task{}
	for _, task := range findAllTasksInTree(tree) {
		if hasStatus && task.Status != statusFilter {
			continue
		}
		if hasComplexity && task.Complexity != complexityFilter {
			continue
		}
		if hasPriority && task.Priority != priorityFilter {
			continue
		}
		if len(tagSet) > 0 {
			taskTags := map[string]struct{}{}
			for _, tag := range task.Tags {
				taskTags[strings.ToLower(strings.TrimSpace(tag))] = struct{}{}
			}
			hit := false
			for tag := range tagSet {
				if _, ok := taskTags[tag]; ok {
					hit = true
					break
				}
			}
			if !hit {
				continue
			}
		}

		content := ""
		if task.File != "" {
			taskPath, pathErr := resolveTaskFilePath(task.File)
			if pathErr == nil {
				raw, readErr := os.ReadFile(taskPath)
				if readErr == nil {
					content = string(raw)
				}
			}
		}
		if !re.MatchString(task.Title) && !re.MatchString(content) {
			continue
		}
		matches = append(matches, task)
	}
	sort.Slice(matches, func(i, j int) bool {
		return matches[i].ID < matches[j].ID
	})

	if parseFlag(args, "--json") {
		payload := map[string]any{
			"query":   pattern,
			"count":   len(matches),
			"results": filteredTasksPayload(matches, criticalPath),
		}
		raw, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	if len(matches) == 0 {
		fmt.Printf("%s\n", styleWarning(fmt.Sprintf("No tasks found matching '%s'", pattern)))
		return nil
	}

	displayMatches := matches
	if len(matches) > limit {
		displayMatches = matches[:limit]
	}
	byPhase := map[string][]models.Task{}
	phaseOrder := []string{}
	for _, task := range displayMatches {
		phaseLabel := task.PhaseID
		if strings.TrimSpace(phaseLabel) == "" {
			phaseLabel = "Unknown"
		} else if phase := tree.FindPhase(task.PhaseID); phase != nil && phase.Name != "" {
			phaseLabel = fmt.Sprintf("%s (%s)", task.PhaseID, phase.Name)
		}
		if _, ok := byPhase[phaseLabel]; !ok {
			phaseOrder = append(phaseOrder, phaseLabel)
		}
		byPhase[phaseLabel] = append(byPhase[phaseLabel], task)
	}
	sort.Strings(phaseOrder)

	fmt.Printf("%s\n", styleHeader(fmt.Sprintf("Found %d result(s) for %q:", len(matches), pattern)))
	for _, phaseLabel := range phaseOrder {
		tasks := byPhase[phaseLabel]
		if len(tasks) == 0 {
			continue
		}
		fmt.Println(styleSubHeader(phaseLabel))
		for _, task := range tasks {
			fmt.Println(formatTaskSummary(task, criticalPath, availableTaskIDs))
			for _, detail := range formatTaskDetails(task) {
				fmt.Printf("    %s\n", detail)
			}
		}
		fmt.Println()
	}

	if len(matches) > limit {
		fmt.Printf("%s\n", styleMuted(fmt.Sprintf("... and %d more results (use --limit to show more)", len(matches)-limit)))
	}
	fmt.Printf("%s\n", styleMuted("★ = On critical path"))
	return nil
}

func runBlockers(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	allowed := map[string]bool{
		"--deep":    true,
		"--suggest": true,
		"--json":    true,
		"--help":    true,
		"-h":        true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdBlockers)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdBlockers, args, allowed); err != nil {
		return err
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	calculator := critical_path.NewCriticalPathCalculator(tree, map[string]float64{})
	criticalPath, _, err := calculator.Calculate()
	if err != nil {
		return err
	}
	availableTaskIDs := taskIDSet(calculator.FindAllAvailable())
	pendingBlocked, err := calculator.FindPendingBlocked()
	if err != nil {
		return err
	}
	rootBlockers, err := calculator.FindRootBlockers()
	if err != nil {
		return err
	}
	blockedMarked := []models.Task{}
	for _, task := range findAllTasksInTree(tree) {
		if task.Status == models.StatusBlocked {
			blockedMarked = append(blockedMarked, task)
		}
	}

	if parseFlag(args, "--json") {
		payload := map[string]any{
			"blocked_tasks":         extractTaskIDs(blockedMarked),
			"pending_blocked_tasks": pendingBlocked,
			"root_blockers":         rootBlockers,
			"critical_path":         criticalPath,
		}
		raw, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	if len(blockedMarked) == 0 && len(pendingBlocked) == 0 {
		fmt.Println(styleSuccess("✓ No blocked tasks!"))
		return nil
	}

	fmt.Printf("%s\n", styleError(fmt.Sprintf("%d task(s) marked as BLOCKED", len(blockedMarked))))
	fmt.Printf("%s\n", styleWarning(fmt.Sprintf("%d task(s) waiting on dependencies", len(pendingBlocked))))
	fmt.Println(styleSubHeader("Blocking Chains:"))

	limit := 10
	if parseFlag(args, "--deep") {
		limit = len(rootBlockers)
	}
	for i, id := range rootBlockers {
		if i >= limit {
			fmt.Printf("%s %d more blocking chains (use --deep to see all)\n", styleMuted("... and"), len(rootBlockers)-limit)
			break
		}
		task := findTask(tree, id)
		if task == nil {
			continue
		}
		fmt.Println(formatTaskSummary(*task, criticalPath, availableTaskIDs))
		for _, detail := range formatTaskDetails(*task) {
			fmt.Printf("    %s\n", detail)
		}
		if parseFlag(args, "--suggest") && task.Status == models.StatusPending && strings.TrimSpace(task.ClaimedBy) == "" {
			fmt.Printf("  %s backlog grab %s\n", styleMuted("suggest:"), styleSuccess(task.ID))
		}
		fmt.Println()
	}
	return nil
}

func runWhy(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	allowed := map[string]bool{
		"--json": true,
		"--help": true,
		"-h":     true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdWhy)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdWhy, args, allowed); err != nil {
		return err
	}
	if len(positionalArgs(args, allowed)) != 1 {
		return printUsageError(commands.CmdWhy, errors.New("why requires TASK_ID"))
	}
	taskID := firstPositionalArg(args, allowed)
	taskID = strings.TrimSpace(taskID)
	if taskID == "" {
		return printUsageError(commands.CmdWhy, errors.New("why requires TASK_ID"))
	}
	if err := validateTaskID(taskID); err != nil {
		return printUsageError(commands.CmdWhy, err)
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	calculator := critical_path.NewCriticalPathCalculator(tree, map[string]float64{})
	report, err := calculator.Why(taskID)
	if err != nil {
		return err
	}

	if parseFlag(args, "--json") {
		raw, err := json.MarshalIndent(report, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	fmt.Println(styleHeader(fmt.Sprintf("%s - %s", report.TaskID, report.TaskTitle)))
	fmt.Printf("%s %s\n", styleSubHeader("Status"), styleStatusText(string(report.Status)))
	fmt.Printf("%s %s\n", styleSubHeader("On critical path"), styleMuted(fmt.Sprintf("%t", report.OnCriticalPath)))
	if report.OnCriticalPath {
		fmt.Printf("%s %s\n", styleSubHeader("Critical path index"), styleMuted(fmt.Sprintf("%d", report.CriticalPathIndex+1)))
	}
	if len(report.ExplicitDependencies) > 0 {
		fmt.Println(styleSubHeader("Explicit dependencies:"))
		for _, dep := range report.ExplicitDependencies {
			if !dep.Found {
				fmt.Printf("  %s %s (%s)\n", styleError("?"), styleCritical(dep.ID), styleError("not found"))
				continue
			}
			marker := "✗"
			if dep.Satisfied {
				marker = styleSuccess("✓")
			} else {
				marker = styleError("✗")
			}
			fmt.Printf("  %s %s (%s)\n", marker, styleSuccess(dep.ID), styleStatusText(string(dep.Status)))
		}
	}
	if report.ImplicitDependency != nil {
		marker := "✗"
		if report.ImplicitDependency.Satisfied {
			marker = styleSuccess("✓")
		} else {
			marker = styleError("✗")
		}
		fmt.Println(styleSubHeader("Implicit dependency:"))
		fmt.Printf("  %s %s (%s)\n", marker, styleSuccess(report.ImplicitDependency.ID), styleStatusText(string(report.ImplicitDependency.Status)))
	}
	if report.CanStart {
		fmt.Println(styleSuccess("Task can be started."))
	} else {
		fmt.Println(styleError("Task is blocked on dependencies."))
	}
	return nil
}

func runTimeline(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	allowed := map[string]bool{
		"--scope":     true,
		"--group-by":  true,
		"--show-done": true,
		"--json":      true,
		"--help":      true,
		"-h":          true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdTimeline)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdTimeline, args, allowed); err != nil {
		return err
	}
	scopes := []string{}
	for _, scope := range parseOptions(args, "--scope") {
		value := strings.TrimSpace(scope)
		if value != "" {
			scopes = append(scopes, value)
		}
	}
	groupBy := strings.TrimSpace(parseOption(args, "--group-by"))
	if groupBy == "" {
		groupBy = "milestone"
	}
	switch strings.ToLower(groupBy) {
	case "phase", "milestone", "epic", "status":
	default:
		return printUsageError(commands.CmdTimeline, fmt.Errorf("invalid --group-by value: %s", groupBy))
	}
	showDone := parseFlag(args, "--show-done")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	if len(scopes) > 0 {
		for _, scope := range scopes {
			matches := false
			if tree.FindPhase(scope) != nil || findMilestone(tree, scope) != nil || findEpic(tree, scope) != nil {
				matches = true
			}
			if !matches {
				for _, task := range findAllTasksInTree(tree) {
					if strings.HasPrefix(task.ID, scope) {
						matches = true
						break
					}
				}
			}
			if !matches {
				return fmt.Errorf("No list nodes found for path query: %s", scope)
			}
		}
	}
	calculator := critical_path.NewCriticalPathCalculator(tree, map[string]float64{})
	criticalPath, _, err := calculator.Calculate()
	if err != nil {
		return err
	}
	availableTaskIDs := taskIDSet(calculator.FindAllAvailable())

	tasks := findAllTasksInTree(tree)
	filtered := []models.Task{}
	for _, task := range tasks {
		if len(scopes) > 0 {
			matchesScope := false
			for _, scope := range scopes {
				if strings.HasPrefix(task.ID, scope) {
					matchesScope = true
					break
				}
			}
			if !matchesScope {
				continue
			}
		}
		if !showDone && task.Status == models.StatusDone {
			continue
		}
		filtered = append(filtered, task)
	}
	if len(filtered) == 0 {
		fmt.Println(styleWarning("No tasks to display."))
		return nil
	}

	groups := map[string][]models.Task{}
	order := []string{}
	for _, task := range filtered {
		key := timelineGroupKey(task, groupBy)
		if _, ok := groups[key]; !ok {
			order = append(order, key)
		}
		groups[key] = append(groups[key], task)
	}
	sort.Strings(order)

	if parseFlag(args, "--json") {
		payload := map[string]any{
			"group_by":      groupBy,
			"scope":         scopes,
			"show_done":     showDone,
			"critical_path": criticalPath,
			"groups":        map[string]any{},
		}
		groupPayload := payload["groups"].(map[string]any)
		for _, key := range order {
			groupPayload[key] = filteredTasksPayload(groups[key], criticalPath)
		}
		raw, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	fmt.Printf("\n%s (%s)\n", styleHeader("Project Timeline"), styleMuted("grouped by "+groupBy))
	if len(scopes) > 0 {
		fmt.Printf("%s %s\n", styleSubHeader("Scope:"), styleSuccess(strings.Join(scopes, ", ")))
	}
	fmt.Printf("%s\n\n", styleMuted("Legend: ★ critical path, status icon indicates task state"))
	for _, key := range order {
		fmt.Printf("%s (%d)\n", styleSubHeader(key), len(groups[key]))
		items := groups[key]
		sort.Slice(items, func(i, j int) bool {
			return items[i].ID < items[j].ID
		})
		for _, task := range items {
			fmt.Println(formatTaskSummary(task, criticalPath, availableTaskIDs))
			for _, detail := range formatTaskDetails(task) {
				fmt.Printf("    %s\n", detail)
			}
		}
		fmt.Println("")
	}
	return nil
}

func runReport(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdReport)
		return nil
	}
	if len(args) == 0 {
		return runReportProgress(nil)
	}

	subcommand := strings.TrimSpace(args[0])
	if strings.HasPrefix(subcommand, "-") {
		return runReportProgress(args)
	}
	rest := args[1:]
	switch subcommand {
	case "progress", "p":
		return runReportProgress(rest)
	case "velocity", "v":
		return runReportVelocity(rest)
	case "estimate-accuracy", "ea":
		return runReportEstimateAccuracy(rest)
	default:
		return printUsageError(commands.CmdReport, fmt.Errorf(reportSubcommandHelp(subcommand)))
	}
}

func reportSubcommandHelp(subcommand string) string {
	base := []string{
		fmt.Sprintf("unknown report subcommand: %s", subcommand),
		"Valid report subcommands:",
		"  progress (alias: p)",
		"  velocity (alias: v)",
		"  estimate-accuracy (alias: ea)",
	}
	trimmed := strings.ToLower(strings.TrimSpace(subcommand))
	if trimmed == "t" || strings.HasPrefix(trimmed, "est") {
		base = append(base, "Tip: Did you mean `backlog r p`, `backlog r v`, or `backlog r ea`?")
	}
	return strings.Join(base, "\n")
}

func runReportProgress(args []string) error {
	allowed := map[string]bool{
		"--format":       true,
		"--json":         true,
		"--by-phase":     true,
		"--by-milestone": true,
		"--by-epic":      true,
		"--all":          true,
		"--help":         true,
		"-h":             true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdReport)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdReport, args, allowed); err != nil {
		return err
	}
	asJSON := parseFlag(args, "--json") || strings.EqualFold(parseOption(args, "--format"), "json")
	showAll := parseFlag(args, "--all")
	byMilestone := parseFlag(args, "--by-milestone")
	byEpic := parseFlag(args, "--by-epic")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}

	normalTasks := findNormalTasksInTree(tree)
	overall := calculateStatusCounts(normalTasks)
	bugCounts := calculateStatusCounts(tree.Bugs)
	ideaCounts := calculateStatusCounts(tree.Ideas)

	payload := reportProgressJSON{}
	payload.Overall.Total = overall.Total
	payload.Overall.Done = overall.Done
	payload.Overall.InProgress = overall.InProgress
	payload.Overall.Pending = overall.Pending
	payload.Overall.Blocked = overall.Blocked
	payload.Overall.PercentComplete = percent(overall.Done, overall.Total)
	payload.Overall.RemainingHours = remainingHours(normalTasks)

	payload.Auxiliary.Bugs.Total = bugCounts.Total
	payload.Auxiliary.Bugs.Done = bugCounts.Done
	payload.Auxiliary.Bugs.InProgress = bugCounts.InProgress
	payload.Auxiliary.Bugs.Pending = bugCounts.Pending
	payload.Auxiliary.Bugs.Blocked = bugCounts.Blocked
	payload.Auxiliary.Bugs.RemainingHours = remainingHours(tree.Bugs)

	payload.Auxiliary.Ideas.Total = ideaCounts.Total
	payload.Auxiliary.Ideas.Done = ideaCounts.Done
	payload.Auxiliary.Ideas.InProgress = ideaCounts.InProgress
	payload.Auxiliary.Ideas.Pending = ideaCounts.Pending
	payload.Auxiliary.Ideas.Blocked = ideaCounts.Blocked
	payload.Auxiliary.Ideas.RemainingHours = remainingHours(tree.Ideas)

	calculator := critical_path.NewCriticalPathCalculator(tree, map[string]float64{})
	criticalPath, _, err := calculator.Calculate()
	if err != nil {
		return err
	}
	payload.Bugs = filteredTasksPayload(tree.Bugs, criticalPath)
	payload.Ideas = filteredTasksPayload(tree.Ideas, criticalPath)

	for _, phase := range tree.Phases {
		phaseTasks := []models.Task{}
		for _, milestone := range phase.Milestones {
			for _, epic := range milestone.Epics {
				phaseTasks = append(phaseTasks, epic.Tasks...)
			}
		}
		phaseCounts := calculateStatusCounts(phaseTasks)
		phaseNode := struct {
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
		}{
			ID:          phase.ID,
			Name:        phase.Name,
			Total:       phaseCounts.Total,
			Done:        phaseCounts.Done,
			InProgress:  phaseCounts.InProgress,
			Pending:     phaseCounts.Pending,
			Blocked:     phaseCounts.Blocked,
			PercentDone: percent(phaseCounts.Done, phaseCounts.Total),
			Remaining:   remainingHours(phaseTasks),
			Milestones: []struct {
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
			}{},
		}
		for _, milestone := range phase.Milestones {
			milestoneTasks := []models.Task{}
			for _, epic := range milestone.Epics {
				milestoneTasks = append(milestoneTasks, epic.Tasks...)
			}
			milestoneCounts := calculateStatusCounts(milestoneTasks)
			mNode := struct {
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
			}{
				ID:         milestone.ID,
				Name:       milestone.Name,
				Total:      milestoneCounts.Total,
				Done:       milestoneCounts.Done,
				InProgress: milestoneCounts.InProgress,
				Pending:    milestoneCounts.Pending,
				Blocked:    milestoneCounts.Blocked,
				Percent:    percent(milestoneCounts.Done, milestoneCounts.Total),
				Remaining:  remainingHours(milestoneTasks),
			}
			for _, epic := range milestone.Epics {
				epicCounts := calculateStatusCounts(epic.Tasks)
				mNode.Epics = append(mNode.Epics, struct {
					ID         string  `json:"id"`
					Name       string  `json:"name"`
					Total      int     `json:"total"`
					Done       int     `json:"done"`
					InProgress int     `json:"in_progress"`
					Pending    int     `json:"pending"`
					Blocked    int     `json:"blocked"`
					Percent    float64 `json:"percent_complete"`
					Remaining  float64 `json:"remaining_hours"`
				}{
					ID:         epic.ID,
					Name:       epic.Name,
					Total:      epicCounts.Total,
					Done:       epicCounts.Done,
					InProgress: epicCounts.InProgress,
					Pending:    epicCounts.Pending,
					Blocked:    epicCounts.Blocked,
					Percent:    percent(epicCounts.Done, epicCounts.Total),
					Remaining:  remainingHours(epic.Tasks),
				})
			}
			phaseNode.Milestones = append(phaseNode.Milestones, mNode)
		}
		payload.Phases = append(payload.Phases, phaseNode)
	}

	if asJSON {
		raw, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}

	fmt.Printf("\n%s\n\n", styleHeader("Progress Report"))
	fmt.Printf("%s: %s %5.1f%%\n", styleSubHeader("Overall"), styleProgressBar(payload.Overall.Done, payload.Overall.Total), payload.Overall.PercentComplete)
	fmt.Printf("  %s: %d | %s: %d | %s: %d | %s: %d\n",
		styleSuccess("Done"), payload.Overall.Done,
		styleWarning("In Progress"), payload.Overall.InProgress,
		styleSubHeader("Pending"), payload.Overall.Pending,
		styleError("Blocked"), payload.Overall.Blocked,
	)
	fmt.Printf("  %s: %d tasks | ~%.1fh remaining\n", styleSubHeader("Total"), payload.Overall.Total, payload.Overall.RemainingHours)

	fmt.Printf("\n%s\n", styleSubHeader("Auxiliary"))
	fmt.Printf("  %s Bugs: %s %5.1f%% (%d/%d)  ~%.1fh remaining\n",
		auxStatusMarker(payload.Auxiliary.Bugs.Total, payload.Auxiliary.Bugs.Done, payload.Auxiliary.Bugs.InProgress),
		styleProgressBar(payload.Auxiliary.Bugs.Done, payload.Auxiliary.Bugs.Total),
		percent(payload.Auxiliary.Bugs.Done, payload.Auxiliary.Bugs.Total),
		payload.Auxiliary.Bugs.Done,
		payload.Auxiliary.Bugs.Total,
		payload.Auxiliary.Bugs.RemainingHours,
	)
	fmt.Printf("  %s Ideas: %s %5.1f%% (%d/%d)\n",
		auxStatusMarker(payload.Auxiliary.Ideas.Total, payload.Auxiliary.Ideas.Done, payload.Auxiliary.Ideas.InProgress),
		styleProgressBar(payload.Auxiliary.Ideas.Done, payload.Auxiliary.Ideas.Total),
		percent(payload.Auxiliary.Ideas.Done, payload.Auxiliary.Ideas.Total),
		payload.Auxiliary.Ideas.Done,
		payload.Auxiliary.Ideas.Total,
	)

	fmt.Printf("\n%s\n", styleSubHeader("Phases"))
	fmt.Printf("%s\n", styleMuted("Legend: ✓ complete | → in progress | · pending"))
	visible := 0
	for _, phase := range payload.Phases {
		if !showAll && phase.Total > 0 && phase.Done == phase.Total {
			continue
		}
		visible++
		fmt.Printf("\n  %s %s %s\n",
			auxStatusMarker(phase.Total, phase.Done, phase.InProgress),
			styleSuccess(phase.ID),
			phase.Name,
		)
		fmt.Printf("      %s %5.1f%% (%d/%d) | active %d | blocked %d | ~%.1fh\n",
			styleProgressBar(phase.Done, phase.Total),
			phase.PercentDone,
			phase.Done,
			phase.Total,
			phase.InProgress,
			phase.Blocked,
			phase.Remaining,
		)
		if byMilestone || byEpic {
			activeMilestonesHeaderPrinted := false
			completedMilestonesHeaderPrinted := false
			hiddenCompletedMilestones := 0
			for _, milestone := range phase.Milestones {
				milestoneComplete := milestone.Total > 0 && milestone.Done == milestone.Total
				if milestoneComplete && !showAll {
					hiddenCompletedMilestones++
					continue
				}
				if milestoneComplete {
					if !completedMilestonesHeaderPrinted {
						fmt.Printf("    %s\n", styleMuted("Completed milestones"))
						completedMilestonesHeaderPrinted = true
					}
				} else if !activeMilestonesHeaderPrinted {
					fmt.Printf("    %s\n", styleSubHeader("Active milestones"))
					activeMilestonesHeaderPrinted = true
				}
				fmt.Printf("      %s %s %s | %4.1f%% (%d/%d) | ~%.1fh\n",
					auxStatusMarker(milestone.Total, milestone.Done, milestone.InProgress),
					styleSubHeader(milestone.ID),
					milestone.Name,
					milestone.Percent,
					milestone.Done,
					milestone.Total,
					milestone.Remaining,
				)
				if byEpic {
					activeEpicsHeaderPrinted := false
					completedEpicsHeaderPrinted := false
					hiddenCompletedEpics := 0
					for _, epic := range milestone.Epics {
						epicComplete := epic.Total > 0 && epic.Done == epic.Total
						if epicComplete && !showAll {
							hiddenCompletedEpics++
							continue
						}
						if epicComplete {
							if !completedEpicsHeaderPrinted {
								fmt.Printf("        %s\n", styleMuted("Completed epics"))
								completedEpicsHeaderPrinted = true
							}
						} else if !activeEpicsHeaderPrinted {
							fmt.Printf("        %s\n", styleSubHeader("Active epics"))
							activeEpicsHeaderPrinted = true
						}
						fmt.Printf("          %s %s %s | %4.1f%% (%d/%d) | ~%.1fh\n",
							auxStatusMarker(epic.Total, epic.Done, epic.InProgress),
							styleMuted(epic.ID),
							epic.Name,
							epic.Percent,
							epic.Done,
							epic.Total,
							epic.Remaining,
						)
					}
					if !showAll && hiddenCompletedEpics > 0 {
						fmt.Printf("        %s %d %s\n", styleMuted("..."), hiddenCompletedEpics, styleMuted("completed epic branch(es) hidden (use --all)"))
					}
				}
			}
			if !showAll && hiddenCompletedMilestones > 0 {
				fmt.Printf("    %s %d %s\n", styleMuted("..."), hiddenCompletedMilestones, styleMuted("completed milestone branch(es) hidden (use --all)"))
			}
		}
	}
	if visible == 0 {
		fmt.Println(styleMuted("  All phases complete. Use --all to show completed phases."))
	}
	fmt.Println("")
	return nil
}

func auxStatusMarker(total, done, inProgress int) string {
	if total > 0 && done == total {
		return styleSuccess("✓")
	}
	if inProgress > 0 {
		return styleWarning("→")
	}
	return styleMuted("·")
}

func runReportVelocity(args []string) error {
	allowed := map[string]bool{
		"--days":   true,
		"--format": true,
		"--json":   true,
		"--help":   true,
		"-h":       true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdReport)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdReport, args, allowed); err != nil {
		return err
	}
	days, err := parseIntOptionWithDefault(args, 14, "--days")
	if err != nil {
		return err
	}
	asJSON := parseFlag(args, "--json") || strings.EqualFold(parseOption(args, "--format"), "json")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	cutoff := now.Add(-time.Duration(days) * 24 * time.Hour)
	dailyCount := map[string]int{}
	dailyHours := map[string]float64{}
	completed := 0
	totalHours := 0.0

	for _, task := range findAllTasksInTree(tree) {
		if task.Status != models.StatusDone || task.CompletedAt == nil {
			continue
		}
		if task.CompletedAt.Before(cutoff) {
			continue
		}
		day := task.CompletedAt.Format("2006-01-02")
		dailyCount[day]++
		dailyHours[day] += task.EstimateHours
		completed++
		totalHours += task.EstimateHours
	}

	daysList := make([]string, 0, len(dailyCount))
	for day := range dailyCount {
		daysList = append(daysList, day)
	}
	sort.Strings(daysList)

	dailyData := make([]map[string]any, 0, len(daysList))
	for _, day := range daysList {
		dailyData = append(dailyData, map[string]any{
			"date":            day,
			"completed_tasks": dailyCount[day],
			"hours":           dailyHours[day],
		})
	}

	averagePerDay := float64(completed) / float64(max(days, 1))
	payload := map[string]any{
		"days":            days,
		"completed_tasks": completed,
		"total_hours":     totalHours,
		"average_per_day": averagePerDay,
		"daily_data":      dailyData,
	}

	if asJSON {
		raw, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}
	fmt.Printf("\n%s\n\n", styleHeader(fmt.Sprintf("Velocity Report (%d days)", days)))
	fmt.Printf("%s: %d completed task(s)\n", styleSubHeader("Completed"), completed)
	fmt.Printf("%s: %.1f/day\n", styleSubHeader("Average Throughput"), averagePerDay)
	fmt.Printf("%s: %.1fh\n", styleSubHeader("Estimated Hours Completed"), totalHours)
	if len(dailyData) == 0 {
		fmt.Printf("%s\n\n", styleMuted("No completions in this window."))
		return nil
	}
	fmt.Printf("\n%s\n", styleSubHeader("Daily Breakdown"))
	maxCount := 0
	for _, row := range dailyData {
		count := row["completed_tasks"].(int)
		if count > maxCount {
			maxCount = count
		}
	}
	for _, row := range dailyData {
		day := row["date"].(string)
		count := row["completed_tasks"].(int)
		hours := row["hours"].(float64)
		width := 0
		if maxCount > 0 {
			width = int((float64(count) / float64(maxCount)) * 20.0)
		}
		if width < 1 && count > 0 {
			width = 1
		}
		bar := styleSuccess(strings.Repeat("█", width)) + styleMuted(strings.Repeat("░", max(0, 20-width)))
		fmt.Printf("  %s %s %2d task(s), %.1fh\n", styleMuted(day), bar, count, hours)
	}
	fmt.Println("")
	return nil
}

func runReportEstimateAccuracy(args []string) error {
	allowed := map[string]bool{
		"--format": true,
		"--json":   true,
		"--help":   true,
		"-h":       true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdReport)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdReport, args, allowed); err != nil {
		return err
	}
	asJSON := parseFlag(args, "--json") || strings.EqualFold(parseOption(args, "--format"), "json")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	type estimateRow struct {
		ID            string
		Title         string
		EstimateHours float64
		ActualHours   float64
		VariancePct   float64
	}
	rows := []estimateRow{}
	rowsJSON := []map[string]any{}
	varianceTotal := 0.0
	for _, task := range findAllTasksInTree(tree) {
		if task.Status != models.StatusDone || task.DurationMinutes == nil || task.EstimateHours <= 0 {
			continue
		}
		actualHours := *task.DurationMinutes / 60.0
		variancePct := ((actualHours - task.EstimateHours) / task.EstimateHours) * 100.0
		varianceTotal += variancePct
		rows = append(rows, estimateRow{
			ID:            task.ID,
			Title:         task.Title,
			EstimateHours: task.EstimateHours,
			ActualHours:   actualHours,
			VariancePct:   variancePct,
		})
		rowsJSON = append(rowsJSON, map[string]any{
			"id":               task.ID,
			"title":            task.Title,
			"estimate_hours":   task.EstimateHours,
			"actual_hours":     actualHours,
			"variance_percent": variancePct,
		})
	}
	avgVariance := 0.0
	if len(rows) > 0 {
		avgVariance = varianceTotal / float64(len(rows))
	}
	payload := map[string]any{
		"tasks_analyzed":       len(rows),
		"average_variance_pct": avgVariance,
		"tasks":                rowsJSON,
	}
	if asJSON {
		raw, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}
	if len(rows) == 0 {
		fmt.Println(styleWarning("No completed tasks with duration data found."))
		return nil
	}
	sort.Slice(rows, func(i, j int) bool {
		left := rows[i].VariancePct
		if left < 0 {
			left = -left
		}
		right := rows[j].VariancePct
		if right < 0 {
			right = -right
		}
		return left > right
	})

	fmt.Printf("\n%s\n\n", styleHeader("Estimate Accuracy Report"))
	fmt.Printf("%s: %d completed task(s) with duration data\n", styleSubHeader("Analyzed"), len(rows))
	fmt.Printf("%s: %.1f%%\n", styleSubHeader("Average Variance"), avgVariance)
	if avgVariance > 20 {
		fmt.Printf("%s\n", styleWarning("Estimates trend low; consider adding buffer."))
	} else if avgVariance < -20 {
		fmt.Printf("%s\n", styleWarning("Estimates trend high; consider tightening estimates."))
	} else {
		fmt.Printf("%s\n", styleSuccess("Estimate accuracy is within a healthy range."))
	}
	fmt.Printf("\n%s\n", styleSubHeader("Largest Variances"))
	limit := min(5, len(rows))
	for i := 0; i < limit; i++ {
		row := rows[i]
		varianceStyle := styleWarning
		if row.VariancePct > 0 {
			varianceStyle = styleError
		}
		fmt.Printf("  %s %s\n", styleSuccess(row.ID), row.Title)
		fmt.Printf("    est %.1fh -> actual %.1fh (%s)\n", row.EstimateHours, row.ActualHours, varianceStyle(fmt.Sprintf("%+.1f%%", row.VariancePct)))
	}
	fmt.Println("")
	return nil
}

func runData(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if len(args) == 0 {
		return printUsageError(commands.CmdData, errors.New("data requires <summary|export>"))
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdData)
		return nil
	}
	if strings.HasPrefix(strings.TrimSpace(args[0]), "-") {
		return printUsageError(commands.CmdData, errors.New("data requires <summary|export>"))
	}
	if len(positionalArgs(args[1:], map[string]bool{
		"--format":          true,
		"--output":          true,
		"-o":                true,
		"--scope":           true,
		"--include-content": false,
		"--pretty":          false,
	})) > 0 {
		return printUsageError(commands.CmdData, fmt.Errorf("data accepts only one subcommand"))
	}
	sub := strings.TrimSpace(args[0])
	rest := args[1:]
	switch sub {
	case "summary":
		return runDataSummary(rest)
	case "export":
		return runDataExport(rest)
	default:
		return printUsageError(commands.CmdData, fmt.Errorf("unknown data subcommand: %s", sub))
	}
}

func runDataSummary(args []string) error {
	allowed := map[string]bool{
		"--format": true,
		"--help":   true,
		"-h":       true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdData)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdData, args, allowed); err != nil {
		return err
	}
	asJSON := strings.EqualFold(parseOption(args, "--format"), "json")
	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	all := findNormalTasksInTree(tree)
	counts := calculateStatusCounts(all)
	payload := map[string]any{
		"project":   tree.Project,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"overall": map[string]any{
			"total_tasks":      counts.Total,
			"done":             counts.Done,
			"in_progress":      counts.InProgress,
			"pending":          counts.Pending,
			"blocked":          counts.Blocked,
			"percent_complete": percent(counts.Done, counts.Total),
		},
		"phases": []map[string]any{},
	}
	phasesPayload := payload["phases"].([]map[string]any)
	for _, phase := range tree.Phases {
		phaseTasks := []models.Task{}
		for _, milestone := range phase.Milestones {
			for _, epic := range milestone.Epics {
				phaseTasks = append(phaseTasks, epic.Tasks...)
			}
		}
		pCounts := calculateStatusCounts(phaseTasks)
		phasesPayload = append(phasesPayload, map[string]any{
			"id":               phase.ID,
			"name":             phase.Name,
			"done":             pCounts.Done,
			"total":            pCounts.Total,
			"percent_complete": percent(pCounts.Done, pCounts.Total),
		})
	}
	payload["phases"] = phasesPayload

	if asJSON {
		raw, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}
	fmt.Printf("%s\n", styleSubHeader(tree.Project))
	fmt.Printf("%s: %d/%d tasks (%.1f%%)\n", styleSuccess("Overall"), counts.Done, counts.Total, percent(counts.Done, counts.Total))
	return nil
}

func runDataExport(args []string) error {
	allowed := map[string]bool{
		"--format":          true,
		"--output":          true,
		"-o":                true,
		"--scope":           true,
		"--include-content": true,
		"--pretty":          true,
		"--help":            true,
		"-h":                true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdData)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdData, args, allowed); err != nil {
		return err
	}
	format := strings.TrimSpace(parseOption(args, "--format"))
	if format == "" {
		format = "json"
	}
	output := strings.TrimSpace(parseOption(args, "--output", "-o"))
	scopes := []string{}
	for _, scope := range parseOptions(args, "--scope") {
		value := strings.TrimSpace(scope)
		if value != "" {
			scopes = append(scopes, value)
		}
	}
	includeContent := parseFlag(args, "--include-content")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	if len(scopes) > 0 {
		for _, scope := range scopes {
			matches := false
			if tree.FindPhase(scope) != nil || findMilestone(tree, scope) != nil || findEpic(tree, scope) != nil {
				matches = true
			}
			if !matches {
				for _, task := range findAllTasksInTree(tree) {
					if strings.HasPrefix(task.ID, scope) {
						matches = true
						break
					}
				}
			}
			if !matches {
				return fmt.Errorf("No list nodes found for path query: %s", scope)
			}
		}
	}
	stats := calculateStatusCounts(findNormalTasksInTree(tree))
	payload := map[string]any{
		"exported_at":    time.Now().UTC().Format(time.RFC3339),
		"project":        tree.Project,
		"description":    tree.Description,
		"timeline_weeks": tree.TimelineWeeks,
		"stats": map[string]any{
			"total_tasks": stats.Total,
			"done":        stats.Done,
			"in_progress": stats.InProgress,
			"pending":     stats.Pending,
			"blocked":     stats.Blocked,
		},
		"phases": []map[string]any{},
	}

	phasesPayload := []map[string]any{}
	phaseMatchesScope := func(candidate string) bool {
		if len(scopes) == 0 {
			return true
		}
		for _, scope := range scopes {
			if strings.HasPrefix(candidate, scope) || strings.HasPrefix(scope, candidate) {
				return true
			}
		}
		return false
	}
	taskMatchesScope := func(candidate string) bool {
		if len(scopes) == 0 {
			return true
		}
		for _, scope := range scopes {
			if strings.HasPrefix(candidate, scope) {
				return true
			}
		}
		return false
	}
	for _, phase := range tree.Phases {
		if !phaseMatchesScope(phase.ID) {
			continue
		}
		phaseNode := map[string]any{
			"id":             phase.ID,
			"name":           phase.Name,
			"path":           phase.Path,
			"status":         phase.Status,
			"weeks":          phase.Weeks,
			"estimate_hours": phase.EstimateHours,
			"priority":       phase.Priority,
			"depends_on":     phase.DependsOn,
			"milestones":     []map[string]any{},
		}
		milestonesPayload := []map[string]any{}
		for _, milestone := range phase.Milestones {
			if !phaseMatchesScope(milestone.ID) {
				continue
			}
			milestoneNode := map[string]any{
				"id":             milestone.ID,
				"name":           milestone.Name,
				"path":           milestone.Path,
				"status":         milestone.Status,
				"estimate_hours": milestone.EstimateHours,
				"complexity":     milestone.Complexity,
				"depends_on":     milestone.DependsOn,
				"epics":          []map[string]any{},
			}
			epicsPayload := []map[string]any{}
			for _, epic := range milestone.Epics {
				if !phaseMatchesScope(epic.ID) {
					continue
				}
				epicNode := map[string]any{
					"id":             epic.ID,
					"name":           epic.Name,
					"path":           epic.Path,
					"status":         epic.Status,
					"estimate_hours": epic.EstimateHours,
					"complexity":     epic.Complexity,
					"depends_on":     epic.DependsOn,
					"tasks":          []map[string]any{},
				}
				taskPayload := []map[string]any{}
				for _, task := range epic.Tasks {
					if !taskMatchesScope(task.ID) {
						continue
					}
					taskNode := map[string]any{
						"id":               task.ID,
						"title":            task.Title,
						"file":             task.File,
						"status":           task.Status,
						"estimate_hours":   task.EstimateHours,
						"complexity":       task.Complexity,
						"priority":         task.Priority,
						"depends_on":       task.DependsOn,
						"tags":             task.Tags,
						"claimed_by":       nullableString(task.ClaimedBy),
						"claimed_at":       formatTimePtr(task.ClaimedAt),
						"started_at":       formatTimePtr(task.StartedAt),
						"completed_at":     formatTimePtr(task.CompletedAt),
						"duration_minutes": task.DurationMinutes,
					}
					if includeContent {
						taskNode["content"] = readTaskFileSafely(task.File)
					}
					taskPayload = append(taskPayload, taskNode)
				}
				epicNode["tasks"] = taskPayload
				epicsPayload = append(epicsPayload, epicNode)
			}
			milestoneNode["epics"] = epicsPayload
			milestonesPayload = append(milestonesPayload, milestoneNode)
		}
		phaseNode["milestones"] = milestonesPayload
		phasesPayload = append(phasesPayload, phaseNode)
	}
	payload["phases"] = phasesPayload

	var rendered []byte
	if strings.EqualFold(format, "yaml") {
		rendered, err = yaml.Marshal(payload)
		if err != nil {
			return err
		}
	} else {
		pretty := true
		if raw, ok := parseOptionWithPresence(args, "--pretty"); ok {
			value := strings.TrimSpace(strings.ToLower(raw))
			pretty = value != "false" && value != "0" && value != "no"
		}
		if pretty {
			rendered, err = json.MarshalIndent(payload, "", "  ")
		} else {
			rendered, err = json.Marshal(payload)
		}
		if err != nil {
			return err
		}
	}

	if output != "" {
		if err := os.WriteFile(output, rendered, 0o644); err != nil {
			return err
		}
		fmt.Printf("%s %s\n", styleSuccess("Exported to"), output)
		return nil
	}
	fmt.Println(string(rendered))
	return nil
}

func runSchema(args []string) error {
	allowed := map[string]bool{
		"--json":    true,
		"--compact": true,
		"--help":    true,
		"-h":        true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdSchema)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdSchema, args, allowed); err != nil {
		return err
	}
	asJSON := parseFlag(args, "--json")
	compact := parseFlag(args, "--compact")
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}

	spec := map[string]any{
		"schema_version": 1,
		"scope":          "file-kinds",
		"enums": map[string]any{
			"status":       []string{"pending", "in_progress", "blocked", "done", "rejected", "cancelled"},
			"complexity":   []string{"low", "medium", "high", "critical"},
			"priority":     []string{"critical", "high", "medium", "low"},
			"context_mode": []string{"single", "multi", "siblings"},
		},
		"files": []map[string]any{
			{"name": "Root index", "path_pattern": filepath.Join(dataDir, "index.yaml"), "format": "yaml"},
			{"name": "Phase index", "path_pattern": filepath.Join(dataDir, "<phase-path>", "index.yaml"), "format": "yaml"},
			{"name": "Milestone index", "path_pattern": filepath.Join(dataDir, "<phase-path>", "<milestone-path>", "index.yaml"), "format": "yaml"},
			{"name": "Epic index", "path_pattern": filepath.Join(dataDir, "<phase-path>", "<milestone-path>", "<epic-path>", "index.yaml"), "format": "yaml"},
			{"name": "Task file", "path_pattern": filepath.Join(dataDir, "<phase-path>", "<milestone-path>", "<epic-path>", "T###-*.todo"), "format": "markdown-with-yaml-frontmatter"},
			{"name": "Context file", "path_pattern": filepath.Join(dataDir, ".context.yaml"), "format": "yaml"},
			{"name": "Sessions file", "path_pattern": filepath.Join(dataDir, ".sessions.yaml"), "format": "yaml"},
			{"name": "Config file", "path_pattern": filepath.Join(dataDir, "config.yaml"), "format": "yaml"},
		},
	}

	if asJSON {
		var raw []byte
		if compact {
			raw, err = json.Marshal(spec)
		} else {
			raw, err = json.MarshalIndent(spec, "", "  ")
		}
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
		return nil
	}
	fmt.Println(styleSubHeader("Schema"))
	for _, entry := range spec["files"].([]map[string]any) {
		fmt.Printf("- %s: %s\n", styleMuted(fmt.Sprintf("%v", entry["name"])), styleMuted(fmt.Sprintf("%v", entry["path_pattern"])))
	}
	return nil
}

func runSession(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if len(args) == 0 {
		return printUsageError(commands.CmdSession, errors.New("session requires subcommand"))
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdSession)
		return nil
	}

	subcommand := args[0]
	rest := args[1:]
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	sessions, err := taskcontext.LoadSessions(dataDir)
	if err != nil {
		return err
	}
	validateSubcommandArgs := func(valueTaking map[string]bool, allowed map[string]bool) error {
		if err := validateAllowedFlagsForUsage(commands.CmdSession, rest, allowed); err != nil {
			return err
		}
		if len(positionalArgs(rest, valueTaking)) > 0 {
			return printUsageError(commands.CmdSession, fmt.Errorf("session %s does not take positional arguments", subcommand))
		}
		return nil
	}

	now := time.Now().UTC().Format(time.RFC3339)
	switch subcommand {
	case "start":
		if err := validateSubcommandArgs(
			map[string]bool{
				"--agent": true,
				"--task":  true,
			},
			map[string]bool{
				"--agent": true,
				"--task":  true,
				"--help":  true,
				"-h":      true,
			},
		); err != nil {
			return err
		}
		agent := strings.TrimSpace(parseOption(rest, "--agent"))
		if agent == "" {
			return printUsageError(commands.CmdSession, errors.New("session start requires --agent"))
		}
		taskID := strings.TrimSpace(parseOption(rest, "--task"))
		sessions[agent] = taskcontext.SessionPayload{
			Agent:         agent,
			TaskID:        taskID,
			LastHeartbeat: now,
			StartedAt:     now,
		}
		if err := taskcontext.SaveSessions(dataDir, sessions); err != nil {
			return err
		}
		fmt.Println(styleSuccess("✓ Session started"))
		fmt.Printf("  %s %s\n", styleSubHeader("Agent:"), styleMuted(agent))
		if taskID != "" {
			fmt.Printf("  %s  %s\n", styleSubHeader("Task:"), styleMuted(taskID))
		}
		fmt.Printf("  %s  %s\n", styleSubHeader("Time:"), styleMuted(now))
		return nil

	case "heartbeat":
		if err := validateSubcommandArgs(
			map[string]bool{
				"--agent":    true,
				"--progress": true,
			},
			map[string]bool{
				"--agent":    true,
				"--progress": true,
				"--help":     true,
				"-h":         true,
			},
		); err != nil {
			return err
		}
		agent := strings.TrimSpace(parseOption(rest, "--agent"))
		progress := strings.TrimSpace(parseOption(rest, "--progress"))
		if agent == "" {
			return printUsageError(commands.CmdSession, errors.New("session heartbeat requires --agent"))
		}
		session, ok := sessions[agent]
		if !ok {
			fmt.Printf("%s %s\n", styleWarning("Warning:"), styleMuted(fmt.Sprintf("No active session for '%s'", agent)))
			return nil
		}
		session.LastHeartbeat = now
		if progress != "" {
			session.Progress = progress
		}
		sessions[agent] = session
		if err := taskcontext.SaveSessions(dataDir, sessions); err != nil {
			return err
		}
		fmt.Printf("%s %s\n", styleSuccess("✓ Heartbeat updated for"), styleMuted(agent))
		if progress != "" {
			fmt.Printf("  %s %s\n", styleSubHeader("Progress:"), styleMuted(progress))
		}
		return nil

	case "end":
		if err := validateSubcommandArgs(
			map[string]bool{
				"--agent":  true,
				"--status": true,
			},
			map[string]bool{
				"--agent":  true,
				"--status": true,
				"--help":   true,
				"-h":       true,
			},
		); err != nil {
			return err
		}
		agent := strings.TrimSpace(parseOption(rest, "--agent"))
		status := strings.TrimSpace(parseOption(rest, "--status"))
		if status == "" {
			status = "completed"
		}
		if agent == "" {
			return printUsageError(commands.CmdSession, errors.New("session end requires --agent"))
		}
		if _, ok := sessions[agent]; !ok {
			fmt.Printf("%s %s\n", styleWarning("No active session found for"), styleMuted(agent))
			return nil
		}
		delete(sessions, agent)
		if err := taskcontext.SaveSessions(dataDir, sessions); err != nil {
			return err
		}
		fmt.Printf("%s %s\n", styleSuccess("✓ Session ended for"), styleMuted(agent))
		fmt.Printf("  %s %s\n", styleSubHeader("Status:"), styleMuted(status))
		return nil

	case "list":
		timeoutMinutes, err := parseIntOptionWithDefault(rest, 15, "--timeout")
		if err != nil {
			return err
		}
		if timeoutMinutes <= 0 {
			timeoutMinutes = 15
		}
		if err := validateSubcommandArgs(
			map[string]bool{
				"--stale":   false,
				"--timeout": true,
			},
			map[string]bool{
				"--stale":   true,
				"--timeout": true,
				"--help":    true,
				"-h":        true,
			},
		); err != nil {
			return err
		}
		onlyStale := parseFlag(rest, "--stale")
		if len(sessions) == 0 {
			if onlyStale {
				fmt.Println(styleSuccess("✓ No stale sessions"))
			} else {
				fmt.Println(styleWarning("No active sessions"))
			}
			return nil
		}
		agents := make([]string, 0, len(sessions))
		for agent := range sessions {
			agents = append(agents, agent)
		}
		sort.Strings(agents)

		if onlyStale {
			stale := []string{}
			for _, agent := range agents {
				session := sessions[agent]
				ageMinutes := ageSinceRFC3339(session.LastHeartbeat)
				if ageMinutes > timeoutMinutes {
					stale = append(stale, agent)
				}
			}
			if len(stale) == 0 {
				fmt.Println(styleSuccess("✓ No stale sessions"))
				return nil
			}
			fmt.Printf("%s (no heartbeat > %dm):\n", styleWarning("Stale Sessions"), timeoutMinutes)
			for _, agent := range stale {
				session := sessions[agent]
				fmt.Printf("  %s\n", styleMuted(agent))
				if session.TaskID != "" {
					fmt.Printf("    %s %s\n", styleSubHeader("Task:"), styleMuted(session.TaskID))
				}
				fmt.Printf("    %s %dm ago\n", styleSubHeader("Last heartbeat:"), ageSinceRFC3339(session.LastHeartbeat))
				if strings.TrimSpace(session.Progress) != "" {
					fmt.Printf("    %s %s\n", styleSubHeader("Last progress:"), styleMuted(session.Progress))
				}
			}
			return nil
		}

		for _, agent := range agents {
			session := sessions[agent]
			taskLabel := session.TaskID
			if taskLabel == "" {
				taskLabel = "-"
			}
			fmt.Printf("%s task=%s last_hb=%dm progress=%s\n", styleMuted(agent), styleSuccess(taskLabel), ageSinceRFC3339(session.LastHeartbeat), styleMuted(defaultDash(session.Progress)))
		}
		return nil

	case "clean":
		timeoutMinutes, err := parseIntOptionWithDefault(rest, 15, "--timeout")
		if err != nil {
			return err
		}
		if timeoutMinutes <= 0 {
			timeoutMinutes = 15
		}
		if err := validateSubcommandArgs(
			map[string]bool{
				"--timeout": true,
			},
			map[string]bool{
				"--timeout": true,
				"--help":    true,
				"-h":        true,
			},
		); err != nil {
			return err
		}
		removed := []string{}
		for agent, session := range sessions {
			if ageSinceRFC3339(session.LastHeartbeat) > timeoutMinutes {
				delete(sessions, agent)
				removed = append(removed, agent)
			}
		}
		sort.Strings(removed)
		if err := taskcontext.SaveSessions(dataDir, sessions); err != nil {
			return err
		}
		if len(removed) == 0 {
			fmt.Println(styleSuccess("✓ No stale sessions to clean"))
			return nil
		}
		fmt.Printf("%s %d stale session(s):\n", styleSuccess("✓ Removed"), len(removed))
		for _, agent := range removed {
			fmt.Printf("  - %s\n", styleMuted(agent))
		}
		return nil
	}

	return printUsageError(commands.CmdSession, fmt.Errorf("unknown session subcommand: %s", subcommand))
}

func runCheck(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	allowed := map[string]bool{
		"--json":   true,
		"--strict": true,
		"--help":   true,
		"-h":       true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdCheck)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdCheck, args, allowed); err != nil {
		return err
	}
	asJSON := parseFlag(args, "--json")
	strict := parseFlag(args, "--strict")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}

	report := checkReport{
		Errors:   []checkIssue{},
		Warnings: []checkIssue{},
	}

	for _, task := range findAllTasksInTree(tree) {
		if strings.TrimSpace(task.File) == "" {
			report.Errors = append(report.Errors, checkIssue{
				Code:     "missing_task_file",
				Message:  "task missing file path",
				Location: task.ID,
			})
			continue
		}
		if !taskFileExists(task.File) {
			report.Errors = append(report.Errors, checkIssue{
				Code:     "missing_task_file",
				Message:  "task file does not exist",
				Location: task.ID,
			})
		}
	}

	calculator := critical_path.NewCriticalPathCalculator(tree, map[string]float64{})
	if _, _, err := calculator.Calculate(); err != nil {
		report.Errors = append(report.Errors, checkIssue{
			Code:    "dependency_graph",
			Message: err.Error(),
		})
	}

	allIDs := map[string]struct{}{}
	for _, id := range allTaskIDs(tree) {
		allIDs[id] = struct{}{}
	}
	ctx, ctxErr := taskcontext.LoadContext(dataDir)
	if ctxErr == nil {
		if strings.TrimSpace(ctx.CurrentTask) != "" {
			if _, ok := allIDs[ctx.CurrentTask]; !ok {
				report.Warnings = append(report.Warnings, checkIssue{
					Code:     "stale_context",
					Message:  "current task is not present in task tree",
					Location: ctx.CurrentTask,
				})
			}
		}
	}
	sessions, sessionsErr := taskcontext.LoadSessions(dataDir)
	if sessionsErr == nil {
		for agent, session := range sessions {
			if strings.TrimSpace(session.TaskID) == "" {
				continue
			}
			if _, ok := allIDs[session.TaskID]; !ok {
				report.Warnings = append(report.Warnings, checkIssue{
					Code:     "stale_session",
					Message:  fmt.Sprintf("session agent %s points to missing task", agent),
					Location: session.TaskID,
				})
			}
		}
	}

	report.Summary.Errors = len(report.Errors)
	report.Summary.Warnings = len(report.Warnings)
	report.OK = report.Summary.Errors == 0 && (!strict || report.Summary.Warnings == 0)

	if asJSON {
		raw, err := json.MarshalIndent(report, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(raw))
	} else if len(report.Errors) == 0 && len(report.Warnings) == 0 {
		fmt.Println(styleSuccess("Consistency check passed with no issues."))
	} else {
		fmt.Printf("%s: %d error(s), %d warning(s)\n", styleWarning("Consistency check results"), report.Summary.Errors, report.Summary.Warnings)
		if len(report.Errors) > 0 {
			fmt.Println(styleError("Errors:"))
			for _, issue := range report.Errors {
				if issue.Location != "" {
					fmt.Printf("- %s: %s (%s)\n", styleError(issue.Code), styleMuted(issue.Message), styleMuted(issue.Location))
				} else {
					fmt.Printf("- %s: %s\n", styleError(issue.Code), styleMuted(issue.Message))
				}
			}
		}
		if len(report.Warnings) > 0 {
			fmt.Println(styleWarning("Warnings:"))
			for _, issue := range report.Warnings {
				if issue.Location != "" {
					fmt.Printf("- %s: %s (%s)\n", styleWarning(issue.Code), styleMuted(issue.Message), styleMuted(issue.Location))
				} else {
					fmt.Printf("- %s: %s\n", styleWarning(issue.Code), styleMuted(issue.Message))
				}
			}
		}
	}

	if report.Summary.Errors > 0 || (strict && report.Summary.Warnings > 0) {
		return errors.New("consistency check failed")
	}
	return nil
}

func runSkip(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	allowed := map[string]bool{
		"--agent":   true,
		"--no-grab": true,
		"--help":    true,
		"-h":        true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdSkip)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdSkip, args, allowed); err != nil {
		return err
	}
	if len(positionalArgs(args, map[string]bool{
		"--agent":   true,
		"--no-grab": false,
	})) > 1 {
		return printUsageError(commands.CmdSkip, errors.New("skip accepts at most one TASK_ID"))
	}
	taskID := firstPositionalArg(args, allowed)
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	if taskID == "" {
		ctx, err := taskcontext.LoadContext(dataDir)
		if err != nil {
			return err
		}
		taskID = ctx.CurrentTask
		if taskID == "" {
			taskID = ctx.PrimaryTask
		}
		if taskID == "" {
			return printUsageError(commands.CmdSkip, errors.New("No task ID provided and no current working task set."))
		}
	}
	if err := validateTaskID(taskID); err != nil {
		return printUsageError(commands.CmdSkip, err)
	}
	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	task := tree.FindTask(taskID)
	if task == nil {
		return fmt.Errorf("Task not found: %s", taskID)
	}
	if task.Status == models.StatusInProgress {
		if err := applyTaskStatusTransition(task, models.StatusPending, "skip"); err != nil {
			return err
		}
	} else if task.Status == models.StatusPending && (task.ClaimedBy != "" || task.ClaimedAt != nil) {
		task.ClaimedBy = ""
		task.ClaimedAt = nil
		task.Reason = ""
	} else {
		fmt.Printf("%s %s\n", styleError("Task is not in progress:"), styleMuted(string(task.Status)))
		return nil
	}
	if err := saveTaskState(*task, tree); err != nil {
		return err
	}
	if err := taskcontext.ClearContext(dataDir); err != nil {
		return err
	}
	fmt.Printf("%s %s - %s\n", styleWarning("Skipped:"), styleSuccess(task.ID), styleSuccess(task.Title))

	if parseFlag(args, "--no-grab") {
		fmt.Println(styleWarning("Tip: Run `backlog grab` to claim the next available task."))
		return nil
	}

	refreshed, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	calculator := critical_path.NewCriticalPathCalculator(refreshed, map[string]float64{})
	_, nextAvailable, err := calculator.Calculate()
	if err != nil {
		return err
	}
	if strings.TrimSpace(nextAvailable) == "" || nextAvailable == task.ID {
		fmt.Println(styleWarning("No available tasks found."))
		return nil
	}
	agent := strings.TrimSpace(parseOption(args, "--agent"))
	if agent == "" {
		agent = "cli-user"
	}
	return grabTaskByID(refreshed, *calculator, nextAvailable, dataDirFromContext(), agent)
}

func runHandoff(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	allowed := map[string]bool{
		"--to":    true,
		"--notes": true,
		"--force": true,
		"--help":  true,
		"-h":      true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdHandoff)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdHandoff, args, allowed); err != nil {
		return err
	}
	valueTaking := map[string]bool{
		"--to":    true,
		"--notes": true,
		"--force": false,
		"--help":  false,
		"-h":      false,
	}
	if len(positionalArgs(args, valueTaking)) > 1 {
		return printUsageError(commands.CmdHandoff, errors.New("handoff accepts at most one TASK_ID"))
	}
	taskID := firstPositionalArg(args, valueTaking)
	toAgent := strings.TrimSpace(parseOption(args, "--to"))
	notes := strings.TrimSpace(parseOption(args, "--notes"))
	force := parseFlag(args, "--force")
	if toAgent == "" {
		return printUsageError(commands.CmdHandoff, errors.New("handoff requires --to AGENT"))
	}

	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	if taskID == "" {
		ctx, err := taskcontext.LoadContext(dataDir)
		if err != nil {
			return err
		}
		taskID = ctx.CurrentTask
		if taskID == "" {
			taskID = ctx.PrimaryTask
		}
		if taskID == "" {
			return printUsageError(commands.CmdHandoff, errors.New("No task ID provided and no current working task set."))
		}
	}
	if err := validateTaskID(taskID); err != nil {
		return printUsageError(commands.CmdHandoff, err)
	}

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	task := tree.FindTask(taskID)
	if task == nil {
		return fmt.Errorf("Task not found: %s", taskID)
	}
	if task.Status != models.StatusInProgress && !force {
		return fmt.Errorf("Cannot handoff task %s: task is %s, not in_progress", task.ID, task.Status)
	}
	now := time.Now().UTC()
	task.Status = models.StatusInProgress
	task.ClaimedBy = toAgent
	task.ClaimedAt = &now
	if task.StartedAt == nil {
		task.StartedAt = &now
	}
	if err := saveTaskState(*task, tree); err != nil {
		return err
	}

	if notes != "" {
		taskPath, err := resolveTaskFilePath(task.File)
		if err == nil {
			f, openErr := os.OpenFile(taskPath, os.O_APPEND|os.O_WRONLY, 0)
			if openErr == nil {
				_, _ = fmt.Fprintf(
					f,
					"\n\n## Handoff\n\n- To: %s\n- At: %s\n- Notes: %s\n",
					toAgent,
					now.Format(time.RFC3339),
					notes,
				)
				_ = f.Close()
			}
		}
	}

	if err := taskcontext.SetCurrentTask(dataDir, task.ID, toAgent); err != nil {
		return err
	}
	fmt.Printf("%s %s - %s\n", styleWarning("Handed off:"), styleSuccess(task.ID), styleSuccess(task.Title))
	fmt.Printf("  %s %s\n", styleSubHeader("To:"), styleMuted(toAgent))
	if notes != "" {
		fmt.Printf("  %s %s\n", styleSubHeader("Notes:"), styleMuted(notes))
	}
	printNextCommands(
		"backlog show "+task.ID,
		"backlog work "+task.ID,
	)
	return nil
}

func runUnclaimStale(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	allowed := map[string]bool{
		"--threshold": true,
		"--dry-run":   true,
		"--help":      true,
		"-h":          true,
	}
	if parseFlag(args, "--help", "-h") {
		printUsageForCommand(commands.CmdUnclaimStale)
		return nil
	}
	if err := validateAllowedFlagsForUsage(commands.CmdUnclaimStale, args, allowed); err != nil {
		return err
	}
	thresholdMinutes, err := parseIntOptionWithDefault(args, 120, "--threshold")
	if err != nil {
		return err
	}
	if thresholdMinutes <= 0 {
		thresholdMinutes = 120
	}
	dryRun := parseFlag(args, "--dry-run")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	stale := []models.Task{}
	for _, task := range findAllTasksInTree(tree) {
		if task.Status != models.StatusInProgress || task.ClaimedAt == nil {
			continue
		}
		ageMinutes := int(now.Sub(*task.ClaimedAt).Minutes())
		if ageMinutes >= thresholdMinutes {
			stale = append(stale, task)
		}
	}

	if len(stale) == 0 {
		fmt.Println(styleWarning("No stale claimed tasks found."))
		return nil
	}
	sort.Slice(stale, func(i, j int) bool {
		return stale[i].ID < stale[j].ID
	})

	if dryRun {
		fmt.Printf("%s %d stale task(s):\n", styleWarning("Would unclaim"), len(stale))
		for _, task := range stale {
			fmt.Printf("  %s (%s)\n", styleMuted(task.ID), styleMuted(defaultDash(task.ClaimedBy)))
		}
		return nil
	}

	for _, snapshot := range stale {
		task := findTask(tree, snapshot.ID)
		if task == nil {
			continue
		}
		resetTaskToPending(task)
		if err := saveTaskState(*task, tree); err != nil {
			return err
		}
	}
	fmt.Printf("%s %d stale task(s)\n", styleWarning("Unclaimed"), len(stale))
	return nil
}

func timelineGroupKey(task models.Task, groupBy string) string {
	switch strings.ToLower(strings.TrimSpace(groupBy)) {
	case "phase":
		if task.PhaseID != "" {
			return task.PhaseID
		}
	case "epic":
		if task.EpicID != "" {
			return task.EpicID
		}
	case "status":
		return string(task.Status)
	default:
		if task.MilestoneID != "" {
			return task.MilestoneID
		}
	}
	return "unknown"
}

type statusCounts struct {
	Total      int
	Done       int
	InProgress int
	Pending    int
	Blocked    int
}

func calculateStatusCounts(tasks []models.Task) statusCounts {
	counts := statusCounts{Total: len(tasks)}
	for _, task := range tasks {
		switch task.Status {
		case models.StatusDone:
			counts.Done++
		case models.StatusInProgress:
			counts.InProgress++
		case models.StatusBlocked:
			counts.Blocked++
		case models.StatusPending:
			counts.Pending++
		}
	}
	return counts
}

func remainingHours(tasks []models.Task) float64 {
	total := 0.0
	for _, task := range tasks {
		if task.Status != models.StatusDone {
			total += task.EstimateHours
		}
	}
	return total
}

func percent(done, total int) float64 {
	if total <= 0 {
		return 0
	}
	return (float64(done) / float64(total)) * 100.0
}

func extractTaskIDs(tasks []models.Task) []string {
	out := make([]string, 0, len(tasks))
	for _, task := range tasks {
		if task.ID != "" {
			out = append(out, task.ID)
		}
	}
	sort.Strings(out)
	return out
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func formatTimePtr(value *time.Time) any {
	if value == nil {
		return nil
	}
	return value.UTC().Format(time.RFC3339)
}

func readTaskFileSafely(taskFile string) any {
	taskPath, err := resolveTaskFilePath(taskFile)
	if err != nil {
		return nil
	}
	raw, err := os.ReadFile(taskPath)
	if err != nil {
		return nil
	}
	return string(raw)
}

func ageSinceRFC3339(raw string) int {
	if strings.TrimSpace(raw) == "" {
		return 1_000_000
	}
	parsed, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return 1_000_000
	}
	return int(time.Since(parsed).Minutes())
}

func defaultDash(value string) string {
	if strings.TrimSpace(value) == "" {
		return "-"
	}
	return value
}
