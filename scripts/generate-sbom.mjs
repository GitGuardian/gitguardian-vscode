#!/usr/bin/env node
// Generate the CycloneDX SBOM of a platform-specific VSIX: the extension, the
// npm packages esbuild bundled into dist/extension.js, and the bundled ggshield
// with the components listed in the SBOM of its own release.
//
// Run it after `vsce package --target <target>`, which writes the esbuild
// metafile and downloads ggshield into ggshield-bundled/.

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

// VS Code target -> ggshield release target.
// Keep in sync with scripts/download-ggshield.sh.
export const GGSHIELD_TARGETS = {
  "darwin-x64": "x86_64-apple-darwin",
  "darwin-arm64": "arm64-apple-darwin",
  "linux-x64": "x86_64-unknown-linux-gnu",
  "win32-x64": "x86_64-pc-windows-msvc",
  "win32-arm64": "x86_64-pc-windows-msvc",
};

const GGSHIELD_RELEASES = "https://github.com/GitGuardian/ggshield/releases";

export function ggshieldSbomUrl(version, assetTarget) {
  return `${GGSHIELD_RELEASES}/download/v${version}/ggshield-${version}-${assetTarget}.cdx.json`;
}

export function npmPurl(name, version) {
  // The scope's "@" and a build metadata "+" must be percent-encoded in a purl
  return `pkg:npm/${name.replace(/^@/, "%40")}@${encodeURIComponent(version)}`;
}

/**
 * List the npm packages whose files esbuild bundled, from its metafile.
 */
