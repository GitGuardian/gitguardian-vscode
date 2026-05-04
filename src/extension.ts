import {
  cancelInFlightScans,
  cleanUpFileDiagnostics,
  createDiagnosticCollection,
  ignoreLastFound,
  ignoreSecret,
  scanFile,
  showAPIQuota,
} from "./lib/ggshield-api";
import { getConfiguration } from "./lib/ggshield-configuration-utils";
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
import { getCurrentFile, checkGitInstalled } from "./utils";
import { GitGuardianWebviewProvider } from "./ggshield-webview/gitguardian-webview-view";
import {
  createStatusBarItem,
  StatusBarStatus,
  updateStatusBarItem,
} from "./gitguardian-interface/gitguardian-status-bar";
import {
  generateSecretName,
  GitGuardianSecretHoverProvider,
} from "./gitguardian-interface/gitguardian-hover-provider";
import { GitGuardianQuotaWebviewProvider } from "./ggshield-webview/gitguardian-quota-webview";
import { GitGuardianRemediationMessageWebviewProvider } from "./ggshield-webview/gitguardian-remediation-message-view";
import {
  AuthenticationStatus,
  loginGGShield,
  logoutGGShield,
  updateAuthenticationStatus,
} from "./lib/authentication";

function registerOpenViewsCommands(
  context: ExtensionContext,
  outputChannel: any,
) {
  const showOutputCommand = commands.registerCommand(
    "gitguardian.showOutput",
    () => {
      outputChannel.show();
    },
  );

  const openSidebarCommand = commands.registerCommand(
    "gitguardian.openSidebar",
    () => {
      commands.executeCommand("workbench.view.extension.gitguardian");
    },
  );

  const openProblemsCommand = commands.registerCommand(
    "gitguardian.openProblems",
    () => {
      commands.executeCommand("workbench.actions.view.problems");
    },
  );

  context.subscriptions.push(
    showOutputCommand,
    openSidebarCommand,
    openProblemsCommand,
  );
}

