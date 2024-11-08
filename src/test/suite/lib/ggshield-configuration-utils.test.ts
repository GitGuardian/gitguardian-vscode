import * as simple from "simple-mock";
import assert = require("assert");
import { ExtensionContext, workspace } from "vscode";
import * as GGShieldConfiguration from "../../../lib/ggshield-configuration";
import { getConfiguration } from "../../../lib/ggshield-configuration-utils";

suite("getConfiguration", () => {
  let getConfigurationMock: simple.Stub<Function>;
  let constructorMock: simple.Stub<Function>;
  let context: Partial<ExtensionContext>;

  setup(() => {
    // Mock workspace.getConfiguration
    getConfigurationMock = simple.mock(workspace, "getConfiguration");

    // Mock the GGShieldConfiguration constructor globally
    constructorMock = simple.mock(
      GGShieldConfiguration,
      "GGShieldConfiguration"
    );
    context = {} as ExtensionContext;
  });

  teardown(() => {
    simple.restore();
  });

  test("Vscode settings are correctly read", async () => {
    getConfigurationMock.returnWith({
      get: (key: string) => {
        if (key === "GGShieldPath") {
          return "path/to/ggshield";
        }
        if (key === "apiUrl") {
          return "https://custom-url.com";
        }
        if (key === "apiKey") {
          return "test-api-key";
        }
        if (key === "allowSelfSigned") {
          return true;
        }
      },
    });
    constructorMock.returnWith({});

    getConfiguration(context as ExtensionContext);

    // Assert both workspace.getConfiguration  and GGShieldConfiguration constructor were called
    assert(
      getConfigurationMock.called,
      "getConfiguration should be called once"
    );
    assert(
      constructorMock.called,
      "GGShieldConfiguration constructor should be called once"
    );

    // Check the arguments passed to GGShieldConfiguration constructor
    const ggshieldConfigurationArgs = constructorMock.lastCall.args;
    assert.strictEqual(ggshieldConfigurationArgs[0], "path/to/ggshield");
    assert.strictEqual(ggshieldConfigurationArgs[1], "https://custom-url.com");
    assert.strictEqual(ggshieldConfigurationArgs[2], "test-api-key");
    assert.strictEqual(ggshieldConfigurationArgs[3], true);
  });
});
