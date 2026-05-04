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

  test("successfully scans a file with no incidents", async () => {
    runGGShieldCommandMock.returnWith(
      Promise.resolve({
        status: 0,
        stdout: scanResultsNoIncident,
        stderr: "",
      }),
    );

    const testFile: string = path.join("test", "test.py");
    await scanFile(testFile, Uri.file(testFile), {} as GGShieldConfiguration);

    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.noSecretFound,
    );
  });

  test("successfully scans a file with incidents", async () => {
    runGGShieldCommandMock.returnWith(
      Promise.resolve({
        status: 1,
        stdout: scanResultsWithIncident,
        stderr: "",
      }),
    );

    const testFile: string = path.join("test", "test.py");
    await scanFile(testFile, Uri.file(testFile), {} as GGShieldConfiguration);

    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.secretFound,
    );

    // The diagnostic collection contains the incident
    assert.strictEqual(diagnosticCollection.get(Uri.file(testFile))?.length, 1);
  });

  test("skips the file if it is gitignored", async () => {
    // Mock isFileGitignored to return true
    simple.mock(utils, "isFileGitignored").returnWith(true);

    const filePath = path.join("out", "test.py");
    await scanFile(filePath, Uri.file(filePath), {} as GGShieldConfiguration);

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
    test(`displays an error message if the scan command fails with error code ${code}`, async () => {
      runGGShieldCommandMock.returnWith(
        Promise.resolve({
          status: code,
          stdout: "",
          stderr: "Error",
        }),
      );

      const testFile: string = path.join("test", "test.py");
      await scanFile(testFile, Uri.file(testFile), {} as GGShieldConfiguration);

      // The error message is displayed
      assert.strictEqual(errorMessageMock.callCount, 1);
      assert.strictEqual(errorMessageMock.lastCall.args[0], "ggshield: Error");
    });
  });

  test("drops results from a scan that was superseded for the same URI", async () => {
    // Queue two resolvers so we can control completion order independently.
    const resolvers: Array<
      (value: { status: number; stdout: string; stderr: string }) => void
    > = [];
    runGGShieldCommandMock.callFn(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const testFile: string = path.join("test", "supersede.py");
    const uri = Uri.file(testFile);

    const first = scanFile(testFile, uri, {} as GGShieldConfiguration);
    const second = scanFile(testFile, uri, {} as GGShieldConfiguration);

    // Resolve the superseded (first) scan with incident data that would
    // otherwise write diagnostics and flip the status bar.
    resolvers[0]({
      status: 1,
      stdout: scanResultsWithIncident,
      stderr: "",
    });
    await first;

    // Then resolve the winning (second) scan with no-incident data.
    resolvers[1]({
      status: 0,
      stdout: scanResultsNoIncident,
      stderr: "",
    });
    await second;

    // Only the second scan's status bar update should have landed.
    assert.strictEqual(updateStatusBarMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.noSecretFound,
    );
    // And the stale scan must not have written its incident diagnostics.
    assert.strictEqual(diagnosticCollection.get(uri)?.length ?? 0, 0);
  });

  test("ignores the 'ignored file cannot be scanned' error", async () => {
    runGGShieldCommandMock.returnWith(
      Promise.resolve({
        status: 2,
        stdout: "",
        stderr: "Error: An ignored file or directory cannot be scanned.",
      }),
    );

    const testFile: string = path.join("test", "test");
    await scanFile(testFile, Uri.file(testFile), {} as GGShieldConfiguration);

    // No error message is displayed
    assert.strictEqual(errorMessageMock.callCount, 0);
    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.ignoredFile,
    );
  });
});
