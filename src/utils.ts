import { spawnSync } from "child_process";

export async function isGitInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    let proc = spawnSync("git", ["--version"]);
    if (proc.error || proc.stderr.length > 0) {
      console.log(`git is not installed.`);
      resolve(false);
    } else {
      resolve(true);
    }
  });
}
