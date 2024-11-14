import { GGShieldConfiguration } from "../../../lib/ggshield-configuration";
import * as statusBar from "../../../gitguardian-interface/gitguardian-status-bar";
import * as simple from "simple-mock";
import { diagnosticCollection, scanFile } from "../../../lib/ggshield-api";
import * as runGGShield from "../../../lib/run-ggshield";
import { Uri, window } from "vscode";
import {
  scanResultsNoIncident,
  scanResultsWithIncident,
} from "../../constants";
import * as assert from "assert";
import { ExtensionContext, Memento } from "vscode";
import { ggshieldAuthStatus } from "../../../lib/ggshield-api";

suite("scanFile", () => {
  let updateStatusBarMock: simple.Stub<Function>;
  let runGGShieldCommandMock: simple.Stub<Function>;
  let errorMessageMock = simple.mock(window, "showErrorMessage");

  setup(() => {
    updateStatusBarMock = simple.mock(statusBar, "updateStatusBarItem");
    runGGShieldCommandMock = simple.mock(runGGShield, "runGGShieldCommand");
    errorMessageMock = simple.mock(window, "showErrorMessage");
  });

  teardown(() => {
    simple.restore();
  });

  test("successfully scans a file with no incidents", async () => {
    runGGShieldCommandMock.returnWith({
      status: 0,
      stdout: scanResultsNoIncident,
      stderr: "",
    });

    await scanFile("test.py", Uri.file("test.py"), {} as GGShieldConfiguration);

    // The status bar displays "No Secret Found"
    assert.strictEqual(updateStatusBarMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.noSecretFound
    );
  });

  test("successfully scans a file with incidents", async () => {
    runGGShieldCommandMock.returnWith({
      status: 1,
      stdout: scanResultsWithIncident,
      stderr: "",
    });

    await scanFile("test.py", Uri.file("test.py"), {} as GGShieldConfiguration);

    // The status bar displays "Secret Found"
    assert.strictEqual(updateStatusBarMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.secretFound
    );

    // The diagnostic collection contains the incident
    assert.strictEqual(
      diagnosticCollection.get(Uri.file("test.py"))?.length,
      1
    );
  });

  test("skips the file if it is gitignored", async () => {
    const filePath = "out/test.py";
    await scanFile(filePath, Uri.file(filePath), {} as GGShieldConfiguration);

    // The status bar displays "Ignored File"
    assert.strictEqual(updateStatusBarMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.ignoredFile
    );
  });

  const errorCodes = [128, 3];
  errorCodes.forEach((code) => {
    test(`displays an error message if the scan command fails with error code ${code}`, async () => {
      runGGShieldCommandMock.returnWith({
        status: code,
        stdout: "",
        stderr: "Error",
      });

      await scanFile(
        "test.py",
        Uri.file("test.py"),
        {} as GGShieldConfiguration
      );

      // The error message is displayed
      assert.strictEqual(errorMessageMock.callCount, 1);
      assert.strictEqual(errorMessageMock.lastCall.args[0], "ggshield: Error");
    });
  });

  test("ignores the 'ignored file cannot be scanned' error", async () => {
    runGGShieldCommandMock.returnWith({
      status: 2,
      stdout: "",
      stderr: "Error: An ignored file or directory cannot be scanned.",
    });

    await scanFile("test", Uri.file("test"), {} as GGShieldConfiguration);

    // No error message is displayed
    assert.strictEqual(errorMessageMock.callCount, 0);
    // The status bar displays "Ignored File"
    assert.strictEqual(updateStatusBarMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.ignoredFile
    );
  });
});

suite("ggshieldAuthStatus", function () {
  let isAuthenticated: boolean;
  let mockGlobalState: Memento & {
    setKeysForSync(keys: readonly string[]): void;
  };
  let mockContext: Partial<ExtensionContext>;
  let runGGShieldMock: simple.Stub<Function>;

  setup(function () {
    isAuthenticated = false;

    mockGlobalState = {
      get: (key: string) =>
        key === "isAuthenticated" ? isAuthenticated : undefined,
      update: (key: string, value: any) => {
        if (key === "isAuthenticated") {
          isAuthenticated = value;
        }
        return Promise.resolve();
      },
      keys: () => [],
      setKeysForSync: (keys: readonly string[]) => {},
    };

    mockContext = {
      globalState: mockGlobalState,
    };
    runGGShieldMock = simple.mock(runGGShield, "runGGShieldCommand");
  });
  teardown(function () {
    simple.restore();
  });

  test("Valid authentication should update isAuthenticated to true", async function () {
    runGGShieldMock.returnWith({
      status: 0,
      stdout: '{"detail": "Valid API key.", "status_code": 200}',
      stderr: "",
    });

    await ggshieldAuthStatus(
      {} as GGShieldConfiguration,
      mockContext as ExtensionContext
    );
    assert.strictEqual(isAuthenticated, true);
  });

  test("Invalid authentication should keep isAuthenticated to false", async function () {
    runGGShieldMock.returnWith({
      status: 0,
      stdout: '{"detail": "Invalid API key.", "status_code": 401}',
      stderr: "",
    });

    await ggshieldAuthStatus(
      {} as GGShieldConfiguration,
      mockContext as ExtensionContext
    );
    assert.strictEqual(isAuthenticated, false);
  });
});
