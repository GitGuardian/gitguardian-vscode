import { childProcess, SpawnOptionsWithoutStdio } from "./child-process";
import { GGShieldConfiguration } from "./ggshield-configuration";
import { workspace } from "vscode";

import * as os from "os";

export interface GGShieldCommandResult {
  pid: number;
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

// ggshield commands run by the extension that accept the `--instance` option
const INSTANCE_OPTION_COMMANDS = [
  "api-status",
  "auth logout",
  "quota",
  "secret scan",
];

/**
 * Run ggshield CLI application with specified arguments.
 *
 * Runs asynchronously so it does not block the VS Code extension host. The
 * returned promise always resolves — process failures surface via the `error`
 * field and/or a non-zero `status`, matching the shape previously returned by
 * `spawnSync`.
 *
 * @param configuration ggshield configuration
 * @param args arguments
 * @param signal optional AbortSignal to cancel an in-flight invocation
 */
export function runGGShieldCommand(
  configuration: GGShieldConfiguration,
  args: string[],
  signal?: AbortSignal,
): Promise<GGShieldCommandResult> {
  if (!workspace.isTrusted) {
    const errorMessage =
      "GitGuardian: cannot run ggshield in an untrusted workspace.";
    return Promise.resolve({
      pid: -1,
      status: 3,
      signal: null,
      stdout: "",
      stderr: errorMessage,
      error: new Error(errorMessage),
    });
  }

  return new Promise<GGShieldCommandResult>((resolve) => {
    let proc;
    try {
      let finalArgs = args.slice();
      if (configuration.insecure) {
        finalArgs = ["--insecure"].concat(finalArgs);
      }
      const command = args.join(" ");
      if (
        configuration.apiUrl &&
        INSTANCE_OPTION_COMMANDS.some((c) => command.startsWith(c))
      ) {
        finalArgs.push("--instance", configuration.apiUrl);
      }

      const env: NodeJS.ProcessEnv = {
        ...process.env,
        GG_USER_AGENT: "gitguardian-vscode",
      };

      // If the command is executed in a workspace, execute ggshield from the root
      // folder so .gitguardian.yaml is used.
      const cwd = workspace.workspaceFolders?.length
        ? workspace.workspaceFolders[0].uri.fsPath
        : os.tmpdir();

      const options: SpawnOptionsWithoutStdio = {
        cwd,
        env,
        windowsHide: true,
        signal,
      };

      proc = childProcess.spawn(configuration.ggshieldPath, finalArgs, options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      resolve({
        pid: -1,
        status: null,
        signal: null,
        stdout: "",
        stderr: error.message,
        error,
      });
      return;
    }

    let stdout = "";
    let stderr = "";
    let spawnError: Error | undefined;
    let settled = false;
    const settle = (result: GGShieldCommandResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    proc.stdout?.setEncoding("utf-8");
    proc.stderr?.setEncoding("utf-8");
    proc.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    proc.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    proc.on("error", (err) => {
      spawnError = err;
      // If the child never actually spawned (e.g. ENOENT, aborted signal),
      // 'close' may not fire — resolve here so callers never hang.
      if (!proc.pid) {
        settle({
          pid: -1,
          status: null,
          signal: null,
          stdout,
          stderr: stderr || err.message,
          error: err,
        });
      }
    });

    proc.on("close", (status, sig) => {
      settle({
        pid: proc.pid ?? -1,
        status,
        signal: sig,
        stdout,
        stderr,
        error: spawnError,
      });
    });
  });
}
