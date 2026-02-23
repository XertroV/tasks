# Phase 4: Tools System

**Status**: Pending  
**Weeks**: 3  
**Total Hours**: 56  
**Dependencies**: Phase 2 (LLM Integration), Phase 3 (WebSocket/REST API)

## Overview

Phase 4 implements the complete tools system for PAG-Server, enabling agents to:
- Execute filesystem operations (read, write, list)
- Run shell commands in sandboxed environments
- Perform web searches
- Communicate with other agents
- Interact with web browsers via agent-browser
- Connect to external MCP servers for additional tools
- Run all tools in isolated Docker containers with resource limits

## Milestones

### M1: Tool Registry (8 hours)
Foundation for tool management with behaviour definition, registry GenServer, and schema building for LLM providers.

**Epics**: 3  
**Tasks**: 9

### M2: Built-in Tools (20 hours)
Core tools that ship with PAG-Server, covering essential operations.

**Epics**: 5  
**Tasks**: 10

**Categories**:
- **File Operations**: read_file, write_file, list_directory
- **Shell Execution**: execute_shell
- **Web Search**: web_search
- **Agent Communications**: send_message, spawn_subagent
- **Browser Integration**: agent-browser setup, browser tool, snapshot parsing

### M3: MCP Host (12 hours)
Model Context Protocol integration for connecting to external tool servers.

**Epics**: 3  
**Tasks**: 9

**Components**:
- JSON-RPC 2.0 protocol implementation
- Server process management via stdio
- Tool discovery and proxy execution

### M4: Sandboxing (16 hours)
**CRITICAL**: Security-focused isolation of tool execution.

**Epics**: 3  
**Tasks**: 10

**Layers**:
1. **Port Executor**: Elixir Port-based process isolation
2. **Docker Integration**: Full container-based sandboxing
3. **Resource Limits**: CPU, memory, timeout enforcement

## Architecture

### Tool Flow

```
Agent Request
    ↓
Tool Registry
    ├── Builtin Tools → Execute
    └── MCP Tools → Proxy to MCP Server
            ↓
    Sandbox Executor
        ├── Port (dev)
        └── Docker (production)
            ↓
    Result + Output
```

### Key Modules

```
lib/pag_server/tools/
├── tool.ex              # Behaviour definition
├── registry.ex          # Tool registry GenServer
├── executor.ex          # Execution logic
├── builtin/
│   ├── read_file.ex
│   ├── write_file.ex
│   ├── list_directory.ex
│   ├── execute_shell.ex
│   ├── web_search.ex
│   ├── send_message.ex
│   └── browser.ex
├── mcp/
│   ├── host.ex          # MCP host
│   ├── server.ex        # Server connection
│   └── protocol.ex      # Protocol helpers
└── sandbox/
    ├── port_executor.ex
    ├── docker_client.ex
    └── resource_limits.ex
```

## Dependencies

### Runtime
- **Elixir Ports**: Built-in
- **Docker**: 20.10+
- **MCP Servers**: Optional, configured per-deployment

### Libraries
- `jason` - JSON encoding/decoding
- `req` - HTTP client for web_search
- `anubis_mcp` or `ex_mcp` - MCP implementation

## Plan References

- `.plan/2026-02-05-velvet-cascade/architecture.md` Lines 324-355 (Tools Domain)
- `.plan/2026-02-05-velvet-cascade/integrations.md` Lines 68-97 (MCP Protocol)
- `.plan/2026-02-05-velvet-cascade/index.md` Lines 1477-1503 (Sandboxing)

## Critical Path

1. **M1** must complete before M2 and M3 can start (registry is foundation)
2. **M2** must complete before M4 (sandboxing requires tools to sandbox)
3. **M3** can run in parallel with M2
4. **M4** is on the critical path (security-critical)

## Security Notes

### Sandboxing is Critical
- **Never** execute tools without sandboxing in production
- Port executor is acceptable for development only
- Docker sandbox must enforce:
  - CPU limits (configurable, default 1 core)
  - Memory limits (configurable, default 512MB)
  - Execution timeouts (configurable, default 30s)
  - Network isolation (optional)
  - Filesystem isolation (read-only except workspace)

### MCP Server Trust
- MCP servers run as subprocesses
- Spawned via stdio, not network sockets (more secure)
- Can be sandboxed via Docker if untrusted
- Configuration should whitelist allowed servers

## Task Statistics

| Metric | Count |
|--------|-------|
| **Total Milestones** | 4 |
| **Total Epics** | 13 |
| **Total Tasks** | 38 |
| **Total Hours** | 56 |

### Complexity Breakdown
- **Critical**: 2 tasks (Docker, resource limits)
- **High**: 15 tasks
- **Medium**: 18 tasks
- **Low**: 3 tasks

### Priority Breakdown
- **Critical**: 4 tasks
- **High**: 28 tasks
- **Medium**: 6 tasks

## Testing Strategy

### Unit Tests
- Each tool module has unit tests
- Mock filesystem, network, Docker API
- Test tool schema generation
- Test MCP protocol handlers

### Integration Tests
- Test tool execution via registry
- Test MCP server communication
- Test Docker container lifecycle
- Test resource limit enforcement

### Security Tests
- Verify sandboxing prevents filesystem escape
- Verify resource limits are enforced
- Verify timeouts work correctly
- Verify untrusted code cannot access sensitive data

## Development Order

Recommended order for implementation:

1. **Start**: M1.E1 (Tool Behaviour) - Foundation
2. **Parallel**:
   - M1.E2, M1.E3 (Registry, Schema Builder)
   - M2.E1 (File Operations - simple tools first)
3. **Sequential**: M2.E2 through M2.E5 (Builtin tools)
4. **Parallel**:
   - M3.E1, M3.E2, M3.E3 (MCP integration)
   - M4.E1 (Port Executor - needed for testing)
5. **Critical Path**: M4.E2 (Docker) then M4.E3 (Resource Limits)

## CLI Usage

```bash
# List all tasks
python3 tasks.py list --phase P4

# Show next task on critical path
python3 tasks.py next

# Claim a task
python3 tasks.py claim P4.M1.E1.T001 --agent=your-agent-id

# Mark complete
python3 tasks.py done P4.M1.E1.T001

# Show progress
python3 tasks.py status --phase P4
```

## Completion Criteria

Phase 4 is complete when:
- [ ] All 38 tasks marked as done
- [ ] All unit tests passing
- [ ] Integration tests for tool execution passing
- [ ] Docker sandbox working in production config
- [ ] At least one MCP server configured and working
- [ ] Security review of sandboxing complete
- [ ] Documentation updated with tool examples
- [ ] Performance benchmarks show <100ms overhead for sandboxing
