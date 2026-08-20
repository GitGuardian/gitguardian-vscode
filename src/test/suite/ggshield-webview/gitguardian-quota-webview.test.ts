import assert from "assert";
import * as sinon from "sinon";
import { GitGuardianQuotaWebviewProvider } from "../../../ggshield-webview/gitguardian-quota-webview";
import { GGShieldConfiguration } from "../../../lib/ggshield-configuration";
import {
  AuthenticationStatus,
  ConfigSource,
} from "../../../lib/authentication";
import * as runGGShield from "../../../lib/run-ggshield";
import { commands, ExtensionContext, Memento, Uri, WebviewView } from "vscode";

suite("GitGuardianQuotaWebviewProvider", () => {
  let provider: GitGuardianQuotaWebviewProvider;
  let mockWebviewView: Partial<WebviewView>;
  let mockWorkspaceState: Memento & {
    setKeysForSync(keys: readonly string[]): void;
  };
  let mockContext: Partial<ExtensionContext>;

  setup(() => {
    mockWorkspaceState = {
      get: (_key: string) => undefined,
      update: (_key: string, _value: unknown) => Promise.resolve(),
      keys: () => [],
      setKeysForSync: (_keys: readonly string[]) => {},
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
        options: {},
        postMessage: (_message: unknown) => Promise.resolve(true),
        asWebviewUri: (uri: Uri) => uri,
      },
      onDidChangeVisibility: () => ({ dispose: () => {} }),
      visible: false,
    };
    provider["_view"] = mockWebviewView as WebviewView;
  });

  teardown(() => {
    sinon.restore();
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

  suite("when authenticated", () => {
    let executeCommandMock: sinon.SinonStub;
    let runGGShieldCommandMock: sinon.SinonStub;

    setup(() => {
      const authStatus: AuthenticationStatus = {
        success: true,
        instance: "https://dashboard.gitguardian.com",
        keySource: ConfigSource.keyring,
      };
      mockWorkspaceState.get = (_key: string) => authStatus;
      executeCommandMock = sinon.stub(commands, "executeCommand");
      runGGShieldCommandMock = sinon.stub(runGGShield, "runGGShieldCommand");
    });

    const setContextCalls = (mock: sinon.SinonStub): unknown[][] =>
      mock
        .getCalls()
        .filter((call) => call.args[0] === "setContext")
        .map((call) => call.args);

    test("renders nothing and flags the quota as forbidden when the API refuses it", async () => {
      runGGShieldCommandMock.resolves({
        status: 128,
        stdout: "",
        stderr:
          "Error: You must have Manager access level to perform this action.",
      });

      await provider.refresh();

      assert.deepStrictEqual(setContextCalls(executeCommandMock), [
        ["setContext", "isQuotaForbidden", true],
      ]);
      assert.strictEqual(provider["_view"]?.webview.html, "");
    });

    test("keeps rendering nothing while a forbidden quota is refreshed", async () => {
      runGGShieldCommandMock.resolves({
        status: 128,
        stdout: "",
        stderr:
          "Error: You must have Manager access level to perform this action.",
      });

      await provider.refresh();
      provider["isLoading"] = true;
      provider["updateWebViewContent"]();

      assert.strictEqual(provider["_view"]?.webview.html, "");
    });

    test("clears the forbidden flag once the quota is readable", async () => {
      runGGShieldCommandMock.resolves({
        status: 0,
        stdout: '{"count": 560, "limit": 10000, "remaining": 9440}',
        stderr: "",
      });

      await provider.refresh();

      assert.deepStrictEqual(setContextCalls(executeCommandMock), [
        ["setContext", "isQuotaForbidden", false],
      ]);
      assert.ok(
        provider["_view"]?.webview.html.includes(
          "<p>Your current quota: 9440</p>",
        ),
      );
    });

    test("clears the forbidden flag when authentication is lost", async () => {
      runGGShieldCommandMock.resolves({
        status: 128,
        stdout: "",
        stderr:
          "Error: You must have Manager access level to perform this action.",
      });

      await provider.refresh();
      assert.strictEqual(provider["isQuotaForbidden"], true);

      mockWorkspaceState.get = (_key: string) => undefined;
      await provider.refresh();

      assert.strictEqual(provider["isQuotaForbidden"], false);
      assert.deepStrictEqual(setContextCalls(executeCommandMock), [
        ["setContext", "isQuotaForbidden", true],
        ["setContext", "isQuotaForbidden", false],
      ]);
      assert.ok(
        provider["_view"]?.webview.html.includes(
          "<p>Please authenticate to see your quota.</p>",
        ),
      );
    });

    test("drops the result of a refresh that was superseded", async () => {
      const resolvers: Array<
        (value: { status: number; stdout: string; stderr: string }) => void
      > = [];
      runGGShieldCommandMock.callsFake(
        () =>
          new Promise((resolve) => {
            resolvers.push(resolve);
          }),
      );

      const superseded = provider.refresh();
      const latest = provider.refresh();

      resolvers[1]({
        status: 0,
        stdout: '{"count": 560, "limit": 10000, "remaining": 9440}',
        stderr: "",
      });
      await latest;

      resolvers[0]({
        status: 128,
        stdout: "",
        stderr:
          "Error: You must have Manager access level to perform this action.",
      });
      await superseded;

      assert.strictEqual(provider["isQuotaForbidden"], false);
      assert.deepStrictEqual(setContextCalls(executeCommandMock), [
        ["setContext", "isQuotaForbidden", false],
      ]);
      assert.ok(
        provider["_view"]?.webview.html.includes(
          "<p>Your current quota: 9440</p>",
        ),
      );
    });
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
