import * as vscode from "vscode";
import { spawnSync } from "child_process";
import * as path from "path";

const reDashboard = "dashboard";
const reApi = "api";
const gitGuardianDomains = ["gitguardian.tech", "gitguardian.com"];

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

export function dasboardToApi(dashboardUrl: string): string {
  const domainMatch = gitGuardianDomains.some((domain) =>
    dashboardUrl.includes(domain)
  );
  if (domainMatch) {
    return dashboardUrl.replace(reDashboard, reApi);
  } else {
    return dashboardUrl;
  }
}

export function apiToDashboard(apiUrl: string): string {
  const domainMatch = gitGuardianDomains.some((domain) =>
    apiUrl.includes(domain)
  );
  if (domainMatch) {
    return apiUrl.replace(reApi, reDashboard);
  } else {
    return apiUrl;
  }
}
