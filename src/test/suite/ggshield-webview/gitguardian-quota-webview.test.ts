import * as assert from "assert";
import { GitGuardianQuotaWebviewProvider } from "../../../ggshield-webview/gitguardian-quota-webview";
import { GGShieldConfiguration } from "../../../lib/ggshield-configuration";
import {
  ExtensionContext,
  Memento,
  Uri,
  WebviewOptions,
  WebviewView,
} from "vscode";

suite("GitGuardianQuotaWebviewProvider", () => {
  let provider: GitGuardianQuotaWebviewProvider;
  let mockWebviewView: Partial<WebviewView>;
  let mockWorkspaceState: Memento & {
    setKeysForSync(keys: readonly string[]): void;
  };
  let mockContext: Partial<ExtensionContext>;

  setup(() => {
    mockWorkspaceState = {
      get: (key: string) => undefined,
      update: (key: string, value: any) => {
        key = value;
        return Promise.resolve();
      },
      keys: () => [],
      setKeysForSync: (keys: readonly string[]) => {},
    };

    mockContext = {
      workspaceState: mockWorkspaceState,
    };

    provider = new GitGuardianQuotaWebviewProvider(
      {} as GGShieldConfiguration,
      Uri.parse("file:///mock"),
      mockContext as ExtensionContext,
    );

    mockWebviewView = {
      webview: {
        html: "",
        onDidReceiveMessage: () => ({ dispose: () => {} }),
        cspSource: "",
        options: {} as WebviewOptions,
        postMessage: (message: any) => Promise.resolve(true),
        asWebviewUri: (uri: Uri) => uri,
      },
      onDidChangeVisibility: () => ({ dispose: () => {} }),
      visible: false,
    };
    provider["_view"] = mockWebviewView as WebviewView;
  });

  test("should update the webview content when loading", () => {
    provider["isLoading"] = true;
    provider["updateWebViewContent"]();

    assert.ok(provider["_view"]?.webview.html.includes("<p>Loading...</p>"));
  });

  test("should display the quota when authenticated", () => {
    provider["isLoading"] = false;
    provider["isAuthenticated"] = true;
    provider["quota"] = 100;

    provider["updateWebViewContent"]();

    assert.ok(
      provider["_view"]?.webview.html.includes(
        "<p>Your current quota: 100</p>",
      ),
    );
  });

  test("should display authentication prompt when unauthenticated", () => {
    provider["isLoading"] = false;
    provider["isAuthenticated"] = false;

    provider["updateWebViewContent"]();

    assert.ok(
      provider["_view"]?.webview.html.includes(
        "<p>Please authenticate to see your quota.</p>",
      ),
    );
  });

  test("shows connected host above quota without scheme or in-body button", () => {
    provider["isLoading"] = false;
    provider["isAuthenticated"] = true;
    provider["quota"] = 42;
    provider["instance"] = "https://api.dashboard.example.com";

    provider["updateWebViewContent"]();
    const html = provider["_view"]?.webview.html ?? "";

    assert.ok(
      html.includes("Connected to: <strong>api.dashboard.example.com</strong>"),
    );
    assert.ok(!html.includes("https://api.dashboard.example.com"));
    assert.ok(!html.includes("Instance source:"));
    assert.ok(!html.includes("API key source:"));
    assert.ok(!html.includes('id="openInstanceSettings"'));

    const connectedIdx = html.indexOf("Connected to:");
    const quotaIdx = html.indexOf("Your current quota:");
    assert.ok(connectedIdx > -1 && quotaIdx > -1 && connectedIdx < quotaIdx);
  });

  test("shows placeholder when no instance is configured", () => {
    provider["isLoading"] = false;
    provider["isAuthenticated"] = false;
    provider["instance"] = "";

    provider["updateWebViewContent"]();
    const html = provider["_view"]?.webview.html ?? "";

    assert.ok(html.includes("No instance configured"));
  });

  test("sanitizes malformed instance URLs", () => {
    provider["isLoading"] = false;
    provider["isAuthenticated"] = true;
    provider["quota"] = 1;
    provider["instance"] = "javascript:alert(1)";

    provider["updateWebViewContent"]();
    const html = provider["_view"]?.webview.html ?? "";

    assert.ok(!html.includes("javascript:alert"));
    assert.ok(html.includes("No instance configured"));
  });
});
