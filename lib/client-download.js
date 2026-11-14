'use client';

/**
 * Fetches a downloadable resource (MP3 or Release ZIP) while allowing the caller
 * to display a loading spinner and disable the button until the browser download starts.
 */
export async function triggerManagedDownload(url, filename) {
  if (!url || typeof window === 'undefined') return;

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`Download request failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename || 'download';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 15000);
  } catch {
    // Fallback to direct anchor navigation if fetch/blob is interrupted
    const fallbackLink = document.createElement('a');
    fallbackLink.href = url;
    if (filename) fallbackLink.download = filename;
    fallbackLink.style.display = 'none';
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
  }
}
