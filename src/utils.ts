import * as vscode from "vscode";
import { spawnSync } from "child_process";
import * as path from "path";

export function checkGitInstalled(): boolean {
  let proc = spawnSync("git", ["--version"]);
  const success = proc.status === 0;
  if (!success) {
    vscode.window.showErrorMessage(
      `GGShield requires git to work correctly. Please install git.`
    );
  }
  return success;
}

// Since git is required to use ggshield, we know that it is installed
export function isFileGitignored(filePath: string): boolean {
  let proc = spawnSync("git", ["check-ignore", filePath], {
    cwd: path.dirname(filePath),
  });
  return proc.status === 0;
}

export function getCurrentFile(): string {
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    return activeEditor.document.fileName;
  } else {
    return "";
  }
}

export function pluralize(num: number, word: string): string {
  return `${[1, -1].includes(num) ? word : word + "s"}`
}
