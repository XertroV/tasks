# Agent Persona Bootstrap System - Implementation Plan

## Overview
Conversational persona selection for workspace initialization with customizable supervisor roles and subordinate agent teams.

**Epic ID**: P15.M7.E5  
**Estimated Hours**: 80  
**Complexity**: High

## Architecture

### Layered Persona System
```
┌─────────────────────────────────────────┐
│  CLI Selection UI (Wizard)              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Persona Catalog (YAML)                 │
│  11 suggestions + custom personas       │
│  Stored in: priv/personas/*.yml         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Dynamic Template Generator             │
│  Injects persona config into base       │
│  workspace template                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Base Workspace Template                │
│  agent-persona-base.yml                 │
│  Conversational bootstrap               │
└─────────────────────────────────────────┘
```

## Design Decisions

1. **Bootstrap Style**: OpenClaw-style conversational ("Who am I? What should I call you?"), hybrid with wizard for narrowing down from 11+ options
2. **Subordinate Spawning**: Configurable per persona (eager/lazy), workspace init provides default env info
3. **Persona Files**: 
   - `PERSONA.md` - Role definition and supervisor config
   - `MY_TEAM.md` (or `MY_FAMILY.md`) - Subordinate composition
   - `BIRTH.md` - Onboarding checklist for the agent
4. **Migration**: Only for new workspaces initially, plugin-based for future extensibility
5. **Priority**: CLI first, then Web UI (A2UI Canvas)
6. **Custom Personas**: Primary focus - built-in ones are just suggestions. BOOTSTRAP.md tells agents to deeply understand their human.

## Implementation Phases

### Phase 1: Core Infrastructure (16 hours)

#### T1: Persona YAML Schema & Loader
- Define schema for persona configuration
- Create loader module to parse YAML files
- Add validation
- **Files**: `lib/pag_server/personas/persona.ex`, `lib/pag_server/personas/loader.ex`

#### T2: Persona Catalog Structure
- Create `priv/personas/` directory structure
- Create `catalog.yml` index file
- Add caching layer (ETS or compile-time)
- **Files**: `priv/personas/catalog.yml`, cache implementation

#### T3: Base Workspace Template
- Create `agent-persona-base.yml` workspace template
- Define generic conversational bootstrap flow
- Configure tracked files (PERSONA.md, MY_TEAM.md, BIRTH.md, SOUL.md, etc.)
- **Files**: `priv/workspace_templates/agent-persona-base.yml`

#### T4: Dynamic Template Generator
- Module to inject persona config into base template
- Variable substitution system integration
- Persona-specific questionnaire generation
- **Files**: `lib/pag_server/personas/template_generator.ex`

### Phase 2: The 11 Suggested Personas (12 hours)

Create YAML definitions in `priv/personas/`:

1. **Tech Lead** - Software development oversight
2. **Executive Assistant Director** - Personal productivity  
3. **DevOps Commander** - Infrastructure & reliability
4. **Research Director** - Knowledge synthesis
5. **PMO Lead** - Multi-project coordination
6. **Customer Success Commander** - Customer retention
7. **Creative Director AI** - Content & creative production
8. **Knowledge Management Curator** - Institutional memory
9. **Crisis Response Coordinator** - Incident management
10. **Open Source Program Manager** - OSS community
11. **Social Media Advisor** - Promotion & engagement

Each persona includes:
- Supervisor system prompt
- 3-7 subordinate definitions
- Tool recommendations
- Default files content
- Spawn strategy (eager/lazy)

### Phase 3: CLI Selection UI (16 hours)

#### T5: Persona Selection Wizard
- Interactive CLI wizard for persona selection
- Progressive disclosure (categories → filtered list → details)
- Preview mode (test chat before committing)
- **Files**: `lib/pag_server/personas/cli/wizard.ex`

#### T6: Integration with Bootstrap Flow
- Hook into existing `Bootstrap.Session`
- Handle persona selection during workspace init
- Generate appropriate files from selected persona
- **Files**: Integration in bootstrap modules

#### T7: Custom Persona Creation CLI
- Interactive custom persona builder
- Base on existing persona + modifications
- Export to YAML
- **Files**: `lib/pag_server/personas/cli/custom_creator.ex`

### Phase 4: Subordinate Agent System (20 hours)

#### T8: Subordinate Agent Templates
- Create subordinate template schema
- Build library of common subordinates (Code Reviewer, Security Scanner, etc.)
- **Files**: `priv/agent_templates/subordinates/*.yml`

