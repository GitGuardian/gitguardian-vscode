import * as simple from "simple-mock";
import assert = require("assert");
import * as fs from "fs";
import { ExtensionContext, workspace, window } from "vscode";
import { getConfiguration } from "../../../lib/ggshield-configuration-utils";
import * as ggshieldResolverUtils from "../../../lib/ggshield-resolver-utils";

suite("getConfiguration", () => {
  let getConfigurationMock: simple.Stub<Function>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getGGShieldMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let existsSyncMock: any;

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

  test("uses custom ggshieldPath when set", () => {
    const context = {} as ExtensionContext;
    const outputChannel = window.createOutputChannel("GitGuardian");
    simple.mock(context, "asAbsolutePath").returnWith("");

    getConfigurationMock.returnWith(
      new FakeConfiguration({
        ggshieldPath: "/custom/path/to/ggshield",
      } as Record<string, any>),
    );
    existsSyncMock = simple.mock(fs, "existsSync").returnWith(true);

    const configuration = getConfiguration(context, outputChannel);

    assert.strictEqual(configuration.ggshieldPath, "/custom/path/to/ggshield");
    assert(
      !getGGShieldMock.called,
      "getGGShield should not be called when custom path is set",
    );
  });

  test("throws when custom ggshieldPath does not exist", () => {
    const context = {} as ExtensionContext;
    const outputChannel = window.createOutputChannel("GitGuardian");
    simple.mock(context, "asAbsolutePath").returnWith("");

    getConfigurationMock.returnWith(
      new FakeConfiguration({
        ggshieldPath: "/nonexistent/path/to/ggshield",
      } as Record<string, any>),
    );
    existsSyncMock = simple.mock(fs, "existsSync").returnWith(false);

    assert.throws(() => {
      getConfiguration(context, outputChannel);
    }, /Custom ggshield path does not exist/);
  });

  test("falls back to bundled binary when no custom path", () => {
    const context = {} as ExtensionContext;
    const outputChannel = window.createOutputChannel("GitGuardian");
    simple.mock(context, "asAbsolutePath").returnWith("");

    getConfigurationMock.returnWith(
      new FakeConfiguration({} as Record<string, any>),
    );
    const configuration = getConfiguration(context, outputChannel);

    assert(
      getGGShieldMock.called,
      "getGGShield should be called when no custom path is set",
    );
  });
});
