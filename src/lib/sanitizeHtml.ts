import DOMPurify from 'dompurify';

// Elements that have no place in a rendered email or signature and enable
// phishing (fake forms) or layout hijacking even after scripts are removed.
const FORBID_TAGS = ['form', 'input', 'button', 'textarea', 'select', 'option', 'iframe', 'frame', 'object', 'embed', 'base', 'meta', 'link', 'style'];

let hooksInstalled = false;

function installHooks() {
  if (hooksInstalled) return;
  // Open links outside the app and don't leak the CRM URL or window handle.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
  hooksInstalled = true;
}

/**
 * Sanitizes untrusted HTML (inbound email bodies, signatures) before it is passed to
 * `dangerouslySetInnerHTML`. Removes scripts, event handlers, `javascript:` URLs and
 * form/embedding elements. Returns '' during server rendering, where there is no DOM;
 * these values only arrive client-side from Firestore listeners.
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html || typeof window === 'undefined') return '';
  installHooks();
  return DOMPurify.sanitize(html, { FORBID_TAGS, USE_PROFILES: { html: true } });
}
