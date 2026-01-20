import html2canvas from 'html2canvas';

/**
 * Captures a screenshot of the current page
 * Excludes modals and overlays (elements with z-50 or higher)
 * Returns base64 data URL of the screenshot
 */
export async function captureScreenshot(): Promise<string | null> {
  try {
    const canvas = await html2canvas(document.body, {
      ignoreElements: (element) => {
        // Ignore modals, overlays, and high z-index elements
        const zIndex = window.getComputedStyle(element).zIndex;
        return zIndex !== 'auto' && parseInt(zIndex) >= 50;
      },
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0a0e1a',
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return null;
  }
}

/**
 * Gets browser and device information for debugging
 */
export function getBrowserInfo() {
  return {
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
  };
}
