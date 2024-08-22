import { exec, spawnSync } from "child_process";
import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { Binary, getBinaryAbsolutePath } from "./ggshield-resolver-utils";
import {
  getSettingsConfiguration,
  GGShieldConfiguration,
} from "./ggshield-configuration";
import * as fs from "fs";
import { runGGShieldCommand } from "./ggshield-api";
import { error } from "console";

export class GGShieldResolver {
  constructor(
    private channel: vscode.OutputChannel,
    private context: vscode.ExtensionContext,
    public configuration: GGShieldConfiguration
  ) {
    let settingsConf = getSettingsConfiguration();

    // If any conf settings has been set explicitly in settings, use it
    this.configuration.apiKey =
      settingsConf?.apiKey ?? this.configuration.apiKey;
    this.configuration.apiUrl =
      settingsConf?.apiUrl ?? this.configuration.apiUrl;
    this.configuration.ggshieldPath =
      settingsConf?.ggshieldPath ?? this.configuration.ggshieldPath;
  }

  async loginGGShield(): Promise<void> {
    return new Promise((resolve, reject) => {
      let proc = runGGShieldCommand(this.configuration, [
        "auth",
        "login",
        "--method=web",
      ]);
      if (proc.error || proc.stderr.length > 0) {
        this.channel.appendLine(`GGShield login failed: ${proc.stderr}`);
        reject();
      } else {
        this.channel.appendLine(`GGShield login successful: ${proc.stdout}`);
        console.log(`ggshield is logged in: ${proc.stdout}`);
        resolve();
      }
    });
  }

  async getGGShieldPath(): Promise<void> {
    /**
     * Ensures the availability of ggshield by determining the executable path.
     *
     * The function performs the following checks in order:
     *  1. Checks if `ggshield` is installed globally and, if so, uses its path.
     *  2. If not installed globally, checks if a custom path is configured in the settings and uses it.
     *  3. Else, falls back to using the standalone version bundled with the extension.
     *
     * @returns {Promise<void>} A promise that resolves once the `ggshield` path is determined.
     */

    let isIntalledGlobally = await this.isGGShieldInstalledGlobally();
    if (isIntalledGlobally) {
      this.configuration.ggshieldPath = await this.getGGShieldGlobalPath();
      this.channel.appendLine(
        `ggshield is installed globally. ${this.configuration.ggshieldPath}`
      );
    } else {
      let isConfigSpecified = await this.isGGShieldInstalled(
        this.configuration.ggshieldPath
      );
      if (isConfigSpecified) {
        this.channel.appendLine(
          `Using ggshield at: ${this.configuration.ggshieldPath}, to change this go to settings.`
        );
      } else {
        try {
          this.useInternalGGShield();
          this.channel.appendLine(
            `Using standalone ggshield at: ${this.configuration.ggshieldPath}`
          );
        } catch (error) {
          this.channel.appendLine(
            `Failed to find standalone ggshield: ${error}. 
            You can try installing ggshield manually.`
          );
        }
      }
    }
  }

  async isGGShieldInstalled(ggshieldPath: string): Promise<boolean> {
    /**
     * Tries to determine if `ggshield` is installed by checking if a specified path.
     *
     * @returns {Promise<boolean>} A promise that resolves if `ggshield` is installed.
     */

    let configuration = new GGShieldConfiguration(
      (ggshieldPath = ggshieldPath)
    );
    return new Promise((resolve) => {
      let proc = runGGShieldCommand(configuration, ["--version"]);
      if (proc.error || proc.stderr.length > 0) {
        this.channel.appendLine(`ggshield is not installed: ${proc.stderr}`);
        console.log(`ggshield is not installed: ${proc.stderr}`);
        resolve(false);
      } else {
        this.channel.appendLine(`ggshield is installed: ${proc.stdout}`);
        console.log(`ggshield is installed: ${proc.stdout}`);
        resolve(true);
      }
    });
  }

  async isGGShieldInstalledGlobally(): Promise<boolean> {
    /**
     * Checks if `ggshield` is installed globally.
     *
     * @returns {Promise<boolean>} A promise that resolves `ggshield` path is determined.
     */

    return new Promise((resolve) => {
      let proc = runGGShieldCommand(this.configuration, ["--version"]);
      if (proc.error || proc.stderr.length > 0) {
        this.channel.appendLine(
          `ggshield is not installed globally: ${proc.stderr}`
        );
        console.log(`ggshield is not installed globally: ${proc.stderr}`);
        resolve(false);
      } else {
        this.channel.appendLine(
          `ggshield is installed globally: ${proc.stdout}`
        );
        console.log(`ggshield is installed globally: ${proc.stdout}`);
        resolve(true);
      }
    });
  }

  private getGGShieldGlobalPath(): Promise<string> {
    let command =
      process.platform === "win32" ? "where ggshield" : "which ggshield";

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.log(`Error while executing ${command}: ${stderr}`);
          reject(`Error while executing ${command}: ${stderr}`);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  private async useInternalGGShield(): Promise<void> {
    this.channel.appendLine("Fetching ggshield binary...");
    try {
      // Get platform and architecture
      const platform = os.platform();
      const arch = os.arch();
      let binary: Binary = getBinaryAbsolutePath(platform, arch);

      let internalpath = path.join(
        this.context.asAbsolutePath(""),
        "ggshield-internal",
        binary.binary,
        binary.executable
      );
      const pathExists = fs.existsSync(internalpath);

      if (pathExists) {
        this.configuration.ggshieldPath = internalpath;
      } else {
        this.channel.appendLine(
          `ggshield binary not found: this architecture is not supported ${this.configuration.ggshieldPath}`
        );
        throw new Error(`architecture is not supported`);
      }

      this.channel.appendLine(
        `ggshield executable: ${this.configuration.ggshieldPath}`
      );
    } catch (error) {
      this.channel.appendLine(`Failed to install ggshield: ${error}`);
      throw error;
    }
  }

  async isGitInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      let proc = spawnSync("git", ["--version"]);
      if (proc.error || proc.stderr.length > 0) {
        this.channel.appendLine(`GGShield requires git to scan files.`);
        console.log(`git is not installed.`);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  }
}
