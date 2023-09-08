import {
  ggshieldScanFile,
  ignoreLastFound,
  showAPIQuota,
} from "./lib/ggshield-api";
import { getGGShieldConfiguration } from "./lib/ggshield-configuration";
import { parseGGShieldResults } from "./lib/ggshield-results-parser";
import {
  Diagnostic,
  DiagnosticCollection,
  ExtensionContext,
  Uri,
  commands,
  languages,
  window,
  workspace,
} from "vscode";

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
function scanFile(filePath: string, fileUri: Uri) {
  const configuration = getGGShieldConfiguration();

  if (!configuration) {
    window.showErrorMessage("ggshield: Missing settings");
    return;
  }

  const results = ggshieldScanFile(filePath, configuration);

  if (!results) {
    return;
  }

  let incidentsDiagnostics: Diagnostic[] = parseGGShieldResults(results);

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
  diagnosticCollection = languages.createDiagnosticCollection("ggshield");

  context.subscriptions.push(diagnosticCollection);
  context.subscriptions.push(
    workspace.onDidSaveTextDocument((textDocument) => {
      scanFile(textDocument.fileName, textDocument.uri);
    }),
    workspace.onDidOpenTextDocument((textDocument) => {
      scanFile(textDocument.fileName, textDocument.uri);
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
}

export function deactivate() {}
