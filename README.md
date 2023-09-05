# GitGuardian's ggshield VSCode extension

## Table of contents

- [GitGuardian's ggshield VSCode extension](#gitguardians-ggshield-vscode-extension)
  - [Table of contents](#table-of-contents)
  - [Description](#description)
    - [Features](#features)
  - [Getting started](#getting-started)
    - [Requirements](#requirements)
    - [Installation](#installation)
    - [Configuration](#configuration)
  - [Known issues](#known-issues)
  - [Support, Feedback, Contributing](#support-feedback-contributing)
  - [Release Notes](#release-notes)
  - [License](#license)

## Description

This extension helps you detect more than 350+ types of secrets, as well as other potential security vulnerabilities or policy breaks affecting your codebase, directly from VSCode using [ggshield](https://www.gitguardian.com/ggshield)) CLI application.

NB: The extension uses the quota of secret detection of your ggshield API token.

### Features

- When a file is opened or saved, it is scanned using the ggshield CLI application
- Found incidents are highlighted in code and available in the `Problems` panel as warnings

## Getting started

### Requirements

The extension requires `ggshield` to be installed. See [documentation](https://docs.gitguardian.com/ggshield-docs/getting-started) for more details on how to install and use it.

The current minimum version is 1.17.0 (TODO: check minimum version)

### Installation

To test the plugin, open this project with VSCode and press F5, a window called "Development Host" will open with the extension loaded.  
You then need to set up the extension settings.

Once released it will installed directly from the VS Code Marketplace.

### Configuration

- `ggshield.ggshieldPath`: Path to ggshield executable (use `$ where ggshield` to find out)
- `ggshield.apiKey`: GitGuardian Internal Monitoring API key
- `ggshield.apiUrl`: GitGuardian Internal Monitoring URL (default: <https://api.gitguardian.com/>)

## Known issues

- During starting debug with files already open, the VSCode API is triggered on a non-existent read-only file with `.git` extension.

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via GitHub issues. Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our Contribution Guidelines.

## Release Notes

See [Change log](./CHANGELOG.md)

## License

ggshield and this extension are MIT licensed.

- Extension not tested

- Not all the output of ggshield is visible in the diagnostics (e.g. validity or secret SHA) => to be added
- No help to remediate to incidents is offered => at least a link to doc for the first version

- Exclude files with pattern to save quota => check if available in ggshield / otherwise config file
- Check minimum VSCode engine version
- Add screenshots
