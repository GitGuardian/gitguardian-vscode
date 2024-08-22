import { exec } from "child_process";
import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { Binary, getBinaryAbsolutePath } from "./ggshield-resolver-utils";
import { getGGShieldConfiguration } from "./ggshield-configuration";
import * as fs from "fs";

export class GGShieldResolver {
  constructor(
    private channel: vscode.OutputChannel,
    private context: vscode.ExtensionContext,
    public ggshieldPath?: string
  ) {}

  async loginGGShield(): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(`${this.ggshieldPath} auth login`, (error, stdout, stderr) => {
        if (error) {
          this.channel.appendLine(`GGShield login failed: ${stderr}`);
          reject();
        } else {
          this.channel.appendLine(`GGShield login successful: ${stdout}`);
          console.log(`ggshield is logged in: ${stdout}`);
          resolve();
        }
      });
    });
  }

  async checkAndInstallGGShield(): Promise<void> {
    const configuration = getGGShieldConfiguration();
    // Check if ggshield is installed globally
    var isInstalled = await this.isGGShieldInstalled(undefined);

    // Check if a path has been specified
    if (!isInstalled) {
      isInstalled = await this.isGGShieldInstalled(configuration?.ggshieldPath);
    }

    // Use standalone
    if (!isInstalled) {
      await this.useInternalGGShield();
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

  private async useInternalGGShield(): Promise<void> {
    this.channel.appendLine("Fetching ggshield binary...");
    try {
      // Get platform and architecture
      const platform = os.platform();
      const arch = os.arch();
      let binary: Binary = getBinaryAbsolutePath(platform, arch);

      this.ggshieldPath = path.join(
        this.context.asAbsolutePath(""),
        "ggshield-internal",
        binary.binary,
        binary.executable
      );
      const pathExists = fs.existsSync(this.ggshieldPath);
      if (!pathExists) {
        this.channel.appendLine(
          `ggshield binary not found: this architecture is not supported ${this.ggshieldPath}`
        );
        throw new Error(`architecture is not supported`);
      }

      this.channel.appendLine(`ggshield executable: ${this.ggshieldPath}`);
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
