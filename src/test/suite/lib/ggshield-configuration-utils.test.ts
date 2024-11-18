import * as simple from "simple-mock";
import assert = require("assert");
import { ExtensionContext, workspace } from "vscode";
import { getConfiguration } from "../../../lib/ggshield-configuration-utils";

suite("getConfiguration", () => {
  let getConfigurationMock: simple.Stub<Function>;

  setup(() => {
    // Mock workspace.getConfiguration
    getConfigurationMock = simple.mock(workspace, "getConfiguration");
  });

  teardown(() => {
    simple.restore();
  });

  test("Vscode settings are correctly read", () => {
    const context = {} as ExtensionContext;
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
    const configuration = getConfiguration(context);

    // Assert both workspace.getConfiguration  and GGShieldConfiguration constructor were called
    assert(
      getConfigurationMock.called,
      "getConfiguration should be called once"
    );

    // Assert that the configuration has the expected values
    assert.strictEqual(configuration.apiUrl, "https://custom-url.com");
    assert.strictEqual(configuration.allowSelfSigned, true);
  });
});
