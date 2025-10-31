import { ExtensionContext, OutputChannel, workspace } from "vscode";
import * as os from "os";
import { GGShieldConfiguration } from "./ggshield-configuration";
import { getGGShield } from "./ggshield-resolver-utils";

/**
 * Retrieve configuration from settings
 * @returns {GGShieldConfiguration} from the extension settings
 */
export async function getConfiguration(
  context: ExtensionContext,
  outputChannel: OutputChannel,
): Promise<GGShieldConfiguration> {
  const config = workspace.getConfiguration("gitguardian");

  const apiUrl: string | undefined = config.get("apiUrl");
  const insecure: boolean = config.get(
    "insecure",
    // Read allowSelfSigned for backward compatibility
    config.get("allowSelfSigned", false),
  );

  const pathToGGShield: string = await getGGShield(
    os.platform(),
    os.arch(),
    context,
    outputChannel,
    insecure,
  );

  return new GGShieldConfiguration(pathToGGShield, apiUrl, insecure || false);
}
