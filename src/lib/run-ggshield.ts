/* eslint-disable @typescript-eslint/naming-convention */
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
  args: string[]
): SpawnSyncReturns<string> {
  const { ggshieldPath, apiUrl, apiKey } = configuration;
  let env: {
    GITGUARDIAN_API_URL: string;
    GG_USER_AGENT: string;
    GITGUARDIAN_API_KEY?: string;
  } = {
    GITGUARDIAN_API_URL: apiUrl,
    GG_USER_AGENT: "gitguardian-vscode",
  };

  if (apiKey) {
    env = {
      ...env,
      GITGUARDIAN_API_KEY: apiKey,
    };
  }

  let options: SpawnSyncOptionsWithStringEncoding = {
    cwd: os.tmpdir(),
    env: env,
    encoding: "utf-8",
    windowsHide: true,
  };

  // If the command is executed in a worskpace, execute ggshield from the root folder so .gitguardian.yaml is used
  if (workspace.workspaceFolders?.length || 0 > 0) {
    options["cwd"] = workspace.workspaceFolders![0].uri.fsPath;
  }
  let proc = spawnSync(ggshieldPath, args, options);

  return proc;
}