export function bundledNpmPackages(metafile, rootDir) {
  const packages = new Map();
  for (const input of Object.keys(metafile.inputs)) {
    const parts = input.split("/");
    const index = parts.lastIndexOf("node_modules");
    if (index === -1) {
      continue;
    }
    const nameLength = parts[index + 1].startsWith("@") ? 2 : 1;
    const packageDir = parts.slice(0, index + 1 + nameLength).join("/");
    if (packages.has(packageDir)) {
      continue;
    }
    const manifest = JSON.parse(
      readFileSync(path.join(rootDir, packageDir, "package.json"), "utf8"),
    );
    packages.set(packageDir, {
      name: manifest.name,
      version: manifest.version,
      license: manifest.license,
    });
  }
  return [...packages.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fail unless `sbom` is the ggshield SBOM for this version and target.
 */
export function checkGgshieldSbom(sbom, version, assetTarget) {
  const component = sbom.metadata?.component ?? {};
  const target = (sbom.metadata?.properties ?? []).find(
    (p) => p.name === "ggshield:target",
  )?.value;
  if (
    component.name !== "ggshield" ||
    component.version !== version ||
    target !== assetTarget
  ) {
    throw new Error(
      `expected the SBOM of ggshield ${version} for ${assetTarget}, got ` +
        `${component.name} ${component.version} for ${target}`,
    );
  }
}

export function buildSbom({
  manifest,
  vscodeTarget,
  npmPackages,
  ggshieldSbom,
  ggshieldSbomUrl,
  timestamp,
}) {
  const extensionRef = `${manifest.publisher}.${manifest.name}@${manifest.version}`;
  const extension = {
    type: "application",
    "bom-ref": extensionRef,
    publisher: "GitGuardian",
    group: manifest.publisher,
    name: manifest.name,
    version: manifest.version,
    description: manifest.displayName,
    licenses: [{ expression: manifest.license }],
    externalReferences: [
      { type: "vcs", url: manifest.repository },
      {
        type: "distribution",
        url: `https://marketplace.visualstudio.com/items?itemName=${manifest.publisher}.${manifest.name}`,
      },
    ],
    properties: [{ name: "vscode:target", value: vscodeTarget }],
  };

  const npmComponents = npmPackages.map(({ name, version, license }) => ({
    type: "library",
    "bom-ref": npmPurl(name, version),
    name,
    version,
    ...(license ? { licenses: [{ expression: license }] } : {}),
    purl: npmPurl(name, version),
  }));

  // ggshield ships as a whole: its components nest under it
  const ggshieldRoot = ggshieldSbom.metadata.component;
  const ggshield = {
    ...ggshieldRoot,
    externalReferences: [
      ...(ggshieldSbomUrl ? [{ type: "bom", url: ggshieldSbomUrl }] : []),
      { type: "vcs", url: "https://github.com/GitGuardian/ggshield" },
    ],
    components: ggshieldSbom.components,
  };

  return {
    $schema: "http://cyclonedx.org/schema/bom-1.5.schema.json",
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp,
      tools: {
        components: [
          {
            type: "application",
            name: "gitguardian-vscode scripts/generate-sbom.mjs",
          },
        ],
      },
      component: extension,
      supplier: { name: "GitGuardian", url: ["https://www.gitguardian.com"] },
    },
    components: [...npmComponents, ggshield],
    dependencies: [
      {
        ref: extensionRef,
        dependsOn: [
          ...npmComponents.map((c) => c["bom-ref"]),
          ggshield["bom-ref"],
        ],
      },
      ...npmComponents.map((c) => ({ ref: c["bom-ref"], dependsOn: [] })),
      ...ggshieldSbom.dependencies,
    ],
  };
}

// Returns null when the ggshield release has no SBOM
async function downloadGgshieldSbom(url) {
  const response = await fetch(url);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`failed to download ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

function timestamp() {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  const date = epoch ? new Date(Number(epoch) * 1000) : new Date();
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function main() {
  const { values } = parseArgs({
    options: {
      target: { type: "string", default: process.env.GGSHIELD_TARGET },
      output: { type: "string", short: "o" },
      "ggshield-sbom": { type: "string" },
      "allow-missing-ggshield-sbom": { type: "boolean", default: false },
    },
  });
  const vscodeTarget = values.target;
  const assetTarget = GGSHIELD_TARGETS[vscodeTarget];
  if (!assetTarget || !values.output) {
    console.error(
      "Usage: generate-sbom.mjs --target <vscode-target> --output <file> " +
        "[--ggshield-sbom <file> | --allow-missing-ggshield-sbom]\n" +
        `Supported targets: ${Object.keys(GGSHIELD_TARGETS).join(", ")}`,
    );
    process.exit(1);
  }

  const manifest = JSON.parse(
    readFileSync(path.join(ROOT_DIR, "package.json"), "utf8"),
  );
  const ggshieldVersion = readFileSync(
    path.join(ROOT_DIR, "ggshield_version"),
    "utf8",
  ).trim();

  const metafilePath = path.join(ROOT_DIR, "dist", "esbuild-meta.json");
  if (!existsSync(metafilePath)) {
    throw new Error(`${metafilePath} not found: run a production build first`);
  }
  const metafile = JSON.parse(readFileSync(metafilePath, "utf8"));

  // --ggshield-sbom is for ggshield releases that predate SBOMs, and has no
  // URL to point to
  let ggshieldSbom;
  let url;
  if (values["ggshield-sbom"]) {
    ggshieldSbom = JSON.parse(readFileSync(values["ggshield-sbom"], "utf8"));
  } else {
    url = ggshieldSbomUrl(ggshieldVersion, assetTarget);
    ggshieldSbom = await downloadGgshieldSbom(url);
    if (!ggshieldSbom) {
      const message =
        `${url} does not exist: pin a ggshield release that publishes ` +
        "SBOMs in ggshield_version";
      if (!values["allow-missing-ggshield-sbom"]) {
        throw new Error(message);
      }
      // GitHub Actions shows this as an annotation
      console.log(`::warning::${message}. No SBOM generated.`);
      return;
    }
  }
  checkGgshieldSbom(ggshieldSbom, ggshieldVersion, assetTarget);

  const sbom = buildSbom({
    manifest,
    vscodeTarget,
    npmPackages: bundledNpmPackages(metafile, ROOT_DIR),
    ggshieldSbom,
    ggshieldSbomUrl: url,
    timestamp: timestamp(),
  });
  writeFileSync(values.output, JSON.stringify(sbom, null, 2) + "\n");
  console.log(
    `${values.output}: ${sbom.components.length - 1} npm packages, ` +
      `ggshield ${ggshieldVersion} with ${ggshieldSbom.components.length} components`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}
