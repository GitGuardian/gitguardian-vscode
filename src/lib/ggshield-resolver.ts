import * as vscode from "vscode";
import {
  GGShieldConfiguration,
} from "./ggshield-configuration";
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
   *  2. Checks if a custom path is configured in the settings and uses it.
   *  3. Else, falls back to using the standalone version bundled with the extension.
   *
   * @returns {Promise<void>} A promise that resolves once the `ggshield` path is determined.
   */
  async checkGGShieldConfiguration(): Promise<void> {
    try {
      await this.testConfiguration(this.configuration);
      this.channel.appendLine(
        `Using ggshield at: ${this.configuration.ggshieldPath}, to change this go to settings.`
      );
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.channel.appendLine(
        `${errorMessage}`
      );
      window.showErrorMessage(
        `${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Tries the configuration from settings.
   *
   * @returns {Promise<void>} A promise that resolves if the configuration is valid.
   */
  async testConfiguration(
    configuration: GGShieldConfiguration
  ): Promise<void> {
    let proc = runGGShieldCommand(configuration, ["quota"]);
    if (proc.error || proc.stderr.length > 0) {
      if (proc.error) { 
        if (proc.error.message.includes("ENOENT")) {
          throw new Error(
            `GGShield path provided in settings is invalid: ${configuration.ggshieldPath}.`
          );
        } else {
          throw new Error(proc.error.message);
        }
      } else if (proc.stderr.includes("Invalid API key")) {
        throw new Error(
          `API key provided in settings is invalid.`
        );
      }
    } else {
      this.configuration = configuration;
      return;
    }
  }
}
