# GitGuardian for VS Code

Detect secrets in real time and retroactively across extensive sources, with no limit to your team’s scale. GitGuardian grows with you, securing both new and legacy codebases with unmatched precision.

Whether you’re a solo developer or part of a team, GitGuardian scales with you, catching secrets in every language, every repo, and every branch.

![Incident highlighted](https://raw.githubusercontent.com/GitGuardian/gitguardian-vscode/main/doc/incident_highlighted_dark.png)

### Key Features

- **Automatic Scanning**: Each time you save a file, GitGuardian scans for over 400+ types of secrets using the bundled GitGuardian CLI (`ggshield`).
- **Secret Detection & Alerts**: Detected secrets are highlighted in your code and displayed as warnings in the `Problems` panel.
- **Easy Ignore Option**: Ignore secrets quickly with the command `GitGuardian: Ignore Last Found Incidents` or directly via the UI.

### Get Started in 3 Steps

1. **Authenticate**: Link your IDE to your GitGuardian account with one click. For on-premise users, enter your custom URL and API key in settings.
2. **Scan on Save**: Save a file to trigger an automatic scan. Incidents show up instantly in your file and Problems panel.
3. **Remediate with Guidance**: View remediation tips right in the extension’s side panel. Security teams can customize messages for precise guidance.

### Additional Features

- **Ignore Secrets**: After a scan, hover over the identified secret and select "GitGuardian: Ignore Secret" to add it to `.gitguardian.yaml`.
- **Quota Tracking**: Run "GitGuardian: Show Quota" to monitor API call usage. Personal accounts include up to 10,000 monthly API calls.
    - **Check API Quota**: Stay aware of usage by running "GitGuardian: Show Quota."

### Support & Contributions

- **Report Issues**: [Submit bug reports](https://github.com/GitGuardian/gitguardian-vscode/issues/new/choose).
- **Feature Requests & Ideas**: [Join discussions](https://github.com/GitGuardian/gitguardian-vscode/discussions).
- **Security Reports**: Use our [Vulnerability Disclosure Portal](https://vdp.gitguardian.com).

### Release Notes & License

- **Updates**: See the [Changelog](https://github.com/GitGuardian/gitguardian-vscode/blob/main/CHANGELOG.md).
- **License**: GitGuardian CLI (`ggshield`) and this extension are MIT licensed.