import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import {
  computeGGShieldPath,
  extractGGShieldBinary,
} from "../../../lib/ggshield-resolver-utils";
import * as tar from "tar";
const AdmZip = require("adm-zip");

suite("ggshield-resolver-utils", () => {
  suite("computeGGShieldPath", () => {
    const version = "1.0.0";
    const ggshieldFolder = "/path/to/ggshield";

    test("computes correct path for Windows", () => {
      const result = computeGGShieldPath(
        "win32",
        "x64",
        ggshieldFolder,
        version
      );
      assert.strictEqual(
        result,
        path.join(
          ggshieldFolder,
          "ggshield-1.0.0-x86_64-pc-windows-msvc",
          "ggshield.exe"
        )
      );
    });

    test("computes correct path for Linux", () => {
      const result = computeGGShieldPath(
        "linux",
        "x64",
        ggshieldFolder,
        version
      );
      assert.strictEqual(
        result,
        path.join(
          ggshieldFolder,
          "ggshield-1.0.0-x86_64-unknown-linux-gnu",
          "ggshield"
        )
      );
    });

    test("computes correct path for macOS x64", () => {
      const result = computeGGShieldPath(
        "darwin",
        "x64",
        ggshieldFolder,
        version
      );
      assert.strictEqual(
        result,
        path.join(
          ggshieldFolder,
          "ggshield-1.0.0-x86_64-apple-darwin",
          "ggshield"
        )
      );
    });

    test("computes correct path for macOS arm64", () => {
      const result = computeGGShieldPath(
        "darwin",
        "arm64",
        ggshieldFolder,
        version
      );
      assert.strictEqual(
        result,
        path.join(
          ggshieldFolder,
          "ggshield-1.0.0-arm64-apple-darwin",
          "ggshield"
        )
      );
    });

    test("throws error for unsupported platform", () => {
      assert.throws(() => {
        computeGGShieldPath("sunos", "x64", ggshieldFolder, version);
      }, /Unsupported platform/);
    });

    test("throws error for unsupported architecture", () => {
      assert.throws(() => {
        computeGGShieldPath("darwin", "mips", ggshieldFolder, version);
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
        [testFileName]
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

      extractGGShieldBinary(tarGzPath, extractDir);

      const extractedContent = fs.readFileSync(
        path.join(extractDir, testFileName),
        "utf8"
      );
      assert.strictEqual(extractedContent, testContent);
    });

    test("extracts zip files correctly", () => {
      const extractDir = path.join(tempDir, "extract-zip");
      fs.mkdirSync(extractDir);

      extractGGShieldBinary(zipPath, extractDir);

      const extractedContent = fs.readFileSync(
        path.join(extractDir, testFileName),
        "utf8"
      );
      assert.strictEqual(extractedContent, testContent);
    });

    test("throws error for unsupported file extension", () => {
      const rarPath = path.join(tempDir, "archive.rar");
      fs.writeFileSync(rarPath, "unsupported file extension");

      assert.throws(() => {
        extractGGShieldBinary(rarPath, tempDir);
      }, /Unsupported file extension/);
    });
  });
});
