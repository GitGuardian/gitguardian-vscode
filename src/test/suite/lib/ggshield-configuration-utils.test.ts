import * as simple from "simple-mock";
import assert = require("assert");
import { ExtensionContext, workspace, window } from "vscode";
import { getConfiguration } from "../../../lib/ggshield-configuration-utils";
import * as ggshieldResolverUtils from "../../../lib/ggshield-resolver-utils";

suite("getConfiguration", () => {
  let getConfigurationMock: simple.Stub<Function>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getGGShieldMock: any;

  setup(() => {
    // Mock workspace.getConfiguration
    getConfigurationMock = simple.mock(workspace, "getConfiguration");
    // Mock getGGShield
    getGGShieldMock = simple
      .mock(ggshieldResolverUtils, "getGGShield")
      .returnWith("/mock/path/to/ggshield");
  });

  teardown(() => {
    simple.restore();
  });

  /**
   * Helper class to fake different configurations of the extension
   */
  class FakeConfiguration {
    records: Record<string, any>;

    constructor(records: Record<string, any>) {
      this.records = records;
    }

    public get(section: string, defaultValue: any): any {
      if (this.records.hasOwnProperty(section)) {
        return this.records[section];
      }
      return defaultValue;
    }
  }

  test("Vscode settings are correctly read", () => {
    const context = {} as ExtensionContext;
    const outputChannel = window.createOutputChannel("GitGuardian");
    simple.mock(context, "asAbsolutePath").returnWith("");

    getConfigurationMock.returnWith(
      new FakeConfiguration({
        apiUrl: "https://custom-url.com",
        insecure: true,
      } as Record<string, any>),
    );
    const configuration = getConfiguration(context, outputChannel);

    // Assert both workspace.getConfiguration and GGShieldConfiguration constructor were called
    assert(
      getConfigurationMock.called,
      "getConfiguration should be called once",
    );

    // Assert that the configuration has the expected values
    assert.strictEqual(configuration.apiUrl, "https://custom-url.com");
    assert.strictEqual(configuration.insecure, true);
  });

  test("insecure falls back on allowSelfSigned", () => {
    const context = {} as ExtensionContext;
    const outputChannel = window.createOutputChannel("GitGuardian");
    simple.mock(context, "asAbsolutePath").returnWith("");

    getConfigurationMock.returnWith(
      new FakeConfiguration({
        allowSelfSigned: true,
      } as Record<string, any>),
    );
    const configuration = getConfiguration(context, outputChannel);

    // Assert that the configuration has the expected values
    assert.strictEqual(configuration.insecure, true);
  });
});
