import { ExtensionContext, StatusBarAlignment, StatusBarItem, ThemeColor, window } from "vscode";


let statusBarItem: StatusBarItem;


export interface StatusBarConfig {
  text: string;
  color: string;
  command?: string;
}

export enum StatusBarStatus {
  initialization = "Initialization",
  unauthenticated = "Unauthenticated",
  ready = "Ready",
  scanning = "Scanning",
  secretFound = "Secret found",
  noSecretFound = "No secret found",
  error = "Error",
  ignoredFile = "Ignored file",
}

export function createStatusBarItem(context: ExtensionContext): void {
  statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 0);
  updateStatusBarItem(StatusBarStatus.initialization);
  context.subscriptions.push(statusBarItem);
}

function getStatusBarConfig(status: StatusBarStatus): StatusBarConfig {
  switch (status) {
    case StatusBarStatus.initialization:
      return {
        text: "GitGuardian - Initializing...",
        color: "statusBar.foreground",
        command: "gitguardian.showOutput",
      };
    case StatusBarStatus.unauthenticated:
      return {
        text: "GitGuardian - Please authenticate",
        color: "statusBarItem.warningBackground",
        command: "gitguardian.openSidebar",
      };
    case StatusBarStatus.ready:
      return { text: "GitGuardian is ready", color: "statusBar.foreground" };
    case StatusBarStatus.scanning:
      return {
        text: "GitGuardian - Scanning...",
        color: "statusBar.foreground",
        command: "gitguardian.showOutput",
      };
    case StatusBarStatus.secretFound:
      return {
        text: "GitGuardian - Secret found",
        color: "statusBarItem.errorBackground",
        command: "gitguardian.openProblems",
        // TODO: onclick open problems panel
      };
    case StatusBarStatus.noSecretFound:
      return {
        text: "GitGuardian - No secret found",
        color: "statusBar.foreground",
        command: "gitguardian.openSidebar",
      };
    case StatusBarStatus.error:
      return {
        text: "GitGuardian - error",
        color: "statusBarItem.errorBackground",
        command: "gitguardian.showOutput",
      };
    case StatusBarStatus.ignoredFile:
      return {
        text: "GitGuardian - Ignored file",
        color: "statusBarItem.warningBackground",
      };
    default:
      return { text: "", color: "statusBar.foreground" };
  }
}

export function updateStatusBarItem(
  status: StatusBarStatus,
): void {
  const config = getStatusBarConfig(status);
  statusBarItem.text = config.text;
  statusBarItem.backgroundColor = new ThemeColor(config.color);

  // If the command is defined, assign it to the status bar item
  if (config.command) {
    statusBarItem.command = config.command;
  } else {
    statusBarItem.command = undefined;
  }

  statusBarItem.show();
}
