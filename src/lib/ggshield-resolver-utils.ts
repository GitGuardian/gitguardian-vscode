export interface Binary {
  binary: string;
  executable: string;
}

export function getBinaryAbsolutePath(
  platform: NodeJS.Platform,
  arch: string
): Binary {
  if (platform === "win32") {
    return {
      binary: "ggshield-1.30.1-x86_64-pc-windows-msvc",
      executable: "ggshield.exe",
    };
  } else if (platform === "darwin") {
    if (arch === "arm64") {
      return {
        binary: "ggshield-1.30.1-arm64-apple-darwin",
        executable: "ggshield",
      };
    } else {
      return {
        binary: `ggshield-1.30.1-x86_64-apple-darwin`,
        executable: "ggshield",
      };
    }
  } else if (platform === "linux") {
    return {
      binary: "ggshield-1.30.1-x86_64-unknown-linux-gnu",
      executable: "ggshield",
    };
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}
