import * as simple from "simple-mock";
import * as childProcess from "child_process";
import * as runGGShield from "../../../lib/run-ggshield";
import assert = require("assert");
import { GGShieldConfiguration } from "../../../lib/ggshield-configuration";

suite("runGGShieldCommand", () => {
  let spawnSyncMock: simple.Stub<Function>;

  setup(() => {
    spawnSyncMock = simple.mock(childProcess, "spawnSync"); // Mock spawnSync
  });

  teardown(() => {
    simple.restore();
  });

  test("Global env variables are set correctly", () => {
    process.env.TEST_GLOBAL_VAR = "GlobalValue";
    runGGShield.runGGShieldCommand(
      {
        ggshieldPath: "path/to/ggshield",
        apiUrl: "",
      } as GGShieldConfiguration,
      [],
    );

    // Assert that spawnSync was called
    assert(spawnSyncMock.called, "spawnSync should be called once");

    // Check the arguments passed to spawnSync
    const spawnSyncArgs = spawnSyncMock.lastCall.args;
    const options = spawnSyncArgs[2];
    assert.strictEqual(options.env.TEST_GLOBAL_VAR, "GlobalValue");

    delete process.env.TEST_GLOBAL_VAR;
  });

  const testCasesInsecure = [
    {
      insecure: true,
      description:
        "GGshield is called with flag --allow-self-signed when insecure is true",
    },
    {
      insecure: false,
      description:
        "GGshield is not called with flag --allow-self-signed when insecure is false",
    },
  ];

  testCasesInsecure.forEach(({ insecure: insecure, description }) => {
    test(description, () => {
      process.env.TEST_GLOBAL_VAR = "GlobalValue";

      runGGShield.runGGShieldCommand(
        {
          ggshieldPath: "path/to/ggshield",
          apiUrl: "",
          insecure: insecure,
        } as GGShieldConfiguration,
        ["test"],
      );

      assert(spawnSyncMock.called, "spawnSync should be called once");

      const spawnSyncArgs = spawnSyncMock.lastCall.args;
      const args = spawnSyncArgs[1];

      assert.strictEqual(args[0] === "--allow-self-signed", insecure);
    });
  });

  test("adds the --instance option when apiUrl is set in the settings", () => {
    runGGShield.runGGShieldCommand(
      {
        ggshieldPath: "path/to/ggshield",
        apiUrl: "https://example.com",
      } as GGShieldConfiguration,
      ["test"],
    );

    assert(spawnSyncMock.called, "spawnSync should be called once");

    assert.deepStrictEqual(spawnSyncMock.lastCall.args[1], [
      "test",
      "--instance",
      "https://example.com",
    ]);
  });

  test("does not add the --instance option when calling ggshield --version", () => {
    runGGShield.runGGShieldCommand(
      {
        ggshieldPath: "path/to/ggshield",
        apiUrl: "https://example.com",
      } as GGShieldConfiguration,
      ["--version"],
    );

    assert(spawnSyncMock.called, "spawnSync should be called once");

    assert.deepStrictEqual(spawnSyncMock.lastCall.args[1], ["--version"]);
  });
});
