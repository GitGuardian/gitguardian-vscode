import * as tar from "tar"; // For extracting tar.gz files

export interface Binary {
  downloadUrl: string;
  fileName: string;
}

export function getBinaryDownloadUrl(
  platform: NodeJS.Platform,
  arch: string
): Binary {
  if (platform === "win32") {
    return {
      downloadUrl: `https://github.com/GitGuardian/ggshield/releases/latest/download/ggshield-1.30.1-x86_64-pc-windows-msvc.zip`,
      fileName: "ggshield-1.30.1-x86_64-pc-windows-msvc",
    };
  } else if (platform === "darwin") {
    if (arch === "arm64") {
      return {
        downloadUrl: `https://github.com/GitGuardian/ggshield/releases/latest/download/ggshield-1.30.1-arm64-apple-darwin.pkg`,
        fileName: "ggshield-1.30.1-arm64-apple-darwin.pkg",
      };
    } else {
      return {
        downloadUrl: `https://github.com/GitGuardian/ggshield/releases/latest/download/ggshield-1.30.1-x86_64-apple-darwin.pkg`,
        fileName: "ggshield-1.30.1-x86_64-apple-darwin.pkg",
      };
    }
  } else if (platform === "linux") {
    return {
      downloadUrl: `https://github.com/GitGuardian/ggshield/releases/latest/download/ggshield-1.30.1-x86_64-unknown-linux-gnu.tar.gz`,
      fileName: "ggshield-1.30.1-x86_64-unknown-linux-gnu.tar.gz",
    };
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

// export function extractZip(zipPath: string, destPath: string): Promise<void> {
//     return new Promise((resolve, reject) => {
//         createReadStream(zipPath)
//             .pipe(unzipper.Extract({ path: destPath }))
//             .on('close', resolve)
//             .on('error', reject);
//     });
// }

// export function installPkg(pkgPath: string): Promise<void> {
//     return new Promise((resolve, reject) => {
//         exec(`sudo installer -pkg ${pkgPath} -target /`, (error, stdout, stderr) => {
//             if (error) {
//                 reject(new Error(`Failed to install pkg: ${stderr}`));
//             } else {
//                 resolve();
//             }
//         });
//     });
// }

// export async function extractTarGz(tarGzPath: string, destPath: string): Promise<void> {
//     return new Promise((resolve, reject) => {
//         tar.x({
//             file: tarGzPath,
//             cwd: destPath,
//             strip: 1,
//             onentry: (entry) => {
//                 console.log(`Extracting ${entry.path}`);
//             }
//         })
//         .then(() => {
//             console.log(`Extraction complete. Files extracted to ${destPath}`);
//             resolve();
//         })
//         .catch((err) => {
//             console.error(`Extraction failed: ${err.message}`);
//             reject(err);
//         });
//     });
// }
