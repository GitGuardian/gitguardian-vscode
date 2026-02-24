import { runGGShieldCommand } from "./run-ggshield";
import { GGShieldConfiguration } from "./ggshield-configuration";
import { commands, ExtensionContext, WebviewView, workspace } from "vscode";
import { spawn, SpawnOptionsWithoutStdio } from "child_process";
import * as os from "os";
import {
  StatusBarStatus,
  updateStatusBarItem,
} from "../gitguardian-interface/gitguardian-status-bar";

export interface AuthenticationStatus {
  success: boolean;
  instance: string;
  instanceSource?: ConfigSource;
  keySource: ConfigSource;
}

export enum GGShieldConfigSource {
  cmdOption = "CMD_OPTION",
  dotEnv = "DOTENV",
  envVar = "ENV_VAR",
  userConfig = "USER_CONFIG",
  default = "DEFAULT",
}

export enum ConfigSource {
  extensionSettings = "Extension settings",
  dotEnv = ".env file",
  envVar = "Environment variable",
  instanceGGShieldConfig = "ggshield settings or .gitguardian.yaml file",
  keyGGShieldConfig = "ggshield settings",
  default = "Default instance",
  noKeyFound = "No key found",
}

function getSource(sourceString: string, isInstance: boolean): ConfigSource {
  switch (sourceString) {
    case GGShieldConfigSource.cmdOption:
      return ConfigSource.extensionSettings;
    case GGShieldConfigSource.dotEnv:
      return ConfigSource.dotEnv;
    case GGShieldConfigSource.envVar:
      return ConfigSource.envVar;
    case GGShieldConfigSource.userConfig:
      if (isInstance) {
        return ConfigSource.instanceGGShieldConfig;
      } else {
        return ConfigSource.keyGGShieldConfig;
      }
    case GGShieldConfigSource.default:
      return ConfigSource.default;
  }

  throw new Error(`Unknown source: ${sourceString}`);
}

/**
 * Checks whether the user is authenticated or not,
 * and updates authenticationStatus and the status bar accordingly
 */
export async function updateAuthenticationStatus(
  context: ExtensionContext,
  configuration: GGShieldConfiguration,
): Promise<void> {
  const proc = runGGShieldCommand(configuration, ["api-status", "--json"]);

  let authStatus: AuthenticationStatus;
  if (proc.stderr.includes("No token is saved for this instance")) {
    authStatus = {
      success: false,
      instance: proc.stderr.split("'")[1],
      keySource: ConfigSource.noKeyFound,
    };
  } else if (proc.status !== 0) {
    authStatus = {
      success: false,
      instance: "",
      keySource: ConfigSource.noKeyFound,
    };
  } else {
    const output = JSON.parse(proc.stdout);
    authStatus = {
      success: output.status_code === 200,
      instance: output.instance,
      instanceSource: getSource(output.instance_source, true),
      keySource: getSource(output.api_key_source, false),
    };
  }

  await context.workspaceState.update("authenticationStatus", authStatus);
  commands.executeCommand("setContext", "isAuthenticated", authStatus.success);

  if (authStatus.success) {
    updateStatusBarItem(StatusBarStatus.ready);
  } else if (authStatus.keySource === ConfigSource.noKeyFound) {
    updateStatusBarItem(StatusBarStatus.unauthenticated);
  } else {
    updateStatusBarItem(StatusBarStatus.authFailed);
  }
}

export async function loginGGShield(
  configuration: GGShieldConfiguration,
  outputChannel: any,
  webviewView: WebviewView,
  context: ExtensionContext,
): Promise<void> {
  const { ggshieldPath } = configuration;

  let options: SpawnOptionsWithoutStdio = {
    cwd: workspace.workspaceFolders
      ? workspace.workspaceFolders[0].uri.fsPath
      : os.tmpdir(),
    env: {
      ...process.env,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      GG_USER_AGENT: "gitguardian-vscode",
    },
    windowsHide: true,
  };

  let args = ["auth", "login", "--method=web", "--debug"];
  if (configuration.insecure) {
    args.unshift("--insecure");
  }
  if (configuration.apiUrl) {
    args.push("--instance", configuration.apiUrl);
  }

  return new Promise<void>((resolve, reject) => {
    const proc = spawn(ggshieldPath, args, options);

    proc.stdout.on("data", (data) => {
      const urlLine = data.toString().match(/https:\/\/[^\s]+/);
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
        updateAuthenticationStatus(context, configuration);
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
  context: ExtensionContext,
): Promise<void> {
  let cmd = ["auth", "logout"];
  const authStatus: AuthenticationStatus | undefined =
    context.workspaceState.get("authenticationStatus");
  if (
    authStatus?.success === false &&
    authStatus.keySource === ConfigSource.keyGGShieldConfig
  ) {
    cmd.push("--no-revoke");
  }
  runGGShieldCommand(configuration, cmd);
  await updateAuthenticationStatus(context, configuration);
}
