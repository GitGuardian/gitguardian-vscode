import * as vscode from "vscode";
import { GGShieldConfiguration } from "../lib/ggshield-configuration";

const projectDiscussionUri = vscode.Uri.parse(
  "https://github.com/GitGuardian/gitguardian-vscode/discussions"
);
const projectIssuesUri = vscode.Uri.parse(
  "https://github.com/GitGuardian/gitguardian-vscode/issues"
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
    private readonly _extensionUri: vscode.Uri,
    private context: vscode.ExtensionContext
  ) {
    this.checkAuthenticationStatus();
  }

  public resolveWebviewView(
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

  public getView(): vscode.WebviewView | undefined {
    return this._view;
  }

  private checkAuthenticationStatus() {
    this.isAuthenticated = this.context.globalState.get(
      "isAuthenticated",
      false
    );
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
          <h1>✅ The extension is active!</strong></h1>
          <p>This initial version scans your active document upon saving, whether manually or automatically.</p>
          <p>Stay tuned for more features coming soon!</p>

          <h1>Build with us !</h1>
          <p>As we are in the v0.x release phase, our focus is on developing v1 incrementally and collaboratively with our users (you).</p>
          <p><strong>Build with us ! Your feedback is essential to us during this process.</strong></p>
          
          <p><a href="${projectDiscussionUri}" target="_blank">👉 Join the discussion: share feedback, ideas, and vote</a></p>
          <p><a href="${projectIssuesUri}" target="_blank">👉 Report any issues you encounter</a></p>
          <p><a href="${feedbackFormUri}" target="_blank">👉 Provide anonymous feedback</a></p>
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
            
            <p id="authMessage" style="display:none;">
              If your browser doesn't open automatically, <a id="authLink" href="#" target="_blank">click here</a>.
            </p>
          </div>

          <script>
            const vscode = acquireVsCodeApi();
            
            // Button click event to trigger authentication
            document.getElementById('authenticate').addEventListener('click', () => {
              vscode.postMessage({ type: 'authenticate' });
            });
            
            // Listener for authentication link
            window.addEventListener('message', event => {
              const message = event.data;
              
              if (message.type === 'authLink') {
                const authMessage = document.getElementById('authMessage');
                const authLink = document.getElementById('authLink');
                authLink.href = message.link;  // Set the authentication link
                authMessage.style.display = 'block';  // Show the message
              }
            });
          </script>
        </body>
        </html>
    `;
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
