import { GGShieldConfiguration } from "../../../lib/ggshield-configuration";
import * as statusBar from "../../../gitguardian-interface/gitguardian-status-bar";
import * as simple from "simple-mock";
import { diagnosticCollection, scanFile } from "../../../lib/ggshield-api";
import * as runGGShield from "../../../lib/run-ggshield";
import path = require("path");
import { Uri, window } from "vscode";
import assert = require("assert");
import {
  scanResultsNoIncident,
  scanResultsWithIncident,
} from "../../constants";

suite("scanFile", () => {
  let updateStatusBarMock: simple.Stub<Function>;
  let runGGShieldCommandMock: simple.Stub<Function>;

  setup(() => {
    updateStatusBarMock = simple.mock(statusBar, "updateStatusBarItem");
    runGGShieldCommandMock = simple.mock(runGGShield, "runGGShieldCommand");
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
      status: 0,
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

  test("skips the file if it is ignored", async () => {
    const filePath = "out/test.py";
    await scanFile(filePath, Uri.file(filePath), {} as GGShieldConfiguration);

    // The status bar displays "Ignored File"
    assert.strictEqual(updateStatusBarMock.callCount, 1);
    assert.strictEqual(
      updateStatusBarMock.lastCall.args[0],
      statusBar.StatusBarStatus.ignoredFile
    );
  });

  test("displays an error message if the scan command fails", async () => {
    const errorMessageMock = simple.mock(window, "showErrorMessage");
    runGGShieldCommandMock.returnWith({
      status: 1,
      stdout: "",
      stderr: "Error",
    });

    await scanFile("test.py", Uri.file("test.py"), {} as GGShieldConfiguration);

    // The error message is displayed
    assert.strictEqual(errorMessageMock.callCount, 1);
    assert.strictEqual(errorMessageMock.lastCall.args[0], "ggshield: Error\n");
  });
});
