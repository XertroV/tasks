package critical_path

import (
	"errors"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strings"

	"github.com/XertroV/tasks/backlog_go/internal/models"
)

var (
	idErrorRegex = regexp.MustCompile(`^(?:[BEI]\d+|P\d+(?:\.M\d+(?:\.E\d+(?:\.T\d+)?)?)?|M\d+|E\d+|T\d+)$`)
	bugIDRegex   = regexp.MustCompile(`^B\d+$`)
	ideaIDRegex  = regexp.MustCompile(`^I\d+$`)
)

var defaultComplexityMultipliers = map[string]float64{
	"low":      1,
	"medium":   1.25,
	"high":     1.5,
	"critical": 2,
}

type TaskWeightProvider map[string]float64

type WhyDependency struct {
	ID        string
	Found     bool
	Title     string
	Status    models.Status
	Satisfied bool
}

type WhyReport struct {
	TaskID               string
	TaskTitle            string
	Status               models.Status
	OnCriticalPath       bool
	CriticalPathIndex    int
	CanStart             bool
	ExplicitDependencies []WhyDependency
	ImplicitDependency   *WhyDependency
}

type dependencyGraph struct {
	nodeWeights map[string]float64
	edges       map[string]map[string]struct{}
	order       []string
}

// CriticalPathCalculator provides DAG-based dependency resolution and availability checks.
type CriticalPathCalculator struct {
	tree              models.TaskTree
	complexityWeights TaskWeightProvider
}

func NewCriticalPathCalculator(tree models.TaskTree, complexityMultipliers map[string]float64) *CriticalPathCalculator {
	multipliers := map[string]float64{}
	for k, v := range defaultComplexityMultipliers {
		multipliers[k] = v
	}
	for k, v := range complexityMultipliers {
		multipliers[strings.ToLower(strings.TrimSpace(k))] = v
	}

	return &CriticalPathCalculator{tree: tree, complexityWeights: multipliers}
}

func (c *CriticalPathCalculator) allTasksOrdered() []models.Task {
	return c.tree.AllTasks()
}

func (c *CriticalPathCalculator) taskWeight(task models.Task) float64 {
	if task.Status == models.StatusDone {
		return 0
	}
	m := c.complexityWeights[strings.ToLower(string(task.Complexity))]
	if m == 0 {
		m = 1
	}
	return task.EstimateHours * m
}

func (c *CriticalPathCalculator) ValidateStatusTransition(current, next models.Status) error {
	return models.ValidateStatusTransition(current, next)
}

