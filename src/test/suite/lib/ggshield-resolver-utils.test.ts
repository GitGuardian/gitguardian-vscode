import assert from "assert";
import * as path from "path";
import * as fs from "fs";

import * as getGGShieldUtils from "../../../lib/ggshield-resolver-utils";
import { ExtensionContext, window, OutputChannel } from "vscode";

suite("getGGShield", () => {
  let tempDir: string;
  let mockContext: ExtensionContext;
  const outputChannel: OutputChannel =
    window.createOutputChannel("GitGuardian");
  const platform = process.platform;

  setup(() => {
    tempDir = fs.mkdtempSync(__dirname);
    mockContext = {
      extensionPath: tempDir,
    } as ExtensionContext;
    // copy ggshield_version file to tempDir
    fs.copyFileSync(
      path.join(__dirname, "..", "..", "..", "..", "ggshield_version"),
      path.join(tempDir, "ggshield_version"),
    );
  });

  teardown(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  test("returns bundled binary path when binary exists", () => {
    const binaryPath = createFakeBundledBinary(tempDir, platform);
    const result = getGGShieldUtils.getGGShield(
      platform,
      mockContext,
      outputChannel,
    );

    assert.strictEqual(result, binaryPath);
    assert(fs.existsSync(result));
  });

  test("throws when bundled binary does not exist", () => {
    assert.throws(() => {
      getGGShieldUtils.getGGShield(platform, mockContext, outputChannel);
    }, /Bundled ggshield binary not found/);
  });
});

suite("getBundledGGShieldPath", () => {
  const cases: { platform: NodeJS.Platform; expectedBinary: string }[] = [
    { platform: "darwin", expectedBinary: "ggshield" },
    { platform: "linux", expectedBinary: "ggshield" },
    { platform: "win32", expectedBinary: "ggshield.exe" },
  ];

  cases.forEach(({ platform, expectedBinary }) => {
    test(`returns correct path for ${platform}`, () => {
      const context = {
        extensionPath: "/ext",
      } as ExtensionContext;

      const result = getGGShieldUtils.getBundledGGShieldPath(platform, context);
      assert.strictEqual(
        result,
        path.join("/ext", "ggshield-bundled", expectedBinary),
      );
    });
  });
});

suite("getGGShieldVersion", () => {
  test("reads version from ggshield_version file", () => {
    const tempDir = fs.mkdtempSync(__dirname);
    try {
      fs.writeFileSync(path.join(tempDir, "ggshield_version"), "1.49.0\n");
      const context = { extensionPath: tempDir } as ExtensionContext;
      const version = getGGShieldUtils.getGGShieldVersion(context);
      assert.strictEqual(version, "1.49.0");
    } finally {
      fs.rmSync(tempDir, { recursive: true });
    }
  });
});

function createFakeBundledBinary(
  tempDir: string,
  platform: NodeJS.Platform,
): string {
  const bundledDir = path.join(tempDir, "ggshield-bundled");
  const binaryName = platform === "win32" ? "ggshield.exe" : "ggshield";
  const binaryPath = path.join(bundledDir, binaryName);
  fs.mkdirSync(bundledDir, { recursive: true });
  fs.writeFileSync(binaryPath, "fake binary content");
  return binaryPath;
}