#### T9: Spawning Logic
- Module for spawning subordinates based on persona config
- Support eager and lazy spawning strategies
- Lifecycle management
- **Files**: `lib/pag_server/personas/subordinates.ex`

#### T10: Supervisor-Subordinate Coordination
- Communication patterns (PubSub, Blackboard)
- Task delegation mechanisms
- Results aggregation
- **Files**: Coordination modules, event definitions

#### T11: Runtime Orchestration
- Persona activation/deactivation
- Subordinate scaling
- Health monitoring
- **Files**: Runtime management modules

### Phase 5: Default Files & Content (8 hours)

#### T12: Persona File Templates
Create EEx/YAML templates for:
- `PERSONA.md` - Role definition, values, capabilities
- `MY_TEAM.md` (or `MY_FAMILY.md`) - Subordinate roster with descriptions
- `BIRTH.md` - Onboarding checklist for the agent (learn about human, setup tasks, etc.)
- `BOOTSTRAP.md` - Conversational guide with instructions to deeply understand the human

### Phase 6: Advanced Features (8 hours)

#### T13: Persona Switching
- Change personas mid-workspace (with confirmation)
- Context preservation during switch
- Command: `pag persona switch <persona>`

#### T14: Combine-Personality Feature
- Merge multiple personas
- Command registered from plugin: `pag persona combine <persona1> <persona2>`

#### T15: Persona Analytics (optional)
- Usage tracking
- Success metrics per persona
- Recommendations based on workspace activity

## File Structure

```
priv/
├── personas/
│   ├── catalog.yml              # Index of all personas
│   ├── tech-lead.yml
│   ├── devops-commander.yml
│   ├── executive-assistant.yml
│   └── ... (11 total + custom)
├── agent_templates/
│   └── subordinates/
│       ├── code-reviewer.yml
│       ├── security-scanner.yml
│       └── ... (20+ common types)
└── workspace_templates/
    └── agent-persona-base.yml   # Conversational base template

lib/pag_server/personas/
├── persona.ex                   # Schema
├── loader.ex                    # Load from YAML
├── registry.ex                  # ETS registry
├── template_generator.ex        # Dynamic template generation
├── subordinates.ex              # Subordinate management
├── bootstrap_integration.ex     # Hooks into bootstrap
└── cli/
    ├── wizard.ex                # Selection wizard
    └── custom_creator.ex        # Custom persona builder

docs/
└── PERSONAS.md                  # Catalog documentation
```

## Database Schema

```elixir
# workspace_personas table
create table(:workspace_personas) do
  add :workspace_id, references(:workspaces)
  add :persona_id, :string           # e.g., "tech-lead"
  add :customizations, :map          # User overrides
  add :subordinate_ids, {:array, :string}
  add :spawn_strategy, :string       # "eager" | "lazy"
  add :is_active, :boolean
  timestamps()
end

# subordinate_agents table
create table(:subordinate_agents) do
  add :workspace_persona_id, references(:workspace_personas)
  add :agent_id, references(:agents)
  add :subordinate_type, :string
  add :spawn_strategy, :string
  add :trigger_conditions, {:array, :string}
  add :status, :string               # active | inactive | spawning
  timestamps()
end
```

## Success Criteria

- [ ] User can select from 11 suggested personas during workspace init
- [ ] Conversational bootstrap feels natural (OpenClaw-style)
- [ ] Each persona auto-configures appropriate subordinates
- [ ] Persona-specific files (PERSONA.md, MY_TEAM.md, BIRTH.md) are generated
- [ ] Subordinate spawning strategy is configurable (eager/lazy)
- [ ] CLI supports custom persona creation
- [ ] Users can switch personas after workspace creation
- [ ] Combine-personality command works
- [ ] Full test coverage (>80%)
- [ ] Documentation complete

## Dependencies

- Existing workspace template system
- Bootstrap session management
- Agent coordinator (for subordinates)
- PubSub system
- ETS caching

## Risks & Mitigations

1. **Complexity of subordinate coordination**
   - Mitigation: Start with simple patterns, iterate
   
2. **Conversational bootstrap may be too open-ended**
   - Mitigation: Provide structure through BOOTSTRAP.md prompts
   
3. **Persona file bloat**
   - Mitigation: Lazy loading, optional files
   
4. **Migration challenges later**
   - Mitigation: Plugin architecture from start

## Future Enhancements

- A2UI Canvas visual selection interface
- Persona marketplace/sharing
- AI-generated custom personas
- Persona evolution over time
- Multi-persona workspaces
