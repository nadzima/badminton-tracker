export async function downloadAsJpeg(
  element: HTMLElement,
  filename: string
): Promise<void> {
  try {
    const { toJpeg } = await import("html-to-image");
    const dataUrl = await toJpeg(element, {
      quality: 0.95,
      backgroundColor: "#ffffff",
      pixelRatio: 2,
    });
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error("Download failed:", err);
    alert("Gagal download. Coba lagi.");
  }
}
