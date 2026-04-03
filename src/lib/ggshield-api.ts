import * as path from "path";
import {
  window,
  Disposable,
  DiagnosticCollection,
  ExtensionContext,
  languages,
  RelativePattern,
  Uri,
  Diagnostic,
  workspace,
} from "vscode";
import { GGShieldConfiguration } from "./ggshield-configuration";
import { isFileGitignored } from "../utils";
import { runGGShieldCommand } from "./run-ggshield";
import {
  StatusBarStatus,
  updateStatusBarItem,
} from "../gitguardian-interface/gitguardian-status-bar";
import { parseGGShieldResults } from "./ggshield-results-parser";

/**
 * Extension diagnostic collection
 */
export const diagnosticCollection: DiagnosticCollection =
  languages.createDiagnosticCollection("ggshield");

// Per-URI delete watchers, registered only for files we currently track
// diagnostics for.
const fileWatchers = new Map<string, Disposable>();

function watchUriForRemoval(fileUri: Uri): void {
  const key = fileUri.toString();
  if (fileWatchers.has(key)) {
    return;
  }
  const folder = workspace.getWorkspaceFolder(fileUri);
  if (!folder) {
    return;
  }
  const relativePath = path.relative(folder.uri.fsPath, fileUri.fsPath);
  if (!relativePath || relativePath.startsWith("..")) {
    return;
  }
  // RelativePattern expects a glob, so use forward slashes on Windows too.
  const globPath = relativePath.split(path.sep).join("/");
  const watcher = workspace.createFileSystemWatcher(
    new RelativePattern(folder, globPath),
    true, // ignoreCreateEvents
    true, // ignoreChangeEvents
    false, // listen for delete
  );
  const subscription = watcher.onDidDelete(() => {
    cleanUpFileDiagnostics(fileUri);
  });
  fileWatchers.set(key, {
    dispose: () => {
      subscription.dispose();
      watcher.dispose();
    },
  });
}

function unwatchUri(fileUri: Uri): void {
  const key = fileUri.toString();
  const watcher = fileWatchers.get(key);
  if (watcher) {
    watcher.dispose();
    fileWatchers.delete(key);
  }
}

function setDiagnostics(fileUri: Uri, diagnostics: Diagnostic[]): void {
  diagnosticCollection.set(fileUri, diagnostics);
  if (diagnostics.length > 0) {
    watchUriForRemoval(fileUri);
  } else {
    unwatchUri(fileUri);
  }
}

// Tracks the in-flight scan per URI so a later save can abort an earlier one
// and we can drop stale results that return after being superseded.
const inFlightScans = new Map<string, AbortController>();

export function cancelInFlightScans(): void {
  for (const controller of inFlightScans.values()) {
    controller.abort();
  }
  inFlightScans.clear();
}

/**
 * Display API quota
 *
 * Show error message on failure
 */
export async function showAPIQuota(
  configuration: GGShieldConfiguration,
): Promise<void> {
  if (!configuration) {
    window.showErrorMessage("ggshield: Missing settings");
    return;
  }

  const proc = await runGGShieldCommand(configuration, ["quota"]);

  if (proc.stderr.length > 0) {
    window.showErrorMessage(`ggshield: ${proc.stderr}`);
  }
  if (proc.stdout.length > 0) {
    window.showInformationMessage(`ggshield: ${proc.stdout}`);
  }
}

export async function getAPIquota(
  configuration: GGShieldConfiguration,
): Promise<number> {
  try {
    const proc = await runGGShieldCommand(configuration, ["quota", "--json"]);
    return JSON.parse(proc.stdout).remaining;
  } catch {
    return 0;
  }
}

/**
 * Ignore last found secrets
 *
 * Show error message on failure
 */
