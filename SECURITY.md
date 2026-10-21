## Security

GitGuardian takes the security of our software products and services seriously, and that includes all source code repositories managed through our GitHub organization.

If you believe you have found a security vulnerability in any GitGuardian-owned repository, please report it using our [Vulnerability Disclosure Portal](https://vdp.gitguardian.com).

## Software Bill of Materials

Each [GitHub release](https://github.com/GitGuardian/gitguardian-vscode/releases) includes a CycloneDX SBOM per platform-specific package, named `gitguardian-<target>.cdx.json`. It lists:

- the npm packages bundled into the extension (none at the moment: the extension only uses the VS Code API and built-in Node.js modules),
- the bundled [ggshield](https://github.com/GitGuardian/ggshield), with the components of its own SBOM: Python packages, the Python runtime, OpenSSL builds and Rust crates.

To scan an SBOM for known vulnerabilities, run, for instance, `grype sbom:gitguardian-linux-x64.cdx.json`.

## Preferred Languages

We prefer all communications to be in English or French.
