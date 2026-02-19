import { describe, expect, test } from "bun:test";
import { PathQuery, TaskPath } from "../src/models";

describe("TaskPath", () => {
  test("parse and ids", () => {
    const p = TaskPath.parse("P1.M1.E1.T001");
    expect(p.phaseId).toBe("P1");
    expect(p.milestoneId).toBe("P1.M1");
    expect(p.epicId).toBe("P1.M1.E1");
    expect(p.taskId).toBe("P1.M1.E1.T001");
    expect(p.depth).toBe(4);
  });

  test("constructors", () => {
    expect(TaskPath.forPhase("P1").fullId).toBe("P1");
    expect(TaskPath.forMilestone("P1", "M2").fullId).toBe("P1.M2");
    expect(TaskPath.forEpic("P1", "M2", "E9").fullId).toBe("P1.M2.E9");
    expect(TaskPath.forTask("P1", "M2", "E9", "T003").fullId).toBe("P1.M2.E9.T003");
  });

  test("parent chain", () => {
    const p = TaskPath.parse("P1.M1.E1.T001");
    expect(p.parent()?.fullId).toBe("P1.M1.E1");
    expect(p.parent()?.parent()?.fullId).toBe("P1.M1");
    expect(p.parent()?.parent()?.parent()?.fullId).toBe("P1");
    expect(p.parent()?.parent()?.parent()?.parent()).toBeUndefined();
  });

  test("guards", () => {
    expect(() => TaskPath.parse("")).toThrow();
    expect(() => TaskPath.forPhase("P1").withEpic("E1")).toThrow();
    expect(() => TaskPath.forMilestone("P1", "M1").withTask("T1")).toThrow();
  });
});

describe("PathQuery", () => {
  test("parse and matches exact queries", () => {
    const query = PathQuery.parse("P1.M1.E1");
    expect(query.segments).toEqual(["P1", "M1", "E1"]);
    expect(query.matches("P1.M1.E1")).toBeTrue();
    expect(query.matches("P1.M1.E1.T001")).toBeTrue();
    expect(query.matches("P1.M2.E1")).toBeFalse();
  });

  test("supports wildcard suffix matching", () => {
    const query = PathQuery.parse("P1.M*");
    expect(query.matches("P1.M1")).toBeTrue();
    expect(query.matches("P1.M12")).toBeTrue();
    expect(query.matches("P1.M1.E1.T001")).toBeTrue();
    expect(query.matches("P2.M1")).toBeFalse();
  });

  test("supports task wildcard", () => {
    const query = PathQuery.parse("P1.M1.E1.T*");
    expect(query.matches("P1.M1.E1.T001")).toBeTrue();
    expect(query.matches("P1.M1.E1.TABC")).toBeTrue();
    expect(query.matches("P1.M1.E1")).toBeFalse();
  });

  test("throws for malformed wildcard usage", () => {
    expect(() => PathQuery.parse("P1.M1*2")).toThrow();
    expect(() => PathQuery.parse("P1..E1")).toThrow();
    expect(() => PathQuery.parse("")).toThrow();
  });
});
