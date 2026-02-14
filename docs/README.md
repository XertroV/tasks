# The Backlogs Docs

This directory contains the Astro + Starlight documentation site.

## Commands

- `bun run dev` - start local docs dev server
- `bun run generate:reference` - regenerate command/parity metadata from CLI help
- `bun run build` - generate metadata and build static output
- `bun run check` - run reference generation + Astro checks + build

## URL configuration

Set env vars when building for custom host/path:

- `DOCS_SITE_URL` (default: `https://xertrov.github.io`)
- `DOCS_BASE_PATH` (default: `/<repo-name>`)

## Notes

- Generated metadata is written to `docs/.generated/` and is intentionally not committed.
- Current visual theme is placeholder scaffolding; integrate final design from `../docs-design-concepts/` when ready.
