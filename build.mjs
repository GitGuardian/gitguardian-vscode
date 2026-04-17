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
};

if (watchMode) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options).catch(() => process.exit(1));
}
