export interface Binary {
  binary: string;
  executable: string;
}

export function getBinaryAbsolutePath(
  platform: NodeJS.Platform,
  arch: string
): Binary {
  let executable: string = "";
  let binary: string = "";
  console.log(`Platform: ${platform}; Arch: ${arch}`);
  switch (platform) {
    case "win32":
      executable = "ggshield.exe";
      break;
    case "linux":
    case "darwin":
      executable = "ggshield";
      break;
    default:
      console.log(`Unsupported platform - ${platform}`);
      throw new Error(`Unsupported platform: ${platform}`);
  }

  switch (arch) {
    case "x64":
    case "x86":
      binary = `ggshield-x86_64-${platform}`;
      break;
    case "arm64":
      binary = `ggshield-arm64-${platform}`;
      break;
    default:
      console.log(`Unsupported architecture - ${arch}`);
      throw new Error(`Unsupported architecture: ${arch}`);
  }
  console.log(`Binary: ${binary}`);
  return {
    binary: binary,
    executable: executable,
  };
}
