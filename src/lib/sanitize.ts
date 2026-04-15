import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                   'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
                   'span', 'div', 'hr', 'img', 'a', 'b', 'i', 's', 'del', 'strike', 'sub', 'sup', 'blockquote'],
    ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'width', 'height'],
    ALLOW_DATA_ATTR: false,
  });
}
