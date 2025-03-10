import * as vscode from "vscode";
import { GGShieldConfiguration } from "./ggshield-configuration";
import { runGGShieldCommand } from "./run-ggshield";
import { window } from "vscode";

export class GGShieldResolver {
  channel: vscode.OutputChannel;
  context: vscode.ExtensionContext;
  configuration: GGShieldConfiguration;

  constructor(
    channel: vscode.OutputChannel,
    context: vscode.ExtensionContext,
    configuration: GGShieldConfiguration
  ) {
    this.channel = channel;
    this.context = context;
    this.configuration = configuration;
  }

  /**
   * Ensures the availability of ggshield by determining the executable path.
   *
   * The function performs the following checks in order:
   *  1. Checks if a custom path is configured in the settings and uses it.
   *  2. Else, falls back to using the standalone version bundled with the extension.
   *
   * @returns {void} A promise that resolves once the `ggshield` path is determined.
   */
  checkGGShieldConfiguration(): void {
    try {
      this.testConfiguration(this.configuration);
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.channel.appendLine(`${errorMessage}`);
      window.showErrorMessage(`${errorMessage}`);
      throw error;
    }
  }

  /**
   * Tries the configuration from settings.
   *
   * @returns {void} A promise that resolves if the configuration is valid.
   */
  testConfiguration(configuration: GGShieldConfiguration): void {
    // Check if the ggshield path is valid
    let proc = runGGShieldCommand(configuration, ["--version"]);
    if (proc.status !== 0) {
      window.showErrorMessage(
        `GitGuardian: Invalid ggshield path. ${proc.stderr}`
      );
      throw new Error(proc.stderr);
    }
  }
}
