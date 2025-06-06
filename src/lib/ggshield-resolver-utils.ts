import * as path from "path";
import * as fs from "fs";
import * as tar from "tar";
import axios, { AxiosRequestConfig } from "axios";
import { Agent } from "https";

const AdmZip = require("adm-zip");
import { ExtensionContext, OutputChannel } from "vscode";

const defaultRequestConfig = {
  headers: { "User-Agent": "GitGuardian-VSCode-Extension" },
  timeout: 30_000,
} satisfies AxiosRequestConfig;

/**
 * Get the version of GGShield
 * @param context The extension context
 * @returns The version of GGShield
 */
export function getGGShieldVersion(context: ExtensionContext): string {
  return fs
    .readFileSync(path.join(context.extensionPath, "ggshield_version"), "utf8")
    .trim();
}

/**
 * Get the absolute path to GGShield binary. If it doesn't exist, it will be installed.
 * @param platform The platform of the user
 * @param arch The architecture of the user
 * @param context The extension context
 * @param outputChannel The output channel to use
 * @returns The absolute path to the GGShield binary
 */
export async function getGGShield(
  platform: NodeJS.Platform,
  arch: string,
  context: ExtensionContext,
  outputChannel: OutputChannel,
  allowSelfSigned: boolean,
): Promise<string> {
  const version = getGGShieldVersion(context);
  console.log(`Latest GGShield version: ${version}`);
  const ggshieldFolder: string = path.join(
    context.extensionPath,
    "ggshield-internal",
  );
  const ggshieldBinaryPath: string = computeGGShieldPath(
    platform,
    arch,
    ggshieldFolder,
    version,
  );

  // if exists, return the path
  if (fs.existsSync(ggshieldBinaryPath)) {
    outputChannel.appendLine(
      `Using GGShield v${version}. Checkout https://github.com/GitGuardian/ggshield for more info.`,
    );
    console.log(`GGShield already exists at ${ggshieldBinaryPath}`);
    return ggshieldBinaryPath;
  }
  // empty ggshield folder if exists, and then re-create it
  if (fs.existsSync(ggshieldFolder)) {
    fs.rmSync(ggshieldFolder, { recursive: true });
  }
  fs.mkdirSync(ggshieldFolder);
  // install GGShield
  await installGGShield(
    platform,
    arch,
    ggshieldFolder,
    version,
    allowSelfSigned,
  );
  outputChannel.appendLine(
    `Updated to GGShield v${version}. Checkout https://github.com/GitGuardian/ggshield for more info.`,
  );
  console.log(`GGShield binary installed at ${ggshieldBinaryPath}`);
  return ggshieldBinaryPath;
}

/**
 * Compute the folder name of the GGShield binary
 * @param platform The platform of the user
 * @param arch The architecture of the user
 * @param version The version of GGShield
 * @returns The folder name of the GGShield binary
 */
export function computeGGShieldFolderName(
  platform: NodeJS.Platform,
  arch: string,
  version: string,
): string {
  let archString: string = "";
  let platformString: string = "";
  switch (arch) {
    case "x64":
    case "x86":
      archString = "x86_64";
      break;
    case "arm64":
      archString = "arm64";
      // win32 + arm64 -> rely on x86_64 emulation on ARM
      if (platform === "win32") {
        archString = "x86_64";
      }
      break;
    default:
      console.log(`Unsupported architecture: ${arch}`);
      throw new Error(`Unsupported architecture: ${arch}`);
  }
  switch (platform) {
    case "win32":
      platformString = "pc-windows-msvc";
      break;
    case "linux":
      platformString = "unknown-linux-gnu";
      break;
    case "darwin":
      platformString = "apple-darwin";
      break;
    default:
      console.log(`Unsupported platform - ${platform}`);
      throw new Error(`Unsupported platform: ${platform}`);
  }
  return `ggshield-${version}-${archString}-${platformString}`;
}

/**
 * Install GGShield: download the executable archive from GitHub and extract it
 * @param platform The platform of the user
 * @param arch The architecture of the user
 * @param ggshieldFolder The folder of the GGShield binary
 * @param version The version of GGShield
 */
export async function installGGShield(
  platform: NodeJS.Platform,
  arch: string,
  ggshieldFolder: string,
  version: string,
  allowSelfSigned: boolean,
): Promise<void> {
  let extension: string = "";
  switch (platform) {
    case "win32":
      extension = "zip";
      break;
    case "linux":
    case "darwin":
      extension = "tar.gz";
      break;
    default:
      console.log(`Unsupported platform: ${platform}`);
      throw new Error(`Unsupported platform: ${platform}`);
  }
  const fileName: string = `${computeGGShieldFolderName(
    platform,
    arch,
    version,
  )}.${extension}`;
  const downloadUrl: string = `https://github.com/GitGuardian/ggshield/releases/download/v${version}/${fileName}`;
  await downloadGGShieldFromGitHub(
    fileName,
    downloadUrl,
    ggshieldFolder,
    allowSelfSigned,
  );
  extractGGShieldBinary(path.join(ggshieldFolder, fileName), ggshieldFolder);
}

/**
 * Extract the GGShield binary
 * @param filePath The path to the GGShield binary
 * @param ggshieldFolder The folder of the GGShield binary
 */
export function extractGGShieldBinary(
  filePath: string,
  ggshieldFolder: string,
): void {
  if (filePath.endsWith(".tar.gz")) {
    tar.x({
      file: filePath,
      cwd: ggshieldFolder,
      sync: true,
    });
  } else if (filePath.endsWith(".zip")) {
    const zip = new AdmZip(filePath);
    zip.extractAllTo(ggshieldFolder, true);
  } else {
    throw new Error(`Unsupported file extension: ${path.extname(filePath)}`);
  }
}

/**
 * Download the GGShield binary from GitHub
 * @param fileName The name of the GGShield binary
 * @param downloadUrl The URL of the GGShield binary
 * @param ggshieldFolder The folder of the GGShield binary
 */
async function downloadGGShieldFromGitHub(
  fileName: string,
  downloadUrl: string,
  ggshieldFolder: string,
  allowSelfSigned: boolean,
): Promise<void> {
  console.log(`Downloading GGShield from ${downloadUrl}`);

  const instance = allowSelfSigned
    ? new Agent({
        rejectUnauthorized: false,
      })
    : undefined;

  const { data } = await axios.get(downloadUrl, {
    ...defaultRequestConfig,
    responseType: "arraybuffer",
    httpsAgent: instance,
  });

  fs.writeFileSync(path.join(ggshieldFolder, fileName), data);
  console.log(
    `GGShield archive downloaded to ${path.join(ggshieldFolder, fileName)}`,
  );
}

/**
 * Compute the path to the GGShield binary
 * @param platform The platform of the user
 * @param arch The architecture of the user
 * @param ggshieldFolder The folder of the GGShield binary
 * @param version The version of GGShield
 */
export function computeGGShieldPath(
  platform: NodeJS.Platform,
  arch: string,
  ggshieldFolder: string,
  version: string,
): string {
  console.log(`Platform: ${platform}; Arch: ${arch}`);
  let executable: string = "";
  switch (platform) {
    case "win32":
      executable = "ggshield.exe";
      break;
    case "linux":
    case "darwin":
      executable = "ggshield";
      break;
    default:
      console.log(`Unsupported platform: ${platform}`);
      throw new Error(`Unsupported platform: ${platform}`);
  }
  return path.join(
    ggshieldFolder,
    computeGGShieldFolderName(platform, arch, version),
    executable,
  );
}
