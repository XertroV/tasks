"""Tests for the `tasks agents` command."""

from click.testing import CliRunner

from backlog.cli import cli


def test_agents_default_prints_all_profiles():
    runner = CliRunner()
    result = runner.invoke(cli, ["agents"])

    assert result.exit_code == 0
    assert "AGENTS.md (Short)" in result.output
    assert "AGENTS.md (Medium)" in result.output
    assert "AGENTS.md (Long)" in result.output


def test_agents_profile_short_prints_single_profile():
    runner = CliRunner()
    result = runner.invoke(cli, ["agents", "--profile", "short"])

    assert result.exit_code == 0
    assert "AGENTS.md (Short)" in result.output
    assert "AGENTS.md (Medium)" not in result.output
    assert "AGENTS.md (Long)" not in result.output
