import { readFileSync } from "node:fs";

const threshold = Number(process.env.COVERAGE_THRESHOLD ?? "95");
const lcov = readFileSync("coverage/lcov.info", "utf8");
let found = 0;
let hit = 0;
for (const line of lcov.split("\n")) {
  if (line.startsWith("LF:")) found += Number(line.slice(3));
  if (line.startsWith("LH:")) hit += Number(line.slice(3));
}
const pct = found > 0 ? (hit / found) * 100 : 100;
console.log(`Line coverage: ${pct.toFixed(2)}% (threshold ${threshold}%)`);
if (pct < threshold) {
  console.error(`Coverage check failed: ${pct.toFixed(2)}% < ${threshold}%`);
  process.exit(1);
}
