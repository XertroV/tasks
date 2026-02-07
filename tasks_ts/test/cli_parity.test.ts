import { expect, test } from "bun:test";

function run(args: string[]) {
  return Bun.spawnSync(["bun", "run", "src/cli.ts", ...args], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });
}

test("cli bridge reaches python tasks", () => {
  const p = run(["--version"]);
  expect(p.exitCode).toBe(0);
  const out = p.stdout.toString() + p.stderr.toString();
  expect(out).toContain("0.1.0");
});
