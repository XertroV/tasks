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
	allowed := map[string]bool{
		"--status":     true,
		"--tags":       true,
		"--complexity": true,
		"--priority":   true,
		"--limit":      true,
		"--json":       true,
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
		return err
	}
	pattern := firstPositionalArg(args, map[string]bool{
		"--status":     true,
		"--tags":       true,
		"--complexity": true,
		"--priority":   true,
		"--limit":      true,
		"--json":       false,
	})
	if strings.TrimSpace(pattern) == "" {
		return errors.New("search requires PATTERN")
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
			return err
		}
	}
	var complexityFilter models.Complexity
	if hasComplexity {
		complexityFilter, err = models.ParseComplexity(complexityRaw)
		if err != nil {
			return err
		}
	}
	var priorityFilter models.Priority
	if hasPriority {
		priorityFilter, err = models.ParsePriority(priorityRaw)
		if err != nil {
			return err
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
		fmt.Printf("No tasks found matching '%s'\n", pattern)
		return nil
	}
	fmt.Printf("Found %d result(s) for %q:\n", len(matches), pattern)
	for i, task := range matches {
		if i >= limit {
			fmt.Printf("... and %d more\n", len(matches)-limit)
			break
		}
		crit := " "
		if containsString(criticalPath, task.ID) {
			crit = "*"
		}
		fmt.Printf("%s %s %s [%s]\n", crit, task.ID, task.Title, task.Status)
	}
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
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
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
		fmt.Println("No blocked tasks!")
		return nil
	}

	fmt.Printf("%d task(s) marked as BLOCKED\n", len(blockedMarked))
	fmt.Printf("%d task(s) waiting on dependencies\n", len(pendingBlocked))
	fmt.Println("Blocking Chains:")

	limit := 10
	if parseFlag(args, "--deep") {
		limit = len(rootBlockers)
	}
	for i, id := range rootBlockers {
		if i >= limit {
			fmt.Printf("... and %d more blocking chains (use --deep to see all)\n", len(rootBlockers)-limit)
			break
		}
		task := findTask(tree, id)
		if task == nil {
			continue
		}
		crit := ""
		if containsString(criticalPath, id) {
			crit = " CRITICAL"
		}
		owner := "UNCLAIMED"
		if strings.TrimSpace(task.ClaimedBy) != "" {
			owner = "@" + task.ClaimedBy
		}
		fmt.Printf("%s %s%s %s\n", task.ID, task.Status, crit, owner)
		if parseFlag(args, "--suggest") && task.Status == models.StatusPending && strings.TrimSpace(task.ClaimedBy) == "" {
			fmt.Printf("  suggest: backlog grab %s\n", task.ID)
		}
	}
	return nil
}

