import { writeFileSync } from "node:fs";
import { build, context } from "esbuild";

const production = process.argv.includes("--production");
const watchMode = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  format: "cjs",
  minify: production,
  sourcemap: !production,
  outfile: "dist/extension.js",
  external: ["vscode"],
  platform: "node",
  metafile: production,
};

if (watchMode) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  const result = await build(options).catch(() => process.exit(1));
  if (production) {
    // Lists the npm packages bundled into the extension, for its SBOM
    writeFileSync("dist/esbuild-meta.json", JSON.stringify(result.metafile));
  }
}