func (c *CriticalPathCalculator) BuildDependencyGraph() (*dependencyGraph, error) {
	graph := &dependencyGraph{
		nodeWeights: map[string]float64{},
		edges:       map[string]map[string]struct{}{},
		order:       []string{},
	}

	tasks := c.allTasksOrdered()
	for _, task := range tasks {
		graph.nodeWeights[task.ID] = c.taskWeight(task)
		graph.order = append(graph.order, task.ID)
		if _, ok := graph.edges[task.ID]; !ok {
			graph.edges[task.ID] = map[string]struct{}{}
		}
	}

	for _, phase := range c.tree.Phases {
		for mIdx := range phase.Milestones {
			milestone := &phase.Milestones[mIdx]

			for eIdx := range milestone.Epics {
				epic := &milestone.Epics[eIdx]
				for tIdx, task := range epic.Tasks {
					t := task // local copy for pointer safety
					for _, depID := range t.DependsOn {
						targets, err := c.resolveDependencyTargets(depID, t.MilestoneID)
						if err != nil {
							return nil, err
						}
						for _, depTask := range targets {
							if depTask != nil {
								graph.addEdge(depTask.ID, t.ID)
							}
						}
					}

					if len(t.DependsOn) == 0 && tIdx > 0 {
						graph.addEdge(epic.Tasks[tIdx-1].ID, t.ID)
					}
				}

				for _, depEpicID := range epic.DependsOn {
					depEpic, err := c.resolveEpicDependency(depEpicID, epic.MilestoneID)
					if err != nil {
						return nil, err
					}
					if depEpic != nil && len(epic.Tasks) > 0 && len(depEpic.Tasks) > 0 {
						firstTaskID := epic.Tasks[0].ID
						lastEpicTaskID := depEpic.Tasks[len(depEpic.Tasks)-1].ID
						graph.addEdge(lastEpicTaskID, firstTaskID)
					}
				}
			}

			for _, depMilestoneID := range milestone.DependsOn {
				depMilestone, err := c.resolveMilestoneDependency(depMilestoneID, phase.ID)
				if err != nil {
					return nil, err
				}
				if depMilestone == nil || len(milestone.Epics) == 0 || len(depMilestone.Epics) == 0 {
					continue
				}

				depMilestoneLastTask := lastTaskInMilestone(*depMilestone)
				if depMilestoneLastTask == "" {
					continue
				}

				currentMilestoneFirstTask := firstTaskInMilestone(*milestone)
				if currentMilestoneFirstTask != "" {
					graph.addEdge(depMilestoneLastTask, currentMilestoneFirstTask)
				}
			}
		}

			for _, depPhaseID := range phase.DependsOn {
				depPhase, err := c.resolvePhaseDependency(depPhaseID)
				if err != nil {
					return nil, err
				}
				if depPhase == nil || len(phase.Milestones) == 0 || len(depPhase.Milestones) == 0 {
					continue
				}

				depPhaseLastTask := lastTaskInPhase(*depPhase)
				if depPhaseLastTask == "" {
					continue
				}

				currentMilestoneFirstTask := firstTaskInPhase(phase)
				if currentMilestoneFirstTask != "" {
					graph.addEdge(depPhaseLastTask, currentMilestoneFirstTask)
				}
			}
		}

	for _, bug := range c.tree.Bugs {
		for _, depID := range bug.DependsOn {
			targets, err := c.resolveDependencyTargets(depID, "")
			if err != nil {
				return nil, err
			}
			for _, target := range targets {
				graph.addEdge(target.ID, bug.ID)
			}
		}
	}

	for _, idea := range c.tree.Ideas {
		for _, depID := range idea.DependsOn {
			targets, err := c.resolveDependencyTargets(depID, "")
			if err != nil {
				return nil, err
			}
			for _, target := range targets {
				graph.addEdge(target.ID, idea.ID)
			}
		}
	}

	return graph, nil
}

func (g *dependencyGraph) addEdge(from string, to string) {
	if from == "" || to == "" {
		return
	}
	if g.edges[from] == nil {
		g.edges[from] = map[string]struct{}{}
	}
	g.edges[from][to] = struct{}{}
}

// Calculate returns the critical path and the highest-priority currently-available
// task according to dependency availability + priority ordering.
func (c *CriticalPathCalculator) Calculate() ([]string, string, error) {
	graph, err := c.BuildDependencyGraph()
	if err != nil {
		return nil, "", err
	}

	criticalPath, err := graph.longestPath()
	if err != nil {
		return nil, "", err
	}

	available := c.FindAllAvailable()
	if len(available) == 0 {
		return criticalPath, "", nil
	}

	prioritized := c.prioritizeTaskIDs(available, criticalPath)
	if len(prioritized) == 0 {
		return criticalPath, "", nil
	}
	for _, candidate := range prioritized {
		if !bugIDRegex.MatchString(candidate) && !ideaIDRegex.MatchString(candidate) {
			return criticalPath, candidate, nil
		}
	}
	return criticalPath, prioritized[0], nil
}

func (g *dependencyGraph) longestPath() ([]string, error) {
	order := topologicalSort(g)
	if len(order) != len(g.nodeWeights) {
		return nil, errors.New("dependency graph contains cycle(s): could not perform topological sort")
	}

	if len(order) == 0 {
		return []string{}, nil
	}

	dist := make(map[string]float64, len(g.nodeWeights))
	parent := make(map[string]string, len(g.nodeWeights))
	for _, id := range order {
		dist[id] = g.nodeWeights[id]
	}

	for _, from := range order {
		successors := mapToSortedSlice(g.edges[from])
		for _, to := range successors {
			candidate := dist[from] + g.nodeWeights[to]
			if candidate > dist[to] {
				dist[to] = candidate
				parent[to] = from
			}
		}
	}

	end := order[0]
	endScore := dist[end]
	for _, id := range order {
		score := dist[id]
		if score > endScore {
			end = id
			endScore = score
		}
	}

	path := []string{}
	cursor := end
	for {
		path = append([]string{cursor}, path...)
		prev, ok := parent[cursor]
		if !ok {
			break
		}
		cursor = prev
	}

	return path, nil
}

