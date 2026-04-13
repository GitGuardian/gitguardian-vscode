import { ExtensionContext, OutputChannel, workspace } from "vscode";
import * as os from "os";
import { GGShieldConfiguration } from "./ggshield-configuration";
import { getGGShield } from "./ggshield-resolver-utils";

/**
 * Retrieve configuration from settings
 * @returns {GGShieldConfiguration} from the extension settings
 */
export function getConfiguration(
  context: ExtensionContext,
  outputChannel: OutputChannel,
): GGShieldConfiguration {
  const config = workspace.getConfiguration("gitguardian");

  const apiUrl: string | undefined = config.get("apiUrl");
  const insecure: boolean = config.get(
    "insecure",
    // Read allowSelfSigned for backward compatibility
    config.get("allowSelfSigned", false),
  );

  const pathToGGShield = getGGShield(os.platform(), context, outputChannel);

  return new GGShieldConfiguration(pathToGGShield, apiUrl, insecure || false);
}
