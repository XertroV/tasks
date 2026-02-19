import pytest

from backlog.models import PathQuery


def test_parse_and_match_exact_segments():
    query = PathQuery.parse("P1.M2.E3")
    assert query.segments == ("P1", "M2", "E3")
    assert query.matches("P1.M2.E3")
    assert query.matches("P1.M2.E3.T001")
    assert not query.matches("P1.M2.E4")


def test_parse_and_match_wildcards():
    query = PathQuery.parse("P2.M*")
    assert query.matches("P2.M1")
    assert query.matches("P2.M1.E1.T001")
    assert not query.matches("P3.M1")

    task_query = PathQuery.parse("P2.M1.E1.T*")
    assert task_query.matches("P2.M1.E1.T123")
    assert not task_query.matches("P2.M1.E1")


def test_parse_rejects_invalid_queries():
    with pytest.raises(ValueError):
        PathQuery.parse("")
    with pytest.raises(ValueError):
        PathQuery.parse("P1.M1*2")
    with pytest.raises(ValueError):
        PathQuery.parse("P1..M2")
