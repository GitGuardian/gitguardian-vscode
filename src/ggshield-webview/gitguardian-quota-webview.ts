import { AuthenticationStatus } from "../lib/authentication";
import { getAPIquota } from "../lib/ggshield-api";
import * as vscode from "vscode";
import { GGShieldConfiguration } from "../lib/ggshield-configuration";

export class GitGuardianQuotaWebviewProvider
  implements vscode.WebviewViewProvider
{
  public static readonly viewType = "gitguardian.gitguardianQuotaView";
  private _view?: vscode.WebviewView;
  private quota: number = 0;
  private isLoading: boolean = false;
  private isAuthenticated: boolean = false;

  constructor(
    private ggshieldConfiguration: GGShieldConfiguration,
    private readonly _extensionUri: vscode.Uri,
    private context: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    this.refresh();

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        // Refresh the quota when the view becomes visible (e.g., after being collapsed and reopened)
        this.refresh();
      }
    });
  }

  private updateQuota() {
    const authStatus: AuthenticationStatus | undefined =
      this.context.workspaceState.get("authenticationStatus");
    this.isAuthenticated = authStatus?.success ?? false;
    if (authStatus?.success) {
      this.quota = getAPIquota(this.ggshieldConfiguration);
    }
  }

  private updateWebViewContent() {
    if (this._view === undefined) {
      return;
    }

    let computedHtml: string;

    if (this.isLoading) {
      computedHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <body>
          <p>Loading...</p>
        </body>
        </html>`;
    } else if (this.quota !== 0 && this.isAuthenticated) {
      computedHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <body>
          <p>Your current quota: ${this.quota}</p>
        </body>
        </html>`;
    } else {
      computedHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <body>
            <p>Please authenticate to see your quota.</p>
        </body>
        </html>`;
    }
    this._view.webview.html = computedHtml;
  }

  public refresh() {
    this.isLoading = true;
    this.updateWebViewContent();

    this.updateQuota();

    this.isLoading = false;
    this.updateWebViewContent();
  }

  dispose(): void {
    if (this._view) {
      this._view.webview.onDidReceiveMessage(() => {});
      this._view.webview.html = "";
      this._view = undefined;
    }
  }
}
