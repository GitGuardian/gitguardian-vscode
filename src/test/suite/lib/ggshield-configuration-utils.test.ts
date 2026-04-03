import * as sinon from "sinon";
import assert from "assert";
import { ExtensionContext, workspace, window } from "vscode";
import { getConfiguration } from "../../../lib/ggshield-configuration-utils";
import * as ggshieldResolverUtils from "../../../lib/ggshield-resolver-utils";

suite("getConfiguration", () => {
  let getConfigurationMock: sinon.SinonStub;
  setup(() => {
    // Mock workspace.getConfiguration
    getConfigurationMock = sinon.stub(workspace, "getConfiguration");
    // Mock getGGShield
    sinon
      .stub(ggshieldResolverUtils, "getGGShield")
      .resolves("/mock/path/to/ggshield");
  });

  teardown(() => {
    sinon.restore();
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

  test("Vscode settings are correctly read", async () => {
    const context = {} as ExtensionContext;
    const outputChannel = window.createOutputChannel("GitGuardian");
    context.asAbsolutePath = sinon.stub().returns("") as any;

    getConfigurationMock.returns(
      new FakeConfiguration({
        apiUrl: "https://custom-url.com",
        insecure: true,
      } as Record<string, any>),
    );
    const configuration = await getConfiguration(context, outputChannel);

    // Assert both workspace.getConfiguration and GGShieldConfiguration constructor were called
    assert(
      getConfigurationMock.called,
      "getConfiguration should be called once",
    );

    // Assert that the configuration has the expected values
    assert.strictEqual(configuration.apiUrl, "https://custom-url.com");
    assert.strictEqual(configuration.insecure, true);
  });
  test("insecure falls back on allowSelfSigned", async () => {
    const context = {} as ExtensionContext;
    const outputChannel = window.createOutputChannel("GitGuardian");
    context.asAbsolutePath = sinon.stub().returns("") as any;

    getConfigurationMock.returns(
      new FakeConfiguration({
        allowSelfSigned: true,
      } as Record<string, any>),
    );
    const configuration = await getConfiguration(context, outputChannel);

    // Assert that the configuration has the expected values
    assert.strictEqual(configuration.insecure, true);
  });
});
