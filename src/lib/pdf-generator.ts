import { jsPDF } from "jspdf";
import type { ProcessedResult } from "./image-processing";
import type { BeadColor } from "./colors";

// 使用 Canvas API 直接绘制颜色列表（避免 OKLCH 问题）
const createColorListCanvas = (
  usedColors: Array<BeadColor & { count: number }>,
  width: number,
  height: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // 配置
  const padding = 40;
  const tableWidth = 470;
  const rowHeight = 24;
  const headerHeight = 32;

  // 计算总高度
  const titleHeight = 80;
  const totalHeight = titleHeight + headerHeight + usedColors.length * rowHeight + padding;

  // 设置 canvas 尺寸（2x 分辨率以提高清晰度）
  const scale = 2;
  canvas.width = (tableWidth + padding * 2) * scale;
  canvas.height = totalHeight * scale;
  canvas.style.width = `${tableWidth + padding * 2}px`;
  canvas.style.height = `${totalHeight}px`;

  ctx.scale(scale, scale);

  // 背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tableWidth + padding * 2, totalHeight);

  // 标题
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Bead Pattern', padding, 30);

  // 尺寸和日期
  ctx.font = '14px Arial, sans-serif';
  ctx.fillStyle = '#666666';
  ctx.fillText(`Size: ${width} x ${height} beads`, padding, 50);
  ctx.fillText(`Created: ${new Date().toLocaleDateString()}`, padding, 68);

  // Color List 标题
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText('Color List', padding, 95);

  // 表头背景
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(padding, 105, tableWidth, headerHeight);

  // 表头文字
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ID', padding + 20, 125);
  ctx.fillText('Name', padding + 70, 125);
  ctx.fillText('Color', padding + 230, 125);
  ctx.fillText('Count', padding + 320, 125);

  // 表格内容
  let y = 105 + headerHeight;
  ctx.font = '12px Arial, sans-serif';

  usedColors.forEach((color) => {
    // 行背景（交替）
    const rowIndex = usedColors.indexOf(color);
    if (rowIndex % 2 === 0) {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(padding, y, tableWidth, rowHeight);
    }

    // 边框
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, y, tableWidth, rowHeight);

    // ID
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(color.id, padding + 20, y + 16);

    // Name
    ctx.textAlign = 'left';
    ctx.fillText(color.name, padding + 40, y + 16);

    // Color swatch
    const rgb = hexToRgb(color.hex);
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.fillRect(padding + 215, y + 5, 30, 14);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding + 215, y + 5, 30, 14);

    // Count
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(color.count.toString(), padding + 320, y + 16);

    y += rowHeight;
  });

  return canvas;
};

export const generatePDF = async (
  processedData: ProcessedResult,
  palette: BeadColor[],
  width: number,
  height: number,
  filename: string = "bead-pattern.pdf",
  showLabels: boolean = false,
  hideWhiteLabels: boolean = false
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // 准备颜色数据
  const usedColors = Array.from(processedData.colorCounts.entries())
    .map(([id, count]) => {
      const color = palette.find(c => c.id === id);
      return { ...color!, count };
    })
    .sort((a, b) => b.count - a.count);

  // 1. 使用 Canvas API 直接绘制颜色列表（避免 OKLCH 和中文乱码问题）
  const colorCanvas = createColorListCanvas(usedColors, width, height);

  // 计算图片在 PDF 中的尺寸
  const imgWidth = contentWidth;
  const imgHeight = (colorCanvas.height * imgWidth) / colorCanvas.width;

  // 如果图片高度超过一页，需要分页
  let currentY = margin;
  let currentHeight = imgHeight;
  let sourceY = 0;

  while (currentHeight > 0) {
    const pageRemainingHeight = pageHeight - margin * 2;
    const sliceHeight = Math.min(currentHeight, pageRemainingHeight);

    // 裁剪 canvas
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = colorCanvas.width;
    sliceCanvas.height = (colorCanvas.height * sliceHeight) / imgHeight;
    const sliceCtx = sliceCanvas.getContext('2d');
    if (sliceCtx) {
      const sourceYPixels = (colorCanvas.height * sourceY) / imgHeight;
      const sourceHeightPixels = (colorCanvas.height * sliceHeight) / imgHeight;
      sliceCtx.drawImage(
        colorCanvas,
        0, sourceYPixels, colorCanvas.width, sourceHeightPixels,
        0, 0, sliceCanvas.width, sliceCanvas.height
      );
    }

    const imgData = sliceCanvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', margin, currentY, imgWidth, sliceHeight);

    currentHeight -= sliceHeight;
    sourceY += sliceHeight;

    if (currentHeight > 0) {
      doc.addPage();
      currentY = margin;
    }
  }

  // 清理
  colorCanvas.remove();

  // 2. Pattern Preview (New Page)
  doc.addPage();

  // 标题
  doc.setFontSize(16);
  doc.text("Pattern Blueprint", margin, 20);

  // Calculate grid size to fit page
  const maxGridWidth = contentWidth;
  const maxGridHeight = pageHeight - 40;

  const cellSize = Math.min(maxGridWidth / width, maxGridHeight / height);
  const startX = margin;
  const startY = 30;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = processedData.pixels[idx];
      const g = processedData.pixels[idx + 1];
      const b = processedData.pixels[idx + 2];
      const a = processedData.pixels[idx + 3];

      if (a < 10) continue;

      doc.setFillColor(r, g, b);
      // Draw rect
      doc.rect(startX + x * cellSize, startY + y * cellSize, cellSize, cellSize, "F");

      // Draw Labels
      if (showLabels && processedData.beadGrid) {
        const beadId = processedData.beadGrid[y * width + x];
        if (beadId && cellSize > 3) {
          // Check Hide White Labels
          if (hideWhiteLabels) {
             const color = palette.find(c => c.id === beadId);
             if (color && (
               color.name.toLowerCase() === "white" ||
               color.name === "白色" ||
               color.name === "极浅灰" ||
               color.hex.toLowerCase() === "#ffffff" ||
               color.hex.toLowerCase() === "#fbfbfb" ||
               color.id === "H02"
             )) {
               continue;
             }
          }

          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          doc.setTextColor(brightness > 128 ? 0 : 255);

          const fontSize = Math.max(4, cellSize * 2.83 * 0.35);
          doc.setFontSize(fontSize);

          doc.text(beadId, startX + x * cellSize + cellSize / 2, startY + y * cellSize + cellSize / 2, {
            align: "center",
            baseline: "middle"
          });
        }
      }
    }
  }

  // Grid lines (draw on top)
  // 1. Standard lines (Thin)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  for (let x = 0; x <= width; x++) {
    if (x % 5 === 0) continue;
    doc.line(startX + x * cellSize, startY, startX + x * cellSize, startY + height * cellSize);
  }
  for (let y = 0; y <= height; y++) {
    if (y % 5 === 0) continue;
    doc.line(startX, startY + y * cellSize, startX + width * cellSize, startY + y * cellSize);
  }

  // 2. Major lines (Thick, every 5)
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  for (let x = 0; x <= width; x += 5) {
    doc.line(startX + x * cellSize, startY, startX + x * cellSize, startY + height * cellSize);
  }
  for (let y = 0; y <= height; y += 5) {
    doc.line(startX, startY + y * cellSize, startX + width * cellSize, startY + y * cellSize);
  }

  doc.save(filename);
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}
