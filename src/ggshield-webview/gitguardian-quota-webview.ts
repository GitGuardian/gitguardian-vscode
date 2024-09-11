import { getAPIquota, ggshieldAuthStatus } from "../lib/ggshield-api";
import { GGShieldConfiguration } from "../lib/ggshield-configuration";
import * as vscode from "vscode";

export class GitGuardianQuotaWebviewProvider
  implements vscode.WebviewViewProvider
{
  public static readonly viewType = "gitguardian.gitguardianQuotaView";
  private _view?: vscode.WebviewView;
  private isAuthenticated: boolean = false;
  private quota: number = 0;

  constructor(
    private ggshieldConfiguration: GGShieldConfiguration,
    private readonly _extensionUri: vscode.Uri
  ) {
    this.checkAuthenticationStatus();
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "media"),
        vscode.Uri.joinPath(this._extensionUri, "images"),
      ],
    };

    this.updateWebViewContent(webviewView);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === "authenticate") {
        vscode.commands.executeCommand("gitguardian.authenticate");
      }
    });
  }

  private async checkAuthenticationStatus() {
    this.isAuthenticated = ggshieldAuthStatus(this.ggshieldConfiguration);
  }

  private async updateQuota() {
    if (this.isAuthenticated) {
      this.quota = await getAPIquota(this.ggshieldConfiguration);
    }
  }

  private updateWebViewContent(webviewView?: vscode.WebviewView) {
    if (webviewView) {
      webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css")
    );
    const logoUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "images",
        "gitguardian-icon-primary700-background.svg"
      )
    );

    this.updateQuota();

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
    await this.checkAuthenticationStatus();
    await this.updateQuota();

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
