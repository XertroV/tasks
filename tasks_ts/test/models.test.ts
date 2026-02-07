import { describe, expect, test } from "bun:test";
import { TaskPath } from "../src/models";

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
