const URL_PATTERN = /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi;

export interface CssValidationOptions {
  /** Esquemas admitidos dentro de `url()` además de `data:`. */
  allowedUrlSchemes?: readonly string[];
}

/** Devuelve las URLs no permitidas encontradas en el CSS. */
export function findInvalidCssUrls(css: string, options: CssValidationOptions = {}): string[] {
  const allowed = ['data:', ...(options.allowedUrlSchemes ?? [])];
  const invalid: string[] = [];
  let match: RegExpExecArray | null;
  URL_PATTERN.lastIndex = 0;
  while ((match = URL_PATTERN.exec(css)) !== null) {
    const url = (match[2] ?? '').trim();
    if (!allowed.some((scheme) => url.startsWith(scheme))) {
      invalid.push(url);
    }
  }
  return invalid;
}

export function validateCustomCss(
  css: string,
  options: CssValidationOptions = {},
): { valid: boolean; invalidUrls: string[] } {
  const invalidUrls = findInvalidCssUrls(css, options);
  return { valid: invalidUrls.length === 0, invalidUrls };
}
