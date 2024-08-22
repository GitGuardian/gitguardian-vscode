import {
  ggshieldScanFile,
  ignoreLastFound,
  showAPIQuota,
} from "./lib/ggshield-api";
import { GGShieldConfiguration } from "./lib/ggshield-configuration";
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
  configuration: GGShieldConfiguration
): void {
  const results = ggshieldScanFile(filePath, configuration);
  if (!results) {
    return;
  }

  let incidentsDiagnostics: Diagnostic[] = parseGGShieldResults(results);
  if (incidentsDiagnostics.length !== 0) {
    window.showWarningMessage(`GGShield found problems.`);
  } else {
    window.showInformationMessage(`GGShield: no problems found.`);
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
  let configuration = new GGShieldConfiguration();
  const ggshieldResolver = new GGShieldResolver(
    outputChannel,
    context,
    configuration
  );

  ggshieldResolver
    .getGGShieldPath()
    .then(() => {
      const isGitInstalled = ggshieldResolver.isGitInstalled();

      if (!isGitInstalled) {
        window.showErrorMessage(
          `GGShield requires git to work correctly. Please install git.`
        );
      }
    })
    .then(() => {
      ggshieldResolver.loginGGShield();
    })
    .then(() => {
      // Start scanning documents on activation events
      // (i.e. when a new document is opened or when the document is saved)
      diagnosticCollection = languages.createDiagnosticCollection("ggshield");

      context.subscriptions.push(diagnosticCollection);
      context.subscriptions.push(
        workspace.onDidSaveTextDocument((textDocument) => {
          scanFile(
            textDocument.fileName,
            textDocument.uri,
            ggshieldResolver.configuration
          );
        }),
        workspace.onDidOpenTextDocument((textDocument) => {
          if (textDocument.uri.scheme !== "git") {
            scanFile(
              textDocument.fileName,
              textDocument.uri,
              ggshieldResolver.configuration
            );
          }
        }),
        workspace.onDidCloseTextDocument((textDocument) =>
          cleanUpFileDiagnostics(textDocument.uri)
        ),
        commands.registerCommand("ggshield.quota", () => {
          showAPIQuota(ggshieldResolver.configuration);
        }),
        commands.registerCommand("ggshield.ignore", () => {
          ignoreLastFound(ggshieldResolver.configuration);
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
