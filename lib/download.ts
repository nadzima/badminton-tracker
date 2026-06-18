export async function downloadAsJpeg(
  element: HTMLElement,
  filename: string
): Promise<void> {
  try {
    const { toJpeg } = await import("html-to-image");

    // Temporarily remove overflow clipping so the full table width is captured
    type Saved = { el: HTMLElement; overflow: string; overflowX: string; width: string };
    const saved: Saved[] = [];
    [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))].forEach((el) => {
      const cs = window.getComputedStyle(el);
      if (cs.overflowX === "auto" || cs.overflowX === "scroll") {
        saved.push({ el, overflow: el.style.overflow, overflowX: el.style.overflowX, width: el.style.width });
        el.style.overflow = "visible";
        el.style.overflowX = "visible";
        el.style.width = el.scrollWidth + "px";
      }
    });

    const fullWidth = element.scrollWidth;
    const fullHeight = element.scrollHeight;

    const dataUrl = await toJpeg(element, {
      quality: 0.95,
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      width: fullWidth,
      height: fullHeight,
    });

    saved.forEach(({ el, overflow, overflowX, width }) => {
      el.style.overflow = overflow;
      el.style.overflowX = overflowX;
      el.style.width = width;
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
