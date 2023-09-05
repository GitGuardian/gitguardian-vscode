import { SpawnSyncOptionsWithStringEncoding, spawnSync } from "child_process";
import { GGShieldConfiguration } from "./ggshield-configuration";
import { GGShieldScanResults } from "./api-types";
import { workspace, window } from "vscode";

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
  const { ggshieldPath, apiKey, apiUrl } = configuration;

  let options: SpawnSyncOptionsWithStringEncoding = {
    cwd: "/tmp",
    env: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      GITGUARDIAN_API_KEY: apiKey,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      GITGUARDIAN_API_URL: apiUrl,
    },
    encoding: "utf-8",
    windowsHide: true,
  };

  if (workspace.workspaceFolders?.length || 0 > 0) {
    options["cwd"] = workspace.workspaceFolders![0].uri.fsPath;
  }

  let proc = spawnSync(
    ggshieldPath,
    ["secret", "scan", "--json", "path", filePath],
    options
  );

  let hasFailed = false;
  proc.stderr.split("\n").forEach((stderrLine) => {
    if (
      stderrLine.length > 0 &&
      !stderrLine.includes("Scanning Path...") // ggshield outputs this info message on stderr, ignore it
    ) {
      window.showErrorMessage(`ggshield: ${stderrLine}`);
      hasFailed = true;
    }
  });
  if (hasFailed) {
    return undefined;
  }

  return JSON.parse(proc.stdout);
}
