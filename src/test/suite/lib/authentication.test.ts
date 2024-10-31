import { GGShieldConfiguration } from "../../../lib/ggshield-configuration";
import * as simple from "simple-mock";
import * as runGGShield from "../../../lib/run-ggshield";
import * as statusBar from "../../../gitguardian-interface/gitguardian-status-bar";
import * as assert from "assert";
import { commands, ExtensionContext, Memento } from "vscode";
import {
  AuthenticationStatus,
  ConfigSource,
  GGShieldConfigSource,
  updateAuthenticationStatus,
} from "../../../lib/authentication";

suite("updateAuthenticationStatus", () => {
  let authenticationStatus: AuthenticationStatus | undefined;
  let mockWorkspaceState: Memento & {
    setKeysForSync(keys: readonly string[]): void;
  };
  let mockContext: Partial<ExtensionContext>;
  let runGGShieldMock: simple.Stub<Function>;
  let updateStatusBarItemMock: simple.Stub<Function>;
  let executeCommandMock: simple.Stub<Function>;

  setup(function () {
    updateStatusBarItemMock = simple.mock(statusBar, "updateStatusBarItem");
    executeCommandMock = simple.mock(commands, "executeCommand");
    mockWorkspaceState = {
      get: (key: string) =>
        key === "authenticationStatus" ? authenticationStatus : undefined,
      update: (key: string, value: any) => {
        if (key === "authenticationStatus") {
          authenticationStatus = value;
        }
        return Promise.resolve();
      },
      keys: () => [],
      setKeysForSync: (keys: readonly string[]) => {},
    };

    mockContext = {
      workspaceState: mockWorkspaceState,
    };
    runGGShieldMock = simple.mock(runGGShield, "runGGShieldCommand");
  });

  teardown(function () {
    simple.restore();
  });

  test("returns noKeyFound status when no key is configured", async () => {
    runGGShieldMock.returnWith({
      status: 3,
      stdout: "",
      stderr:
        "Error: No token is saved for this instance: 'https://dashboard.gitguardian.com'",
    });

    await updateAuthenticationStatus(
      mockContext as ExtensionContext,
      {} as GGShieldConfiguration
    );

    assert.deepStrictEqual(authenticationStatus, {
      success: false,
      instance: "https://dashboard.gitguardian.com",
      keySource: ConfigSource.noKeyFound,
    });

    assert.strictEqual(updateStatusBarItemMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarItemMock.lastCall.args[0],
      statusBar.StatusBarStatus.unauthenticated
    );

    assert.strictEqual(executeCommandMock.callCount, 1);
    assert.deepStrictEqual(executeCommandMock.lastCall.args, [
      "setContext",
      "isAuthenticated",
      false,
    ]);
  });

  test("returns true when valid credentials are configured", async () => {
    runGGShieldMock.returnWith({
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
      {} as GGShieldConfiguration
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
      statusBar.StatusBarStatus.ready
    );

    assert.strictEqual(executeCommandMock.callCount, 1);
    assert.deepStrictEqual(executeCommandMock.lastCall.args, [
      "setContext",
      "isAuthenticated",
      true,
    ]);
  });

  test("returns false with correct sources and instance when API key is invalid", async () => {
    runGGShieldMock.returnWith({
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
      {} as GGShieldConfiguration
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
      statusBar.StatusBarStatus.authFailed
    );

    assert.strictEqual(executeCommandMock.callCount, 1);
    assert.deepStrictEqual(executeCommandMock.lastCall.args, [
      "setContext",
      "isAuthenticated",
      false,
    ]);
  });
});