export async function activate(context: ExtensionContext) {
  const outputChannel = window.createOutputChannel("GitGuardian");
  let configuration = getConfiguration(context, outputChannel);

  const ggshieldResolver = new GGShieldResolver(
    outputChannel,
    context,
    configuration,
  );
  const ggshieldViewProvider = new GitGuardianWebviewProvider(
    configuration,
    context.extensionUri,
    context,
  );

  const ggshieldRemediationMessageViewProvider =
    new GitGuardianRemediationMessageWebviewProvider(
      configuration,
      context.extensionUri,
      context,
    );
  const ggshieldQuotaViewProvider = new GitGuardianQuotaWebviewProvider(
    configuration,
    context.extensionUri,
    context,
  );
  window.registerWebviewViewProvider("gitguardianView", ggshieldViewProvider);
  window.registerWebviewViewProvider(
    "gitguardianRemediationMessageView",
    ggshieldRemediationMessageViewProvider,
  );
  window.registerWebviewViewProvider(
    "gitguardianQuotaView",
    ggshieldQuotaViewProvider,
  );
  context.subscriptions.push(
    ggshieldViewProvider,
    ggshieldRemediationMessageViewProvider,
    ggshieldQuotaViewProvider,
  );

  createStatusBarItem(context);

  //generic commands to open correct view on status bar click
  registerOpenViewsCommands(context, outputChannel);
  context.subscriptions.push(
    commands.registerCommand("gitguardian.refreshQuota", () =>
      ggshieldQuotaViewProvider.refresh(),
    ),
    commands.registerCommand("gitguardian.openInstanceSettings", () =>
      commands.executeCommand(
        "workbench.action.openSettings",
        "gitguardian.apiUrl",
      ),
    ),
  );

  context.subscriptions.push(
    workspace.onDidChangeConfiguration(async (event) => {
      if (!event.affectsConfiguration("gitguardian.apiUrl")) {
        return;
      }
      configuration = getConfiguration(context, outputChannel);
      ggshieldResolver.configuration = configuration;
      ggshieldQuotaViewProvider.setConfiguration(configuration);
      await updateAuthenticationStatus(context, configuration);
      ggshieldViewProvider.refresh();
      ggshieldRemediationMessageViewProvider.refresh();
      ggshieldQuotaViewProvider.refresh();
    }),
  );

  context.subscriptions.push(
    languages.registerHoverProvider("*", new GitGuardianSecretHoverProvider()),
  );

  if (!checkGitInstalled()) {
    updateStatusBarItem(StatusBarStatus.error);
    return;
  }

  ggshieldResolver.checkGGShieldConfiguration().catch((err) => {
    outputChannel.appendLine(
      `ggshield configuration check failed: ${
        err instanceof Error ? err.stack ?? err.message : String(err)
      }`,
    );
  });

  // update authentication status
  updateAuthenticationStatus(context, configuration).then(() => {
    ggshieldViewProvider.refresh();
    ggshieldRemediationMessageViewProvider.refresh();
    ggshieldQuotaViewProvider.refresh();
  });

  // Start scanning documents on activation events
  // (i.e. when a new document is opened or when the document is saved)
  createDiagnosticCollection(context);
  context.subscriptions.push(
    { dispose: cancelInFlightScans },
    workspace.onDidSaveTextDocument((textDocument) => {
      // Check if the document is inside the workspace
      const workspaceFolder = workspace.getWorkspaceFolder(textDocument.uri);
      const authStatus: AuthenticationStatus | undefined =
        context.workspaceState.get("authenticationStatus");
      if (authStatus?.success && workspaceFolder) {
        scanFile(
          textDocument.fileName,
          textDocument.uri,
          ggshieldResolver.configuration,
        ).catch((err) => {
          outputChannel.appendLine(
            `scanFile failed: ${
              err instanceof Error ? err.stack ?? err.message : String(err)
            }`,
          );
        });
      }
    }),
    workspace.onDidCloseTextDocument((textDocument) =>
      cleanUpFileDiagnostics(textDocument.uri),
    ),
    commands.registerCommand("gitguardian.quota", async () => {
      try {
        await showAPIQuota(ggshieldResolver.configuration);
      } catch (err) {
        outputChannel.appendLine(
          `showAPIQuota failed: ${
            err instanceof Error ? err.stack ?? err.message : String(err)
          }`,
        );
      }
    }),
    commands.registerCommand("gitguardian.ignore", async () => {
      await ignoreLastFound(ggshieldResolver.configuration);
      if (window.activeTextEditor) {
        cleanUpFileDiagnostics(window.activeTextEditor?.document.uri);
      }
    }),
    commands.registerCommand(
      "gitguardian.ignoreSecret",
      async (diagnosticData) => {
        window.showInformationMessage("Secret ignored.");
        let currentFile = getCurrentFile();
        let secretName = generateSecretName(currentFile, diagnosticData);

        await ignoreSecret(
          ggshieldResolver.configuration,
          diagnosticData.secretSha,
          secretName,
        );
        await scanFile(
          currentFile,
          Uri.file(currentFile),
          ggshieldResolver.configuration,
        );
      },
    ),
    commands.registerCommand("gitguardian.authenticate", async () => {
      commands.executeCommand("gitguardian.openSidebar");
      await loginGGShield(
        ggshieldResolver.configuration,
        outputChannel,
        ggshieldViewProvider.getView() as WebviewView,
        context,
      )
        .then(async () => {
          await updateAuthenticationStatus(context, configuration);
          ggshieldViewProvider.refresh();
          ggshieldRemediationMessageViewProvider.refresh();
          ggshieldQuotaViewProvider.refresh();
        })
        .catch((err) => {
          outputChannel.appendLine(`Authentication failed: ${err.message}`);
        });
    }),
    commands.registerCommand("gitguardian.logout", async () => {
      await logoutGGShield(ggshieldResolver.configuration, context);
      ggshieldViewProvider.refresh();
      ggshieldRemediationMessageViewProvider.refresh();
      ggshieldQuotaViewProvider.refresh();
    }),
    commands.registerCommand(
      "gitguardian.updateAuthenticationStatus",
      async () => {
        await updateAuthenticationStatus(context, configuration);
        ggshieldViewProvider.refresh();
        ggshieldRemediationMessageViewProvider.refresh();
        ggshieldQuotaViewProvider.refresh();
      },
    ),
  );
}

export function deactivate() {}
