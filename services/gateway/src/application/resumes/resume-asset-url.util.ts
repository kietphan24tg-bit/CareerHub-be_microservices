export function resolveAssetOrigin(appBaseUrl?: string): string {
  if (typeof appBaseUrl === 'string' && appBaseUrl.trim().length > 0) {
    return appBaseUrl.replace(/\/+$/, '');
  }

  return 'http://localhost:4000';
}

export function toAbsoluteAssetUrl(
  assetPath: string | null | undefined,
  assetOrigin: string
): string | null {
  if (!assetPath) {
    return null;
  }

  if (/^https?:\/\//i.test(assetPath) || /^data:/i.test(assetPath)) {
    return assetPath;
  }

  return new URL(assetPath, `${assetOrigin}/`).toString();
}

export function resolveLayoutAssetUrls(
  value: Record<string, unknown>,
  assetOrigin: string
): Record<string, unknown> {
  const visit = (node: unknown, parentKey?: string): unknown => {
    if (Array.isArray(node)) {
      return node.map((item) => visit(item));
    }

    if (node && typeof node === 'object') {
      return Object.fromEntries(
        Object.entries(node).map(([key, entry]) => [key, visit(entry, key)])
      );
    }

    if (
      parentKey === 'placeholder' &&
      typeof node === 'string' &&
      node.startsWith('/')
    ) {
      return toAbsoluteAssetUrl(node, assetOrigin);
    }

    return node;
  };

  return visit(value) as Record<string, unknown>;
}