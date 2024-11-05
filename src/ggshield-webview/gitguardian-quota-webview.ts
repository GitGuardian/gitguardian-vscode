import { getAPIquota } from "../lib/ggshield-api";
import { GGShieldConfiguration } from "../lib/ggshield-configuration";
import * as vscode from "vscode";

export class GitGuardianQuotaWebviewProvider
  implements vscode.WebviewViewProvider
{
  public static readonly viewType = "gitguardian.gitguardianQuotaView";
  private _view?: vscode.WebviewView;
  private isAuthenticated: boolean = false;
  private quota: number = 0;
  private isLoading: boolean = false;

  constructor(
    private ggshieldConfiguration: GGShieldConfiguration,
    private readonly _extensionUri: vscode.Uri,
    private context: vscode.ExtensionContext
  ) {
    this.checkAuthenticationStatus();
    this.updateQuota();
  }

  public async resolveWebviewView(
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

  private async checkAuthenticationStatus() {
    this.isAuthenticated = this.context.globalState.get(
      "isAuthenticated",
      false
    );
  }

  private async updateQuota() {
    if (this.isAuthenticated) {
      this.quota = await getAPIquota(this.ggshieldConfiguration);
    }
  }

  private updateWebViewContent(webviewView?: vscode.WebviewView) {
    if (webviewView) {
      webviewView.webview.html = this.getHtmlForWebview();
    }
  }

  private getHtmlForWebview(): string {
    if (this.isLoading) {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <body>
          <p>Loading...</p>
        </body>
        </html>`;
    }

    if (this.isAuthenticated) {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <body>
          <p>Your current quota: ${this.quota}</p>
        </body>
        </html>`;
    } else {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <body>
            <p>Please authenticate to see your quota.</p>
        </body>
        </html>`;
    }
  }

  public async refresh() {
    this.isLoading = true;
    this.updateWebViewContent(this._view);

    await this.checkAuthenticationStatus();
    await this.updateQuota();

    this.isLoading = false;
    this.updateWebViewContent(this._view);
  }

  dispose(): void {
    if (this._view) {
      this._view.webview.onDidReceiveMessage(() => {});
      this._view.webview.html = "";
      this._view = undefined;
    }
  }
}
