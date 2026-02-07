# tasks_ts

Bun + TypeScript port workspace for `tasks`.

## Usage

- Run CLI bridge: `bun run src/cli.ts <command>`
- Run checks: `bun run check`
- Run parity only: `bun run parity`

## Coverage

Coverage is enforced at >=95% line coverage via `bun run coverage:check`.

## Notes

- Machine-readable (`--json`) outputs are parity-validated against Python CLI.
- Human-readable output is allowed to differ stylistically.
