import { AuthenticationStatus } from "../lib/authentication";
import { getAPIquota } from "../lib/ggshield-api";
import * as vscode from "vscode";
import { GGShieldConfiguration } from "../lib/ggshield-configuration";
import { sanitizeInstanceUrl } from "./webview-utils";

export class GitGuardianQuotaWebviewProvider
  implements vscode.WebviewViewProvider
{
  public static readonly viewType = "gitguardian.gitguardianQuotaView";
  private _view?: vscode.WebviewView;
  private quota: number = 0;
  private isLoading: boolean = false;
  private isAuthenticated: boolean = false;
  private instance: string = "";

  constructor(
    private ggshieldConfiguration: GGShieldConfiguration,
    private readonly _extensionUri: vscode.Uri,
    private context: vscode.ExtensionContext,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;
    void this.refresh().catch((err) => {
      console.error("GitGuardian quota refresh failed:", err);
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        // Refresh the quota when the view becomes visible (e.g., after being collapsed and reopened)
        void this.refresh().catch((err) => {
          console.error("GitGuardian quota refresh failed:", err);
        });
      }
    });
  }

  public setConfiguration(configuration: GGShieldConfiguration) {
    this.ggshieldConfiguration = configuration;
  }

  private async updateQuota(): Promise<void> {
    const authStatus: AuthenticationStatus | undefined =
      this.context.workspaceState.get("authenticationStatus");
    this.isAuthenticated = authStatus?.success ?? false;
    this.instance = authStatus?.instance ?? "";
    if (authStatus?.success) {
      this.quota = await getAPIquota(this.ggshieldConfiguration);
    } else {
      this.quota = 0;
    }
  }

  private renderConnectedLine(): string {
    const host = sanitizeInstanceUrl(this.instance).replace(/^https?:\/\//, "");
    return host
      ? `<p>Connected to: <strong>${host}</strong></p>`
      : `<p><em>No instance configured.</em></p>`;
  }

  private updateWebViewContent() {
    if (this._view === undefined) {
      return;
    }

    const connectedLine = this.renderConnectedLine();

    let body: string;
    if (this.isLoading) {
      body = `${connectedLine}<p>Loading...</p>`;
    } else if (this.quota !== 0 && this.isAuthenticated) {
      body = `${connectedLine}<p>Your current quota: ${this.quota}</p>`;
    } else {
      body = `${connectedLine}<p>Please authenticate to see your quota.</p>`;
    }

    this._view.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <body>
        ${body}
      </body>
      </html>`;
  }

  public async refresh(): Promise<void> {
    this.isLoading = true;
    this.updateWebViewContent();

    await this.updateQuota();

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
