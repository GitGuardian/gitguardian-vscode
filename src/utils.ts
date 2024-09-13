import * as vscode from "vscode";
import { spawnSync } from "child_process";
import path = require("path");

export async function isGitInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    let proc = spawnSync("git", ["--version"]);
    if (proc.error || proc.stderr.length > 0) {
      console.log(`git is not installed.`);
      resolve(false);
    } else {
      resolve(true);
    }
  });
}

export function getCurrentFile(): string {
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    return activeEditor.document.fileName;
  } else {
    return "";
  }
}
