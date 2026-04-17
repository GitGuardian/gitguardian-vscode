import * as sinon from "sinon";
import { childProcess } from "../../../lib/child-process";
import * as vscode from "vscode";
import * as runGGShield from "../../../lib/run-ggshield";
import assert from "assert";
import { GGShieldConfiguration } from "../../../lib/ggshield-configuration";

suite("runGGShieldCommand", () => {
  let spawnSyncMock: sinon.SinonStub;

  setup(() => {
    spawnSyncMock = sinon.stub(childProcess, "spawnSync"); // Mock spawnSync
  });

  teardown(() => {
    sinon.restore();
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
        "GGshield is called with flag --insecure when insecure is true",
    },
    {
      insecure: false,
      description:
        "GGshield is not called with flag --insecure when insecure is false",
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

      assert.strictEqual(args[0] === "--insecure", insecure);
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

  test("returns a failed result without spawning ggshield in an untrusted workspace", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      vscode.workspace,
      "isTrusted",
    );
    Object.defineProperty(vscode.workspace, "isTrusted", {
      get: () => false,
      configurable: true,
    });

    try {
      const result = runGGShield.runGGShieldCommand(
        {
          ggshieldPath: "path/to/ggshield",
          apiUrl: "",
        } as GGShieldConfiguration,
        ["secret", "scan", "--json", "test.py"],
      );

      assert(!spawnSyncMock.called, "spawnSync should not be called");
      assert.strictEqual(result.status, 3);
      assert.strictEqual(result.pid, -1);
      assert.ok(
        result.stderr.includes("untrusted workspace"),
        "stderr should mention untrusted workspace",
      );
      assert.ok(
        result.error instanceof Error,
        "error should be an Error instance",
      );
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(
          vscode.workspace,
          "isTrusted",
          originalDescriptor,
        );
      }
    }
  });
});
