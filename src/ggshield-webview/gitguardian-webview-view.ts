import * as vscode from "vscode";
import { GGShieldConfiguration } from "../lib/ggshield-configuration";
import { ggshieldAuthStatus } from "../lib/ggshield-api";

const documentationUri = vscode.Uri.parse(
  "https://docs.gitguardian.com/ggshield-docs/getting-started"
);
const feedbackFormUri = vscode.Uri.parse(
  "https://docs.google.com/forms/d/e/1FAIpQLSc_BemGrdQfxp6lg7KgeDoB32XZg8yMfapk2gbemu0mVfskDQ/viewform"
);

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
          <h2>How it works</h2>
          <p>Each time you save a document, it will undergo automatic scanning, and any detected secrets will be highlighted as errors.</p>
          <p><a href="${documentationUri}" target="_blank">Open documentation</a></p>

          <h2>Feedback</h2>
          <p>This extension is in beta.</p>
          <p>Please share any issues or suggestions <a href="${feedbackFormUri}" target="_blank"> using the following feedback form</a>.</p>
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
          <div class="anonymous">
            <img src="${logoUri}" alt="GitGuardian Logo" height="100px"; />
            <h1 style="margin-bottom:0px;">Welcome to GitGuardian</h1>
            <p>Protect your code from secrets leakage</p>
            <button class="button large" id="authenticate">Link your IDE to your account</button>
          </div>
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
