import { workspace } from "vscode";

export class GGShieldConfiguration {
  // Implement the properties and methods defined in the GGShieldConfiguration interface
  ggshieldPath: string;
  apiKey: string;
  apiUrl: string;

  constructor(
    ggshieldPath: string = "",
    apiKey: string = "",
    apiUrl: string = ""
  ) {
    this.ggshieldPath = ggshieldPath;
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }
}

/**
 * Retrieve configuration from settings
 *
 * @returns ggshield configuration or undefined if at least one setting is empty
 */
export function getSettingsConfiguration(): GGShieldConfiguration | undefined {
  let config = workspace.getConfiguration("ggshield");

  let ggshieldPath: string | undefined = config.get("ggshieldPath");
  let apiUrl: string | undefined = config.get("apiUrl");
  let apiKey: string | undefined = config.get("apiKey")!;

  return new GGShieldConfiguration(ggshieldPath, apiKey, apiUrl);
}

export function config(
  globalConfig: GGShieldConfiguration
): GGShieldConfiguration {
  let settingsConf = getSettingsConfiguration();

  // If any conf settings has been set explicitly in settings, use it

  if (settingsConf?.ggshieldPath !== undefined) {
    globalConfig!.ggshieldPath = globalConfig.ggshieldPath;
  }
  if (settingsConf?.apiUrl !== undefined) {
    globalConfig!.apiUrl = globalConfig.apiUrl;
  }
  if (settingsConf?.apiKey !== undefined) {
    globalConfig!.apiKey = globalConfig.apiKey;
  }
  return globalConfig;
}
