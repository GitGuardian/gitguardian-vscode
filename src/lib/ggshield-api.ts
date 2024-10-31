/* eslint-disable @typescript-eslint/naming-convention */
import {
  window,
  DiagnosticCollection,
  ExtensionContext,
  languages,
  Uri,
  Diagnostic,
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
export let diagnosticCollection: DiagnosticCollection;

/**
 * Display API quota
 *
 * Show error message on failure
 */
export function showAPIQuota(configuration: GGShieldConfiguration): undefined {
  if (!configuration) {
    window.showErrorMessage("ggshield: Missing settings");
    return;
  }

  const proc = runGGShieldCommand(configuration, ["quota"]);

  if (proc.stderr.length > 0) {
    window.showErrorMessage(`ggshield: ${proc.stderr}`);
  }
  if (proc.stdout.length > 0) {
    window.showInformationMessage(`ggshield: ${proc.stdout}`);
  }
}

export function getAPIquota(configuration: GGShieldConfiguration): number {
  try {
    const proc = runGGShieldCommand(configuration, ["quota", "--json"]);
    return JSON.parse(proc.stdout).remaining;
  } catch (e) {
    return 0;
  }
}

/**
 * Ignore last found secrets
 *
 * Show error message on failure
 */
export function ignoreLastFound(
  configuration: GGShieldConfiguration
): undefined {
  if (!configuration) {
    window.showErrorMessage("ggshield: Missing settings");
    return;
  }

  const proc = runGGShieldCommand(configuration, [
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
export function ignoreSecret(
  configuration: GGShieldConfiguration,
  secretSha: string,
  secretName: string
): boolean {
  const proc = runGGShieldCommand(configuration, [
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
  diagnosticCollection = languages.createDiagnosticCollection("ggshield");
  context.subscriptions.push(diagnosticCollection);
}

/**
 * Clean up file diagnostics
 *
 * @param fileUri file uri
 */
export function cleanUpFileDiagnostics(fileUri: Uri): void {
  diagnosticCollection.delete(fileUri);
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
export function scanFile(
  filePath: string,
  fileUri: Uri,
  configuration: GGShieldConfiguration
): void {
  if (isFileGitignored(filePath)) {
    updateStatusBarItem(StatusBarStatus.ignoredFile);
    return;
  }
  const proc = runGGShieldCommand(configuration, [
    "secret",
    "scan",
    "--json",
    "path",
    filePath,
  ]);

  if (proc.status === 128 || proc.status === 3) {
    const errorMessage = proc.stderr
      .split("\n")
      .filter(
        (stderrLine) =>
          stderrLine.length > 0 && !stderrLine.includes("Scanning Path...") // ggshield outputs this info message on stderr, ignore it
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
        "Error: An ignored file or directory cannot be scanned"
      )
    ) {
      updateStatusBarItem(StatusBarStatus.ignoredFile);
      return;
    }
    return undefined;
  } else if (proc.status === 0) {
    updateStatusBarItem(StatusBarStatus.noSecretFound);
    return;
  } else {
    updateStatusBarItem(StatusBarStatus.secretFound);
  }
  const results = JSON.parse(proc.stdout);
  let incidentsDiagnostics: Diagnostic[] = parseGGShieldResults(results);
  diagnosticCollection.set(fileUri, incidentsDiagnostics);
}
