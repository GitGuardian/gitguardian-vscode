import { ExtensionContext, OutputChannel, workspace } from "vscode";
import * as os from "os";
import { GGShieldConfiguration } from "./ggshield-configuration";
import { getGGShieldAbsolutePath } from "./ggshield-resolver-utils";

/**
 * Retrieve configuration from settings
 * @returns {GGShieldConfiguration} from the extension settings
 */
export function getConfiguration(
  context: ExtensionContext,
  outputChannel: OutputChannel
): GGShieldConfiguration {
  const config = workspace.getConfiguration("gitguardian");

  const ggshieldPath: string | undefined = config.get("GGShieldPath");
  const apiUrl: string | undefined = config.get("apiUrl");
  const allowSelfSigned: boolean = config.get("allowSelfSigned", false);

  const ggshieldAbsolutePath: string = getGGShieldAbsolutePath(
    os.platform(),
    os.arch(),
    context,
    outputChannel
  );

  return new GGShieldConfiguration(
    ggshieldAbsolutePath,
    apiUrl,
    allowSelfSigned || false
  );
}
