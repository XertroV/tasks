import { describe, expect, test } from "bun:test";
import { getAllTasks, findTask } from "../src/helpers";
import { CriticalPathCalculator } from "../src/critical_path";
import { Complexity, Priority, Status, type TaskTree } from "../src/models";

const tree: TaskTree = {
  project: "x",
  criticalPath: [],
  phases: [
    {
      id: "P1",
      name: "Phase",
      path: "01",
      status: Status.PENDING,
      weeks: 1,
      estimateHours: 10,
      priority: Priority.MEDIUM,
      dependsOn: [],
      milestones: [
        {
          id: "P1.M1",
          name: "M",
          path: "01-m",
          status: Status.PENDING,
          estimateHours: 10,
          complexity: Complexity.MEDIUM,
          dependsOn: [],
          epics: [
            {
              id: "P1.M1.E1",
              name: "E",
              path: "01-e",
              status: Status.PENDING,
              estimateHours: 10,
              complexity: Complexity.MEDIUM,
              dependsOn: [],
              tasks: [
                {
                  id: "P1.M1.E1.T001",
                  title: "A",
                  file: "a.todo",
                  status: Status.DONE,
                  estimateHours: 1,
                  complexity: Complexity.LOW,
                  priority: Priority.MEDIUM,
                  dependsOn: [],
                  tags: [],
                },
                {
                  id: "P1.M1.E1.T002",
                  title: "B",
                  file: "b.todo",
                  status: Status.PENDING,
                  estimateHours: 3,
                  complexity: Complexity.HIGH,
                  priority: Priority.MEDIUM,
                  dependsOn: ["P1.M1.E1.T001"],
                  tags: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  bugs: [],
  ideas: [],
};

describe("helpers and critical path", () => {
  test("all tasks and find", () => {
    const tasks = getAllTasks(tree);
    expect(tasks.length).toBe(2);
    expect(findTask(tree, "P1.M1.E1.T002")?.title).toBe("B");
  });

  test("critical path and availability", () => {
    const calc = new CriticalPathCalculator(tree);
    const available = calc.findAllAvailable();
    expect(available).toContain("P1.M1.E1.T002");
    const { criticalPath, nextAvailable } = calc.calculate();
    expect(criticalPath[0]).toBe("P1.M1.E1.T002");
    expect(nextAvailable).toBe("P1.M1.E1.T002");
  });

  test("critical path respects epic dependency", () => {
    const epicTree: TaskTree = {
      project: "x",
      criticalPath: [],
      phases: [
        {
          id: "P1",
          name: "Phase",
          path: "01",
          status: Status.PENDING,
          weeks: 1,
          estimateHours: 10,
          priority: Priority.MEDIUM,
          dependsOn: [],
          milestones: [
            {
              id: "P1.M1",
              name: "M",
              path: "01-m",
              status: Status.PENDING,
              estimateHours: 10,
              complexity: Complexity.MEDIUM,
              dependsOn: [],
              epics: [
                {
                  id: "P1.M1.E1",
                  name: "E1",
                  path: "01-e1",
                  status: Status.PENDING,
                  milestoneId: "P1.M1",
                  phaseId: "P1",
                  estimateHours: 10,
                  complexity: Complexity.MEDIUM,
                  dependsOn: [],
                  tasks: [
                    {
                      id: "P1.M1.E1.T001",
                      title: "A",
                      file: "a.todo",
                      status: Status.PENDING,
                      estimateHours: 1,
                      complexity: Complexity.LOW,
                      priority: Priority.MEDIUM,
                      phaseId: "P1",
                      milestoneId: "P1.M1",
                      dependsOn: [],
                      tags: [],
                    },
                  ],
                },
                {
                  id: "P1.M1.E2",
                  name: "E2",
                  path: "02-e2",
                  status: Status.PENDING,
                  milestoneId: "P1.M1",
                  phaseId: "P1",
                  estimateHours: 10,
                  complexity: Complexity.MEDIUM,
                  dependsOn: [],
                  tasks: [
                    {
                      id: "P1.M1.E2.T001",
                      title: "B",
                      file: "b.todo",
                      status: Status.PENDING,
                      estimateHours: 2,
                      complexity: Complexity.HIGH,
                      priority: Priority.MEDIUM,
                      phaseId: "P1",
                      milestoneId: "P1.M1",
                      dependsOn: ["E1"],
                      tags: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      bugs: [],
      ideas: [],
    };

    const calc = new CriticalPathCalculator(epicTree);
    let available = calc.findAllAvailable();
    expect(available).not.toContain("P1.M1.E2.T001");

    const sourceEpic = epicTree.phases[0].milestones[0].epics[0].tasks[0];
    sourceEpic.status = Status.DONE;
    available = calc.findAllAvailable();
    expect(available).toContain("P1.M1.E2.T001");
  });
});
