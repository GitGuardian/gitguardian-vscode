import {
  ggshieldAuthStatus,
  ggshieldScanFile,
  ignoreLastFound,
  ignoreSecret,
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
import { getCurrentFile, isGitInstalled } from "./utils";
import { GitGuardianWebviewProvider } from "./ggshield-webview/gitguardian-webview-view";
import { StatusBarStatus, updateStatusBarItem } from "./status-bar-utils";
import {
  generateSecretName,
  GitGuardianSecretHoverProvider,
} from "./gitguardian-hover-provider";
import { GitGuardianQuotaWebviewProvider } from "./ggshield-webview/gitguardian-quota-webview";

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

function registerOpenViewsCommands(
  context: ExtensionContext,
  outputChannel: any
) {
  const showOutputCommand = commands.registerCommand(
    "gitguardian.showOutput",
    () => {
      outputChannel.show();
    }
  );

  const openSidebarCommand = commands.registerCommand(
    "gitguardian.openSidebar",
    () => {
      commands.executeCommand("workbench.view.extension.gitguardian");
    }
  );

  const openProblemsCommand = commands.registerCommand(
    "gitguardian.openProblems",
    () => {
      commands.executeCommand("workbench.actions.view.problems");
    }
  );

  context.subscriptions.push(
    showOutputCommand,
    openSidebarCommand,
    openProblemsCommand
  );
}

function registerQuotaViewCommands(view: GitGuardianQuotaWebviewProvider) {
  commands.registerCommand(
    "gitguardian.refreshQuota",
    async () => await view.refresh()
  );
}

export function activate(context: ExtensionContext) {
  // Check if ggshield if available
  commands.executeCommand('setContext', 'isAuthenticated', false);
  const outputChannel = window.createOutputChannel("GGShield Resolver");
  let configuration = createDefaultConfiguration(context);
  let authStatus: boolean = false;
  const ggshieldResolver = new GGShieldResolver(
    outputChannel,
    context,
    configuration
  );
  const ggshieldViewProvider = new GitGuardianWebviewProvider(
    configuration,
    context.extensionUri
  );

  const ggshieldQuotaViewProvider = new GitGuardianQuotaWebviewProvider(
    configuration,
    context.extensionUri
  );
  window.registerWebviewViewProvider("gitguardianView", ggshieldViewProvider);
  window.registerWebviewViewProvider(
    "gitguardianQuotaView",
    ggshieldQuotaViewProvider
  );
  context.subscriptions.push(ggshieldViewProvider, ggshieldQuotaViewProvider);

  statusBar = window.createStatusBarItem(StatusBarAlignment.Left, 0);
  updateStatusBarItem(StatusBarStatus.initialization, statusBar);

  //generic commands to open correct view on status bar click
  registerOpenViewsCommands(context, outputChannel);
  registerQuotaViewCommands(ggshieldQuotaViewProvider);
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    languages.registerHoverProvider("*", new GitGuardianSecretHoverProvider())
  );

  ggshieldResolver
    .checkGGShieldConfiguration()
    .then(() => {
      // Check if ggshield is authenticated
      authStatus = ggshieldAuthStatus(configuration);
      if (!authStatus) {
        updateStatusBarItem(StatusBarStatus.unauthenticated, statusBar);
       } else {
        commands.executeCommand('setContext', 'isAuthenticated', true);
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
        commands.registerCommand(
          "gitguardian.ignoreSecret",
          (diagnosticData) => {
            let currentFile = getCurrentFile();
            let secretName = generateSecretName(currentFile, diagnosticData);

            ignoreSecret(
              ggshieldResolver.configuration,
              diagnosticData.secretSha,
              secretName
            );
            scanFile(
              currentFile,
              Uri.file(currentFile),
              ggshieldResolver.configuration
            );
          }
        ),
        commands.registerCommand("gitguardian.authenticate", async () => {
          const isAuthenticated = await loginGGShield(
            ggshieldResolver.configuration,
            outputChannel
          );
          if (isAuthenticated) {
            authStatus = true;
            updateStatusBarItem(StatusBarStatus.ready, statusBar);
            commands.executeCommand('setContext', 'isAuthenticated', true);
            ggshieldViewProvider.refresh();
            ggshieldQuotaViewProvider.refresh();
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
}

export function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
    statusBar.dispose();
  }
}
