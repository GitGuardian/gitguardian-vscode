/* eslint-disable @typescript-eslint/naming-convention */
import { SpawnOptionsWithoutStdio, spawn } from "child_process";
import {
  window,
  WebviewView,
  DiagnosticCollection,
  commands,
  ExtensionContext,
  languages,
  Uri,
  Diagnostic,
} from "vscode";
import axios from "axios";
import { GGShieldConfiguration } from "./ggshield-configuration";
import { GGShieldScanResults } from "./api-types";
import * as os from "os";
import { apiToDashboard, dasboardToApi, isFileGitignored } from "../utils";
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

export async function getAPIquota(
  configuration: GGShieldConfiguration
): Promise<number> {
  try {
    const proc = runGGShieldCommand(configuration, ["quota", "--json"]);
    return JSON.parse(proc.stdout).remaining;
  } catch (e) {
    return 0;
  }
}

export async function getRemediationMessage(
  configuration: GGShieldConfiguration
): Promise<string> {
  const apiUrl = dasboardToApi(configuration.apiUrl);
  const path = require("node:path");
  try {
    const response = await axios.get(path.join(apiUrl, "v1/metadata"), {
      headers: {
        authorization: `Token ${configuration.apiKey}`,
      },
    });
    return response.data.remediation_messages.pre_commit;
  } catch (error) {
    return "An error occurred.";
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
export async function scanFile(
  this: any,
  filePath: string,
  fileUri: Uri,
  configuration: GGShieldConfiguration
): Promise<void> {
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
  if (proc.stderr.includes("Usage: ggshield secret scan path")) {
    return undefined;
  }
  let errorMessage = "";
  proc.stderr.split("\n").forEach((stderrLine) => {
    if (
      stderrLine.length > 0 &&
      !stderrLine.includes("Scanning Path...") // ggshield outputs this info message on stderr, ignore it
    ) {
      errorMessage += stderrLine + "\n";
    }
  });
  if (errorMessage.length > 0) {
    window.showErrorMessage(`ggshield: ${errorMessage}`);
    return undefined;
  }

  const results = JSON.parse(proc.stdout);
  if (!results) {
    updateStatusBarItem(StatusBarStatus.ready);
    return;
  }
  let incidentsDiagnostics: Diagnostic[] = parseGGShieldResults(results);
  if (incidentsDiagnostics.length !== 0) {
    updateStatusBarItem(StatusBarStatus.secretFound);
  } else {
    updateStatusBarItem(StatusBarStatus.noSecretFound);
  }

  diagnosticCollection.set(fileUri, incidentsDiagnostics);
}

export async function loginGGShield(
  configuration: GGShieldConfiguration,
  outputChannel: any,
  webviewView: WebviewView,
  context: ExtensionContext
): Promise<void> {
  const { ggshieldPath, apiUrl, apiKey } = configuration;

  let options: SpawnOptionsWithoutStdio = {
    cwd: os.tmpdir(),
    env: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      GITGUARDIAN_API_URL: apiUrl,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      GG_USER_AGENT: "gitguardian-vscode",
    },
    windowsHide: true,
  };

  let args = ["auth", "login", "--method=web", "--debug"];

  return new Promise<void>((resolve, reject) => {
    const proc = spawn(ggshieldPath, args, options);

    proc.stdout.on("data", (data) => {
      const output = data.toString();
      outputChannel.appendLine(`ggshield stdout: ${output}`);

      const urlLine = output.match(/https:\/\/[^\s]+/);
      if (urlLine) {
        const authUrl = urlLine[0];
        webviewView.webview.postMessage({
          type: "authLink",
          link: authUrl,
        });
      }
    });

    proc.stderr.on("data", (data) => {
      outputChannel.appendLine(`ggshield stderr: ${data.toString()}`);
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        outputChannel.appendLine(`ggshield process exited with code ${code}`);
        reject(new Error(`ggshield process exited with code ${code}`));
      } else {
        outputChannel.appendLine("ggshield login completed successfully");
        commands.executeCommand("setContext", "isAuthenticated", true);
        await context.globalState.update("isAuthenticated", true);
        resolve();
      }
    });

    proc.on("error", (err) => {
      outputChannel.appendLine(`ggshield process error: ${err.message}`);
      reject(err);
    });
  });
}

export async function logoutGGShield(
  configuration: GGShieldConfiguration,
  context: ExtensionContext
): Promise<void> {
  runGGShieldCommand(configuration, ["auth", "logout"]);
  commands.executeCommand("setContext", "isAuthenticated", false);
  await context.globalState.update("isAuthenticated", false);
}

export async function ggshieldAuthStatus(
  configuration: GGShieldConfiguration,
  context: ExtensionContext
): Promise<void> {
  let isAuthenticated: boolean;
  const proc = runGGShieldCommand(configuration, ["api-status", "--json"]);
  if (proc.status === 0 && JSON.parse(proc.stdout).status_code === 200) {
    isAuthenticated = true;
  } else {
    if (proc.stderr && proc.stderr.includes("Config key")) {
      window.showErrorMessage(`Gitguardian: ${proc.stderr}`);
    }
    console.log(proc.stderr);
    isAuthenticated = false;
  }
  commands.executeCommand("setContext", "isAuthenticated", isAuthenticated);
  await context.globalState.update("isAuthenticated", isAuthenticated);
}

/**
 * Get ggshield API key from ggshield config list
 *
 * Search for the correct instance section and return the token
 * */
export function ggshieldApiKey(
  configuration: GGShieldConfiguration
): string | undefined {
  const proc = runGGShieldCommand(configuration, ["config", "list"]);
  if (proc.stderr || proc.error) {
    console.log(proc.stderr);
    return undefined;
  } else {
    console.log(proc.stdout);
    const apiUrl = configuration.apiUrl;

    const regexInstanceSection = `\\[${apiToDashboard(
      apiUrl
    )}\\]([\\s\\S]*?)(?=\\[|$)`;
    const instanceSectionMatch = proc.stdout.match(regexInstanceSection);

    if (instanceSectionMatch) {
      const instanceSection = instanceSectionMatch[0];
      const regexToken = /token:\s([a-zA-Z0-9]+)/;
      const matchToken = instanceSection.match(regexToken);

      // if the token is not found, or is not a valid token, return undefined
      if (!matchToken || matchToken[1].trim().length !== 71) {
        return undefined;
      }

      return matchToken[1].trim();
    }
  }
}
