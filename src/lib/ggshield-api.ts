import {
  SpawnOptionsWithoutStdio,
  SpawnSyncOptionsWithStringEncoding,
  SpawnSyncReturns,
  spawn,
  spawnSync,
} from "child_process";
import { workspace, window } from "vscode";
import { GGShieldConfiguration } from "./ggshield-configuration";
import { GGShieldScanResults } from "./api-types";
import * as os from "os";

/**
 * Run ggshield CLI application with specified arguments
 *
 * @param configuration ggshield configuration
 * @param args arguments
 * @returns
 */
export function runGGShieldCommand(
  configuration: GGShieldConfiguration,
  args: string[]
): SpawnSyncReturns<string> {
  const { ggshieldPath, apiUrl } = configuration;

  let options: SpawnSyncOptionsWithStringEncoding = {
    cwd: os.tmpdir(),
    env: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      GITGUARDIAN_API_URL: apiUrl,
    },
    encoding: "utf-8",
    windowsHide: true,
  };

  // If the command is executed in a worskpace, execute ggshield from the root folder so .gitguardian.yaml is used
  if (workspace.workspaceFolders?.length || 0 > 0) {
    options["cwd"] = workspace.workspaceFolders![0].uri.fsPath;
  }
  console.log(ggshieldPath, args, options);

  let proc = spawnSync(ggshieldPath, args, options);

  return proc;
}

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
  outputChannel: any
): Promise<boolean> {
  const { ggshieldPath, apiUrl } = configuration;

  let options: SpawnOptionsWithoutStdio = {
    cwd: os.tmpdir(),
    env: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      GITGUARDIAN_API_URL: apiUrl,
    },
    windowsHide: true,
  };

  let args = ["auth", "login", "--method=web"];
  console.log(ggshieldPath, args, options);

  return new Promise((resolve) => {
    const proc = spawn(ggshieldPath, args, options);

    proc.stdout.on("data", (data) => {
      outputChannel.appendLine(`ggshield stdout: ${data.toString()}`);
    });

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

export async function ggshieldAuthStatus(
  configuration: GGShieldConfiguration
): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = runGGShieldCommand(configuration, ["api-status"]);
    if (proc.stderr || proc.error) {
      console.log(proc.stderr);
      resolve(false);
    } else {
      console.log(proc.stdout);
      resolve(true);
    }
  });
}
