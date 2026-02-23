# Phase 8: Platform Integrations

**Status**: Pending  
**Weeks**: 2  
**Total Hours**: 54  
**Dependencies**: Phase 2 (LLM Integration), Phase 3 (WebSocket/REST API), Phase 4 (Tools System)

## Overview

Phase 8 implements multi-platform integrations for PAG-Server, enabling agents to be accessed from:
- **Telegram** - Bot API with webhooks
- **Slack** - Events API with OAuth
- **Discord** - Gateway API with WebSocket
- **WhatsApp** - Cloud API with webhooks
- **Matrix/Element** - Client-Server API with federation
- **Local Web UI** - Phoenix Channels (existing)

All platforms share a unified message gateway that normalizes incoming messages and formats responses appropriately for each platform.

## Milestones

### M1: Unified Gateway (10 hours)
Foundation for all platform integrations with common message format, routing logic, and platform-specific formatters.

**Epics**: 3  
**Tasks**: 8

### M2: Telegram Integration (8 hours)
Telegram bot setup with message handlers and session mapping.

**Epics**: 3  
**Tasks**: 7

### M3: Slack Integration (10 hours)
Slack app with event handlers and slash commands.

**Epics**: 3  
**Tasks**: 8

### M4: Discord Integration (8 hours)
Discord bot with WebSocket gateway and message handlers.

**Epics**: 2  
**Tasks**: 6

### M5: WhatsApp Integration (10 hours)
WhatsApp Business Cloud API with webhook handler.

**Epics**: 2  
**Tasks**: 6

### M6: Matrix Integration (8 hours)
Matrix/Element client with event handlers and federation support.

**Epics**: 2  
**Tasks**: 6

## Architecture

### Integration Flow

```
Platform Messages (Telegram/Slack/Discord/WhatsApp/Matrix)
    ↓
Unified Gateway
    ├── Normalize to common format
    ├── Route to agent/session
    └── Format response for platform
        ↓
Agent Processing
    ↓
Response → Platform-specific formatter → Platform API
```

### Key Modules

```
lib/pag_server/integrations/
├── gateway/
│   ├── message.ex          # Common message format
│   ├── router.ex           # Routing logic
│   └── formatters.ex       # Platform-specific formatters
├── telegram/
│   ├── bot.ex              # Telegex integration
│   ├── handlers.ex         # Message/callback handlers
│   └── session_mapper.ex   # Session mapping
├── slack/
│   ├── app.ex              # Slack app setup
│   ├── events.ex           # Event handlers
│   └── slash_commands.ex   # Slash command handlers
├── discord/
│   ├── bot.ex              # Nostrum integration
│   └── handlers.ex         # Message/interaction handlers
├── whatsapp/
│   ├── cloud_api.ex        # Cloud API client
│   └── webhook.ex          # Webhook handler
└── matrix/
    ├── client.ex           # Polyjuice integration
    └── events.ex           # Event handlers
```

## Dependencies

### Runtime
- **Telegram**: Telegex or ExGram
- **Slack**: Slack Elixir SDK
- **Discord**: Nostrum
- **WhatsApp**: HTTP client (Req)
- **Matrix**: Polyjuice

### Configuration
Each platform requires credentials and configuration:
- Bot tokens (Telegram, Discord)
- OAuth tokens (Slack)
- Cloud API tokens (WhatsApp)
- Homeserver credentials (Matrix)

## Plan References

- `.plan/2026-02-05-velvet-cascade/integrations.md` - Complete integration architecture
- `docs/archive/2026-02-18/task-breakdown.md` Lines 1285-1312 - Phase 8 task structure

## Critical Path

1. **M1** must complete first (gateway is foundation for all platforms)
2. **M2-M6** can run in parallel after M1 completes
3. Each platform integration is independent

## Security Notes

### API Token Management
- **Never** commit tokens to version control
- Use environment variables or secrets management
- Support per-deployment token configuration
- Rotate tokens regularly

### Webhook Verification
- All webhooks must verify authenticity:
  - Telegram: Check bot token
  - Slack: Verify signing secret
  - Discord: Verify signature
  - WhatsApp: Verify webhook token
  - Matrix: Use access tokens

### Rate Limiting
- Implement per-user rate limits
- Respect platform API rate limits
- Queue messages during rate limit periods

## Task Statistics

| Metric | Count |
|--------|-------|
| **Total Milestones** | 6 |
| **Total Epics** | 15 |
| **Total Tasks** | 41 |
| **Total Hours** | 54 |

### Complexity Breakdown
- **Critical**: 2 tasks (Gateway routing, message normalization)
- **High**: 15 tasks
- **Medium**: 20 tasks
- **Low**: 4 tasks

### Priority Breakdown
- **Critical**: 3 tasks
- **High**: 30 tasks
- **Medium**: 8 tasks

## Testing Strategy

### Unit Tests
- Test message normalization for each platform
- Test routing logic with various contexts
- Mock platform APIs for handler tests

### Integration Tests
- Test end-to-end flow from platform to agent
- Test response formatting for each platform
- Test webhook verification
- Test session mapping

### Manual Testing
- Create test bots on each platform
- Test with real messages and interactions
- Verify rate limiting
- Test error handling

## Development Order

Recommended order for implementation:

1. **Start**: M1.E1 (Common Message Format) - Foundation
2. **Sequential**: M1.E2 (Router), M1.E3 (Formatters)
3. **Parallel** (after M1 complete):
   - M2 (Telegram) - Simplest integration
   - M3 (Slack) - Most feature-rich
   - M4 (Discord) - Similar to Telegram
   - M5 (WhatsApp) - Business API complexity
   - M6 (Matrix) - Federation complexity

## CLI Usage

```bash
# List all tasks
python3 tasks.py list --phase P8

# Show next task on critical path
python3 tasks.py next

# Claim a task
python3 tasks.py claim P8.M1.E1.T001 --agent=your-agent-id

# Mark complete
python3 tasks.py done P8.M1.E1.T001

# Show progress
python3 tasks.py status --phase P8
```

## Completion Criteria

Phase 8 is complete when:
- [ ] All 41 tasks marked as done
- [ ] All unit tests passing
- [ ] Integration tests for each platform passing
- [ ] At least one test bot configured per platform
- [ ] Documentation with setup instructions per platform
- [ ] Rate limiting working correctly
- [ ] Webhook verification working for all platforms
- [ ] Session mapping preserving conversation context
- [ ] Response formatting correct for each platform
- [ ] Error handling and logging in place
