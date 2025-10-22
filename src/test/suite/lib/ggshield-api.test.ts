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
import * as path from "path";
import * as utils from "../../../utils";

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

  test("successfully scans a file with no incidents", () => {
    runGGShieldCommandMock.returnWith({
      status: 0,
      stdout: scanResultsNoIncident,
      stderr: "",
    });

    const testFile: string = path.join("test", "test.py");
    scanFile(testFile, Uri.file(testFile), {} as GGShieldConfiguration);

    // The status bar displays "No Secret Found"
    assert.strictEqual(updateStatusBarMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.noSecretFound,
    );
  });

  test("successfully scans a file with incidents", () => {
    runGGShieldCommandMock.returnWith({
      status: 1,
      stdout: scanResultsWithIncident,
      stderr: "",
    });

    const testFile: string = path.join("test", "test.py");
    scanFile(testFile, Uri.file(testFile), {} as GGShieldConfiguration);

    // The status bar displays "Secret Found"
    assert.strictEqual(updateStatusBarMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.secretFound,
    );

    // The diagnostic collection contains the incident
    assert.strictEqual(diagnosticCollection.get(Uri.file(testFile))?.length, 1);
  });

  test("skips the file if it is gitignored", () => {
    // Mock isFileGitignored to return true
    simple.mock(utils, "isFileGitignored").returnWith(true);

    const filePath = path.join("out", "test.py");
    scanFile(filePath, Uri.file(filePath), {} as GGShieldConfiguration);

    // Verify that runGGShieldCommand was never called
    assert.strictEqual(runGGShieldCommandMock.callCount, 0);

    // Verify status bar was updated correctly
    assert.strictEqual(updateStatusBarMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.ignoredFile,
    );
  });

  const errorCodes = [128, 3];
  errorCodes.forEach((code) => {
    test(`displays an error message if the scan command fails with error code ${code}`, () => {
      runGGShieldCommandMock.returnWith({
        status: code,
        stdout: "",
        stderr: "Error",
      });

      const testFile: string = path.join("test", "test.py");
      scanFile(testFile, Uri.file(testFile), {} as GGShieldConfiguration);

      // The error message is displayed
      assert.strictEqual(errorMessageMock.callCount, 1);
      assert.strictEqual(errorMessageMock.lastCall.args[0], "ggshield: Error");
    });
  });

  test("ignores the 'ignored file cannot be scanned' error", () => {
    runGGShieldCommandMock.returnWith({
      status: 2,
      stdout: "",
      stderr: "Error: An ignored file or directory cannot be scanned.",
    });

    const testFile: string = path.join("test", "test");
    scanFile(testFile, Uri.file(testFile), {} as GGShieldConfiguration);

    // No error message is displayed
    assert.strictEqual(errorMessageMock.callCount, 0);
    // The status bar displays "Ignored File"
    assert.strictEqual(updateStatusBarMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.ignoredFile,
    );
  });
});