func topologicalSort(graph *dependencyGraph) []string {
	inDegree := map[string]int{}
	for _, id := range graph.order {
		inDegree[id] = 0
	}
	for from, tos := range graph.edges {
		for to := range tos {
			if _, ok := inDegree[to]; ok {
				inDegree[to]++
			}
		}
		_ = from
	}

	queue := []string{}
	for _, id := range graph.order {
		if inDegree[id] == 0 {
			queue = append(queue, id)
		}
	}

	resolved := make([]string, 0, len(graph.order))
	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		resolved = append(resolved, id)
		successors := mapToSortedSlice(graph.edges[id])
		for _, to := range successors {
			if _, ok := inDegree[to]; !ok {
				continue
			}
			inDegree[to]--
			if inDegree[to] == 0 {
				queue = append(queue, to)
			}
		}
	}

	if len(resolved) != len(graph.order) {
		return resolved
	}
	return resolved
}

func mapToSortedSlice(m map[string]struct{}) []string {
	out := make([]string, 0, len(m))
	for v := range m {
		out = append(out, v)
	}
	sort.Strings(out)
	return out
}

// FindAllAvailable returns pending, unclaimed tasks whose dependency constraints are met.
func (c *CriticalPathCalculator) FindAllAvailable() []string {
	available := []string{}

	for _, task := range c.allTasksOrdered() {
		if !c.isTaskAvailable(&task, map[string]struct{}{}) {
			continue
		}
		available = append(available, task.ID)
	}

	return available
}

func (c *CriticalPathCalculator) isTaskAvailable(task *models.Task, batch map[string]struct{}) bool {
	if task == nil {
		return false
	}
	if task.Status != models.StatusPending {
		return false
	}
	if task.ClaimedBy != "" {
		return false
	}
	return c.checkDependencies(task, batch)
}

func (c *CriticalPathCalculator) CanStart(taskID string) (bool, error) {
	if err := validateTaskID(taskID); err != nil {
		return false, err
	}
	task := c.tree.FindTask(taskID)
	if task == nil {
		return false, fmt.Errorf("task not found: %s", taskID)
	}
	return c.isTaskAvailable(task, map[string]struct{}{}), nil
}

func (c *CriticalPathCalculator) FindSiblingTasks(primaryTaskID string, count int) ([]string, error) {
	if count <= 0 {
		return []string{}, nil
	}
	if err := validateTaskID(primaryTaskID); err != nil {
		return nil, err
	}
	primary := c.tree.FindTask(primaryTaskID)
	if primary == nil {
		return nil, fmt.Errorf("task not found: %s", primaryTaskID)
	}
	if primary.EpicID == "" {
		return []string{}, nil
	}
	epic := c.tree.FindEpic(primary.EpicID)
	if epic == nil {
		return []string{}, nil
	}

	index := -1
	for i, task := range epic.Tasks {
		if task.ID == primary.ID {
			index = i
			break
		}
	}
	if index < 0 {
		return nil, fmt.Errorf("task %s not found in epic %s", primary.ID, primary.EpicID)
	}

	inBatch := map[string]struct{}{primary.ID: {}}
	out := []string{}

	for i := index + 1; i < len(epic.Tasks) && len(out) < count; i++ {
		task := epic.Tasks[i]
		if task.Status != models.StatusPending || task.ClaimedBy != "" {
			continue
		}
		if c.checkDependenciesWithinBatch(&task, inBatch) {
			out = append(out, task.ID)
			inBatch[task.ID] = struct{}{}
		}
	}

	return out, nil
}

func (c *CriticalPathCalculator) FindAdditionalBugs(primaryTaskID string, count int) ([]string, error) {
	if count <= 0 {
		return []string{}, nil
	}
	if err := validateTaskID(primaryTaskID); err != nil {
		return nil, err
	}
	primaryTask := c.tree.FindTask(primaryTaskID)
	if primaryTask == nil {
		return nil, fmt.Errorf("task not found: %s", primaryTaskID)
	}
	if !isBug(primaryTask.ID) {
		return []string{}, nil
	}

	criticalPath, _, err := c.Calculate()
	if err != nil {
		return nil, err
	}

	bugCandidates := []string{}
	for _, candidateID := range c.FindAllAvailable() {
		if candidateID == primaryTask.ID {
			continue
		}
		if !isBug(candidateID) {
			continue
		}
		bugCandidates = append(bugCandidates, candidateID)
	}

	prioritized := c.prioritizeTaskIDs(bugCandidates, criticalPath)
	selected := []string{}
	for _, candidate := range prioritized {
		if len(selected) >= count {
			break
		}
		if hasDependencyRelationship(candidate, primaryTask.ID, c) {
			continue
		}
		if hasAnyDependencyRelationshipWithSelected(candidate, selected, c) {
			continue
		}
		selected = append(selected, candidate)
	}

	return selected, nil
}

