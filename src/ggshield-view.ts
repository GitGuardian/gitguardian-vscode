import * as vscode from "vscode";
import { GGShieldResolver } from "./lib/ggshield-resolver";
import { ggshieldAuthStatus } from "./lib/ggshield-api";

/**
 * View provider for the GitGuardian view
 * The view provides authentication status
 * - If the user is not authenticated, it provides a login button
 * - If the user is authenticated, the view is left empty for now
 */
export class GGShieldViewProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined | void
  > = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<any> =
    this._onDidChangeTreeData.event;
  private isAuthenticated: boolean = false;

  constructor(private ggshieldResolver: GGShieldResolver) {
    // Initialize authentication state
    this.checkAuthenticationStatus();
  }

  private async checkAuthenticationStatus() {
    // Update authentication status
    this.isAuthenticated = await ggshieldAuthStatus(
      this.ggshieldResolver.configuration
    );
    this._onDidChangeTreeData.fire(); // Notify the view to refresh
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (element) {
      return Promise.resolve([]);
    }

    // Provide root level items based on authentication status
    if (this.isAuthenticated) {
      return Promise.resolve([
        new vscode.TreeItem(
          "ggshield is running",
          vscode.TreeItemCollapsibleState.None
        ),
      ]);
    } else {
      return Promise.resolve([]);
    }
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }

  refresh(): void {
    this.checkAuthenticationStatus()
      .then(() => {
        // After checking the authentication status, force a view update
        this._onDidChangeTreeData.fire(undefined);
      })
      .catch((error) => {
        console.error("Error checking authentication status:", error);
      });
  }
}
