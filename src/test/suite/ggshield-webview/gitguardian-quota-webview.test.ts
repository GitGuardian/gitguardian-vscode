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
  let mockGGShieldConfig: Partial<GGShieldConfiguration>;
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
});