func hasAnyDependencyRelationshipWithSelected(candidate string, selected []string, calc *CriticalPathCalculator) bool {
	for _, selectedID := range selected {
		if hasDependencyRelationship(candidate, selectedID, calc) {
			return true
		}
	}
	return false
}

func (c *CriticalPathCalculator) FindTasksBlockedBy(taskID string) ([]string, error) {
	if err := validateTaskID(taskID); err != nil {
		return nil, err
	}
	blocked := map[string]models.Task{}

	for pIdx := range c.tree.Phases {
		phase := c.tree.Phases[pIdx]
		for mIdx := range phase.Milestones {
			milestone := phase.Milestones[mIdx]
			for eIdx := range milestone.Epics {
				epic := milestone.Epics[eIdx]
				for tIdx, task := range epic.Tasks {
					if hasDependency(task.DependsOn, taskID) {
						blocked[task.ID] = task
					}
					if len(task.DependsOn) == 0 && tIdx > 0 {
						prev := epic.Tasks[tIdx-1]
						if prev.ID == taskID {
							blocked[task.ID] = task
						}
					}
				}
			}
		}
	}

	for _, bug := range c.tree.Bugs {
		if hasDependency(bug.DependsOn, taskID) {
			blocked[bug.ID] = bug
		}
	}

	for _, idea := range c.tree.Ideas {
		if hasDependency(idea.DependsOn, taskID) {
			blocked[idea.ID] = idea
		}
	}

	if len(blocked) == 0 {
		return []string{}, nil
	}

	ordered := make([]string, 0, len(blocked))
	for id := range blocked {
		ordered = append(ordered, id)
	}
	sort.Strings(ordered)
	return ordered, nil
}

func (c *CriticalPathCalculator) FindPendingBlocked() ([]string, error) {
	blocked := []string{}
	for _, task := range c.allTasksOrdered() {
		if task.Status != models.StatusPending || task.ClaimedBy != "" {
			continue
		}
		if c.isTaskAvailable(&task, map[string]struct{}{}) {
			continue
		}
		blocked = append(blocked, task.ID)
	}
	return blocked, nil
}

func (c *CriticalPathCalculator) FindRootBlockers() ([]string, error) {
	pendingBlocked, err := c.FindPendingBlocked()
	if err != nil {
		return nil, err
	}

	root := map[string]struct{}{}
	ordered := []string{}

	for _, blockedID := range pendingBlocked {
		blockedTask := c.tree.FindTask(blockedID)
		if blockedTask == nil {
			continue
		}

		for _, dep := range blockedTask.DependsOn {
			candidate := c.tree.FindTask(dep)
			if candidate == nil || candidate.Status == models.StatusDone {
				continue
			}
			if candidate.Status == models.StatusInProgress || (candidate.Status == models.StatusPending && c.isTaskAvailable(candidate, map[string]struct{}{})) {
				if _, seen := root[candidate.ID]; !seen {
					root[candidate.ID] = struct{}{}
					ordered = append(ordered, candidate.ID)
				}
			}
		}

		if len(blockedTask.DependsOn) == 0 && blockedTask.EpicID != "" {
			epic := c.tree.FindEpic(blockedTask.EpicID)
			if epic == nil || len(epic.Tasks) == 0 {
				continue
			}
			for idx, t := range epic.Tasks {
				if t.ID != blockedTask.ID {
					continue
				}
				if idx == 0 {
					break
				}
				prev := epic.Tasks[idx-1]
				if prev.Status == models.StatusDone {
					break
				}
				if _, seen := root[prev.ID]; !seen {
					root[prev.ID] = struct{}{}
					ordered = append(ordered, prev.ID)
				}
				break
			}
		}
	}

	return ordered, nil
}

