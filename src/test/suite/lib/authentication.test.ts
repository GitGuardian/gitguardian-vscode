import { GGShieldConfiguration } from "../../../lib/ggshield-configuration";
import * as sinon from "sinon";
import * as runGGShield from "../../../lib/run-ggshield";
import * as childProcess from "child_process";
import { ChildProcessWithoutNullStreams } from "child_process";
import * as statusBar from "../../../gitguardian-interface/gitguardian-status-bar";
import assert from "assert";
import { EventEmitter } from "events";
import {
  commands,
  ExtensionContext,
  Memento,
  OutputChannel,
  WebviewView,
} from "vscode";
import {
  AuthenticationStatus,
  ConfigSource,
  GGShieldConfigSource,
  loginGGShield,
  updateAuthenticationStatus,
} from "../../../lib/authentication";

suite("updateAuthenticationStatus", () => {
  let authenticationStatus: AuthenticationStatus | undefined;
  let mockWorkspaceState: Memento & {
    setKeysForSync(keys: readonly string[]): void;
  };
  let mockContext: Partial<ExtensionContext>;
  let runGGShieldMock: sinon.SinonStub;
  let updateStatusBarItemMock: sinon.SinonStub;
  let executeCommandMock: sinon.SinonStub;

  setup(function () {
    updateStatusBarItemMock = sinon.stub(statusBar, "updateStatusBarItem");
    executeCommandMock = sinon.stub(commands, "executeCommand");
    mockWorkspaceState = {
      get: (key: string) =>
        key === "authenticationStatus" ? authenticationStatus : undefined,
      update: (key: string, value: unknown) => {
        if (key === "authenticationStatus") {
          authenticationStatus = value as AuthenticationStatus | undefined;
        }
        return Promise.resolve();
      },
      keys: () => [],
      setKeysForSync: (_keys: readonly string[]) => {},
    };

    mockContext = {
      workspaceState: mockWorkspaceState,
    };
    runGGShieldMock = sinon.stub(runGGShield, "runGGShieldCommand");
  });

  teardown(function () {
    sinon.restore();
  });

  test("returns noKeyFound status when no key is configured", async () => {
    runGGShieldMock.returns({
      status: 3,
      stdout: "",
      stderr:
        "Error: No token is saved for this instance: 'https://dashboard.gitguardian.com'",
    });

    await updateAuthenticationStatus(
      mockContext as ExtensionContext,
      {} as GGShieldConfiguration,
    );

    assert.deepStrictEqual(authenticationStatus, {
      success: false,
      instance: "https://dashboard.gitguardian.com",
      keySource: ConfigSource.noKeyFound,
    });

    assert.strictEqual(updateStatusBarItemMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarItemMock.lastCall.args[0],
      statusBar.StatusBarStatus.unauthenticated,
    );

    assert.strictEqual(executeCommandMock.callCount, 1);
    assert.deepStrictEqual(executeCommandMock.lastCall.args, [
      "setContext",
      "isAuthenticated",
      false,
    ]);
  });

  test("returns true when valid credentials are configured", async () => {
    runGGShieldMock.returns({
      status: 0,
      stdout: `{
          "status_code": 200,
          "instance": "https://dashboard.gitguardian.com",
          "api_key_source": "${GGShieldConfigSource.userConfig}",
          "instance_source": "${GGShieldConfigSource.userConfig}"
        }`,
      stderr: "",
    });

    await updateAuthenticationStatus(
      mockContext as ExtensionContext,
      {} as GGShieldConfiguration,
    );

    assert.deepStrictEqual(authenticationStatus, {
      success: true,
      instance: "https://dashboard.gitguardian.com",
      keySource: ConfigSource.keyGGShieldConfig,
      instanceSource: ConfigSource.instanceGGShieldConfig,
    });

    assert.strictEqual(updateStatusBarItemMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarItemMock.lastCall.args[0],
      statusBar.StatusBarStatus.ready,
    );

    assert.strictEqual(executeCommandMock.callCount, 1);
    assert.deepStrictEqual(executeCommandMock.lastCall.args, [
      "setContext",
      "isAuthenticated",
      true,
    ]);
  });

  test("returns false with correct sources and instance when API key is invalid", async () => {
    runGGShieldMock.returns({
      status: 0,
      stdout: `{
        "status_code": 401,
        "instance": "https://dashboard.gitguardian.com",
        "api_key_source": "${GGShieldConfigSource.dotEnv}",
        "instance_source": "${GGShieldConfigSource.cmdOption}"
      }`,
      stderr: "",
    });

    await updateAuthenticationStatus(
      mockContext as ExtensionContext,
      {} as GGShieldConfiguration,
    );

    assert.deepStrictEqual(authenticationStatus, {
      success: false,
      instance: "https://dashboard.gitguardian.com",
      keySource: ConfigSource.dotEnv,
      instanceSource: ConfigSource.extensionSettings,
    });

    assert.strictEqual(updateStatusBarItemMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarItemMock.lastCall.args[0],
      statusBar.StatusBarStatus.authFailed,
    );

    assert.strictEqual(executeCommandMock.callCount, 1);
    assert.deepStrictEqual(executeCommandMock.lastCall.args, [
      "setContext",
      "isAuthenticated",
      false,
    ]);
  });
});

suite("loginGGShield", () => {
  let spawnMock: sinon.SinonStub;
  let fakeProc: EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };

  setup(function () {
    fakeProc = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
    });
    spawnMock = sinon
      .stub(childProcess, "spawn")
      .returns(fakeProc as unknown as ChildProcessWithoutNullStreams);
  });

  teardown(function () {
    sinon.restore();
  });

  const testCasesInsecure = [
    {
      insecure: true,
      description: "loginGGShield passes --insecure flag when insecure is true",
    },
    {
      insecure: false,
      description:
        "loginGGShield does not pass --insecure flag when insecure is false",
    },
  ];

  testCasesInsecure.forEach(({ insecure, description }) => {
    test(description, () => {
      void loginGGShield(
        {
          ggshieldPath: "path/to/ggshield",
          apiUrl: "",
          insecure: insecure,
        } as GGShieldConfiguration,
        { appendLine: () => {} } as unknown as OutputChannel,
        { webview: { postMessage: () => {} } } as unknown as WebviewView,
        {} as ExtensionContext,
      );

      assert(spawnMock.called, "spawn should be called once");

      const args = spawnMock.lastCall.args[1];
      assert.strictEqual(args[0] === "--insecure", insecure);
    });
  });
});
