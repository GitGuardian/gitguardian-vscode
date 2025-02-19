import * as simple from "simple-mock";
import assert = require("assert");
import { ExtensionContext, workspace, window } from "vscode";
import { getConfiguration } from "../../../lib/ggshield-configuration-utils";
import * as ggshieldResolverUtils from "../../../lib/ggshield-resolver-utils";

suite("getConfiguration", () => {
  let getConfigurationMock: simple.Stub<Function>;
  let getGGShieldAbsolutePathMock: simple.Stub<
    (
      platform: NodeJS.Platform,
      arch: string,
      context: ExtensionContext
    ) => string
  >;

  setup(() => {
    // Mock workspace.getConfiguration
    getConfigurationMock = simple.mock(workspace, "getConfiguration");
    // Mock getGGShieldAbsolutePath
    getGGShieldAbsolutePathMock = simple
      .mock(ggshieldResolverUtils, "getGGShieldAbsolutePath")
      .returnWith(() => "/mock/path/to/ggshield");
  });

  teardown(() => {
    simple.restore();
  });

  test("Vscode settings are correctly read", () => {
    const context = {} as ExtensionContext;
    const outputChannel = window.createOutputChannel("GitGuardian");
    simple.mock(context, "asAbsolutePath").returnWith("");

    getConfigurationMock.returnWith({
      get: (key: string) => {
        if (key === "apiUrl") {
          return "https://custom-url.com";
        }
        if (key === "allowSelfSigned") {
          return true;
        }
      },
    });
    const configuration = getConfiguration(context, outputChannel);

    // Assert both workspace.getConfiguration and GGShieldConfiguration constructor were called
    assert(
      getConfigurationMock.called,
      "getConfiguration should be called once"
    );

    // Assert that the configuration has the expected values
    assert.strictEqual(configuration.apiUrl, "https://custom-url.com");
    assert.strictEqual(configuration.allowSelfSigned, true);
  });
});
