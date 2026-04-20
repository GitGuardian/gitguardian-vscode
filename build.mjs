import { build, context } from "esbuild";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const watchMode = process.argv.includes("--watch");

function findTs(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory()
      ? findTs(full)
      : full.endsWith(".ts")
        ? [full]
        : [];
  });
}

const options = {
  entryPoints: findTs("src"),
  bundle: false,
  format: "cjs",
  platform: "node",
  sourcemap: true,
  outdir: "out",
  outbase: "src",
};

if (watchMode) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options).catch(() => process.exit(1));
}
