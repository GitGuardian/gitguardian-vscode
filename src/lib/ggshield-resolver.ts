import * as vscode from "vscode";
import {
  getConfiguration,
  GGShieldConfiguration,
} from "./ggshield-configuration";
import { runGGShieldCommand } from "./ggshield-api";
import { window } from "vscode";
import * as os from "os";

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
      this.channel.appendLine(
        `Failed to use ggshield version ${this.configuration.ggshieldPath}.`
      );
      window.showErrorMessage(
        `Failed to use ggshield.`
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
    let proc = runGGShieldCommand(configuration, ["--version"]);
    if (proc.error || proc.stderr.length > 0) {
      throw new Error(
        `Configuration provided in settings is invalid: ${proc.error}`
      );
    } else {
      this.configuration = configuration;
      return;
    }
  }

  /**
   * Tries the default bundled version of ggshield.
   *
   * @returns {Promise<void>} A promise that resolves if the configuration is valid.
   */
  private async checkBundledGGShield(): Promise<void> {
    let proc = runGGShieldCommand(this.configuration, ["--version"]);
    if (proc.error || proc.stderr.length > 0) {
      throw new Error(
        `ggshield binary not found, architecture not supported: ${proc.error}`
      );
    } else {
      return;
    }
  }
}
