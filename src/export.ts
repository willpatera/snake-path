import { svgToString } from './renderer';

/**
 * Export SVG element as a downloadable .svg file.
 */
export function exportSVG(svg: SVGSVGElement, filename = 'over-under-path.svg'): void {
  const str = svgToString(svg);
  const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * Export SVG element as a PNG by rendering to an offscreen canvas.
 */
export function exportPNG(svg: SVGSVGElement, filename = 'over-under-path.png', scale = 1): void {
  const str = svgToString(svg);
  const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob((pngBlob) => {
      if (pngBlob) {
        downloadBlob(pngBlob, filename);
      }
    }, 'image/png');
  };
  img.src = url;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
