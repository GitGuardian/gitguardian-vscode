export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function sanitizeInstanceUrl(instance: string): string {
  try {
    const url = new URL(instance);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }
    return escapeHtml(url.origin);
  } catch {
    return "";
  }
}

export function renderSelfHostedHint(): string {
  return `<p class="self-hosted-hint">Using a self-hosted instance?</p>
          <button class="button secondary" id="openInstanceSettings">Configure instance URL</button>`;
}

export function renderCurrentInstanceLine(instance: string): string {
  const sanitized = sanitizeInstanceUrl(instance);
  return sanitized
    ? `<p class="self-hosted-current">Connecting to <code>${sanitized}</code></p>`
    : "";
}
