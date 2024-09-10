import { StatusBarItem, ThemeColor } from "vscode";

export interface StatusBarConfig {
  text: string;
  color: string;
}

export enum StatusBarStatus {
  initialization = "Initialization",
  unauthenticated = "Unauthenticated",
  ready = "Ready",
  scanning = "Scanning",
  secretFound = "Secret found",
  noSecretFound = "No secret found",
  error = "Error",
}

export function getStatusBarConfig(status: StatusBarStatus): StatusBarConfig {
  switch (status) {
    case StatusBarStatus.initialization:
      return {
        text: "Gitguardian - Initializing...",
        color: "statusBar.foreground",
      };
    case StatusBarStatus.unauthenticated:
      return {
        text: "Gitguardian - Please authenticate",
        color: "statusBarItem.warningBackground",
      };
    case StatusBarStatus.ready:
      return { text: "Gitguardian is ready", color: "statusBar.foreground" };
    case StatusBarStatus.scanning:
      return {
        text: "Gitguardian - Scanning...",
        color: "statusBar.foreground",
      };
    case StatusBarStatus.secretFound:
      return {
        text: "Gitguardian - Secret found",
        color: "statusBarItem.errorBackground",
      };
    case StatusBarStatus.noSecretFound:
      return {
        text: "Gitguardian - No secret found",
        color: "statusBar.foreground",
      };
    case StatusBarStatus.error:
      return {
        text: "Gitguardian - error",
        color: "statusBarItem.errorBackground",
      };
    default:
      return { text: "", color: "statusBar.foreground" };
  }
}

export function updateStatusBarItem(
  status: StatusBarStatus,
  statusBarItem: StatusBarItem
): void {
  const config = getStatusBarConfig(status);
  statusBarItem.text = config.text;
  statusBarItem.backgroundColor = new ThemeColor(config.color);

  statusBarItem.show();
}
