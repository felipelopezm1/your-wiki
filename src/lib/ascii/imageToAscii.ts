const ASCII_CHARS = " .:-=+*#%@";

export interface AsciiResult {
  text: string;
  width: number;
  height: number;
}

export function imageToAscii(
  img: HTMLImageElement,
  targetWidth: number = 80,
): AsciiResult {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { text: "", width: 0, height: 0 };

  const aspect = img.naturalHeight / img.naturalWidth;
  const w = targetWidth;
  const h = Math.round(w * aspect * 0.5);

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;

  let text = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const brightness =
        (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      const charIndex = Math.floor(brightness * (ASCII_CHARS.length - 1));
      text += ASCII_CHARS[charIndex];
    }
    text += "\n";
  }

  return { text, width: w, height: h };
}

export function loadImageForAscii(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
