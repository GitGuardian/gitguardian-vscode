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
        // TODO: onclick open output channel if the bar is frozen and I want to see what's going on
      };
    case StatusBarStatus.unauthenticated:
      return {
        text: "Gitguardian - Please authenticate",
        color: "statusBarItem.warningBackground",
        // TODO: onclick open sidebar
      };
    case StatusBarStatus.ready:
      return { text: "Gitguardian is ready", color: "statusBar.foreground" };
    case StatusBarStatus.scanning:
      return {
        text: "GitGuardian - scanning...",
        color: "statusBar.foreground",
        // TODO: onclick open output channel if the bar is frozen and I want to see what's going on
      };
    case StatusBarStatus.secretFound:
      return {
        text: "GitGuardian - found secret",
        color: "statusBarItem.errorBackground",
        // TODO: onclick open problems panel
      };
    case StatusBarStatus.noSecretFound:
      return {
        text: "GitGuardian - no secret found",
        color: "statusBar.foreground",
        // TODO: onclick open sidebar
      };
    case StatusBarStatus.error:
      return {
        text: "GitGuardian - error",
        color: "statusBarItem.errorBackground",
        // TODO: onclick open output channel panel
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
