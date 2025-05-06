import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as tar from "tar";
const AdmZip = require("adm-zip");
import * as getGGShieldUtils from "../../../lib/ggshield-resolver-utils";
import { ExtensionContext, window, OutputChannel } from "vscode";

suite("getGGShield integration tests", async () => {
  let tempDir: string;
  let mockContext: ExtensionContext;
  let version: string;
  let outputChannel: OutputChannel = window.createOutputChannel("GitGuardian");
  const platform = process.platform;
  const arch = process.arch;
  let originalLog: (message?: any, ...optionalParams: any[]) => void;
  let output: string;

  setup(() => {
    // Create temp directory for tests
    tempDir = fs.mkdtempSync(__dirname);
    mockContext = {
      extensionPath: tempDir,
    } as ExtensionContext;
    // copy ggshield_version file to tempDir
    fs.copyFileSync(
      path.join(__dirname, "..", "..", "..", "..", "ggshield_version"),
      path.join(tempDir, "ggshield_version"),
    );
    version = getGGShieldUtils.getGGShieldVersion(mockContext);
    output = ""; // Reset captured output before each test
    originalLog = console.log; // Store original console.log

    console.log = (message: string) => {
      output += message;
    };
  });

  teardown(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
      console.log = originalLog; // Restore original console.log
    }
  });

  test("returns existing binary path when binary exists", async () => {
    const binaryPath: string = createFakeBinary(
      tempDir,
      platform,
      arch,
      version,
    );
    const result = await getGGShieldUtils.getGGShield(
      platform,
      arch,
      mockContext,
      outputChannel,
      false,
    );

    assert.strictEqual(result, binaryPath);
    assert(fs.existsSync(result));
    assert(result.includes(version));
    assert(
      !output.includes("Updated to GGShield"),
      "installGGShield should not be called when binary exists",
    );
  });

  test("installs binary when it doesn't exist", async () => {
    const expectedBinaryPath: string = getGGShieldUtils.computeGGShieldPath(
      platform,
      arch,
      path.join(tempDir, "ggshield-internal"),
      version,
    );
    assert(!fs.existsSync(expectedBinaryPath));

    const result = await getGGShieldUtils.getGGShield(
      platform,
      arch,
      mockContext,
      outputChannel,
      false,
    );

    assert(fs.existsSync(result));
    assert.strictEqual(result, expectedBinaryPath);
    assert(result.includes(version));
    assert(
      !output.includes("Updated to GGShield"),
      "installGGShield should be called once when binary doesn't exist",
    );
  });

  test("updates binary when newer version set by ggshield_version file", async () => {
    const oldBinaryPath: string = createFakeBinary(
      tempDir,
      platform,
      arch,
      "1.0.0",
    );
    const result = await getGGShieldUtils.getGGShield(
      platform,
      arch,
      mockContext,
      outputChannel,
      false,
    );

    assert(fs.existsSync(result));
    assert(result.includes(version));
    assert(!fs.existsSync(oldBinaryPath));
    assert(
      !output.includes("Updated to GGShield"),
      "installGGShield should be called once when updating binary",
    );
  });
});

function createFakeBinary(
  tempDir: string,
  platform: NodeJS.Platform,
  arch: string,
  version: string,
): string {
  const ggshieldFolder: string = path.join(tempDir, "ggshield-internal");
  const binaryName: string = platform === "win32" ? "ggshield.exe" : "ggshield";
  const versionFolder: string = path.join(
    ggshieldFolder,
    `${getGGShieldUtils.computeGGShieldFolderName(platform, arch, version)}`,
  );
  const binaryPath: string = path.join(versionFolder, binaryName);
  fs.mkdirSync(versionFolder, { recursive: true });
  fs.writeFileSync(binaryPath, "fake binary content");
  return binaryPath;
}

