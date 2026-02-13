"""Load task tree from YAML files."""

import os
import re
import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
from .models import (
    TaskTree,
    Phase,
    Milestone,
    Epic,
    Task,
    Status,
    Complexity,
    Priority,
    TaskPath,
)


class TaskLoader:
    """Load task tree from .tasks/ directory."""

    def __init__(self, tasks_dir: str = ".tasks"):
        self.tasks_dir = Path(tasks_dir)
        if not self.tasks_dir.exists():
            raise FileNotFoundError(f"Tasks directory not found: {tasks_dir}")

    def load(self) -> TaskTree:
        """Load complete task tree."""
        root_index_path = self.tasks_dir / "index.yaml"
        try:
            # Load root index
            root_index = self._load_yaml(root_index_path)

            # Create task tree
            tree = TaskTree(
                project=root_index["project"],
                description=root_index.get("description", ""),
                timeline_weeks=root_index.get("timeline_weeks", 0),
                critical_path=root_index.get("critical_path", []),
                next_available=root_index.get("next_available"),
            )

            # Load phases
            for phase_data in root_index.get("phases", []):
                try:
                    phase = self._load_phase(phase_data)
                    tree.phases.append(phase)
                except Exception as e:
                    phase_id = phase_data.get("id", "UNKNOWN")
                    phase_path = phase_data.get("path", "UNKNOWN")
                    raise RuntimeError(
                        f"Error loading phase {phase_id} (path: {phase_path}): {str(e)}"
                    ) from e

            # Load bugs
            tree.bugs = self._load_bugs()

            return tree
        except KeyError as e:
            raise RuntimeError(
                f"Missing required field {str(e)} in root index: {root_index_path}"
            ) from e

    def _get_estimate_hours(self, data: Dict[str, Any], default: float = 0.0) -> float:
        """Read estimate from either estimate_hours or estimated_hours."""
        value = data.get("estimate_hours")
        if value is None:
            value = data.get("estimated_hours", default)
        return float(value)

    def _load_phase(self, phase_data: Dict[str, Any]) -> Phase:
        """Load a phase and its milestones."""
        try:
            phase_path = self.tasks_dir / phase_data["path"]

            # Load phase index (skip if not exists)
            if not (phase_path / "index.yaml").exists():
                # Phase not yet populated, return minimal phase
                return Phase(
                    id=phase_data["id"],
                    name=phase_data["name"],
                    path=phase_data["path"],
                    status=Status(phase_data.get("status", "pending")),
                    weeks=phase_data.get("weeks", 0),
                    estimate_hours=self._get_estimate_hours(phase_data, 0.0),
                    priority=Priority(phase_data.get("priority", "medium")),
                    depends_on=phase_data.get("depends_on", []),
                    description=phase_data.get("description"),
                )

            phase_index_path = phase_path / "index.yaml"
            phase_index = self._load_yaml(phase_index_path)

            phase = Phase(
                id=phase_data["id"],
                name=phase_data["name"],
                path=phase_data["path"],
                status=Status(phase_data.get("status", "pending")),
                weeks=phase_data.get("weeks", 0),
                estimate_hours=self._get_estimate_hours(phase_data, 0.0),
                priority=Priority(phase_data.get("priority", "medium")),
                depends_on=phase_data.get("depends_on", []),
                description=phase_data.get("description"),
            )

            # Load milestones
            for milestone_data in phase_index.get("milestones", []):
                try:
                    milestone = self._load_milestone(
                        phase_path, milestone_data, phase.id
                    )
                    phase.milestones.append(milestone)
                except Exception as e:
                    milestone_id = milestone_data.get("id", "UNKNOWN")
                    milestone_path = milestone_data.get("path", "UNKNOWN")
                    raise RuntimeError(
                        f"Error loading milestone {phase.id}.{milestone_id} "
                        f"(path: {phase.path}/{milestone_path}): {str(e)}"
                    ) from e

            return phase
        except KeyError as e:
            raise RuntimeError(
                f"Missing required field {str(e)} in phase data: {phase_data}"
            ) from e

    def _load_milestone(
        self, phase_path: Path, milestone_data: Dict[str, Any], phase_id: str
    ) -> Milestone:
        """Load a milestone and its epics."""
        try:
            milestone_path = phase_path / milestone_data["path"]

            # Build fully qualified milestone ID using TaskPath
            milestone_short_id = milestone_data["id"]
            ms_path = TaskPath.for_milestone(phase_id, milestone_short_id)

            # Load milestone index (may not exist if not yet populated)
            if (milestone_path / "index.yaml").exists():
                milestone_index_path = milestone_path / "index.yaml"
                milestone_index = self._load_yaml(milestone_index_path)
            else:
                milestone_index = {"epics": []}

            milestone = Milestone(
                id=ms_path.full_id,  # Fully qualified: "P1.M1"
                name=milestone_data["name"],
                path=milestone_data["path"],
                status=Status(milestone_data.get("status", "pending")),
                estimate_hours=self._get_estimate_hours(milestone_data, 0.0),
                complexity=Complexity(milestone_data.get("complexity", "medium")),
                depends_on=milestone_data.get("depends_on", []),
                description=milestone_data.get("description"),
                phase_id=phase_id,
            )

            # Load epics
            for epic_data in milestone_index.get("epics", []):
                try:
                    epic = self._load_epic(milestone_path, epic_data, ms_path)
                    milestone.epics.append(epic)
                except Exception as e:
                    epic_id = (
                        epic_data.get("id", "UNKNOWN")
                        if isinstance(epic_data, dict)
                        else "UNKNOWN"
                    )
                    epic_file_path = (
                        epic_data.get("path", "UNKNOWN")
                        if isinstance(epic_data, dict)
                        else str(epic_data)
                    )
                    full_path = (
                        f"{phase_path.name}/{milestone_data['path']}/{epic_file_path}"
                    )
                    raise RuntimeError(
                        f"Error loading epic {ms_path.full_id}.{epic_id} "
                        f"(path: {full_path}): {str(e)}\n"
                        f"Epic data type: {type(epic_data)}, value: {epic_data}"
                    ) from e

            return milestone
        except KeyError as e:
            raise RuntimeError(
                f"Missing required field {str(e)} in milestone data: {milestone_data}"
            ) from e

    def _load_epic(
        self,
        milestone_path: Path,
        epic_data: Dict[str, Any],
        ms_path: TaskPath,
    ) -> Epic:
        """Load an epic and its tasks."""
        epic_file_path = milestone_path / epic_data["path"]

        # Build fully qualified epic ID using TaskPath
        epic_path = ms_path.with_epic(epic_data["id"])

        # Load epic index (may not exist if not yet populated)
        if (epic_file_path / "index.yaml").exists():
            epic_index = self._load_yaml(epic_file_path / "index.yaml")
        else:
            epic_index = {"tasks": []}

        epic = Epic(
            id=epic_path.full_id,  # Fully qualified: "P1.M1.E1"
            name=epic_data["name"],
            path=epic_data["path"],
            status=Status(epic_data.get("status", "pending")),
            estimate_hours=self._get_estimate_hours(epic_data, 0.0),
            complexity=Complexity(epic_data.get("complexity", "medium")),
            depends_on=epic_data.get("depends_on", []),
            description=epic_data.get("description"),
            milestone_id=ms_path.full_id,  # Fully qualified: "P1.M1"
            phase_id=ms_path.phase,
        )

        # Load tasks
        for task_data in epic_index.get("tasks", []):
            task = self._load_task(epic_file_path, task_data, epic_path)
            epic.tasks.append(task)

        return epic

    def _load_task(
        self,
        epic_file_path: Path,
        task_data: Dict[str, Any] | str,
        epic_path: TaskPath,
    ) -> Task:
        """Load a task from its .todo file."""
        # Handle both formats: dict with metadata or simple string filename
        if isinstance(task_data, str):
            # Simple format: just a filename
            # Extract task ID from filename (e.g., "T001" from "T001-description.todo")
            filename = task_data
            task_short_id = filename.split("-")[0].replace(".todo", "")
            # Build full qualified task ID using TaskPath
            task_path = epic_path.with_task(task_short_id)
            task_data = {"file": filename, "id": task_path.full_id}
        elif not isinstance(task_data, dict):
            raise ValueError(
                f"Task data must be dict or str, got {type(task_data).__name__}: {task_data}"
            )

        # Support both 'file' and 'path' keys
        filename = task_data.get("file") or task_data.get("path")
        if not filename:
            raise KeyError(
                f"Task data missing 'file' or 'path' key. Task data: {task_data}"
            )

        task_file = epic_file_path / filename

        # Parse .todo file (YAML frontmatter + Markdown)
        if task_file.exists():
            frontmatter, _ = self._parse_todo_file(task_file)
        else:
            # Task file doesn't exist yet, use data from index
            frontmatter = {}

        # Merge frontmatter with task_data (frontmatter takes precedence)
        task_id = frontmatter.get("id", task_data.get("id", ""))

        # If task_id doesn't start with the phase prefix, it's incomplete - build the full ID
        if task_id and not task_id.startswith(f"{epic_path.phase}."):
            # Extract just the T### part
            task_short_id = task_id.split(".")[
                -1
            ]  # Gets T001 from either "T001" or "P1.M2.E3.T001"
            task_path = epic_path.with_task(task_short_id)
            task_id = task_path.full_id

        title = frontmatter.get("title", task_data.get("title", ""))
        status = frontmatter.get("status", task_data.get("status", "pending"))
        estimate_hours = frontmatter.get("estimate_hours")
        if estimate_hours is None:
            estimate_hours = frontmatter.get("estimated_hours")
        if estimate_hours is None:
            estimate_hours = task_data.get("estimate_hours")
        if estimate_hours is None:
            estimate_hours = task_data.get("estimated_hours", 0.0)
        complexity = frontmatter.get("complexity", task_data.get("complexity", "low"))
        priority = frontmatter.get("priority", task_data.get("priority", "medium"))
        depends_on = frontmatter.get("depends_on", task_data.get("depends_on", []))

        # Parse datetime fields
        claimed_at = self._parse_datetime(frontmatter.get("claimed_at"))
        started_at = self._parse_datetime(frontmatter.get("started_at"))
        completed_at = self._parse_datetime(frontmatter.get("completed_at"))

        # Parse duration if present
        duration_minutes = frontmatter.get("duration_minutes")
        if duration_minutes is not None:
            duration_minutes = float(duration_minutes)

        task = Task(
            id=task_id,
            title=title,
            file=str(task_file.relative_to(self.tasks_dir)),
            status=Status(status),
            estimate_hours=float(estimate_hours),
            complexity=Complexity(complexity),
            priority=Priority(priority),
            depends_on=depends_on if isinstance(depends_on, list) else [],
            claimed_by=frontmatter.get("claimed_by"),
            claimed_at=claimed_at,
            started_at=started_at,
            completed_at=completed_at,
            duration_minutes=duration_minutes,
            tags=frontmatter.get("tags", []),
            epic_id=epic_path.full_id,  # Fully qualified: "P1.M1.E1"
            milestone_id=epic_path.milestone_id,  # Fully qualified: "P1.M1"
            phase_id=epic_path.phase,
        )

        return task

    def _load_yaml(self, filepath: Path) -> Dict[str, Any]:
        """Load YAML file."""
        try:
            with open(filepath, "r") as f:
                data = yaml.safe_load(f)
                if data is None:
                    raise ValueError(f"YAML file is empty or invalid: {filepath}")
                if not isinstance(data, dict):
                    raise ValueError(
                        f"YAML file does not contain a dictionary. "
                        f"Got {type(data).__name__}: {filepath}"
                    )
                return data
        except yaml.YAMLError as e:
            raise RuntimeError(f"YAML parsing error in {filepath}: {str(e)}") from e
        except FileNotFoundError:
            raise FileNotFoundError(f"YAML file not found: {filepath}")
        except Exception as e:
            raise RuntimeError(f"Error reading {filepath}: {str(e)}") from e

    def _parse_todo_file(self, filepath: Path) -> tuple[Dict[str, Any], str]:
        """Parse .todo file with YAML frontmatter."""
        with open(filepath, "r") as f:
            content = f.read()

        # Split frontmatter and body
        parts = content.split("---\n", 2)
        if len(parts) >= 3:
            frontmatter_str = parts[1]
            body = parts[2]
            frontmatter = yaml.safe_load(frontmatter_str)
            return frontmatter, body
        else:
            return {}, content

    def _parse_datetime(self, dt_str: Optional[str]) -> Optional[datetime]:
        """Parse datetime string."""
        if not dt_str:
            return None
        try:
            return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        except:
            return None

    def save_task(self, task: Task) -> None:
        """Save task updates to its .todo file."""
        task_file = self.tasks_dir / task.file

        # Load existing file
        if task_file.exists():
            frontmatter, body = self._parse_todo_file(task_file)
        else:
            raise FileNotFoundError(f"Task file not found: {task_file}")

        # Update frontmatter fields
        frontmatter["status"] = task.status.value
        frontmatter["claimed_by"] = task.claimed_by
        frontmatter["claimed_at"] = (
            task.claimed_at.isoformat() if task.claimed_at else None
        )
        frontmatter["started_at"] = (
            task.started_at.isoformat() if task.started_at else None
        )
        frontmatter["completed_at"] = (
            task.completed_at.isoformat() if task.completed_at else None
        )
        if task.duration_minutes is not None:
            frontmatter["duration_minutes"] = task.duration_minutes

        # Write back
        with open(task_file, "w") as f:
            f.write("---\n")
            yaml.dump(frontmatter, f, default_flow_style=False, sort_keys=False)
            f.write("---\n")
            f.write(body)

    def save_stats(self, tree: TaskTree) -> None:
        """Update statistics in index files."""
        # Update root index
        root_index_path = self.tasks_dir / "index.yaml"
        root_index = self._load_yaml(root_index_path)
        root_index["stats"] = tree.stats
        root_index["critical_path"] = tree.critical_path
        root_index["next_available"] = tree.next_available

        with open(root_index_path, "w") as f:
            yaml.dump(root_index, f, default_flow_style=False, sort_keys=False)

        # Update phase indices
        for phase in tree.phases:
            phase_index_path = self.tasks_dir / phase.path / "index.yaml"

            # Skip if phase index doesn't exist yet
            if not phase_index_path.exists():
                continue

            phase_index = self._load_yaml(phase_index_path)
            phase_index["stats"] = phase.stats

            with open(phase_index_path, "w") as f:
                yaml.dump(phase_index, f, default_flow_style=False, sort_keys=False)

            # Update milestone indices
            for milestone in phase.milestones:
                milestone_index_path = (
                    self.tasks_dir / phase.path / milestone.path / "index.yaml"
                )
                if milestone_index_path.exists():
                    milestone_index = self._load_yaml(milestone_index_path)
                    milestone_index["stats"] = milestone.stats

                    with open(milestone_index_path, "w") as f:
                        yaml.dump(
                            milestone_index,
                            f,
                            default_flow_style=False,
                            sort_keys=False,
                        )

    def _load_bugs(self):
        """Load bugs from .tasks/bugs/ directory."""
        bugs_dir = self.tasks_dir / "bugs"
        index_path = bugs_dir / "index.yaml"
        if not index_path.exists():
            return []

        idx = self._load_yaml(index_path)
        bugs = []
        for entry in idx.get("bugs", []):
            filename = entry.get("file", "")
            if not filename:
                continue
            file_path = bugs_dir / filename
            if not file_path.exists():
                continue
            frontmatter, _ = self._parse_todo_file(file_path)
            bugs.append(Task(
                id=str(frontmatter.get("id", "")),
                title=str(frontmatter.get("title", "")),
                file=str(Path("bugs") / filename),
                status=Status(frontmatter.get("status", "pending")),
                estimate_hours=float(self._get_estimate_hours(frontmatter, 1.0)),
                complexity=Complexity(frontmatter.get("complexity", "medium")),
                priority=Priority(frontmatter.get("priority", "medium")),
                depends_on=frontmatter.get("depends_on", []) if isinstance(frontmatter.get("depends_on"), list) else [],
                claimed_by=frontmatter.get("claimed_by"),
                claimed_at=self._parse_datetime(frontmatter.get("claimed_at")),
                started_at=self._parse_datetime(frontmatter.get("started_at")),
                completed_at=self._parse_datetime(frontmatter.get("completed_at")),
                duration_minutes=float(frontmatter["duration_minutes"]) if frontmatter.get("duration_minutes") is not None else None,
                tags=frontmatter.get("tags", []) if isinstance(frontmatter.get("tags"), list) else [],
                epic_id=None,
                milestone_id=None,
                phase_id=None,
            ))
        return bugs

    def create_bug(self, bug_data: dict) -> Task:
        """
        Create a new bug report.

        Args:
            bug_data: Dict with keys: title, estimate_hours, complexity, priority,
                       depends_on, tags

        Returns:
            The created Task object
        """
        bugs_dir = self.tasks_dir / "bugs"
        bugs_dir.mkdir(parents=True, exist_ok=True)
        index_path = bugs_dir / "index.yaml"

        # Determine next bug number
        next_num = 1
        if index_path.exists():
            idx = self._load_yaml(index_path)
            existing = idx.get("bugs", [])
            nums = []
            for entry in existing:
                match = re.match(r"B(\d+)", entry.get("file", ""))
                if match:
                    nums.append(int(match.group(1)))
            if nums:
                next_num = max(nums) + 1

        bug_id = f"B{next_num:03d}"
        slug = self._slugify(bug_data["title"])
        filename = f"{bug_id}-{slug}.todo"
        file_path = bugs_dir / filename

        # Prepare frontmatter
        frontmatter = {
            "id": bug_id,
            "title": bug_data["title"],
            "status": "pending",
            "estimate_hours": bug_data.get("estimate_hours", 1.0),
            "complexity": bug_data.get("complexity", "medium"),
            "priority": bug_data.get("priority", "high"),
            "depends_on": bug_data.get("depends_on", []),
            "tags": bug_data.get("tags", []),
        }

        if bug_data.get("simple"):
            body = f"\n{bug_data['title']}\n"
        else:
            body = f"""
# {bug_data["title"]}

## Steps to Reproduce

1. TODO: Add steps

## Expected Behavior

TODO: Describe expected behavior

## Actual Behavior

TODO: Describe actual behavior
"""

        with open(file_path, "w") as f:
            f.write("---\n")
            yaml.dump(frontmatter, f, default_flow_style=False, sort_keys=False)
            f.write("---\n")
            f.write(body)

        # Update bugs index
        if index_path.exists():
            idx = self._load_yaml(index_path)
        else:
            idx = {"bugs": []}
        bugs_list = idx.get("bugs", [])
        bugs_list.append({"file": filename})
        idx["bugs"] = bugs_list
        with open(index_path, "w") as f:
            yaml.dump(idx, f, default_flow_style=False, sort_keys=False)

        return Task(
            id=bug_id,
            title=bug_data["title"],
            file=str(Path("bugs") / filename),
            status=Status.PENDING,
            estimate_hours=float(bug_data.get("estimate_hours", 1.0)),
            complexity=Complexity(bug_data.get("complexity", "medium")),
            priority=Priority(bug_data.get("priority", "high")),
            depends_on=bug_data.get("depends_on", []),
            tags=bug_data.get("tags", []),
            epic_id=None,
            milestone_id=None,
            phase_id=None,
        )

    def create_task(self, epic_id: str, task_data: dict) -> Task:
        """
        Create a new task in the specified epic.

        Args:
            epic_id: Fully qualified epic ID (e.g., "P5.M04.E4")
            task_data: Dict with keys: title, estimate_hours, complexity, priority,
                       depends_on, tags, description

        Returns:
            The created Task object

        Raises:
            ValueError: If epic not found or invalid data
        """
        # Parse the epic path
        epic_path = TaskPath.parse(epic_id)
        if not epic_path.is_epic:
            raise ValueError(f"Invalid epic ID: {epic_id}")

        # Find the epic directory
        epic_dir = self._find_epic_dir(epic_path)
        if not epic_dir:
            raise ValueError(f"Epic directory not found for: {epic_id}")

        # Determine next task number
        next_num = self._get_next_task_number(epic_dir)

        # Generate task ID
        task_short_id = f"T{next_num:03d}"
        full_task_id = f"{epic_id}.{task_short_id}"

        # Generate slug from title
        slug = self._slugify(task_data["title"])

        # Create filename
        filename = f"{task_short_id}-{slug}.todo"
        task_file = epic_dir / filename

        # Prepare frontmatter
        frontmatter = {
            "id": full_task_id,
            "title": task_data["title"],
            "status": "pending",
            "estimate_hours": task_data.get("estimate_hours", 1.0),
            "complexity": task_data.get("complexity", "medium"),
            "priority": task_data.get("priority", "medium"),
            "depends_on": task_data.get("depends_on", []),
            "tags": task_data.get("tags", []),
        }

        # Prepare body
        description = task_data.get("description", "")
        body = f"""
# {task_data["title"]}

{description}

## Requirements

- [ ] TODO: Add requirements

## Acceptance Criteria

- [ ] TODO: Add acceptance criteria
"""

        # Write .todo file
        with open(task_file, "w") as f:
            f.write("---\n")
            yaml.dump(frontmatter, f, default_flow_style=False, sort_keys=False)
            f.write("---\n")
            f.write(body)

        # Update epic index.yaml to include the new task
        self._add_task_to_epic_index(epic_dir, task_short_id, filename, task_data)

        # Create and return Task object
        return Task(
            id=full_task_id,
            title=task_data["title"],
            file=str(task_file.relative_to(self.tasks_dir)),
            status=Status.PENDING,
            estimate_hours=float(task_data.get("estimate_hours", 1.0)),
            complexity=Complexity(task_data.get("complexity", "medium")),
            priority=Priority(task_data.get("priority", "medium")),
            depends_on=task_data.get("depends_on", []),
            tags=task_data.get("tags", []),
            epic_id=epic_id,
            milestone_id=epic_path.milestone_id,
            phase_id=epic_path.phase,
        )

    def create_epic(self, milestone_id: str, epic_data: dict) -> Epic:
        """
        Create a new epic in the specified milestone.

        Args:
            milestone_id: Fully qualified milestone ID (e.g., "P5.M04")
            epic_data: Dict with keys: name, estimate_hours, complexity, depends_on, description

        Returns:
            The created Epic object

        Raises:
            ValueError: If milestone not found or invalid data
        """
        # Parse the milestone path
        ms_path = TaskPath.parse(milestone_id)
        if not ms_path.is_milestone:
            raise ValueError(f"Invalid milestone ID: {milestone_id}")

        # Find the milestone directory
        milestone_dir = self._find_milestone_dir(ms_path)
        if not milestone_dir:
            raise ValueError(f"Milestone directory not found for: {milestone_id}")

        # Determine next epic number
        next_num = self._get_next_epic_number(milestone_dir)

        # Generate epic ID
        epic_short_id = f"E{next_num}"
        full_epic_id = f"{milestone_id}.{epic_short_id}"

        # Generate slug from name
        slug = self._slugify(epic_data["name"])

        # Create directory name with zero-padded number
        dir_name = f"{next_num:02d}-{slug}"
        epic_dir = milestone_dir / dir_name

        # Create epic directory
        epic_dir.mkdir(parents=True, exist_ok=True)

        # Create epic index.yaml
        epic_index = {
            "id": full_epic_id,
            "name": epic_data["name"],
            "status": "pending",
            "estimate_hours": epic_data.get("estimate_hours", 4.0),
            "complexity": epic_data.get("complexity", "medium"),
            "depends_on": epic_data.get("depends_on", []),
            "tasks": [],
            "stats": {
                "total": 0,
                "done": 0,
                "in_progress": 0,
                "blocked": 0,
                "pending": 0,
            },
        }

        # Add description as a comment at the top
        epic_index_path = epic_dir / "index.yaml"
        with open(epic_index_path, "w") as f:
            f.write(f"# Epic: {epic_data['name']}\n")
            f.write(f"# {milestone_id}, Epic {next_num} ({full_epic_id})\n\n")
            yaml.dump(epic_index, f, default_flow_style=False, sort_keys=False)

        # Update milestone index.yaml to include the new epic
        self._add_epic_to_milestone_index(
            milestone_dir, epic_short_id, dir_name, epic_data
        )

        # Create and return Epic object
        epic_path = ms_path.with_epic(epic_short_id)
        return Epic(
            id=full_epic_id,
            name=epic_data["name"],
            path=dir_name,
            status=Status.PENDING,
            estimate_hours=float(epic_data.get("estimate_hours", 4.0)),
            complexity=Complexity(epic_data.get("complexity", "medium")),
            depends_on=epic_data.get("depends_on", []),
            description=epic_data.get("description"),
            milestone_id=milestone_id,
            phase_id=ms_path.phase,
        )

    def create_milestone(self, phase_id: str, milestone_data: dict):
        """
        Create a new milestone in the specified phase.

        Args:
            phase_id: Phase ID (e.g., "P1")
            milestone_data: Dict with keys: name, estimate_hours, complexity,
                            depends_on, description

        Returns:
            The created Milestone object

        Raises:
            ValueError: If phase not found or invalid data
        """
        # Parse and validate phase_id
        phase_path = TaskPath.parse(phase_id)
        if not phase_path.is_phase:
            raise ValueError(f"Invalid phase ID: {phase_id}")

        # Find the phase directory
        phase_dir = self._find_phase_dir(phase_path)
        if not phase_dir:
            raise ValueError(f"Phase directory not found for: {phase_id}")

        # Determine next milestone number
        next_num = self._get_next_milestone_number(phase_dir)

        # Generate milestone ID (NOT zero-padded)
        milestone_short_id = f"M{next_num}"
        full_milestone_id = f"{phase_id}.{milestone_short_id}"

        # Generate slug from name
        slug = self._slugify(milestone_data["name"])

        # Create directory name with zero-padded number
        dir_name = f"{next_num:02d}-{slug}"
        milestone_dir = phase_dir / dir_name

        # Create milestone directory
        milestone_dir.mkdir(parents=True, exist_ok=True)

        # Create milestone index.yaml
        milestone_index = {
            "id": full_milestone_id,
            "name": milestone_data["name"],
            "status": "pending",
            "estimate_hours": milestone_data.get("estimate_hours", 8.0),
            "complexity": milestone_data.get("complexity", "medium"),
            "depends_on": milestone_data.get("depends_on", []),
            "epics": [],
            "stats": {
                "total_tasks": 0,
                "done": 0,
                "in_progress": 0,
                "blocked": 0,
                "pending": 0,
            },
        }

        milestone_index_path = milestone_dir / "index.yaml"
        with open(milestone_index_path, "w") as f:
            f.write(f"# Milestone: {milestone_data['name']}\n")
            f.write(f"# {phase_id}, Milestone {next_num} ({full_milestone_id})\n\n")
            yaml.dump(milestone_index, f, default_flow_style=False, sort_keys=False)

        # Update phase index.yaml
        self._add_milestone_to_phase_index(
            phase_dir, milestone_short_id, dir_name, milestone_data
        )

        # Create and return Milestone object
        from .models import Milestone

        return Milestone(
            id=full_milestone_id,
            name=milestone_data["name"],
            path=dir_name,
            status=Status.PENDING,
            estimate_hours=float(milestone_data.get("estimate_hours", 8.0)),
            complexity=Complexity(milestone_data.get("complexity", "medium")),
            depends_on=milestone_data.get("depends_on", []),
            description=milestone_data.get("description"),
            phase_id=phase_id,
        )

    def create_phase(self, phase_data: dict):
        """
        Create a new phase in the project.

        Args:
            phase_data: Dict with keys: name, weeks, estimate_hours, priority,
                        depends_on, description

        Returns:
            The created Phase object

        Raises:
            ValueError: If invalid data or directory conflict
        """
        # Determine next phase number
        next_num = self._get_next_phase_number()

        # Generate phase ID (NOT zero-padded)
        phase_id = f"P{next_num}"

        # Generate slug from name
        slug = self._slugify(phase_data["name"])

        # Create directory name with zero-padded number
        dir_name = f"{next_num:02d}-{slug}"
        phase_dir = self.tasks_dir / dir_name

        # Check for directory conflicts
        if phase_dir.exists():
            raise ValueError(f"Phase directory already exists: {dir_name}")

        # Create phase directory
        phase_dir.mkdir(parents=True, exist_ok=True)

        # Create phase index.yaml
        phase_index = {
            "id": phase_id,
            "name": phase_data["name"],
            "status": "pending",
            "weeks": phase_data.get("weeks", 2),
            "estimate_hours": phase_data.get("estimate_hours", 40.0),
            "complexity": "medium",
            "depends_on": phase_data.get("depends_on", []),
            "milestones": [],
            "stats": {
                "total_tasks": 0,
                "done": 0,
                "in_progress": 0,
                "blocked": 0,
                "pending": 0,
            },
        }

        phase_index_path = phase_dir / "index.yaml"
        with open(phase_index_path, "w") as f:
            f.write(f"# Phase: {phase_data['name']}\n")
            f.write(f"# Phase {next_num} ({phase_id})\n\n")
            yaml.dump(phase_index, f, default_flow_style=False, sort_keys=False)

        # Update root index.yaml
        self._add_phase_to_root_index(phase_id, dir_name, phase_data)

        # Create and return Phase object
        from .models import Phase, Priority

        return Phase(
            id=phase_id,
            name=phase_data["name"],
            path=dir_name,
            status=Status.PENDING,
            weeks=phase_data.get("weeks", 2),
            estimate_hours=float(phase_data.get("estimate_hours", 40.0)),
            priority=Priority(phase_data.get("priority", "medium")),
            depends_on=phase_data.get("depends_on", []),
            description=phase_data.get("description"),
        )

    def _find_epic_dir(self, epic_path: TaskPath) -> Optional[Path]:
        """Find the directory for an epic given its TaskPath."""
        # First find the phase directory
        tree = self.load()
        phase = tree.find_phase(epic_path.phase)
        if not phase:
            return None

        # Find the milestone
        milestone = tree.find_milestone(epic_path.milestone_id)
        if not milestone:
            return None

        # Find the epic
        epic = tree.find_epic(epic_path.full_id)
        if not epic:
            return None

        # Build the full path
        return self.tasks_dir / phase.path / milestone.path / epic.path

    def _find_milestone_dir(self, ms_path: TaskPath) -> Optional[Path]:
        """Find the directory for a milestone given its TaskPath."""
        tree = self.load()
        phase = tree.find_phase(ms_path.phase)
        if not phase:
            return None

        milestone = tree.find_milestone(ms_path.full_id)
        if not milestone:
            return None

        return self.tasks_dir / phase.path / milestone.path

    def _get_next_task_number(self, epic_dir: Path) -> int:
        """Get the next task number for an epic."""
        existing_tasks = list(epic_dir.glob("T*.todo"))
        if not existing_tasks:
            return 1

        max_num = 0
        for task_file in existing_tasks:
            match = re.match(r"T(\d+)", task_file.name)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num

        return max_num + 1

    def _get_next_epic_number(self, milestone_dir: Path) -> int:
        """Get the next epic number for a milestone."""
        # Read the milestone index to find existing epics
        index_path = milestone_dir / "index.yaml"
        if not index_path.exists():
            return 1

        index = self._load_yaml(index_path)
        epics = index.get("epics", [])
        if not epics:
            return 1

        max_num = 0
        for epic in epics:
            epic_id = epic.get("id", "")
            match = re.match(r"E(\d+)", epic_id)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num

        return max_num + 1

    def _find_phase_dir(self, phase_path: TaskPath) -> Optional[Path]:
        """Find the directory for a phase given its TaskPath."""
        tree = self.load()
        phase = tree.find_phase(phase_path.phase)
        if not phase:
            return None
        return self.tasks_dir / phase.path

    def _get_next_milestone_number(self, phase_dir: Path) -> int:
        """Get the next milestone number for a phase."""
        index_path = phase_dir / "index.yaml"
        if not index_path.exists():
            return 1

        index = self._load_yaml(index_path)
        milestones = index.get("milestones", [])
        if not milestones:
            return 1

        max_num = 0
        for milestone in milestones:
            milestone_id = milestone.get("id", "")
            match = re.match(r"M(\d+)", milestone_id)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num

        return max_num + 1

    def _get_next_phase_number(self) -> int:
        """Get the next phase number from root index."""
        root_index_path = self.tasks_dir / "index.yaml"
        if not root_index_path.exists():
            return 1

        index = self._load_yaml(root_index_path)
        phases = index.get("phases", [])
        if not phases:
            return 1

        max_num = 0
        for phase in phases:
            phase_id = phase.get("id", "")
            match = re.match(r"P(\d+)", phase_id)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num

        return max_num + 1

    def _add_milestone_to_phase_index(
        self,
        phase_dir: Path,
        milestone_short_id: str,
        dir_name: str,
        milestone_data: dict,
    ) -> None:
        """Add a milestone entry to the phase's index.yaml."""
        index_path = phase_dir / "index.yaml"

        if not index_path.exists():
            raise ValueError(f"Phase index not found: {index_path}")

        index = self._load_yaml(index_path)

        milestone_entry = {
            "id": milestone_short_id,
            "name": milestone_data["name"],
            "path": dir_name,
            "status": "pending",
            "estimate_hours": milestone_data.get("estimate_hours", 8.0),
            "complexity": milestone_data.get("complexity", "medium"),
            "depends_on": milestone_data.get("depends_on", []),
            "description": milestone_data.get("description", ""),
        }

        if "milestones" not in index:
            index["milestones"] = []
        index["milestones"].append(milestone_entry)

        with open(index_path, "w") as f:
            yaml.dump(index, f, default_flow_style=False, sort_keys=False)

    def _add_phase_to_root_index(
        self, phase_id: str, dir_name: str, phase_data: dict
    ) -> None:
        """Add a phase entry to the root index.yaml."""
        root_index_path = self.tasks_dir / "index.yaml"

        if not root_index_path.exists():
            raise ValueError(f"Root index not found: {root_index_path}")

        index = self._load_yaml(root_index_path)

        phase_entry = {
            "id": phase_id,
            "name": phase_data["name"],
            "path": dir_name,
            "status": "pending",
            "weeks": phase_data.get("weeks", 2),
            "estimate_hours": phase_data.get("estimate_hours", 40.0),
            "priority": phase_data.get("priority", "medium"),
            "depends_on": phase_data.get("depends_on", []),
            "description": phase_data.get("description", ""),
        }

        if "phases" not in index:
            index["phases"] = []
        index["phases"].append(phase_entry)

        with open(root_index_path, "w") as f:
            yaml.dump(index, f, default_flow_style=False, sort_keys=False)

    def _slugify(self, text: str, max_length: int = 30) -> str:
        """Convert text to a slug for filenames."""
        # Convert to lowercase
        slug = text.lower()
        # Replace spaces and special chars with hyphens
        slug = re.sub(r"[^a-z0-9]+", "-", slug)
        # Remove leading/trailing hyphens
        slug = slug.strip("-")
        # Truncate to max_length
        if len(slug) > max_length:
            slug = slug[:max_length].rstrip("-")
        return slug

    def _add_task_to_epic_index(
        self, epic_dir: Path, task_short_id: str, filename: str, task_data: dict
    ) -> None:
        """Add a task entry to the epic's index.yaml."""
        index_path = epic_dir / "index.yaml"

        if index_path.exists():
            index = self._load_yaml(index_path)
        else:
            # Create minimal epic index if it doesn't exist
            index = {"tasks": [], "stats": {}}

        # Add task to list
        task_entry = {
            "id": task_short_id,
            "file": filename,
            "title": task_data["title"],
            "status": "pending",
            "estimate_hours": task_data.get("estimate_hours", 1.0),
            "complexity": task_data.get("complexity", "medium"),
            "priority": task_data.get("priority", "medium"),
            "depends_on": task_data.get("depends_on", []),
        }

        if "tasks" not in index:
            index["tasks"] = []
        index["tasks"].append(task_entry)

        # Update stats
        if "stats" not in index:
            index["stats"] = {}
        stats = index["stats"]
        stats["total"] = stats.get("total", 0) + 1
        stats["pending"] = stats.get("pending", 0) + 1

        # Write back
        with open(index_path, "w") as f:
            yaml.dump(index, f, default_flow_style=False, sort_keys=False)

    def _add_epic_to_milestone_index(
        self, milestone_dir: Path, epic_short_id: str, dir_name: str, epic_data: dict
    ) -> None:
        """Add an epic entry to the milestone's index.yaml."""
        index_path = milestone_dir / "index.yaml"

        if not index_path.exists():
            raise ValueError(f"Milestone index not found: {index_path}")

        index = self._load_yaml(index_path)

        # Add epic to list
        epic_entry = {
            "id": epic_short_id,
            "name": epic_data["name"],
            "path": dir_name,
            "status": "pending",
            "estimate_hours": epic_data.get("estimate_hours", 4.0),
            "complexity": epic_data.get("complexity", "medium"),
            "depends_on": epic_data.get("depends_on", []),
            "description": epic_data.get("description", ""),
        }

        if "epics" not in index:
            index["epics"] = []
        index["epics"].append(epic_entry)

        # Write back
        with open(index_path, "w") as f:
            yaml.dump(index, f, default_flow_style=False, sort_keys=False)
