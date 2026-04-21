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
