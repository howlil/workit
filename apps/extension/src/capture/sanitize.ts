/**
 * Lightweight HTML sanitization for captured job descriptions.
 * Removes script tags, iframes, inline event handlers, and dangerous attributes.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  return html
    // Remove script, style, iframe, object, embed tags and their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    // Remove inline event handlers (onload, onclick, onerror, etc.)
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
    // Remove javascript: hrefs
    .replace(/href\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*")/gi, 'href="#"')
    .trim();
}

/**
 * Converts HTML into clean plain text for search, embeddings, and previews.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";

  return html
    // Replace block-level tags with newlines
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    // Strip all remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize whitespace while preserving single newlines
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, arr) => line.length > 0 || (index > 0 && arr[index - 1]?.length !== 0))
    .join("\n")
    .trim();
}