func (c *CriticalPathCalculator) Why(taskID string) (WhyReport, error) {
	report := WhyReport{TaskID: taskID, CriticalPathIndex: -1}
	if err := validateTaskID(taskID); err != nil {
		return report, err
	}
	task := c.tree.FindTask(taskID)
	if task == nil {
		return report, fmt.Errorf("task not found: %s", taskID)
	}
	report.TaskID = task.ID
	report.TaskTitle = task.Title
	report.Status = task.Status

	criticalPath, _, err := c.Calculate()
	if err != nil {
		return report, err
	}

	for index, id := range criticalPath {
		if id == task.ID {
			report.OnCriticalPath = true
			report.CriticalPathIndex = index
			break
		}
	}

	for _, depID := range task.DependsOn {
		dep := WhyDependency{ID: depID}
		depTask := c.tree.FindTask(depID)
		if depTask == nil {
			dep.Found = false
			report.ExplicitDependencies = append(report.ExplicitDependencies, dep)
			continue
		}

		dep.Found = true
		dep.Title = depTask.Title
		dep.Status = depTask.Status
		dep.Satisfied = depTask.Status == models.StatusDone
		report.ExplicitDependencies = append(report.ExplicitDependencies, dep)
	}

	if len(task.DependsOn) == 0 && task.EpicID != "" {
		epic := c.tree.FindEpic(task.EpicID)
		if epic != nil {
			for idx, epicTask := range epic.Tasks {
				if epicTask.ID != task.ID {
					continue
				}
				if idx == 0 {
					break
				}
				prev := epic.Tasks[idx-1]
				report.ImplicitDependency = &WhyDependency{
					ID:        prev.ID,
					Found:     true,
					Title:     prev.Title,
					Status:    prev.Status,
					Satisfied: prev.Status == models.StatusDone,
				}
				break
			}
		}
	}

	report.CanStart = c.isTaskAvailable(task, map[string]struct{}{})

	return report, nil
}

