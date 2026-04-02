import * as path from "path";
import * as fs from "fs";
import { ExtensionContext, OutputChannel } from "vscode";

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
 * Get the absolute path to the bundled GGShield binary.
 * @param platform The platform of the user
 * @param context The extension context
 * @param outputChannel The output channel to use
 * @returns The absolute path to the GGShield binary
 */
export function getGGShield(
  platform: NodeJS.Platform,
  context: ExtensionContext,
  outputChannel: OutputChannel,
): string {
  const bundledPath = getBundledGGShieldPath(platform, context);

  if (!fs.existsSync(bundledPath)) {
    throw new Error(
      `Bundled ggshield binary not found at ${bundledPath}. ` +
        `This may indicate a corrupted extension installation.`,
    );
  }

  const version = getGGShieldVersion(context);
  outputChannel.appendLine(
    `Using GGShield v${version}. Checkout https://github.com/GitGuardian/ggshield for more info.`,
  );
  return bundledPath;
}

/**
 * Get the path to the bundled GGShield binary
 * @param platform The platform of the user
 * @param context The extension context
 * @returns The absolute path to the bundled binary
 */
export function getBundledGGShieldPath(
  platform: NodeJS.Platform,
  context: ExtensionContext,
): string {
  const executable = platform === "win32" ? "ggshield.exe" : "ggshield";
  return path.join(context.extensionPath, "ggshield-bundled", executable);
}
