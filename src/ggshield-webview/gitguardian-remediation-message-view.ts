import { getRemediationMessage } from "../lib/ggshield-api";
import { GGShieldConfiguration } from "../lib/ggshield-configuration";
import * as vscode from "vscode";

export class GitGuardianRemediationMessageWebviewProvider
  implements vscode.WebviewViewProvider
{
  public static readonly viewType = "gitguardian.gitguardianRemediationMessageView";
  private _view?: vscode.WebviewView;
  private isAuthenticated: boolean = false;
  private remediationMessage: string = "";
  private isLoading: boolean = false;

  constructor(
    private ggshieldConfiguration: GGShieldConfiguration,
    private readonly _extensionUri: vscode.Uri,
    private context: vscode.ExtensionContext
  ) {
    this.checkAuthenticationStatus();
    this.updateRemediationMessage();
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
        // Refresh when the view becomes visible (e.g., after being collapsed and reopened)
        this.refresh();
      }
    });
  }

  private async checkAuthenticationStatus() {
    this.isAuthenticated = this.context.globalState.get("isAuthenticated", false);
  }

  private async updateRemediationMessage() {
    if (this.isAuthenticated) {
      this.remediationMessage = await getRemediationMessage(this.ggshieldConfiguration);
    }
  }

  private updateWebViewContent(webviewView?: vscode.WebviewView) {
    if (webviewView) {
      webviewView.webview.html = this.getHtmlForWebview();
    }
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
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
          <pre style="white-space:pre-wrap">
${this.escapeHtml(this.remediationMessage)}
          </pre>
        </body>
        </html>`;
    } else {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <body>
            <p>Please authenticate to see your personalized remediation message.</p>
        </body>
        </html>`;
    }
  }

  public async refresh() {
    this.isLoading = true;
    this.updateWebViewContent(this._view);

    await this.checkAuthenticationStatus();
    console.log("Well authenticated");
    await this.updateRemediationMessage();

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