func runWhy(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	allowed := map[string]bool{
		"--json": true,
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
		return err
	}
	taskID := firstPositionalArg(args, allowed)
	if strings.TrimSpace(taskID) == "" {
		return errors.New("why requires TASK_ID")
	}
	if err := validateTaskID(taskID); err != nil {
		return err
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

	fmt.Printf("%s - %s\n", report.TaskID, report.TaskTitle)
	fmt.Printf("Status: %s\n", report.Status)
	fmt.Printf("On critical path: %t\n", report.OnCriticalPath)
	if report.OnCriticalPath {
		fmt.Printf("Critical path index: %d\n", report.CriticalPathIndex+1)
	}
	if len(report.ExplicitDependencies) > 0 {
		fmt.Println("Explicit dependencies:")
		for _, dep := range report.ExplicitDependencies {
			if !dep.Found {
				fmt.Printf("  - %s (missing)\n", dep.ID)
				continue
			}
			marker := "✗"
			if dep.Satisfied {
				marker = "✓"
			}
			fmt.Printf("  - %s %s (%s)\n", marker, dep.ID, dep.Status)
		}
	}
	if report.ImplicitDependency != nil {
		marker := "✗"
		if report.ImplicitDependency.Satisfied {
			marker = "✓"
		}
		fmt.Printf("Implicit dependency: %s %s (%s)\n", marker, report.ImplicitDependency.ID, report.ImplicitDependency.Status)
	}
	if report.CanStart {
		fmt.Println("Task can be started.")
	} else {
		fmt.Println("Task is blocked on dependencies.")
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
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
		return err
	}
	scope := strings.TrimSpace(parseOption(args, "--scope"))
	groupBy := strings.TrimSpace(parseOption(args, "--group-by"))
	if groupBy == "" {
		groupBy = "milestone"
	}
	showDone := parseFlag(args, "--show-done")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	calculator := critical_path.NewCriticalPathCalculator(tree, map[string]float64{})
	criticalPath, _, err := calculator.Calculate()
	if err != nil {
		return err
	}

	tasks := findAllTasksInTree(tree)
	filtered := []models.Task{}
	for _, task := range tasks {
		if scope != "" && !strings.HasPrefix(task.ID, scope) {
			continue
		}
		if !showDone && task.Status == models.StatusDone {
			continue
		}
		filtered = append(filtered, task)
	}
	if len(filtered) == 0 {
		fmt.Println("No tasks to display.")
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
			"scope":         scope,
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

	fmt.Println("Project Timeline")
	for _, key := range order {
		fmt.Println(key)
		items := groups[key]
		sort.Slice(items, func(i, j int) bool {
			return items[i].ID < items[j].ID
		})
		for _, task := range items {
			crit := " "
			if containsString(criticalPath, task.ID) {
				crit = "*"
			}
			fmt.Printf("  %s %s %s %s\n", crit, task.ID, task.Status, task.Title)
		}
	}
	return nil
}

func runReport(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
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
		return fmt.Errorf("unknown report subcommand: %s", subcommand)
	}
}

func runReportProgress(args []string) error {
	allowed := map[string]bool{
		"--format":       true,
		"--json":         true,
		"--by-phase":     true,
		"--by-milestone": true,
		"--by-epic":      true,
		"--all":          true,
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
		return err
	}
	asJSON := parseFlag(args, "--json") || strings.EqualFold(parseOption(args, "--format"), "json")

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

	fmt.Printf("Overall: %d/%d tasks complete (%.1f%%)\n", payload.Overall.Done, payload.Overall.Total, payload.Overall.PercentComplete)
	fmt.Printf("In progress: %d | Pending: %d | Blocked: %d\n", payload.Overall.InProgress, payload.Overall.Pending, payload.Overall.Blocked)
	for _, phase := range payload.Phases {
		fmt.Printf("%s: %d/%d (%.1f%%)\n", phase.ID, phase.Done, phase.Total, phase.PercentDone)
	}
	return nil
}

func runReportVelocity(args []string) error {
	allowed := map[string]bool{
		"--days":   true,
		"--format": true,
		"--json":   true,
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
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

	payload := map[string]any{
		"days":            days,
		"completed_tasks": completed,
		"total_hours":     totalHours,
		"average_per_day": float64(completed) / float64(max(days, 1)),
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
	fmt.Printf("Velocity (%d days): %d tasks complete (%.1f/day)\n", days, completed, payload["average_per_day"].(float64))
	return nil
}

func runReportEstimateAccuracy(args []string) error {
	allowed := map[string]bool{
		"--format": true,
		"--json":   true,
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
		return err
	}
	asJSON := parseFlag(args, "--json") || strings.EqualFold(parseOption(args, "--format"), "json")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
	}
	rows := []map[string]any{}
	varianceTotal := 0.0
	for _, task := range findAllTasksInTree(tree) {
		if task.Status != models.StatusDone || task.DurationMinutes == nil || task.EstimateHours <= 0 {
			continue
		}
		actualHours := *task.DurationMinutes / 60.0
		variancePct := ((actualHours - task.EstimateHours) / task.EstimateHours) * 100.0
		varianceTotal += variancePct
		rows = append(rows, map[string]any{
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
		"tasks":                rows,
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
		fmt.Println("No completed tasks with duration data found.")
		return nil
	}
	fmt.Printf("Estimate accuracy: %d task(s), avg variance %.1f%%\n", len(rows), avgVariance)
	return nil
}

func runData(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if len(args) == 0 {
		fmt.Println("Usage: backlog data <summary|export> [options]")
		return nil
	}
	sub := strings.TrimSpace(args[0])
	rest := args[1:]
	switch sub {
	case "summary":
		return runDataSummary(rest)
	case "export":
		return runDataExport(rest)
	default:
		return fmt.Errorf("Unknown data subcommand: %s", sub)
	}
}

func runDataSummary(args []string) error {
	allowed := map[string]bool{
		"--format": true,
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
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
	fmt.Printf("%s\n", tree.Project)
	fmt.Printf("Overall: %d/%d tasks (%.1f%%)\n", counts.Done, counts.Total, percent(counts.Done, counts.Total))
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
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
		return err
	}
	format := strings.TrimSpace(parseOption(args, "--format"))
	if format == "" {
		format = "json"
	}
	output := strings.TrimSpace(parseOption(args, "--output", "-o"))
	scope := strings.TrimSpace(parseOption(args, "--scope"))
	includeContent := parseFlag(args, "--include-content")

	tree, err := loader.New().Load("metadata", true, true)
	if err != nil {
		return err
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
	for _, phase := range tree.Phases {
		if scope != "" && !strings.HasPrefix(phase.ID, scope) && !strings.HasPrefix(scope, phase.ID) {
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
			if scope != "" && !strings.HasPrefix(milestone.ID, scope) && !strings.HasPrefix(scope, milestone.ID) {
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
				if scope != "" && !strings.HasPrefix(epic.ID, scope) && !strings.HasPrefix(scope, epic.ID) {
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
					if scope != "" && !strings.HasPrefix(task.ID, scope) {
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
		fmt.Printf("Exported to %s\n", output)
		return nil
	}
	fmt.Println(string(rendered))
	return nil
}

func runSchema(args []string) error {
	allowed := map[string]bool{
		"--json":    true,
		"--compact": true,
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
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
	fmt.Println("Schema")
	for _, entry := range spec["files"].([]map[string]any) {
		fmt.Printf("- %s: %s\n", entry["name"], entry["path_pattern"])
	}
	return nil
}

func runSession(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	if len(args) == 0 || args[0] == "--help" {
		fmt.Println("Usage: backlog session <start|heartbeat|list|end|clean> [options]")
		return nil
	}

	subcommand := args[0]
	rest := args[1:]
	timeoutMinutes, err := parseIntOptionWithDefault(rest, 15, "--timeout")
	if err != nil {
		return err
	}
	if timeoutMinutes <= 0 {
		timeoutMinutes = 15
	}
	dataDir, err := ensureDataRoot()
	if err != nil {
		return err
	}
	sessions, err := taskcontext.LoadSessions(dataDir)
	if err != nil {
		return err
	}

	now := time.Now().UTC().Format(time.RFC3339)
	switch subcommand {
	case "start":
		agent := strings.TrimSpace(parseOption(rest, "--agent"))
		if agent == "" {
			return errors.New("session start requires --agent")
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
		fmt.Println("✓ Session started")
		fmt.Printf("  Agent: %s\n", agent)
		if taskID != "" {
			fmt.Printf("  Task:  %s\n", taskID)
		}
		fmt.Printf("  Time:  %s\n", now)
		return nil

	case "heartbeat":
		agent := strings.TrimSpace(parseOption(rest, "--agent"))
		progress := strings.TrimSpace(parseOption(rest, "--progress"))
		if agent == "" {
			return errors.New("session heartbeat requires --agent")
		}
		session, ok := sessions[agent]
		if !ok {
			fmt.Printf("Warning: No active session for '%s'\n", agent)
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
		fmt.Printf("✓ Heartbeat updated for %s\n", agent)
		if progress != "" {
			fmt.Printf("  Progress: %s\n", progress)
		}
		return nil

	case "end":
		agent := strings.TrimSpace(parseOption(rest, "--agent"))
		status := strings.TrimSpace(parseOption(rest, "--status"))
		if status == "" {
			status = "completed"
		}
		if agent == "" {
			return errors.New("session end requires --agent")
		}
		if _, ok := sessions[agent]; !ok {
			fmt.Printf("No active session found for '%s'\n", agent)
			return nil
		}
		delete(sessions, agent)
		if err := taskcontext.SaveSessions(dataDir, sessions); err != nil {
			return err
		}
		fmt.Printf("✓ Session ended for %s\n", agent)
		fmt.Printf("  Status: %s\n", status)
		return nil

	case "list":
		onlyStale := parseFlag(rest, "--stale")
		if len(sessions) == 0 {
			if onlyStale {
				fmt.Println("✓ No stale sessions")
			} else {
				fmt.Println("No active sessions")
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
				fmt.Println("✓ No stale sessions")
				return nil
			}
			fmt.Printf("Stale Sessions (no heartbeat > %dm):\n", timeoutMinutes)
			for _, agent := range stale {
				session := sessions[agent]
				fmt.Printf("  %s\n", agent)
				if session.TaskID != "" {
					fmt.Printf("    Task: %s\n", session.TaskID)
				}
				fmt.Printf("    Last heartbeat: %dm ago\n", ageSinceRFC3339(session.LastHeartbeat))
				if strings.TrimSpace(session.Progress) != "" {
					fmt.Printf("    Last progress: %s\n", session.Progress)
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
			fmt.Printf("%s task=%s last_hb=%dm progress=%s\n", agent, taskLabel, ageSinceRFC3339(session.LastHeartbeat), defaultDash(session.Progress))
		}
		return nil

	case "clean":
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
			fmt.Println("✓ No stale sessions to clean")
			return nil
		}
		fmt.Printf("✓ Removed %d stale session(s):\n", len(removed))
		for _, agent := range removed {
			fmt.Printf("  - %s\n", agent)
		}
		return nil
	}

	return fmt.Errorf("Unknown session subcommand: %s", subcommand)
}

func runCheck(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	allowed := map[string]bool{
		"--json":   true,
		"--strict": true,
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
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
		fmt.Println("Consistency check passed with no issues.")
	} else {
		fmt.Printf("Consistency check results: %d error(s), %d warning(s)\n", report.Summary.Errors, report.Summary.Warnings)
		if len(report.Errors) > 0 {
			fmt.Println("Errors:")
			for _, issue := range report.Errors {
				if issue.Location != "" {
					fmt.Printf("- %s: %s (%s)\n", issue.Code, issue.Message, issue.Location)
				} else {
					fmt.Printf("- %s: %s\n", issue.Code, issue.Message)
				}
			}
		}
		if len(report.Warnings) > 0 {
			fmt.Println("Warnings:")
			for _, issue := range report.Warnings {
				if issue.Location != "" {
					fmt.Printf("- %s: %s (%s)\n", issue.Code, issue.Message, issue.Location)
				} else {
					fmt.Printf("- %s: %s\n", issue.Code, issue.Message)
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
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
		return err
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
	if task.Status == models.StatusInProgress {
		if err := applyTaskStatusTransition(task, models.StatusPending, "skip"); err != nil {
			return err
		}
	} else if task.Status == models.StatusPending && (task.ClaimedBy != "" || task.ClaimedAt != nil) {
		task.ClaimedBy = ""
		task.ClaimedAt = nil
		task.Reason = ""
	} else {
		fmt.Printf("Task is not in progress: %s\n", task.Status)
		return nil
	}
	if err := saveTaskState(*task, tree); err != nil {
		return err
	}
	if err := taskcontext.ClearContext(dataDir); err != nil {
		return err
	}
	fmt.Printf("Skipped: %s - %s\n", task.ID, task.Title)

	if parseFlag(args, "--no-grab") {
		fmt.Println("Tip: Run `backlog grab` to claim the next available task.")
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
		fmt.Println("No available tasks found.")
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
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
		return err
	}
	taskID := firstPositionalArg(args, allowed)
	toAgent := strings.TrimSpace(parseOption(args, "--to"))
	notes := strings.TrimSpace(parseOption(args, "--notes"))
	force := parseFlag(args, "--force")
	if toAgent == "" {
		return errors.New("handoff requires --to AGENT")
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
	fmt.Printf("Handed off: %s - %s\n", task.ID, task.Title)
	fmt.Printf("To: %s\n", toAgent)
	if notes != "" {
		fmt.Printf("Notes: %s\n", notes)
	}
	return nil
}

func runUnclaimStale(args []string) error {
	if _, err := ensureDataRoot(); err != nil {
		return err
	}
	allowed := map[string]bool{
		"--threshold": true,
		"--dry-run":   true,
	}
	if err := validateAllowedFlags(args, allowed); err != nil {
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
		fmt.Println("No stale claimed tasks found.")
		return nil
	}
	sort.Slice(stale, func(i, j int) bool {
		return stale[i].ID < stale[j].ID
	})

	if dryRun {
		fmt.Printf("Would unclaim %d stale task(s):\n", len(stale))
		for _, task := range stale {
			fmt.Printf("  %s (%s)\n", task.ID, defaultDash(task.ClaimedBy))
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
	fmt.Printf("Unclaimed %d stale task(s)\n", len(stale))
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
