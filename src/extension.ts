import {
  cleanUpFileDiagnostics,
  createDiagnosticCollection,
  ggshieldApiKey,
  ggshieldAuthStatus,
  ignoreLastFound,
  ignoreSecret,
  loginGGShield,
  logoutGGShield,
  scanFile,
  showAPIQuota,
} from "./lib/ggshield-api";
import {
  getConfiguration,
  setApiKey,
} from "./lib/ggshield-configuration";
import {
  ExtensionContext,
  Uri,
  commands,
  languages,
  window,
  workspace,
  WebviewView,
} from "vscode";
import { GGShieldResolver } from "./lib/ggshield-resolver";
import { getCurrentFile, isGitInstalled } from "./utils";
import { GitGuardianWebviewProvider } from "./ggshield-webview/gitguardian-webview-view";
import { createStatusBarItem, StatusBarStatus, updateStatusBarItem } from "./gitguardian-interface/gitguardian-status-bar";
import {
  generateSecretName,
  GitGuardianSecretHoverProvider,
} from "./gitguardian-interface/gitguardian-hover-provider";
import { GitGuardianQuotaWebviewProvider } from "./ggshield-webview/gitguardian-quota-webview";
import { GitGuardianRemediationMessageWebviewProvider } from "./ggshield-webview/gitguardian-remediation-message-view";


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

  const outputChannel = window.createOutputChannel("GitGuardian");
  let configuration = getConfiguration(context);

  const ggshieldResolver = new GGShieldResolver(
    outputChannel,
    context,
    configuration
  );
  const ggshieldViewProvider = new GitGuardianWebviewProvider(
    configuration,
    context.extensionUri,
    context
  );

  const ggshieldRemediationMessageViewProvider = new GitGuardianRemediationMessageWebviewProvider(
    configuration,
    context.extensionUri,
    context
  );
  const ggshieldQuotaViewProvider = new GitGuardianQuotaWebviewProvider(
    configuration,
    context.extensionUri,
    context
  );
  window.registerWebviewViewProvider("gitguardianView", ggshieldViewProvider);
  window.registerWebviewViewProvider(
    "gitguardianRemediationMessageView",
    ggshieldRemediationMessageViewProvider
  );
  window.registerWebviewViewProvider(
    "gitguardianQuotaView",
    ggshieldQuotaViewProvider
  );
  context.subscriptions.push(ggshieldViewProvider, ggshieldRemediationMessageViewProvider, ggshieldQuotaViewProvider);

  createStatusBarItem(context);

  //generic commands to open correct view on status bar click
  registerOpenViewsCommands(context, outputChannel);
  registerQuotaViewCommands(ggshieldQuotaViewProvider);

  context.subscriptions.push(
    languages.registerHoverProvider("*", new GitGuardianSecretHoverProvider())
  );

  ggshieldResolver
    .checkGGShieldConfiguration()
    .then(() => {
      // Check if ggshield is authenticated
      ggshieldAuthStatus(configuration, context);
      if (context.globalState.get("isAuthenticated", false)) {
        updateStatusBarItem(StatusBarStatus.ready);
        setApiKey(configuration, ggshieldApiKey(configuration));
        ggshieldViewProvider.refresh();
        ggshieldRemediationMessageViewProvider.refresh();
        ggshieldQuotaViewProvider.refresh();

      } else {
        updateStatusBarItem(StatusBarStatus.unauthenticated);
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
      createDiagnosticCollection(context);
      context.subscriptions.push(
        workspace.onDidSaveTextDocument((textDocument) => {
          // Check if the document is inside the workspace
          const workspaceFolder = workspace.getWorkspaceFolder(textDocument.uri);
          console.log(context.globalState.get("isAuthenticated", false), workspaceFolder);
          console.log('»»»»»»»»»»»»»»', context.globalState.get("isAuthenticated", false) && workspaceFolder);
          if (context.globalState.get("isAuthenticated", false) && workspaceFolder) {
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
            window.showInformationMessage(
              'Secret ignored.'
            );
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
              ggshieldResolver.configuration,
            );
          }
        ),
        commands.registerCommand("gitguardian.authenticate", async () => {
          commands.executeCommand("gitguardian.openSidebar");
          await loginGGShield(
            ggshieldResolver.configuration,
            outputChannel,
            ggshieldViewProvider.getView() as WebviewView,
            context
          ).then(() => {
            if (context.globalState.get("isAuthenticated", false)) {
              updateStatusBarItem(StatusBarStatus.ready);
              setApiKey(configuration, ggshieldApiKey(configuration));
            } else {
              updateStatusBarItem(StatusBarStatus.unauthenticated);
            }
            ggshieldViewProvider.refresh();
            ggshieldRemediationMessageViewProvider.refresh();
            ggshieldQuotaViewProvider.refresh();
          }).catch((err) => {
            outputChannel.appendLine(`Authentication failed: ${err.message}`);
          });
        }),
        commands.registerCommand("gitguardian.logout", async () => {
          logoutGGShield(ggshieldResolver.configuration, context);
          updateStatusBarItem(StatusBarStatus.unauthenticated);
          setApiKey(configuration, undefined);
          ggshieldViewProvider.refresh();
          ggshieldRemediationMessageViewProvider.refresh();
          ggshieldQuotaViewProvider.refresh();
        })
      );
    })
    .catch((error) => {
      outputChannel.appendLine(`Error: ${error.message}`);
      updateStatusBarItem(StatusBarStatus.error);
    });
}

export function deactivate() {}
