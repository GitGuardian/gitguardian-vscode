import { exec } from "child_process";
import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { Binary, getBinaryAbsolutePath } from "./ggshield-resolver-utils";
import {
  getSettingsConfiguration,
  GGShieldConfiguration,
} from "./ggshield-configuration";
import * as fs from "fs";

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
      exec(
        `${this.configuration.ggshieldPath} auth login --method=web`,
        (error, stdout, stderr) => {
          if (error) {
            this.channel.appendLine(`GGShield login failed: ${stderr}`);
            reject();
          } else {
            this.channel.appendLine(`GGShield login successful: ${stdout}`);
            console.log(`ggshield is logged in: ${stdout}`);
            resolve();
          }
        }
      );
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

  async isGGShieldInstalled(
    ggshieldPath: string | undefined
  ): Promise<boolean> {
    if (!ggshieldPath) {
      ggshieldPath = "ggshield";
    }
    return new Promise((resolve) => {
      exec(`${ggshieldPath} --version`, (error, stdout, stderr) => {
        if (error) {
          this.channel.appendLine(`ggshield is not installed: ${stderr}`);
          console.log(`ggshield is not installed: ${stderr}`);
          resolve(false);
        } else {
          this.channel.appendLine(`ggshield is installed: ${stdout}`);
          console.log(`ggshield is installed: ${stdout}`);
          resolve(true);
        }
      });
    });
  }

  async isGGShieldInstalledGlobally(): Promise<boolean> {
    /**
     * Checks if `ggshield` is installed globally.
     *
     * @returns {Promise<boolean>} A promise that resolves `ggshield` path is determined.
     */

    return new Promise((resolve, reject) => {
      exec(`ggshield --version`, async (error, stdout, stderr) => {
        if (error) {
          this.channel.appendLine(`ggshield is not installed globally.`);
          console.log(`ggshield is not installed globally: ${stderr}`);
          resolve(false);
        } else {
          this.channel.appendLine(`ggshield is installed globally: ${stdout}`);
          console.log(`ggshield is installed globally: ${stdout}`);
          resolve(true);
        }
      });
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
      exec("git --version", (error, stdout, stderr) => {
        if (error) {
          this.channel.appendLine(
            `GGShield requires git to scan files: ${stderr}`
          );
          console.log(`git is not installed: ${stderr}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
}
