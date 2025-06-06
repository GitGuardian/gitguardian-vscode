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

  const ggshieldPath: string | undefined = config.get("GGShieldPath");
  const apiUrl: string | undefined = config.get("apiUrl");
  const allowSelfSigned: boolean = config.get("allowSelfSigned", false);

  const pathToGGShield: string = await getGGShield(
    os.platform(),
    os.arch(),
    context,
    outputChannel,
    allowSelfSigned,
  );

  return new GGShieldConfiguration(
    pathToGGShield,
    apiUrl,
    allowSelfSigned || false,
  );
}
