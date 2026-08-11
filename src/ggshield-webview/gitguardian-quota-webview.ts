import { AuthenticationStatus } from "../lib/authentication";
import { getAPIquota, QuotaResult } from "../lib/ggshield-api";
import * as vscode from "vscode";
import { GGShieldConfiguration } from "../lib/ggshield-configuration";
import { sanitizeInstanceUrl } from "./webview-utils";

export class GitGuardianQuotaWebviewProvider
  implements vscode.WebviewViewProvider
{
  public static readonly viewType = "gitguardian.gitguardianQuotaView";
  private _view?: vscode.WebviewView;
  private quota: QuotaResult | undefined;
  private isLoading: boolean = false;
  private isAuthenticated: boolean = false;
  private isQuotaForbidden: boolean = false;
  private instance: string = "";
  private refreshGeneration: number = 0;

  constructor(
    private ggshieldConfiguration: GGShieldConfiguration,
    private readonly _extensionUri: vscode.Uri,
    private context: vscode.ExtensionContext,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;
    void this.refresh().catch((err) => {
      console.error("GitGuardian quota refresh failed:", err);
    });

    webviewView.onDidDispose(() => {
      this._view = undefined;
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

  private async updateQuota(generation: number): Promise<void> {
    const authStatus: AuthenticationStatus | undefined =
      this.context.workspaceState.get("authenticationStatus");
    this.isAuthenticated = authStatus?.success ?? false;
    this.instance = authStatus?.instance ?? "";
    if (!authStatus?.success) {
      this.quota = undefined;
      this.setQuotaForbidden(false);
      return;
    }

    const result = await getAPIquota(this.ggshieldConfiguration);
    if (generation !== this.refreshGeneration) {
      return;
    }

    this.quota = result;
    this.setQuotaForbidden(result.status === "forbidden");
  }

  private setQuotaForbidden(isForbidden: boolean): void {
    this.isQuotaForbidden = isForbidden;
    void vscode.commands.executeCommand(
      "setContext",
      "isQuotaForbidden",
      isForbidden,
    );
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

    if (this.isQuotaForbidden) {
      this._view.webview.html = "";
      return;
    }

    const connectedLine = this.renderConnectedLine();

    let body: string;
    if (this.isLoading) {
      body = `${connectedLine}<p>Loading...</p>`;
    } else if (!this.isAuthenticated) {
      body = `${connectedLine}<p>Please authenticate to see your quota.</p>`;
    } else if (this.quota?.status === "available") {
      body = `${connectedLine}<p>Your current quota: ${this.quota.remaining}</p>`;
    } else {
      body = `${connectedLine}<p>Quota is not available right now.</p>`;
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
    const generation = ++this.refreshGeneration;
    this.isLoading = true;
    this.updateWebViewContent();

    try {
      await this.updateQuota(generation);
    } finally {
      if (generation === this.refreshGeneration) {
        this.isLoading = false;
        this.updateWebViewContent();
      }
    }
  }

  dispose(): void {
    this._view = undefined;
  }
}
