import { GGShieldConfiguration } from "../../../lib/ggshield-configuration";
import * as statusBar from "../../../gitguardian-interface/gitguardian-status-bar";
import * as simple from "simple-mock";
import { diagnosticCollection, scanFile } from "../../../lib/ggshield-api";
import * as runGGShield from "../../../lib/run-ggshield";
import path = require("path");
import { Uri } from "vscode";
import assert = require("assert");
import { scanResultsWithIncident } from "../extension.test";

suite("scanFile", () => {
    let updateStatusBarMock: simple.Stub<Function>;
    let runGGShieldCommandMock: simple.Stub<Function>;
  
    setup(() => {
      updateStatusBarMock = simple.mock(statusBar, "updateStatusBarItem");
      runGGShieldCommandMock = simple.mock(runGGShield, "runGGShieldCommand");
    });
  
    test("successfully scans a file with no incidents", async () => {
      const stdout = '{"id": "test.py", "type": "path_scan", "total_incidents": 0, "total_occurrences": 0}';
       runGGShieldCommandMock.returnWith({ status: 0, stdout: stdout, stderr: ""});

       await scanFile("test.py", Uri.file("test.py"), {} as GGShieldConfiguration);

     // The status bar displays "No Secret Found"
       assert.strictEqual(updateStatusBarMock.callCount, 1);
       assert.strictEqual(updateStatusBarMock.lastCall.args[0], statusBar.StatusBarStatus.noSecretFound);
    });

    test("successfully scans a file with incidents", async () => {
      runGGShieldCommandMock.returnWith({ status: 0, stdout: scanResultsWithIncident, stderr: "" });

      await scanFile("test.py", Uri.file("test.py"), {} as GGShieldConfiguration);

      // The status bar displays "Secret Found"
      assert.strictEqual(updateStatusBarMock.callCount, 1);
      assert.strictEqual(updateStatusBarMock.lastCall.args[0], statusBar.StatusBarStatus.secretFound);

      // The diagnostic collection contains the incident
      assert.strictEqual(diagnosticCollection.get(Uri.file("test.py"))?.length, 1);
   });
  
    test("skips the file if it is ignored", async () => {
     const mock = simple.mock(statusBar, "updateStatusBarItem");
     const filePath = "out/test.py";
     await scanFile(filePath, Uri.file(filePath), {} as GGShieldConfiguration);
  
     // The status bar displays "Ignored File"
     assert.strictEqual(mock.callCount, 1);
     assert.strictEqual(mock.lastCall.args[0], statusBar.StatusBarStatus.ignoredFile);
     });
  });