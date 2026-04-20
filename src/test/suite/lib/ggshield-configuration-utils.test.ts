import * as sinon from "sinon";
import assert from "assert";
import { ExtensionContext, workspace, window } from "vscode";
import { getConfiguration } from "../../../lib/ggshield-configuration-utils";
import * as resolverUtils from "../../../lib/ggshield-resolver-utils";

suite("getConfiguration", () => {
  let getConfigurationMock: sinon.SinonStub;

  setup(() => {
    getConfigurationMock = sinon.stub(workspace, "getConfiguration");
    sinon.stub(resolverUtils, "getGGShield").returns("/fake/ggshield");
  });

  teardown(() => {
    sinon.restore();
  });

  /**
   * Helper class to fake different configurations of the extension
   */
  class FakeConfiguration {
    records: Record<string, unknown>;

    constructor(records: Record<string, unknown>) {
      this.records = records;
    }

    public get(section: string, defaultValue: unknown): unknown {
      if (this.records.hasOwnProperty(section)) {
        return this.records[section];
      }
      return defaultValue;
    }
  }

  test("Vscode settings are correctly read", () => {
    const context = {} as ExtensionContext;
    const outputChannel = window.createOutputChannel("GitGuardian");

    getConfigurationMock.returns(
      new FakeConfiguration({
        apiUrl: "https://custom-url.com",
        insecure: true,
      } as Record<string, unknown>),
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

    getConfigurationMock.returns(
      new FakeConfiguration({
        allowSelfSigned: true,
      } as Record<string, unknown>),
    );
    const configuration = getConfiguration(context, outputChannel);

    // Assert that the configuration has the expected values
    assert.strictEqual(configuration.insecure, true);
  });
});
