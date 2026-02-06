"""Tests for the skills install command."""

import json

import pytest
from click.testing import CliRunner

from tasks.cli import cli


@pytest.fixture
def runner():
    """CLI runner fixture."""
    return CliRunner()


def test_install_default_local_common_skills(runner, tmp_path, monkeypatch):
    """Default install should write skills for codex, claude, and opencode."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(cli, ["skills", "install", "plan-ingest"])

    assert result.exit_code == 0
    assert (tmp_path / ".agents/skills/plan-ingest/SKILL.md").exists()
    assert (tmp_path / ".claude/skills/plan-ingest/SKILL.md").exists()
    assert (tmp_path / ".opencode/skills/plan-ingest/SKILL.md").exists()


def test_plan_ingest_template_contains_out_of_order_assignment(
    runner, tmp_path, monkeypatch
):
    """Generated plan-ingest template should encode out-of-order epic assignment."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(cli, ["skills", "install", "plan-ingest", "--client=codex"])

    assert result.exit_code == 0
    content = (tmp_path / ".agents/skills/plan-ingest/SKILL.md").read_text()
    assert "Assign epic decomposition out of order" in content
    assert "topological + farthest-first" in content


def test_commands_artifact_skips_codex_with_warning(runner, tmp_path, monkeypatch):
    """Commands should be skipped for codex and installed for claude/opencode."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(
        cli,
        [
            "skills",
            "install",
            "plan-task",
            "--client=common",
            "--artifact=commands",
        ],
    )

    assert result.exit_code == 0
    assert "codex does not support 'commands' artifacts; skipping." in result.output
    assert (tmp_path / ".claude/commands/plan-task.md").exists()
    assert (tmp_path / ".opencode/commands/plan-task.md").exists()
    assert not (tmp_path / ".agents/commands/plan-task.md").exists()


def test_dir_with_both_artifacts_writes_expected_layout(runner, tmp_path, monkeypatch):
    """--dir should emit client-scoped skills and commands trees."""
    monkeypatch.chdir(tmp_path)
    out = tmp_path / "out"

    result = runner.invoke(
        cli,
        [
            "skills",
            "install",
            "plan-task",
            "--client=common",
            "--artifact=both",
            "--dir",
            str(out),
        ],
    )

    assert result.exit_code == 0
    assert (out / "skills/codex/plan-task/SKILL.md").exists()
    assert (out / "skills/claude/plan-task/SKILL.md").exists()
    assert (out / "skills/opencode/plan-task/SKILL.md").exists()
    assert (out / "commands/claude/plan-task.md").exists()
    assert (out / "commands/opencode/plan-task.md").exists()
    assert not (out / "commands/codex/plan-task.md").exists()


def test_global_scope_uses_canonical_locations(runner, tmp_path, monkeypatch):
    """Global install should target canonical client home directories."""
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("CODEX_HOME", raising=False)

    result = runner.invoke(
        cli,
        [
            "skills",
            "install",
            "plan-task",
            "--scope=global",
            "--client=common",
            "--artifact=skills",
        ],
    )

    assert result.exit_code == 0
    assert (tmp_path / ".agents/skills/plan-task/SKILL.md").exists()
    assert (tmp_path / ".claude/skills/plan-task/SKILL.md").exists()
    assert (tmp_path / ".config/opencode/skills/plan-task/SKILL.md").exists()


def test_codex_home_override_is_respected(runner, tmp_path, monkeypatch):
    """CODEX_HOME should override codex global install location."""
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("CODEX_HOME", str(tmp_path / "legacy-codex-home"))

    result = runner.invoke(
        cli,
        [
            "skills",
            "install",
            "plan-task",
            "--scope=global",
            "--client=codex",
            "--artifact=skills",
        ],
    )

    assert result.exit_code == 0
    assert (
        tmp_path / "legacy-codex-home/skills/plan-task/SKILL.md"
    ).exists()


def test_conflict_requires_force(runner, tmp_path, monkeypatch):
    """Second install without --force should fail on existing files."""
    monkeypatch.chdir(tmp_path)

    first = runner.invoke(cli, ["skills", "install", "plan-task", "--client=codex"])
    assert first.exit_code == 0

    second = runner.invoke(cli, ["skills", "install", "plan-task", "--client=codex"])
    assert second.exit_code != 0
    assert "Refusing to overwrite existing files" in second.output


def test_dry_run_writes_nothing(runner, tmp_path, monkeypatch):
    """Dry-run should not write files."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(
        cli,
        ["skills", "install", "plan-task", "--client=codex", "--dry-run"],
    )

    assert result.exit_code == 0
    assert "Dry run: no files written." in result.output
    assert not (tmp_path / ".agents/skills/plan-task/SKILL.md").exists()


def test_json_output_shape(runner, tmp_path, monkeypatch):
    """JSON output should include operations and warnings."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(
        cli,
        [
            "skills",
            "install",
            "plan-task",
            "--client=common",
            "--artifact=commands",
            "--json",
            "--dry-run",
        ],
    )

    assert result.exit_code == 0
    payload = json.loads(result.output)
    assert payload["client"] == "common"
    assert payload["artifact"] == "commands"
    assert payload["dry_run"] is True
    assert any(op["client"] == "claude" for op in payload["operations"])
    assert any("codex does not support" in w for w in payload["warnings"])


def test_opencode_commands_use_opencode_frontmatter(runner, tmp_path, monkeypatch):
    """OpenCode command templates should avoid Claude-specific keys."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(
        cli, ["skills", "install", "plan-task", "--client=opencode", "--artifact=commands"]
    )

    assert result.exit_code == 0
    command = (tmp_path / ".opencode/commands/plan-task.md").read_text()
    assert "description:" in command
    assert "argument-hint:" not in command
    assert "\nname:" not in command


def test_claude_skills_omit_codex_metadata_block(runner, tmp_path, monkeypatch):
    """Claude skills should use Claude-compatible frontmatter keys only."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(
        cli, ["skills", "install", "plan-ingest", "--client=claude", "--artifact=skills"]
    )

    assert result.exit_code == 0
    skill = (tmp_path / ".claude/skills/plan-ingest/SKILL.md").read_text()
    assert "name: plan-ingest" in skill
    assert "description:" in skill
    assert "metadata:" not in skill
