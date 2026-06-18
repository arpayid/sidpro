/**
 * Rewrites a MinIO/S3 presigned URL from the internal endpoint to a public-facing base URL.
 */
export function rewriteMinioSignedUrl(
  signedUrl: string,
  internalBaseUrl: string,
  publicBaseUrl?: string,
): string {
  const publicUrl = publicBaseUrl?.replace(/\/$/, '');
  if (!publicUrl) return signedUrl;

  const internalBase = internalBaseUrl.replace(/\/$/, '');
  if (signedUrl.startsWith(internalBase)) {
    return `${publicUrl}${signedUrl.slice(internalBase.length)}`;
  }

  return signedUrl;
}

export function buildMinioInternalBaseUrl(config: {
  endpoint: string;
  port: string;
  useSsl: boolean;
}): string {
  const protocol = config.useSsl ? 'https' : 'http';
  return `${protocol}://${config.endpoint}:${config.port}`;
}
