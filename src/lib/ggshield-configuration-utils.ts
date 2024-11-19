import { getBinaryAbsolutePath } from "./ggshield-resolver-utils";
import { ExtensionContext, workspace } from "vscode";
import * as os from "os";
import { GGShieldConfiguration } from "./ggshield-configuration";

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
  const allowSelfSigned: boolean = config.get("allowSelfSigned", false);
  return new GGShieldConfiguration(
    getBinaryAbsolutePath(os.platform(), os.arch(), context),
    apiUrl,
    allowSelfSigned || false
  );
}
