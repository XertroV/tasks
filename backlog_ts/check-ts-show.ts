import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const r = mkdtempSync(join(tmpdir(), 'tasks-ts-native-debug-'));
const t = join(r, '.tasks');
mkdirSync(join(t, '01-phase', '01-ms', '01-epic'), { recursive: true });
writeFileSync(join(t, 'index.yaml'), `project: Native\nphases:\n  - id: P1\n    name: Phase\n    path: 01-phase\ncritical_path: []\n`);
writeFileSync(join(t, '01-phase', 'index.yaml'), `milestones:\n  - id: P1.M1\n    name: M\n    path: 01-ms\n`);
writeFileSync(
  join(t, '01-phase', '01-ms', 'index.yaml'),
  `epics:\n  - id: E1\n    name: E\n    path: 01-epic\n`,
);
mkdirSync(join(t, '01-phase', '01-ms', '01-epic'), { recursive: true });
writeFileSync(
  join(t, '01-phase', '01-ms', '01-epic', 'index.yaml'),
  `tasks:\n  - id: T001\n    file: T001-a.todo\n`,
);
writeFileSync(
  join(t, '01-phase', '01-ms', '01-epic', 'T001-a.todo'),
  `---\nid: P1.M1.E1.T001\ntitle: A\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# A\nLine 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10\nLine 11\nLine 12\nLine 13\n`,
);

const cliPath = join(__dirname, 'bin', 'backlog');
function run(args:string[]) {
  const p = spawnSync('bun', [cliPath, ...args], { cwd: r, encoding: 'utf8', stdio:['ignore','pipe','pipe']});
  console.log('cmd', ['show', ...args].join(' '), 'exit', p.status);
  console.log('stdout\n' + (p.stdout ?? '')); 
  console.log('stderr\n' + (p.stderr ?? ''));
}

run(['show','P1.M1.E1.T001']);
run(['show','P1.M1.E1.T001','--long']);
