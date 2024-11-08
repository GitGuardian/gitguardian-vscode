import { getBinaryAbsolutePath } from "./ggshield-resolver-utils";
import { ExtensionContext, workspace } from "vscode";
import * as os from "os";

const apiUrlDefault = "https://dashboard.gitguardian.com/";

export class GGShieldConfiguration {
  ggshieldPath: string;
  apiUrl: string;
  apiKey: string;
  allowSelfSigned: boolean;

  constructor(
    ggshieldPath: string = "",
    apiUrl: string = "",
    apiKey: string = "",
    allowSelfSigned: boolean = false
  ) {
    this.ggshieldPath = ggshieldPath;
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.allowSelfSigned = allowSelfSigned;
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
  const allowSelfSigned: boolean = config.get("allowSelfSigned", false);

  return new GGShieldConfiguration(
    ggshieldPath
      ? ggshieldPath
      : getBinaryAbsolutePath(os.platform(), os.arch(), context),
    apiUrl ? apiUrl : apiUrlDefault,
    apiKey ? apiKey : "",
    allowSelfSigned ? allowSelfSigned : false
  );
}

export function setApiKey(
  configuration: GGShieldConfiguration,
  apiKey: string | undefined
): void {
  configuration.apiKey = apiKey ? apiKey : "";
}
