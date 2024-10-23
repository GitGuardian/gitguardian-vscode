/* eslint-disable @typescript-eslint/naming-convention */
import {
  SpawnOptionsWithoutStdio,
  spawn,
} from "child_process";
import { window, WebviewView } from "vscode";
import axios from 'axios';
import { GGShieldConfiguration } from "./ggshield-configuration";
import { GGShieldScanResults } from "./api-types";
import * as os from "os";
import { apiToDashboard, dasboardToApi } from "../utils";
import { runGGShieldCommand } from "./run-ggshield";


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
  const path = require('node:path');
    try {
      const response = await axios.get(path.join(apiUrl,'v1/metadata'), {
          headers: {
              'authorization': `Token ${configuration.apiKey}`
          }
      });
      return response.data.remediation_messages.pre_commit;
    } catch (error) {
        return "An error occured.";
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

/**
 * Scan a file using ggshield CLI application
 *
 * Show error messages on failure
 *
 * @param filePath path to file
 * @param configuration ggshield configuration
 * @returns results or undefined if there was an error
 */
export function ggshieldScanFile(
  filePath: string,
  configuration: GGShieldConfiguration
): GGShieldScanResults | undefined {
  const proc = runGGShieldCommand(configuration, [
    "secret",
    "scan",
    "--json",
    "path",
    filePath,
  ]);

  // Ignore errors concerning usage
  // This occurs when the path of the file is invalid (i.e.VSCode sending an event for files not on the file system)
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

  return JSON.parse(proc.stdout);
}

export async function loginGGShield(
  configuration: GGShieldConfiguration,
  outputChannel: any,
  webviewView: WebviewView,
): Promise<boolean> {
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

  let args = ["auth", "login", "--method=web"];

  return new Promise((resolve) => {
    const proc = spawn(ggshieldPath, args, options);

    proc.stdout.on("data", (data) => {
      const output = data.toString();
      outputChannel.appendLine(`ggshield stdout: ${output}`);

      const urlLine = output.match(/https:\/\/[^\s]+/);
      if (urlLine) {
        const authUrl = urlLine[0];
        webviewView.webview.postMessage({
          type: 'authLink',
          link: authUrl,
        });
      }
    });
;

    proc.stderr.on("data", (data) => {
      outputChannel.appendLine(`ggshield stderr: ${data.toString()}`);
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        outputChannel.appendLine(`ggshield process exited with code ${code}`);
        resolve(false);
      } else {
        outputChannel.appendLine("ggshield login completed successfully");
        resolve(true);
      }
    });

    proc.on("error", (err) => {
      outputChannel.appendLine(`ggshield process error: ${err.message}`);
      resolve(false);
    });
  });
}

export function logoutGGShield(
  configuration: GGShieldConfiguration
): void {
  runGGShieldCommand(configuration, ["auth", "logout"]);
}

export function ggshieldAuthStatus(
  configuration: GGShieldConfiguration
): boolean {
  const proc = runGGShieldCommand(configuration, ["api-status"]);
  if (proc.stderr || proc.error) {
    if (proc.stderr.includes("Config key")){
      window.showErrorMessage(`Gitguardian: ${proc.stderr}`);
    }
    console.log(proc.stderr);
    return false;
  } else {
    if (proc.stdout.includes("unhealthy")) {
      return false;
    }
    console.log(proc.stdout);
    return true;
  }
}

/**
 * Get ggshield API key from ggshield config list
 * 
 * Search for the correct instance section and return the token
 * */
export function ggshieldApiKey(
  configuration: GGShieldConfiguration,
): string | undefined {
  const proc = runGGShieldCommand(configuration, ["config", "list"]);
  if (proc.stderr || proc.error) {
    console.log(proc.stderr);
    return undefined;
  } else {
    console.log(proc.stdout);
    const apiUrl = configuration.apiUrl;

    const regexInstanceSection = `\\[${apiToDashboard(apiUrl)}\\]([\\s\\S]*?)(?=\\[|$)`;
    const instanceSectionMatch = proc.stdout.match(regexInstanceSection);

    if (instanceSectionMatch) {
      const instanceSection = instanceSectionMatch[0];
      const regexToken = /token:\s([a-zA-Z0-9]+)/;
      const matchToken = instanceSection.match(regexToken);

      // if the token is not found, or is not a valid token, return undefined
      if (!matchToken || matchToken[1].trim().length !== 71 ) {
        return undefined;
      }
      
      return matchToken[1].trim();
    }
  }
}