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

  test("Global env variables are set correctly", async () => {
    process.env.TEST_GLOBAL_VAR = "GlobalValue";

    const spawnSyncSpy = simple.mock(childProcess, "spawnSync");
    runGGShield.runGGShieldCommand(
      {
        ggshieldPath: "path/to/ggshield",
        apiUrl: "",
        apiKey: "",
      } as GGShieldConfiguration,
      []
    );

    // Assert that spawnSync was called
    assert(spawnSyncSpy.called, "spawnSync should be called once");

    // Check the arguments passed to spawnSync
    const spawnSyncArgs = spawnSyncSpy.lastCall.args;
    const options = spawnSyncArgs[2];
    assert.strictEqual(options.env.TEST_GLOBAL_VAR, "GlobalValue");

    simple.restore();
    delete process.env.TEST_GLOBAL_VAR;
  });
});