suite("ggshield-resolver-utils", () => {
  suite("computeGGShieldPath", () => {
    const version = "1.0.0";
    const ggshieldFolder = "/path/to/ggshield";

    test("computes correct path for Windows", () => {
      const result = getGGShieldUtils.computeGGShieldPath(
        "win32",
        "x64",
        ggshieldFolder,
        version,
      );
      assert.strictEqual(
        result,
        path.join(
          ggshieldFolder,
          "ggshield-1.0.0-x86_64-pc-windows-msvc",
          "ggshield.exe",
        ),
      );
    });
    test("computes correct path for Windows arm64", () => {
      const result = getGGShieldUtils.computeGGShieldPath(
        "win32",
        "arm64",
        ggshieldFolder,
        version,
      );
      assert.strictEqual(
        result,
        path.join(
          ggshieldFolder,
          "ggshield-1.0.0-x86_64-pc-windows-msvc",
          "ggshield.exe",
        ),
      );
    });

    test("computes correct path for Linux", () => {
      const result = getGGShieldUtils.computeGGShieldPath(
        "linux",
        "x64",
        ggshieldFolder,
        version,
      );
      assert.strictEqual(
        result,
        path.join(
          ggshieldFolder,
          "ggshield-1.0.0-x86_64-unknown-linux-gnu",
          "ggshield",
        ),
      );
    });

    test("computes correct path for macOS x64", () => {
      const result = getGGShieldUtils.computeGGShieldPath(
        "darwin",
        "x64",
        ggshieldFolder,
        version,
      );
      assert.strictEqual(
        result,
        path.join(
          ggshieldFolder,
          "ggshield-1.0.0-x86_64-apple-darwin",
          "ggshield",
        ),
      );
    });

    test("computes correct path for macOS arm64", () => {
      const result = getGGShieldUtils.computeGGShieldPath(
        "darwin",
        "arm64",
        ggshieldFolder,
        version,
      );
      assert.strictEqual(
        result,
        path.join(
          ggshieldFolder,
          "ggshield-1.0.0-arm64-apple-darwin",
          "ggshield",
        ),
      );
    });

    test("throws error for unsupported platform", () => {
      assert.throws(() => {
        getGGShieldUtils.computeGGShieldPath(
          "sunos",
          "x64",
          ggshieldFolder,
          version,
        );
      }, /Unsupported platform/);
    });

    test("throws error for unsupported architecture", () => {
      assert.throws(() => {
        getGGShieldUtils.computeGGShieldPath(
          "darwin",
          "mips",
          ggshieldFolder,
          version,
        );
      }, /Unsupported architecture/);
    });
  });

  suite("extractGGShieldBinary", () => {
    const testContent = "hello world";
    const testFileName = "test.txt";
    let tempDir: string;
    let tarGzPath: string;
    let zipPath: string;

    setup(() => {
      // Create temporary directory
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ggshield-test-"));

      // Create test file
      const testFilePath = path.join(tempDir, testFileName);
      fs.writeFileSync(testFilePath, testContent);

      // Create tar.gz archive
      tarGzPath = path.join(tempDir, "archive.tar.gz");
      tar.create(
        {
          gzip: true,
          file: tarGzPath,
          cwd: tempDir,
          sync: true,
        },
        [testFileName],
      );

      // Create zip archive
      zipPath = path.join(tempDir, "archive.zip");
      const zip = new AdmZip();
      zip.addFile(testFileName, Buffer.from(testContent));
      zip.writeZip(zipPath);
    });

    teardown(() => {
      // Clean up temporary directory and its contents
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test("extracts tar.gz files correctly", () => {
      const extractDir = path.join(tempDir, "extract-tar");
      fs.mkdirSync(extractDir);

      getGGShieldUtils.extractGGShieldBinary(tarGzPath, extractDir);

      const extractedContent = fs.readFileSync(
        path.join(extractDir, testFileName),
        "utf8",
      );
      assert.strictEqual(extractedContent, testContent);
    });

    test("extracts zip files correctly", () => {
      const extractDir = path.join(tempDir, "extract-zip");
      fs.mkdirSync(extractDir);

      getGGShieldUtils.extractGGShieldBinary(zipPath, extractDir);

      const extractedContent = fs.readFileSync(
        path.join(extractDir, testFileName),
        "utf8",
      );
      assert.strictEqual(extractedContent, testContent);
    });

    test("throws error for unsupported file extension", () => {
      const rarPath = path.join(tempDir, "archive.rar");
      fs.writeFileSync(rarPath, "unsupported file extension");

      assert.throws(() => {
        getGGShieldUtils.extractGGShieldBinary(rarPath, tempDir);
      }, /Unsupported file extension/);
    });
  });
});
