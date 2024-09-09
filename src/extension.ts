import {
  ggshieldAuthStatus,
  ggshieldScanFile,
  ignoreLastFound,
  loginGGShield,
  showAPIQuota,
} from "./lib/ggshield-api";
import {
  createDefaultConfiguration,
  GGShieldConfiguration,
} from "./lib/ggshield-configuration";
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
  StatusBarItem,
  StatusBarAlignment,
} from "vscode";
import { GGShieldResolver } from "./lib/ggshield-resolver";
import { isGitInstalled } from "./utils";
import { GGShieldViewProvider } from "./ggshield-view";
import { StatusBarStatus, updateStatusBarItem } from "./status-bar-utils";

/**
 * Extension diagnostic collection
 */
let diagnosticCollection: DiagnosticCollection;
let statusBar: StatusBarItem;

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
async function scanFile(
  this: any,
  filePath: string,
  fileUri: Uri,
  configuration: GGShieldConfiguration
): Promise<void> {
  const results = ggshieldScanFile(filePath, configuration);
  if (!results) {
    updateStatusBarItem(StatusBarStatus.ready, statusBar);
    return;
  }
  let incidentsDiagnostics: Diagnostic[] = parseGGShieldResults(results);
  if (incidentsDiagnostics.length !== 0) {
    updateStatusBarItem(StatusBarStatus.secretFound, statusBar);
  } else {
    updateStatusBarItem(StatusBarStatus.noSecretFound, statusBar);
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
  let configuration = createDefaultConfiguration(context);
  let authStatus: boolean = false;
  const ggshieldResolver = new GGShieldResolver(
    outputChannel,
    context,
    configuration
  );
  const ggshieldViewProvider = new GGShieldViewProvider(ggshieldResolver);
  window.registerTreeDataProvider("gitguardianView", ggshieldViewProvider);
  context.subscriptions.push(ggshieldViewProvider);

  statusBar = window.createStatusBarItem(StatusBarAlignment.Left, 0);
  updateStatusBarItem(StatusBarStatus.initialization, statusBar);
  context.subscriptions.push(statusBar);

  ggshieldResolver
    .checkGGShieldConfiguration()
    .then(() => {
      // Check if ggshield is authenticated
      authStatus = ggshieldAuthStatus(configuration);
      if (!authStatus) {
        updateStatusBarItem(StatusBarStatus.unauthenticated, statusBar);
      }
    })
    .then(async () => {
      // Check if git is installed
      console.log("git is installed and configured");
      const gitInstallation = await isGitInstalled();
      if (!gitInstallation) {
        window.showErrorMessage(
          `GGShield requires git to work correctly. Please install git.`
        );
      }
    })
    .then(() => {
      // Start scanning documents on activation events
      // (i.e. when a new document is opened or when the document is saved)
      diagnosticCollection = languages.createDiagnosticCollection("ggshield");

      context.subscriptions.push(diagnosticCollection);
      context.subscriptions.push(
        workspace.onDidSaveTextDocument((textDocument) => {
          if (authStatus) {
            scanFile(
              textDocument.fileName,
              textDocument.uri,
              ggshieldResolver.configuration
            );
          }
        }),
        workspace.onDidOpenTextDocument(async (textDocument) => {
          if (textDocument.uri.scheme !== "git" && authStatus) {
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
        commands.registerCommand("gitguardian.quota", () => {
          showAPIQuota(ggshieldResolver.configuration);
        }),
        commands.registerCommand("gitguardian.ignore", () => {
          ignoreLastFound(ggshieldResolver.configuration);
          if (window.activeTextEditor) {
            cleanUpFileDiagnostics(window.activeTextEditor?.document.uri);
          }
        }),
        commands.registerCommand("gitguardian.authenticate", async () => {
          const isAuthenticated = await loginGGShield(
            ggshieldResolver.configuration,
            outputChannel
          );
          if (isAuthenticated) {
            authStatus = true;
            updateStatusBarItem(StatusBarStatus.ready, statusBar);
            ggshieldViewProvider.refresh();
          } else {
            updateStatusBarItem(StatusBarStatus.unauthenticated, statusBar);
          }
        })
      );
    })
    .catch((error) => {
      outputChannel.appendLine(`Error: ${error.message}`);
      updateStatusBarItem(StatusBarStatus.error, statusBar);
    });
  outputChannel.show();
}

export function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
    statusBar.dispose();
  }
}