func (c *CriticalPathCalculator) prioritizeTaskIDs(taskIDs []string, criticalPath []string) []string {
	if len(taskIDs) == 0 {
		return []string{}
	}

	cpPos := map[string]int{}
	for index, id := range criticalPath {
		cpPos[id] = index
	}

	type rankedTask struct {
		id             string
		originalPos    int
		typeRank       int
		priorityRank   int
		onCriticalPath int
		cpPos          int
	}

	ranked := make([]rankedTask, 0, len(taskIDs))
	for idx, id := range taskIDs {
		task := c.tree.FindTask(id)
		if task == nil {
			continue
		}
		ranked = append(ranked, rankedTask{
			id:             task.ID,
			originalPos:    idx,
			typeRank:       c.taskTypeRank(task.ID),
			priorityRank:   c.priorityRank(task.Priority),
			onCriticalPath: boolToInt(contains(criticalPath, task.ID)),
			cpPos:          cpPosValue(cpPos, task.ID),
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
		if a.onCriticalPath != b.onCriticalPath {
			return a.onCriticalPath < b.onCriticalPath
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

func (c *CriticalPathCalculator) taskTypeRank(taskID string) int {
	if isBug(taskID) {
		return 0
	}
	if isIdea(taskID) {
		return 2
	}
	return 1
}

func (c *CriticalPathCalculator) priorityRank(priority models.Priority) int {
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

func (c *CriticalPathCalculator) resolveDependencyTargets(dependencyID string, milestoneID string) ([]*models.Task, error) {
	if strings.TrimSpace(dependencyID) == "" {
		return nil, nil
	}
	if err := validateDependencyID(dependencyID); err != nil {
		return nil, err
	}

	if task := c.tree.FindTask(dependencyID); task != nil {
		return []*models.Task{task}, nil
	}
	epicID, err := c.resolveEpicDependency(dependencyID, milestoneID)
	if err != nil {
		return nil, err
	}
	if epicID != nil {
		tasks := make([]*models.Task, 0, len(epicID.Tasks))
		for i := range epicID.Tasks {
			tasks = append(tasks, &epicID.Tasks[i])
		}
		if len(tasks) > 0 {
			return tasks, nil
		}
	}
	return nil, nil
}

func (c *CriticalPathCalculator) resolveEpicDependency(depEpicID string, milestoneID string) (*models.Epic, error) {
	if strings.TrimSpace(depEpicID) == "" {
		return nil, nil
	}
	if err := validateDependencyID(depEpicID); err != nil {
		return nil, err
	}

	if epic := c.tree.FindEpic(depEpicID); epic != nil {
		return epic, nil
	}
	if milestoneID != "" && !strings.Contains(depEpicID, ".") {
		if epic := c.tree.FindEpic(milestoneID + "." + depEpicID); epic != nil {
			return epic, nil
		}
	}
	return nil, nil
}

func (c *CriticalPathCalculator) resolveMilestoneDependency(depMilestoneID string, phaseID string) (*models.Milestone, error) {
	if strings.TrimSpace(depMilestoneID) == "" {
		return nil, nil
	}
	if err := validateDependencyID(depMilestoneID); err != nil {
		return nil, err
	}

	if milestone := c.tree.FindMilestone(depMilestoneID); milestone != nil {
		return milestone, nil
	}
	if phaseID != "" && !strings.Contains(depMilestoneID, ".") {
		if milestone := c.tree.FindMilestone(phaseID + "." + depMilestoneID); milestone != nil {
			return milestone, nil
		}
	}
	return nil, nil
}

func (c *CriticalPathCalculator) resolvePhaseDependency(depPhaseID string) (*models.Phase, error) {
	if strings.TrimSpace(depPhaseID) == "" {
		return nil, nil
	}
	if err := validateDependencyID(depPhaseID); err != nil {
		return nil, err
	}

	for i := range c.tree.Phases {
		phase := &c.tree.Phases[i]
		if phase.ID == depPhaseID {
			return phase, nil
		}
	}
	return nil, nil
}

func (c *CriticalPathCalculator) checkDependencies(task *models.Task, inBatch map[string]struct{}) bool {
	for _, depID := range task.DependsOn {
		targets, err := c.resolveDependencyTargets(depID, task.MilestoneID)
		if err != nil || len(targets) == 0 {
			return false
		}
		for _, dep := range targets {
			if dep.Status != models.StatusDone {
				if _, ok := inBatch[dep.ID]; !ok {
					return false
				}
			}
		}
	}

	if len(task.DependsOn) == 0 && task.EpicID != "" {
		epic := c.tree.FindEpic(task.EpicID)
		if epic != nil {
			for i, epicTask := range epic.Tasks {
				if epicTask.ID == task.ID {
					if i > 0 {
						prevTask := epic.Tasks[i-1]
						if prevTask.Status != models.StatusDone {
							if _, ok := inBatch[prevTask.ID]; !ok {
								return false
							}
						}
					}
					break
				}
			}
		}
	}

	if task.PhaseID != "" {
		phase := c.tree.FindPhase(task.PhaseID)
		if phase != nil {
			for _, depPhaseID := range phase.DependsOn {
				depPhase, err := c.resolvePhaseDependency(depPhaseID)
				if err != nil || depPhase == nil {
					continue
				}
				if !c.isPhaseComplete(*depPhase) {
					return false
				}
			}
		}
	}

	if task.MilestoneID != "" {
		milestone := c.tree.FindMilestone(task.MilestoneID)
		if milestone != nil {
			for _, depMilestoneID := range milestone.DependsOn {
				depMilestone, err := c.resolveMilestoneDependency(depMilestoneID, task.PhaseID)
				if err != nil || depMilestone == nil {
					continue
				}
				if !c.isMilestoneComplete(*depMilestone) {
					return false
				}
			}
		}
	}

	if task.EpicID != "" {
		epic := c.tree.FindEpic(task.EpicID)
		if epic != nil {
			for _, depEpicID := range epic.DependsOn {
				depEpic, err := c.resolveEpicDependency(depEpicID, epic.MilestoneID)
				if err != nil || depEpic == nil {
					continue
				}
				if !c.isEpicComplete(*depEpic) {
					return false
				}
			}
		}
	}

	return true
}

func (c *CriticalPathCalculator) checkDependenciesWithinBatch(task *models.Task, batchTaskIDs map[string]struct{}) bool {
	return c.checkDependencies(task, batchTaskIDs)
}

func (c *CriticalPathCalculator) isPhaseComplete(phase models.Phase) bool {
	if len(phase.Milestones) == 0 {
		return true
	}
	for _, milestone := range phase.Milestones {
		if !c.isMilestoneComplete(milestone) {
			return false
		}
	}
	return true
}

func (c *CriticalPathCalculator) isMilestoneComplete(milestone models.Milestone) bool {
	if len(milestone.Epics) == 0 {
		return true
	}
	for _, epic := range milestone.Epics {
		if !c.isEpicComplete(epic) {
			return false
		}
	}
	return true
}

func (c *CriticalPathCalculator) isEpicComplete(epic models.Epic) bool {
	for _, task := range epic.Tasks {
		if task.Status != models.StatusDone {
			return false
		}
	}
	return true
}

func hasDependency(depList []string, dep string) bool {
	for _, candidate := range depList {
		if strings.TrimSpace(candidate) == dep {
			return true
		}
	}
	return false
}

func isBug(taskID string) bool {
	return bugIDRegex.MatchString(taskID)
}

func isIdea(taskID string) bool {
	return ideaIDRegex.MatchString(taskID)
}

func boolToInt(v bool) int {
	if v {
		return 0
	}
	return 1
}

func contains(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}

func cpPosValue(cpPos map[string]int, id string) int {
	if value, ok := cpPos[id]; ok {
		return value
	}
	return math.MaxInt32
}

func firstTaskInEpic(tasks []models.Task) string {
	if len(tasks) == 0 {
		return ""
	}
	return tasks[0].ID
}

func lastTaskInEpic(tasks []models.Task) string {
	if len(tasks) == 0 {
		return ""
	}
	return tasks[len(tasks)-1].ID
}

func firstTaskInMilestone(milestone models.Milestone) string {
	if len(milestone.Epics) == 0 {
		return ""
	}
	return firstTaskInEpic(milestone.Epics[0].Tasks)
}

func lastTaskInMilestone(milestone models.Milestone) string {
	if len(milestone.Epics) == 0 {
		return ""
	}
	return lastTaskInEpic(milestone.Epics[len(milestone.Epics)-1].Tasks)
}

func firstTaskInPhase(phase models.Phase) string {
	if len(phase.Milestones) == 0 {
		return ""
	}
	return firstTaskInMilestone(phase.Milestones[0])
}

func lastTaskInPhase(phase models.Phase) string {
	if len(phase.Milestones) == 0 {
		return ""
	}
	return lastTaskInMilestone(phase.Milestones[len(phase.Milestones)-1])
}

func validateTaskID(taskID string) error {
	if strings.TrimSpace(taskID) == "" {
		return errors.New("malformed task id: empty")
	}
	if !idErrorRegex.MatchString(strings.TrimSpace(taskID)) {
		return fmt.Errorf("malformed task id: %s", taskID)
	}
	return nil
}

func validateDependencyID(taskID string) error {
	if strings.TrimSpace(taskID) == "" {
		return nil
	}
	if !idErrorRegex.MatchString(strings.TrimSpace(taskID)) {
		return fmt.Errorf("malformed dependency id: %s", taskID)
	}
	if strings.HasPrefix(taskID, "P") {
		if _, err := models.ParseTaskPath(taskID); err != nil {
			return err
		}
	}
	return nil
}

func hasDependencyRelationship(startID, targetID string, calc *CriticalPathCalculator) bool {
	start := calc.tree.FindTask(startID)
	target := calc.tree.FindTask(targetID)
	if start == nil || target == nil {
		return false
	}
	return calc.hasDependencyChain(start, target.ID, map[string]struct{}{})
}

func (c *CriticalPathCalculator) hasDependencyChain(task *models.Task, targetID string, seen map[string]struct{}) bool {
	if task == nil {
		return false
	}
	if _, ok := seen[task.ID]; ok {
		return false
	}
	seen[task.ID] = struct{}{}

	for _, depID := range task.DependsOn {
		if depID == targetID {
			return true
		}
		for _, depTask := range c.taskDependencies(task, depID) {
			if depTask == nil {
				continue
			}
			if depTask.ID == targetID {
				return true
			}
			if c.hasDependencyChain(depTask, targetID, seen) {
				return true
			}
		}
	}

	return false
}

func (c *CriticalPathCalculator) taskDependencies(task *models.Task, depID string) []*models.Task {
	if task == nil {
		return nil
	}
	deps, err := c.resolveDependencyTargets(depID, task.MilestoneID)
	if err != nil || len(deps) == 0 {
		return nil
	}
	return deps
}
