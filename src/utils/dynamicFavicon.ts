/**
 * Dynamic Favicon and Page Title Manager
 * Instantly updates the browser tab icon (<link rel="icon">) and document title in real-time
 * without requiring a hard refresh, ensuring the user immediately sees their brand logo in the tab.
 */

export function updateDocumentFavicon(iconUrl: string) {
  if (!iconUrl || typeof document === 'undefined') return;

  try {
    // 1. Find all icon links in <head>
    const existingIconLinks = document.querySelectorAll<HTMLLinkElement>(
      "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
    );

    // If iconUrl is a path (not data:), append timestamp to break aggressive browser favicon cache
    const finalUrl = iconUrl.startsWith('data:')
      ? iconUrl
      : `${iconUrl}${iconUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;

    if (existingIconLinks.length > 0) {
      existingIconLinks.forEach((link) => {
        link.href = finalUrl;
      });
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.type = 'image/png';
      newLink.href = finalUrl;
      document.head.appendChild(newLink);
    }

    // Force browser to notice change by cloning the favicon link tag
    const primaryIcon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (primaryIcon && primaryIcon.parentNode) {
      const clone = primaryIcon.cloneNode(true) as HTMLLinkElement;
      clone.href = finalUrl;
      primaryIcon.parentNode.replaceChild(clone, primaryIcon);
    }
  } catch (err) {
    console.warn('[updateDocumentFavicon] Notice:', err);
  }
}

export function updateDocumentTitle(title: string) {
  if (!title || typeof document === 'undefined') return;
  document.title = title;
}

/**
 * Gets the current active application icon from localStorage or companyProfile
 */
export function getActiveAppIcon(companyLogoUrl?: string): string {
  // 1. Check if user configured a company logo
  if (companyLogoUrl && companyLogoUrl.trim()) {
    return companyLogoUrl.trim();
  }

  // 2. Check if user uploaded 11 PWA icons in PWA Branding settings
  try {
    const savedPwaIcons = localStorage.getItem('jti_pwa_icons');
    if (savedPwaIcons) {
      const parsed = JSON.parse(savedPwaIcons);
      if (Array.isArray(parsed)) {
        // Priority: favicon-32.png, then icon-192.png, then first available
        const fav = parsed.find((i: any) => i.name === 'favicon-32.png' || i.name?.includes('favicon'));
        if (fav?.path) return fav.path;
        const icon192 = parsed.find((i: any) => i.name === 'icon-192.png');
        if (icon192?.path) return icon192.path;
        if (parsed[0]?.path) return parsed[0].path;
      }
    }
  } catch {}

  // 3. Fallback to default favicon
  return '/icons/favicon-32.png';
}
