# GitGuardian Secret Security Changelog

## [0.5.0]

### Removed

- Removed GGShield path and API key from the extension settings

### Changed

- Improve the authentication process and add more information when it fails.
- Only display one problem when a secret URI is detected

### Added

- Added an option in the vscode settings to allow self-signed certificates

## [0.4.2]

### Fixed

- Default value for Gitguardian API Url is https://dashboard.gitguardian.com

## [0.4.1]

### Fixed

- Ensure all global environment variables are loaded before making API calls

## [0.4.0]

### Changed

- Load .env configuration and ensure environment specific settings are applied
- Prevent scanning gitignored files
- Status bar displays error when scanning ignored files

### Fixed

- Stop displaying error when scanning file ignored in .gitguardian.yaml

## [0.3.0]

### Changed

- Remove API key from settings
- Improve logging for invalid settings

### Fixed

- Handled Authentication if the .gitguardian.yaml is malformed

## [0.2.0]

### Changed

- Do not display CLI path in settings

## [0.1.0]

### Added

- One-Click Authentication
- Automatic Secret Scanning on Save
- Custom Remediation Guidelines
- Visibility into Usage Quota
