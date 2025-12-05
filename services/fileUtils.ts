/**
 * Fetches a file from a URL and returns it as a base64 string.
 * Note: This depends on the URL supporting CORS.
 */
export const fetchPdfAsBase64 = async (url: string): Promise<{ base64: string; filename: string }> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("pdf")) {
       // Warn but try to proceed, or throw error depending on strictness.
       // For now, we assume the user provides valid PDF links.
       console.warn("URL content-type is not strictly application/pdf:", contentType);
    }

    const blob = await response.blob();
    
    // Extract filename from URL or headers
    let filename = url.split('/').pop()?.split('?')[0] || "document.pdf";
    const disposition = response.headers.get("content-disposition");
    if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
            filename = match[1];
        }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the Data-URI prefix (e.g. "data:application/pdf;base64,") to get raw base64
        const base64 = result.split(',')[1];
        resolve({ base64, filename });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(`Network Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

export const parseUrls = (text: string): string[] => {
  return text
    .split(/[\n,]+/) // Split by newline or comma
    .map((url) => url.trim())
    .filter((url) => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));
};
