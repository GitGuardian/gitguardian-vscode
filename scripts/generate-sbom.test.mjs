import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  GGSHIELD_TARGETS,
  buildSbom,
  bundledNpmPackages,
  checkGgshieldSbom,
  ggshieldSbomUrl,
  npmPurl,
} from "./generate-sbom.mjs";

function writePackage(rootDir, packageDir, manifest) {
  mkdirSync(path.join(rootDir, packageDir), { recursive: true });
  writeFileSync(
    path.join(rootDir, packageDir, "package.json"),
    JSON.stringify(manifest),
  );
}

function ggshieldSbom(version = "1.57.0", target = "x86_64-unknown-linux-gnu") {
  const ref = `pkg:pypi/ggshield@${version}`;
  return {
    metadata: {
      component: {
        type: "application",
        "bom-ref": ref,
        name: "ggshield",
        version,
      },
      properties: [{ name: "ggshield:target", value: target }],
    },
    components: [
      {
        type: "library",
        "bom-ref": "pkg:pypi/requests@2.32.0",
        name: "requests",
        version: "2.32.0",
      },
    ],
    dependencies: [
      { ref, dependsOn: ["pkg:pypi/requests@2.32.0"] },
      { ref: "pkg:pypi/requests@2.32.0", dependsOn: [] },
    ],
  };
}

const manifest = {
  name: "gitguardian",
  displayName: "GitGuardian - Secrets Security",
  publisher: "gitguardian-secret-security",
  version: "0.26.0",
  license: "MIT",
  repository: "https://github.com/GitGuardian/gitguardian-vscode",
};

describe("bundledNpmPackages", () => {
  it("lists each package esbuild bundled files from, once", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "sbom-"));
    writePackage(rootDir, "node_modules/semver", {
      name: "semver",
      version: "7.6.0",
      license: "ISC",
    });
    writePackage(rootDir, "node_modules/@scope/pkg", {
      name: "@scope/pkg",
      version: "1.0.0",
    });
    writePackage(rootDir, "node_modules/@scope/pkg/node_modules/nested", {
      name: "nested",
      version: "2.0.0",
      license: "MIT",
    });
    const metafile = {
      inputs: {
        "src/extension.ts": {},
        "node_modules/semver/index.js": {},
        "node_modules/semver/functions/parse.js": {},
        "node_modules/@scope/pkg/lib/index.js": {},
        "node_modules/@scope/pkg/node_modules/nested/index.js": {},
      },
    };

    assert.deepEqual(bundledNpmPackages(metafile, rootDir), [
      { name: "@scope/pkg", version: "1.0.0", license: undefined },
      { name: "nested", version: "2.0.0", license: "MIT" },
      { name: "semver", version: "7.6.0", license: "ISC" },
    ]);
  });

  it("finds nothing when only first-party code is bundled", () => {
    const metafile = { inputs: { "src/extension.ts": {}, "src/utils.ts": {} } };
    assert.deepEqual(bundledNpmPackages(metafile, "/nonexistent"), []);
  });
});

describe("npmPurl", () => {
  it("percent-encodes the scope", () => {
    assert.equal(npmPurl("@scope/pkg", "1.0.0"), "pkg:npm/%40scope/pkg@1.0.0");
    assert.equal(npmPurl("semver", "7.6.0"), "pkg:npm/semver@7.6.0");
    assert.equal(
      npmPurl("pkg", "1.0.0+build.1"),
      "pkg:npm/pkg@1.0.0%2Bbuild.1",
    );
  });
});

describe("checkGgshieldSbom", () => {
  it("accepts the SBOM of the pinned version and target", () => {
    checkGgshieldSbom(ggshieldSbom(), "1.57.0", "x86_64-unknown-linux-gnu");
  });

  it("rejects another version or target", () => {
    assert.throws(
      () =>
        checkGgshieldSbom(ggshieldSbom(), "1.58.0", "x86_64-unknown-linux-gnu"),
      /expected the SBOM of ggshield 1.58.0/,
    );
    assert.throws(
      () => checkGgshieldSbom(ggshieldSbom(), "1.57.0", "x86_64-apple-darwin"),
      /for x86_64-apple-darwin, got ggshield 1.57.0 for x86_64-unknown-linux-gnu/,
    );
  });
});

describe("ggshieldSbomUrl", () => {
  it("points to the asset of the ggshield release", () => {
    assert.equal(
      ggshieldSbomUrl("1.57.0", GGSHIELD_TARGETS["win32-arm64"]),
      "https://github.com/GitGuardian/ggshield/releases/download/v1.57.0/" +
        "ggshield-1.57.0-x86_64-pc-windows-msvc.cdx.json",
    );
  });
});

describe("buildSbom", () => {
  const url = ggshieldSbomUrl("1.57.0", "x86_64-unknown-linux-gnu");
  const sbom = buildSbom({
    manifest,
    vscodeTarget: "linux-x64",
    npmPackages: [{ name: "semver", version: "7.6.0", license: "ISC" }],
    ggshieldSbom: ggshieldSbom(),
    ggshieldSbomUrl: url,
    timestamp: "2026-10-21T00:00:00Z",
  });
  const extensionRef = "gitguardian-secret-security.gitguardian@0.26.0";

  it("describes the extension for its target", () => {
    assert.equal(sbom.specVersion, "1.5");
    assert.equal(sbom.metadata.component["bom-ref"], extensionRef);
    assert.deepEqual(sbom.metadata.component.licenses, [{ expression: "MIT" }]);
    assert.deepEqual(sbom.metadata.component.properties, [
      { name: "vscode:target", value: "linux-x64" },
    ]);
  });

  it("nests the ggshield components under ggshield", () => {
    const ggshield = sbom.components.find((c) => c.name === "ggshield");
    assert.equal(ggshield["bom-ref"], "pkg:pypi/ggshield@1.57.0");
    assert.deepEqual(
      ggshield.components.map((c) => c["bom-ref"]),
      ["pkg:pypi/requests@2.32.0"],
    );
    assert.deepEqual(ggshield.externalReferences[0], { type: "bom", url });
  });

  it("links the extension to its npm packages and ggshield", () => {
    const deps = Object.fromEntries(
      sbom.dependencies.map((d) => [d.ref, d.dependsOn]),
    );
    assert.deepEqual(deps[extensionRef], [
      "pkg:npm/semver@7.6.0",
      "pkg:pypi/ggshield@1.57.0",
    ]);
    assert.deepEqual(deps["pkg:pypi/ggshield@1.57.0"], [
      "pkg:pypi/requests@2.32.0",
    ]);
  });

  it("leaves the bom reference out without a URL", () => {
    const local = buildSbom({
      manifest,
      vscodeTarget: "linux-x64",
      npmPackages: [],
      ggshieldSbom: ggshieldSbom(),
      timestamp: "2026-10-21T00:00:00Z",
    });
    const ggshield = local.components.find((c) => c.name === "ggshield");
    assert.ok(!ggshield.externalReferences.some((r) => r.type === "bom"));
  });
});
