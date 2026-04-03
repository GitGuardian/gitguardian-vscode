import {
  spawnSync,
  SpawnSyncOptionsWithStringEncoding,
  SpawnSyncReturns,
} from "child_process";
import { GGShieldConfiguration } from "./ggshield-configuration";
import { workspace } from "vscode";

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
  args: string[],
): SpawnSyncReturns<string> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GG_USER_AGENT: "gitguardian-vscode",
  };

  const options: SpawnSyncOptionsWithStringEncoding = {
    cwd: workspace.workspaceFolders
      ? workspace.workspaceFolders[0].uri.fsPath
      : os.tmpdir(),
    env: env,
    encoding: "utf-8",
    windowsHide: true,
  };

  // If the command is executed in a worskpace, execute ggshield from the root folder so .gitguardian.yaml is used
  if (workspace.workspaceFolders?.length || 0 > 0) {
    options["cwd"] = workspace.workspaceFolders![0].uri.fsPath;
  }
  if (configuration.insecure) {
    args = ["--insecure"].concat(args);
  }

  if (configuration.apiUrl && !args.includes("--version")) {
    args.push("--instance", configuration.apiUrl);
  }

  if (!workspace.isTrusted) {
    const errorMessage =
      "GitGuardian: cannot run ggshield in an untrusted workspace.";
    return {
      pid: -1,
      status: 3,
      signal: null,
      output: ["", "", errorMessage],
      stdout: "",
      stderr: errorMessage,
      error: new Error(errorMessage),
    };
  }

  const proc = spawnSync(configuration.ggshieldPath, args, options);

  return proc;
}
