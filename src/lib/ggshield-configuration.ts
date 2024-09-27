import { getBinaryAbsolutePath } from "./ggshield-resolver-utils";
import { ConfigurationTarget, ExtensionContext, workspace } from "vscode";
import * as os from "os";

const apiUrlDefault = "https://api.gitguardian.com/";

export class GGShieldConfiguration {
  ggshieldPath: string;
  apiUrl: string;
  apiKey: string;

  constructor(ggshieldPath: string = "", apiUrl: string = "", apiKey: string = "") {
    this.ggshieldPath = ggshieldPath;
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }
}

/**
 * Retrieve configuration from settings
 *
 * TODO: Check with Mathieu if this behaviour is expected
 * @returns {GGShieldConfiguration} from the extension settings
 */
export function getConfiguration(
  context: ExtensionContext
): GGShieldConfiguration {
  const config = workspace.getConfiguration("gitguardian");

  const ggshieldPath: string | undefined = config.get("GGShieldPath");
  const apiUrl: string | undefined = config.get("apiUrl");
  const apiKey: string | undefined = config.get("apiKey");

  return new GGShieldConfiguration(
    ggshieldPath ? ggshieldPath : getBinaryAbsolutePath(os.platform(), os.arch(), context),
    apiUrl ? apiUrl : apiUrlDefault,
    apiKey ? apiKey : ""
  );
}

export function setApiKey(configuration: GGShieldConfiguration, apiKey: string | undefined): void {
  const config = workspace.getConfiguration("gitguardian");
  configuration.apiKey = apiKey ? apiKey : "";
  config.update("apiKey", apiKey, ConfigurationTarget.Global);
}
