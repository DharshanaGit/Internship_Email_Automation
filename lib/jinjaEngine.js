/**
 * Shortfundly Jinja Text Template Engine
 * User-friendly template compilation supporting {{variable}} tags, conditionals, and formatting.
 */

/**
 * Normalizes legacy HTML or formatted content into clean plain-text Jinja format.
 * Strips out raw <p>, <div>, <strong>, etc. so HR works with natural plain text.
 * @param {string} content 
 * @returns {string}
 */
export function normalizeToJinjaPlainText(content) {
  if (!content) return '';
  // If it doesn't contain HTML tags, return as trimmed string
  if (!/<[a-z][\s\S]*>/i.test(content)) {
    return content.trim();
  }

  return content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n**$1**\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '_$1_')
    .replace(/<i>(.*?)<\/i>/gi, '_$1_')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

/**
 * Replaces {{variable}} tags with corresponding context values.
 * @param {string} templateString 
 * @param {Record<string, any>} context 
 * @returns {string}
 */
export function renderJinja(templateString, context = {}) {
  if (!templateString) return '';

  const ctx = { ...context };
  if (ctx.responseUrl && !ctx.responseLink) {
    ctx.responseLink = ctx.responseUrl;
  }
  if (ctx.responseLink && !ctx.responseUrl) {
    ctx.responseUrl = ctx.responseLink;
  }

  let output = templateString;

  // 1. Process simple conditionals: {% if var %}...{% endif %}
  output = output.replace(/\{%\s*if\s+([a-zA-Z0-9_]+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, (match, key, inner) => {
    return ctx[key] ? inner : '';
  });

  // 2. Process variable tags: {{var}} or {{ var }}
  output = output.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (ctx[key] !== undefined && ctx[key] !== null) {
      return String(ctx[key]);
    }
    return '';
  });

  return output;
}

/**
 * Converts a plain-text Jinja template into clean, modern Gmail-compatible HTML email body.
 * Preserves paragraphs, links, bold terms, and branding.
 * @param {string} textContent 
 * @param {Record<string, any>} context 
 * @returns {string}
 */
export function jinjaTextToEmailHtml(textContent, context = {}) {
  // Normalize if raw HTML was supplied
  const cleanPlainText = normalizeToJinjaPlainText(textContent);
  const renderedText = renderJinja(cleanPlainText, context);

  // Convert linebreaks to paragraphs and bold **text** to <strong>
  const paragraphs = renderedText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      let formatted = p
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br />');

      // Convert URLs to hyperlinks if not already
      formatted = formatted.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color: #9333ea; font-weight: 600; text-decoration: underline;" target="_blank">$1</a>'
      );

      return `<p style="margin: 0 0 16px 0; line-height: 1.65; color: #1e293b; font-size: 14.5px;">${formatted}</p>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px;">
  <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
    <div style="background: #ffffff; padding: 22px 28px 16px 28px; text-align: left; border-bottom: 2px solid #e2e8f0;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 36px; height: 36px; border-radius: 8px; background: #7c3aed; display: inline-flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; line-height: 36px;">S</div>
        <div>
          <div style="color: #0f172a; margin: 0; font-size: 20px; letter-spacing: 1px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">SHORTFUNDLY</div>
          <div style="color: #64748b; margin: 2px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Official Operations &amp; Talent Dispatch</div>
        </div>
      </div>
    </div>
    <div style="padding: 32px 28px; background: #ffffff;">
      ${paragraphs}
    </div>
    <div style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
      <p style="margin: 0 0 4px 0;"><strong>Shortfundly Media Technologies Pvt. Ltd.</strong></p>
      <p style="margin: 0;">Chennai, Tamil Nadu, India &bull; <a href="https://www.shortfundly.com" style="color: #9333ea;">www.shortfundly.com</a> &bull; hr@shortfundly.com</p>
    </div>
  </div>
</body>
</html>`.trim();
}
