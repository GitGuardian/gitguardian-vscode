import {
  ggshieldScanFile,
  ignoreLastFound,
  showAPIQuota,
} from "./lib/ggshield-api";
import { getGGShieldConfiguration } from "./lib/ggshield-configuration";
import { parseGGShieldResults } from "./lib/ggshield-results-parser";
import {
  Color,
  Diagnostic,
  DiagnosticCollection,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  Uri,
  commands,
  languages,
  window,
  workspace,
} from "vscode";
import { GGShieldResolver } from "./lib/ggshield-resolver";

/**
 * Extension diagnostic collection
 */
let diagnosticCollection: DiagnosticCollection;

/**
 * Scan a file using ggshield
 *
 * - retrieve configuration
 * - scan file using ggshield CLI application
 * - parse ggshield results
 * - set diagnostics collection so the incdients are visible to the user
 *
 * @param filePath path to file
 * @param fileUri file uri
 */
function scanFile(
  this: any,
  filePath: string,
  fileUri: Uri,
  statusBarItem: StatusBarItem,
  ggshieldPath?: string
): void {
  const configuration = getGGShieldConfiguration(ggshieldPath);

  if (!configuration) {
    window
      .showErrorMessage("ggshield: Missing settings", "Open Settings")
      .then((selection) => {
        if (selection === "Open Settings") {
          commands.executeCommand("workbench.action.openSettings", "ggshield");
        }
      });
    return;
  }
  console.log(`Scanning ${filePath}`);
  statusBarItem.text = `Scanning ${filePath}...`;
  const results = ggshieldScanFile(filePath, configuration);
  console.log(`Scanned ${filePath}`);
  if (!results) {
    return;
  }

  let incidentsDiagnostics: Diagnostic[] = parseGGShieldResults(results);
  if (incidentsDiagnostics.length !== 0) {
    statusBarItem.text = `GGshield: found ${incidentsDiagnostics.length} problems.`;
    window.showWarningMessage(`ggshield found problems >:(((((`);
  } else {
    statusBarItem.text = `GGshield: no problems found.`;
    window.showInformationMessage(`ggshield: no problems found :)))))`);
  }
  diagnosticCollection.set(fileUri, incidentsDiagnostics);
}

/**
 * Clean up file diagnostics
 *
 * @param fileUri file uri
 */
function cleanUpFileDiagnostics(fileUri: Uri): void {
  diagnosticCollection.delete(fileUri);
}

export function activate(context: ExtensionContext) {
  // Check if ggshield if available
  const outputChannel = window.createOutputChannel("GGShield Resolver");
  const ggshieldResolver = new GGShieldResolver(outputChannel, context);
  const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 0);
  statusBarItem.color = "#00FF00";
  statusBarItem.text = `Checking GGShield installation...`;
  statusBarItem.show(); // Show the status bar item

  ggshieldResolver
    .checkAndInstallGGShield()
    .then(() => {
      ggshieldResolver.loginGGShield();
    })
    .then(() => {
      statusBarItem.text = `GGShield installation completed.`;

      // Start scanning ddocuments on activation events
      // (i.e. when a new document is opened or when the document is saved)
      diagnosticCollection = languages.createDiagnosticCollection("ggshield");

      context.subscriptions.push(diagnosticCollection);
      context.subscriptions.push(
        workspace.onDidSaveTextDocument((textDocument) => {
          console.log(textDocument.uri.scheme);
          console.log(textDocument.fileName);
          scanFile(
            textDocument.fileName,
            textDocument.uri,
            statusBarItem,
            ggshieldResolver.ggshieldPath
          );
        }),
        workspace.onDidOpenTextDocument((textDocument) => {
          if (textDocument.uri.scheme !== "git") {
            console.log(textDocument.uri.scheme);
            scanFile(
              textDocument.fileName,
              textDocument.uri,
              statusBarItem,
              ggshieldResolver.ggshieldPath
            );
          }
        }),
        workspace.onDidCloseTextDocument((textDocument) =>
          cleanUpFileDiagnostics(textDocument.uri)
        ),
        commands.registerCommand("ggshield.quota", () => {
          showAPIQuota();
        }),
        commands.registerCommand("ggshield.ignore", () => {
          ignoreLastFound();
          if (window.activeTextEditor) {
            cleanUpFileDiagnostics(window.activeTextEditor?.document.uri);
          }
        })
      );
    })
    .catch((error) => {
      outputChannel.appendLine(`Error: ${error.message}`);
    });
  outputChannel.show();
}

export function deactivate() {}
