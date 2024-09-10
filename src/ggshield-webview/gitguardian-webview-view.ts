import * as vscode from "vscode";
import { GGShieldConfiguration } from "../lib/ggshield-configuration";
import { ggshieldAuthStatus } from "../lib/ggshield-api"; // Assuming you have this utility to check auth status

export class GitGuardianWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "gitguardian.gitguardianView";
  private _view?: vscode.WebviewView;
  private isAuthenticated: boolean = false;

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
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, "media")],
    };

    this.updateWebViewContent(webviewView);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === "authenticate") {
        vscode.commands.executeCommand("gitguardian.authenticate");
      }
    });
  }

  private async checkAuthenticationStatus() {
    this.isAuthenticated = await ggshieldAuthStatus(this.ggshieldConfiguration);
    this.updateWebViewContent(this._view);
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

    if (this.isAuthenticated) {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="${styleUri}" rel="stylesheet">
          <title>GitGuardian - Authenticated</title>
        </head>
        <body>
          <h2>Welcome to the beta version of GitGuardian for VSCode.</h2>
          <p>Whenever you save a document, it will be automatically scanned, and any secrets found will be highlighted as errors.</p>
          <p>You can find detailed documentation <a href="https://docs.gitguardian.com/ggshield-docs/getting-started" target="_blank">here</a>.</p>

          <h2>Feedback</h2>
          <p>We value your feedback greatly. Please share any issues or suggestions using the following <a href="https://docs.google.com/forms/d/e/1FAIpQLSc_BemGrdQfxp6lg7KgeDoB32XZg8yMfapk2gbemu0mVfskDQ/viewform" target="_blank">Feedback Form</a>.</p>
        </body>
        </html>`;
    } else {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="${styleUri}" rel="stylesheet">
          <title>GitGuardian - Welcome</title>
        </head>
        <body>
          <h1>Welcome to GitGuardian</h1>
          <p>To get started with GitGuardian, please authenticate.</p>
          <button id="authenticate">Authenticate</button>
          <script>
            const vscode = acquireVsCodeApi();
            document.getElementById('authenticate').addEventListener('click', () => {
              vscode.postMessage({ type: 'authenticate' });
            });
          </script>
        </body>
        </html>`;
    }
  }

  public refresh() {
    this.checkAuthenticationStatus();
  }

  dispose(): void {}
}
