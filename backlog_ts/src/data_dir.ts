import { existsSync, lstatSync, readFileSync, symlinkSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stdout, stdin } from "node:process";

export const BACKLOG_DIR = ".backlog";
export const TASKS_DIR = ".tasks";

export const MIGRATION_COMMENT = "<!-- CLI migrated: 'tasks' → 'backlog' (alias 'bl' also works). -->\n";

export const KNOWN_COMMANDS = [
  "list", "ls", "show", "next", "claim", "grab", "done", "cycle", "work", "update", "sync", "check",
  "unclaim-stale", "add", "add-epic", "add-milestone", "add-phase", "move", "idea", "bug",
  "fixed",
  "blocked", "skip", "unclaim", "handoff", "why", "dash", "search", "blockers",
  "timeline", "tl", "session", "report", "data", "schema", "skills", "migrate",
];

export function getDataDir(): string {
  if (existsSync(BACKLOG_DIR)) {
    return BACKLOG_DIR;
  }
  if (existsSync(TASKS_DIR)) {
    return TASKS_DIR;
  }
  throw new Error(`No data directory found. Expected ${BACKLOG_DIR}/ or ${TASKS_DIR}/`);
}

export function getDataDirName(): string {
  return getDataDir();
}

export function needsMigration(): boolean {
  return existsSync(TASKS_DIR) && !existsSync(BACKLOG_DIR);
}

export function isSymlinkTo(path: string, target: string): boolean {
  try {
    if (!lstatSync(path).isSymbolicLink()) return false;
    return resolve(join(path, "..", readFileSync(path, "utf8").trim())) === resolve(target);
  } catch {
    return false;
  }
}

export function isInteractive(): boolean {
  return stdin.isTTY && stdout.isTTY;
}

export function updateMdFile(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return false;
  }
  
  if (content.includes(MIGRATION_COMMENT)) return false;
  
  const lines = content.split("\n");
  const newLines = lines.map((line) => {
    let newLine = line;
    
    for (const cmd of KNOWN_COMMANDS) {
      newLine = newLine.replace(new RegExp(`\`tasks ${cmd}`, "g"), `\`backlog ${cmd}`);
      newLine = newLine.replace(new RegExp(`    tasks ${cmd}`, "g"), `    backlog ${cmd}`);
      newLine = newLine.replace(new RegExp(`- tasks ${cmd}`, "g"), `- backlog ${cmd}`);
    }
    
    newLine = newLine.replace(/\`tasks --/g, "`backlog --");
    newLine = newLine.replace(/\`tasks \[/g, "`backlog [");
    newLine = newLine.replace(/python -m tasks/g, "python -m backlog");
    newLine = newLine.replace(/\.\/tasks\.py/g, "./backlog.py");
    newLine = newLine.replace(/\`tasks\/\`/g, "`backlog/`");
    newLine = newLine.replace(/"tasks\//g, '"backlog/');
    
    return newLine;
  });
  
  const newContent = newLines.join("\n");
  
  if (newContent !== content) {
    writeFileSync(filePath, MIGRATION_COMMENT + newContent);
    return true;
  }
  
  return false;
}

export interface MigrationResult {
  success: boolean;
  message: string;
}

export function migrateDataDir(createSymlink = true, force = false): MigrationResult {
  if (existsSync(BACKLOG_DIR)) {
    if (isSymlinkTo(TASKS_DIR, BACKLOG_DIR)) {
      return { success: true, message: "Already migrated (.tasks is symlink to .backlog)" };
    }
    if (existsSync(TASKS_DIR) && !lstatSync(TASKS_DIR).isSymbolicLink()) {
      if (!force) {
        return { success: false, message: "Both .tasks/ and .backlog/ exist. Use --force to proceed." };
      }
      return { success: true, message: "Both directories exist (force mode - using .backlog/)" };
    }
    return { success: true, message: "Already migrated (.backlog/ exists)" };
  }
  
  if (!existsSync(TASKS_DIR)) {
    return { success: false, message: "No .tasks/ directory found to migrate" };
  }
  
  try {
    renameSync(TASKS_DIR, BACKLOG_DIR);
  } catch (e) {
    return { success: false, message: `Failed to rename .tasks/ to .backlog/: ${e}` };
  }
  
  if (createSymlink) {
    try {
      symlinkSync(BACKLOG_DIR, TASKS_DIR);
    } catch (e) {
      return { success: false, message: `Migrated but failed to create symlink: ${e}` };
    }
  }
  
  const mdFiles = ["AGENTS.md", "CLAUDE.md"];
  const updatedFiles: string[] = [];
  
  for (const mdFile of mdFiles) {
    if (existsSync(mdFile) && !["README.md", "PARITY_DIFFS.md"].includes(mdFile)) {
      if (updateMdFile(mdFile)) {
        updatedFiles.push(mdFile);
      }
    }
  }
  
  let msg = "Migrated .tasks/ → .backlog/";
  if (createSymlink) msg += " (with symlink)";
  if (updatedFiles.length > 0) {
    msg += `\nUpdated doc files: ${updatedFiles.join(", ")}`;
  }
  
  return { success: true, message: msg };
}
