import { exec } from "child_process";
import * as vscode from "vscode";
import { createReadStream, createWriteStream, unlinkSync } from "fs";
import * as path from "path";
import * as os from "os";
import * as unzipper from "unzipper"; // For extracting zip files
import * as tar from "tar"; // For extracting tar.gz files
import { Binary, getBinaryDownloadUrl } from "./ggshield-resolver-utils";
import { https } from "follow-redirects";
import { getGGShieldConfiguration } from "./ggshield-configuration";

export class GGShieldResolver {
  constructor(
    private channel: vscode.OutputChannel,
    private context: vscode.ExtensionContext,
    public ggshieldPath?: string
  ) {}

  async loginGGShield(): Promise<void> {
    return new Promise((resolve) => {
      exec(`${this.ggshieldPath} auth login`, (error, stdout, stderr) => {
        if (error) {
          this.channel.appendLine(`GGshield login failed: ${stderr}`);
          console.log(`ggshield is not logged in: ${stderr}`);
          resolve();
        } else {
          this.channel.appendLine(`GGshield login successful: ${stdout}`);
          console.log(`ggshield is logged in: ${stdout}`);
          resolve();
        }
      });
    });
  }

  async checkAndInstallGGShield(): Promise<void> {
    const configuration = getGGShieldConfiguration();
    const isInstalled = await this.isGGShieldInstalled(
      configuration?.ggshieldPath
    );
    if (!isInstalled) {
      await this.installGGShield();
    }
  }

  private isGGShieldInstalled(
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

  private async installGGShield(): Promise<void> {
    this.channel.appendLine("Installing ggshield...");
    try {
      const platform = os.platform();
      const arch = os.arch();
      let binary: Binary = getBinaryDownloadUrl(platform, arch);

      const downloadPath = path.join(os.tmpdir(), binary.fileName);
      this.channel.appendLine(
        `Downloading ggshield from '${binary.downloadUrl}' to '${downloadPath}'.`
      );
      await this.downloadFile(binary.downloadUrl, downloadPath);

      if (platform === "win32") {
        const extractdest = this.context.asAbsolutePath("");
        this.channel.appendLine(
          `Extracting tar.gz from '${downloadPath}' to '${extractdest}'.`
        );
        await this.extractZip(downloadPath, this.context.asAbsolutePath(""));
        console.log("zip extracted");
        this.ggshieldPath = path.join(
          extractdest,
          binary.fileName,
          "ggshield.exe"
        );
        this.channel.appendLine(
          `ggshield.exe is installed successfully: ${this.ggshieldPath}`
        );
        exec(`${this.ggshieldPath} --version`, (error, stdout, stderr) => {
          if (error) {
            this.channel.appendLine(
              `Failed to install ggshield1: ${error.message}`
            );
          }
          if (stderr) {
            this.channel.appendLine(`Failed to install ggshield2: ${stderr}`);
          } else {
            this.channel.appendLine(
              `ggshield is installed successfully3: ${stdout}`
            );
          }
        });
      } else if (platform === "darwin") {
        exec(`open ${downloadPath}`, (error, stdout, stderr) => {
          if (error) {
            this.channel.appendLine(
              `Failed to install ggshield: ${error.message}`
            );
          }
          if (stderr) {
            this.channel.appendLine(`Failed to install ggshield: ${stderr}`);
          } else {
            this.channel.appendLine(
              `ggshield is installed successfully: ${stdout}`
            );
          }
        });
      } else if (platform === "linux") {
        // Extract tar.gz
        const extractdest = this.context.asAbsolutePath("");
        this.channel.appendLine(
          `Extracting tar.gz from '${downloadPath}' to '${extractdest}'.`
        );
        await this.extractTarGz(downloadPath, extractdest);

        this.ggshieldPath = path.join(extractdest, "ggshield");

        exec(`${this.ggshieldPath} --version`, (error, stdout, stderr) => {
          if (error) {
            this.channel.appendLine(
              `Failed to install ggshield: ${error.message}`
            );
          }
          if (stderr) {
            this.channel.appendLine(`Failed to install ggshield: ${stderr}`);
          } else {
            this.channel.appendLine(
              `ggshield is installed successfully: ${stdout}`
            );
          }
        });
      }

      unlinkSync(downloadPath); // Clean up the downloaded file
    } catch (error) {
      this.channel.appendLine(`Failed to install ggshield: ${error}`);
      throw error;
    }
  }

  private downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(dest);
      https
        .get(url, (response: any) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(`Failed to get '${url}' (${response.statusCode})`)
            );
            return;
          }
          response.pipe(file);
          file.on("finish", () => {
            file.close((err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });
        })
        .on("error", (err: any) => {
          unlinkSync(dest); // Delete the file async
          reject(err);
        });
    });
  }
  private extractZip(zipPath: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: destPath }))
        .on("close", resolve)
        .on("error", reject);
    });
  }

  private async extractTarGz(
    tarGzPath: string,
    destPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      tar
        .x({
          file: tarGzPath,
          cwd: destPath,
          strip: 1,
          onentry: (entry) => {
            console.log(`Extracting ${entry.path}`);
          },
        })
        .then(() => {
          console.log(`Extraction complete. Files extracted to ${destPath}`);
          resolve();
        })
        .catch((err) => {
          console.error(`Extraction failed: ${err.message}`);
          reject(err);
        });
    });
  }
}
