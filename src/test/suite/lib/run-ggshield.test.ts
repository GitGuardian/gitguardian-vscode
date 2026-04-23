import * as simple from "simple-mock";
import * as childProcess from "child_process";
import * as vscode from "vscode";
import * as runGGShield from "../../../lib/run-ggshield";
import assert = require("assert");
import { EventEmitter } from "events";
import { GGShieldConfiguration } from "../../../lib/ggshield-configuration";

type FakeProc = EventEmitter & {
  stdout: EventEmitter & { setEncoding: (enc: string) => void };
  stderr: EventEmitter & { setEncoding: (enc: string) => void };
  pid: number;
};

function makeFakeProc(): FakeProc {
  const stdout = Object.assign(new EventEmitter(), {
    setEncoding: () => {},
  });
  const stderr = Object.assign(new EventEmitter(), {
    setEncoding: () => {},
  });
  return Object.assign(new EventEmitter(), { stdout, stderr, pid: 1234 });
}

suite("runGGShieldCommand", () => {
  let spawnMock: simple.Stub<any>;
  let fakeProc: FakeProc;

  setup(() => {
    fakeProc = makeFakeProc();
    spawnMock = simple.mock(childProcess, "spawn").returnWith(fakeProc);
  });

  teardown(() => {
    simple.restore();
  });

  // Helper: drive the fake process to completion after the runGGShieldCommand
  // call has attached its listeners.
  function finishProc(status: number = 0) {
    // Defer so the promise has a chance to wire up handlers before close fires.
    setImmediate(() => fakeProc.emit("close", status, null));
  }

  test("Global env variables are set correctly", async () => {
    process.env.TEST_GLOBAL_VAR = "GlobalValue";
    const resultPromise = runGGShield.runGGShieldCommand(
      {
        ggshieldPath: "path/to/ggshield",
        apiUrl: "",
      } as GGShieldConfiguration,
      [],
    );
    finishProc();
    await resultPromise;

    assert(spawnMock.called, "spawn should be called once");

    const spawnArgs = spawnMock.lastCall.args;
    const options = spawnArgs[2];
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
    test(description, async () => {
      process.env.TEST_GLOBAL_VAR = "GlobalValue";

      const resultPromise = runGGShield.runGGShieldCommand(
        {
          ggshieldPath: "path/to/ggshield",
          apiUrl: "",
          insecure: insecure,
        } as GGShieldConfiguration,
        ["test"],
      );
      finishProc();
      await resultPromise;

      assert(spawnMock.called, "spawn should be called once");

      const spawnArgs = spawnMock.lastCall.args;
      const args = spawnArgs[1];

      assert.strictEqual(args[0] === "--insecure", insecure);
    });
  });

  test("adds the --instance option when apiUrl is set in the settings", async () => {
    const resultPromise = runGGShield.runGGShieldCommand(
      {
        ggshieldPath: "path/to/ggshield",
        apiUrl: "https://example.com",
      } as GGShieldConfiguration,
      ["test"],
    );
    finishProc();
    await resultPromise;

    assert(spawnMock.called, "spawn should be called once");

    assert.deepStrictEqual(spawnMock.lastCall.args[1], [
      "test",
      "--instance",
      "https://example.com",
    ]);
  });

  test("does not add the --instance option when calling ggshield --version", async () => {
    const resultPromise = runGGShield.runGGShieldCommand(
      {
        ggshieldPath: "path/to/ggshield",
        apiUrl: "https://example.com",
      } as GGShieldConfiguration,
      ["--version"],
    );
    finishProc();
    await resultPromise;

    assert(spawnMock.called, "spawn should be called once");

    assert.deepStrictEqual(spawnMock.lastCall.args[1], ["--version"]);
  });

  test("returns a failed result without spawning ggshield in an untrusted workspace", async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      vscode.workspace,
      "isTrusted",
    );
    Object.defineProperty(vscode.workspace, "isTrusted", {
      get: () => false,
      configurable: true,
    });

    try {
      const result = await runGGShield.runGGShieldCommand(
        {
          ggshieldPath: "path/to/ggshield",
          apiUrl: "",
        } as GGShieldConfiguration,
        ["secret", "scan", "--json", "test.py"],
      );

      assert(!spawnMock.called, "spawn should not be called");
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