export async function ignoreLastFound(
  configuration: GGShieldConfiguration,
): Promise<void> {
  if (!configuration) {
    window.showErrorMessage("ggshield: Missing settings");
    return;
  }

  const proc = await runGGShieldCommand(configuration, [
    "secret",
    "ignore",
    "--last-found",
  ]);

  if (proc.stderr.length > 0) {
    window.showErrorMessage(`ggshield: ${proc.stderr}`);
  }
  if (proc.stdout.length > 0) {
    window.showInformationMessage(`ggshield: ${proc.stdout}`);
  }
}

/**
 * Ignore one secret.
 *
 * Show error message on failure
 */
export async function ignoreSecret(
  configuration: GGShieldConfiguration,
  secretSha: string,
  secretName: string,
): Promise<boolean> {
  const proc = await runGGShieldCommand(configuration, [
    "secret",
    "ignore",
    secretSha,
    "--name",
    secretName,
  ]);
  if (proc.stderr || proc.error) {
    console.log(proc.stderr);
    return false;
  } else {
    console.log(proc.stdout);
    return true;
  }
}

export function createDiagnosticCollection(context: ExtensionContext): void {
  context.subscriptions.push(diagnosticCollection);
}

/**
 * Clean up file diagnostics
 *
 * @param fileUri file uri
 */
export function cleanUpFileDiagnostics(fileUri: Uri): void {
  diagnosticCollection.delete(fileUri);
  unwatchUri(fileUri);
}

/**
 * Scan a file using ggshield
 *
 * - retrieve configuration
 * - scan file using ggshield CLI application
 * - parse ggshield results
 * - set diagnostics collection so the incdients are visible to the user
 *
 * @param filePath path to file
 * @param fileUri file uri
 */
export async function scanFile(
  filePath: string,
  fileUri: Uri,
  configuration: GGShieldConfiguration,
): Promise<void> {
  if (isFileGitignored(filePath)) {
    updateStatusBarItem(StatusBarStatus.ignoredFile);
    cleanUpFileDiagnostics(fileUri);
    return;
  }

  const key = fileUri.toString();
  inFlightScans.get(key)?.abort();
  const controller = new AbortController();
  inFlightScans.set(key, controller);

  const proc = await runGGShieldCommand(
    configuration,
    ["secret", "scan", "--json", "path", filePath],
    controller.signal,
  );

  // Superseded by a newer scan for this URI — drop the result.
  if (inFlightScans.get(key) !== controller) {
    return;
  }
  inFlightScans.delete(key);

  // Aborted or failed to spawn — no meaningful exit status to interpret.
  if (controller.signal.aborted || proc.status === null) {
    return;
  }

  if (proc.status === 128 || proc.status === 3) {
    const errorMessage = proc.stderr
      .split("\n")
      .filter(
        (stderrLine) =>
          stderrLine.length > 0 && !stderrLine.includes("Scanning Path..."), // ggshield outputs this info message on stderr, ignore it
      )
      .join("\n");
    if (errorMessage.length > 0) {
      window.showErrorMessage(`ggshield: ${errorMessage}`);
      return undefined;
    }
  } else if (proc.status === 2) {
    // Ignore errors concerning usage
    // This occurs when the path of the file is invalid (i.e.VSCode sending an event for files not on the file system)
    // or when the file is ignored in the .gitguardian.yaml
    if (
      proc.stderr.includes(
        "Error: An ignored file or directory cannot be scanned",
      )
    ) {
      updateStatusBarItem(StatusBarStatus.ignoredFile);
      cleanUpFileDiagnostics(fileUri);
      return;
    }
    return undefined;
  } else if (proc.status === 0) {
    updateStatusBarItem(StatusBarStatus.noSecretFound);
    cleanUpFileDiagnostics(fileUri);
    return;
  } else {
    updateStatusBarItem(StatusBarStatus.secretFound);
  }
  const results = JSON.parse(proc.stdout);
  const incidentsDiagnostics: Diagnostic[] = parseGGShieldResults(results);
  setDiagnostics(fileUri, incidentsDiagnostics);
}
