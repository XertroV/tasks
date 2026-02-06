"""Tests for the schema command."""

import json

import pytest
from click.testing import CliRunner

from tasks.cli import cli


@pytest.fixture
def runner():
    """CLI runner fixture."""
    return CliRunner()


def test_schema_json_includes_all_file_kinds(runner, tmp_path, monkeypatch):
    """schema --json should include all supported file-kind schema entries."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(cli, ["schema", "--json"])

    assert result.exit_code == 0
    payload = json.loads(result.output)

    file_names = {item["name"] for item in payload["files"]}
    assert "Root index" in file_names
    assert "Phase index" in file_names
    assert "Milestone index" in file_names
    assert "Epic index" in file_names
    assert "Task file" in file_names
    assert "Context file" in file_names
    assert "Sessions file" in file_names
    assert "Config file" in file_names


def test_schema_text_is_file_kind_level_not_per_file(runner, tmp_path, monkeypatch):
    """Text output should describe file types and include key path patterns."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(cli, ["schema"])

    assert result.exit_code == 0
    assert "Type-level schema; does not enumerate each task instance." in result.output
    assert ".tasks/index.yaml" in result.output
    assert ".tasks/.context.yaml" in result.output
    assert ".tasks/.sessions.yaml" in result.output
    assert ".tasks/config.yaml" in result.output
    assert "T###-*.todo" in result.output


def test_schema_compact_output(runner, tmp_path, monkeypatch):
    """--compact should render summary lines instead of full field details."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(cli, ["schema", "--compact"])

    assert result.exit_code == 0
    assert ".tasks File-Type Schema (Compact)" in result.output
    assert "File Kinds (compact)" in result.output
    assert "Root index | .tasks/index.yaml | yaml" in result.output
    assert "project*" in result.output
    assert "...(+" in result.output


def test_schema_only_filters_text_output(runner, tmp_path, monkeypatch):
    """--only should filter text output by file/object names."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(cli, ["schema", "--only", "Task file", "--only", "TaskFrontmatter"])

    assert result.exit_code == 0
    assert "Task file" in result.output
    assert "TaskFrontmatter" in result.output
    assert "Root index" not in result.output
    assert "PhaseEntry" not in result.output


def test_schema_only_filters_json_output(runner, tmp_path, monkeypatch):
    """--only should filter JSON output by path pattern tokens."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(cli, ["schema", "--json", "--only", ".context.yaml"])

    assert result.exit_code == 0
    payload = json.loads(result.output)
    assert len(payload["files"]) == 1
    assert payload["files"][0]["name"] == "Context file"
    assert payload["object_types"] == []


def test_schema_only_unknown_value_errors(runner, tmp_path, monkeypatch):
    """Unknown --only filter should produce actionable error."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(cli, ["schema", "--only", "does-not-exist"])

    assert result.exit_code != 0
    assert "No schema entries matched --only=does-not-exist" in result.output


def test_schema_check_sync_passes(runner, tmp_path, monkeypatch):
    """--check-sync should validate parser/schema contract."""
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(cli, ["schema", "--check-sync"])

    assert result.exit_code == 0
    assert "Schema sync check passed." in result.output
