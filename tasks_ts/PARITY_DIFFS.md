# Parity Diffs

Current status: no intentional behavior diffs are documented.

## Native Coverage Snapshot

The TypeScript CLI now handles all currently exercised command families natively:

- `list`, `show`, `next`, `sync`
- `claim`, `grab`, `done`, `cycle`, `update`, `blocked`, `unclaim`, `work`
- `session` (`start`, `heartbeat`, `list`, `end`, `clean`)
- `check`
- `data` (`summary`, `export`)
- `report` (`progress`, `velocity`, `estimate-accuracy`)
- `timeline`, `schema`
- `search`, `blockers`
- `skills install`
- `agents`
- `add`, `add-epic`, `add-milestone`, `add-phase`

## Fallback Status

No active Python fallback delegation paths remain in `tasks_ts/src/cli.ts`.

## Divergence Policy

If a bug-fix divergence is introduced, record:
- command/fixture
- python behavior
- tasks_ts behavior
- rationale
