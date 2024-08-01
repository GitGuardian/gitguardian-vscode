import { workspace } from "vscode";

export interface GGShieldConfiguration {
  ggshieldPath: string;
  apiKey: string;
  apiUrl: string;
}

/**
 * Retrieve configuration from settings
 *
 * @returns ggshield configuration or undefined if at least one setting is empty
 */
export function getGGShieldConfiguration(
  ggshieldPath?: string
): GGShieldConfiguration | undefined {
  let config = workspace.getConfiguration("ggshield");

  if (!ggshieldPath) {
    ggshieldPath = config.get("ggshieldPath");
  }
  let apiUrl: string = config.get("apiUrl")!;
  let apiKey: string = config.get("apiKey")!;

  if (!ggshieldPath || !apiKey || !apiUrl) {
    // all settings are mandatory for the extension to work
    return undefined;
  }

  return {
    ggshieldPath,
    apiKey,
    apiUrl,
  };
}
