import { describe, expect, test } from "bun:test";
import { Complexity, Priority, Status, type Task } from "../src/models";
import { claimTask, completeTask, StatusError, updateStatus, validateTransition } from "../src/status";

function mkTask(status = Status.PENDING): Task {
  return {
    id: "P1.M1.E1.T001",
    title: "Task",
    file: "01/a.todo",
    status,
    estimateHours: 1,
    complexity: Complexity.LOW,
    priority: Priority.MEDIUM,
    dependsOn: [],
    tags: [],
  };
}

describe("status", () => {
  test("transition validation", () => {
    expect(validateTransition(Status.PENDING, Status.IN_PROGRESS)[0]).toBeTrue();
    expect(validateTransition(Status.DONE, Status.PENDING)[0]).toBeFalse();
  });

  test("claim task", () => {
    const t = mkTask();
    claimTask(t, "agent1");
    expect(t.status).toBe(Status.IN_PROGRESS);
    expect(t.claimedBy).toBe("agent1");
    expect(t.startedAt).toBeInstanceOf(Date);
  });

  test("claim already claimed without force", () => {
    const t = mkTask();
    t.claimedBy = "agent2";
    expect(() => claimTask(t, "agent1")).toThrow(StatusError);
  });

  test("complete task", () => {
    const t = mkTask(Status.IN_PROGRESS);
    completeTask(t);
    expect(t.status).toBe(Status.DONE);
    expect(t.completedAt).toBeInstanceOf(Date);
  });

  test("complete task requires in-progress state", () => {
    const t = mkTask();
    expect(() => completeTask(t)).toThrow(StatusError);
  });

  test("complete task with force", () => {
    const t = mkTask();
    completeTask(t, true);
    expect(t.status).toBe(Status.DONE);
  });

  test("update requires reason", () => {
    const t = mkTask(Status.IN_PROGRESS);
    expect(() => updateStatus(t, Status.BLOCKED)).toThrow(StatusError);
  });

  test("update stores reason for blocked status", () => {
    const t = mkTask(Status.IN_PROGRESS);
    updateStatus(t, Status.BLOCKED, "blocked by dependencies");
    expect(t.reason).toBe("blocked by dependencies");
  });

  test("update clears claim when pending", () => {
    const t = mkTask(Status.IN_PROGRESS);
    t.claimedBy = "a";
    t.claimedAt = new Date();
    updateStatus(t, Status.PENDING, "requeue");
    expect(t.claimedBy).toBeUndefined();
    expect(t.claimedAt).toBeUndefined();
  });
});
