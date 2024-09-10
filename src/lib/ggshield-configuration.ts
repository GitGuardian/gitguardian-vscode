import { getBinaryAbsolutePath } from "./ggshield-resolver-utils";
import { ExtensionContext, workspace } from "vscode";
import * as os from "os";

const apiUrlDefault = "https://api.gitguardian.com/";

export class GGShieldConfiguration {
  ggshieldPath: string;
  apiUrl: string;

  constructor(ggshieldPath: string = "", apiUrl: string = "") {
    this.ggshieldPath = ggshieldPath;
    this.apiUrl = apiUrl;
  }
}

/**
 * Retrieve configuration from settings
 *
 * TODO: Check with Mathieu if this behaviour is expected
 * @returns {GGShieldConfiguration} from the extension settings
 */
export function getSettingsConfiguration(): GGShieldConfiguration | undefined {
  const config = workspace.getConfiguration("gitguardian");

  const ggshieldPath: string | undefined = config.get("GGShieldPath");
  const apiUrl: string | undefined = config.get("apiUrl");

  if (!ggshieldPath) {
    return undefined;
  }
  return new GGShieldConfiguration(
    ggshieldPath,
    apiUrl ? apiUrl : apiUrlDefault
  );
}

export function createDefaultConfiguration(
  context: ExtensionContext
): GGShieldConfiguration {
  return new GGShieldConfiguration(
    getBinaryAbsolutePath(os.platform(), os.arch(), context),
    "https://api.gitguardian.com/"
  );
}
