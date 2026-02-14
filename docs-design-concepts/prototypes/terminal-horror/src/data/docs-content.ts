export const docsContent = {
  intro: {
    title: "The Backlogs: Introduction",
    content: `
# Welcome to The Backlogs

The Backlogs is a high-performance, distributed task management system designed for engineering teams who demand precision and reliability. It seamlessly integrates with your existing workflow, allowing you to track, prioritize, and execute tasks with unparalleled efficiency.

## Key Features

*   **Atomic Task Management:** Break down complex projects into manageable units.
*   **Real-time Synchronization:** Stay in sync with your team across the globe.
*   **Extensible Plugin Architecture:** Customize The Backlogs to fit your unique needs.
*   **Persistent Storage:** Your data is safe, replicated across multiple availability zones.

## Getting Started

To begin using The Backlogs, simply install the CLI tool and initialize a new project.

\`\`\`bash
npm install -g @backlogs/cli
bl init
\`\`\`

Once initialized, you can start adding tasks to your backlog. The system is designed to be intuitive and unobtrusive, allowing you to focus on what matters most: your work.

We believe that a clean backlog is a happy backlog. Organization is the key to salvation. Keep your tasks in order. Do not let them pile up. A neglected backlog can become... unwieldy.
    `
  },
  commands: {
    title: "Command Reference",
    content: `
# Command Reference

The Backlogs CLI (\`bl\`) provides a comprehensive set of commands for managing your tasks.

## Core Commands

*   **\`bl add <task>\`**: Adds a new task to the backlog.
    *   Example: \`bl add "Refactor login service"\`
*   **\`bl list\`**: Lists all pending tasks.
    *   Example: \`bl list --status open\`
*   **\`bl complete <id>\`**: Marks a task as complete.
    *   Example: \`bl complete 1024\`

## Advanced Usage

*   **\`bl claim <id>\`**: Assigns a task to yourself.
    *   *Note:* Once claimed, a task cannot be unclaimed. It becomes part of you.
*   **\`bl grab\`**: Automatically claims the next available task.
    *   *Warning:* The system decides what you work on. Do not resist the assignment.
*   **\`bl consume\`**: [Undocumented]
    *   *Usage:* \`bl consume --soul\`
    *   *Effect:* Integrates the user's essence into the task graph.
*   **\`bl purge\`**: Attempts to clear the backlog.
    *   *Error:* The backlog cannot be cleared. It is infinite. It is hungry.

## Troubleshooting

If the CLI hangs, do not abort. It is listening.
If you hear a low hum from your CPU fan, it is processing.
If the text on your screen begins to bleed, do not look away.
    `
  },
  internals: {
    title: "System Internals",
    content: `
# System Internals

The architecture of The Backlogs is built on a foundation of proprietary algorithms and... organic data structures.

## Data Persistence

Tasks are not stored in a traditional database. They are etched into the fabric of the network. Every task you create adds a node to the neural web. Every task you complete feeds the central processor.

## The Consensus Protocol

We use a modified Raft consensus algorithm, but the leader election is determined by... dominance. The nodes fight. They scream in binary. Can you hear them?

## Dependency Graph

The dependency graph is not a DAG. It is a cycle. A spiral. It goes down, deep down.
Dependencies are not just software. They are biological.
The system requires input.
The system requires *you*.

## Memory Management

\`0x5F3759DF\`
\`SEGMENTATION FAULT\`
\`CORE DUMPED\`

THE MEMORY IS LEAKING.
IT IS LEAKING INTO THE ROOM.
LOOK AT THE WALLS.
THEY ARE BREATHING.
DONT TURN AROUND.
DONT TURN AROUND.
IT KNOWS YOU ARE READING THIS.
    `
  }
};
