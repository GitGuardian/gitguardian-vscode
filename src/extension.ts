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
  const results = ggshieldScanFile(filePath, configuration);
  if (!results) {
    return;
  }

  let incidentsDiagnostics: Diagnostic[] = parseGGShieldResults(results);
  if (incidentsDiagnostics.length !== 0) {
    window.showWarningMessage(`GGshield found problems.`);
  } else {
    window.showInformationMessage(`GGshield: no problems found.`);
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

  ggshieldResolver
    .checkAndInstallGGShield()
    .then(() => {
      const isGitInstalled = ggshieldResolver.isGitInstalled();

      if (!isGitInstalled) {
        window.showErrorMessage(
          `GGshield requires git to work correctly. Please install git.`
        );
      }
    })
    .then(() => {
      ggshieldResolver.loginGGShield();
    })
    .then(() => {
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
            ggshieldResolver.ggshieldPath
          );
        }),
        workspace.onDidOpenTextDocument((textDocument) => {
          if (textDocument.uri.scheme !== "git") {
            console.log(textDocument.uri.scheme);
            scanFile(
              textDocument.fileName,
              textDocument.uri,
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
