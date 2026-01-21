import type { BeadColor } from "./colors";

export interface PixelData {
  r: number;
  g: number;
  b: number;
  a: number;
}

// 新增：颜色匹配算法选项
export type ColorMatchAlgorithm = 'weighted' | 'euclidean' | 'cielab';

// 新增：颜色匹配配置
export interface ColorMatchConfig {
  algorithm: ColorMatchAlgorithm;
  tolerance?: number; // 颜色容差（0-100），用于精确匹配
  useCache?: boolean; // 是否使用缓存
}

export interface ProcessedResult {
  pixels: Uint8ClampedArray;
  colorCounts: Map<string, number>; // beadId -> count
  beadGrid: (string | null)[]; // beadId array for the grid
}

export const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getPixelData = (
  img: HTMLImageElement,
  width: number,
  height: number
): Uint8ClampedArray => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  
  if (!ctx) throw new Error("Could not get canvas context");
  
  ctx.imageSmoothingEnabled = true; 
  ctx.imageSmoothingQuality = "high";
  
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
};

// Helper to convert RGB to Hex
export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};

export const hexToRgb = (hex: string): { r: number, g: number, b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// ============ 优化的颜色距离算法 ============

// 原有：加权RGB距离（人眼感知优化）
const weightedRGBDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
  const rmean = (r1 + r2) / 2;
  const r = r1 - r2;
  const g = g1 - g2;
  const b = b1 - b2;
  return Math.sqrt((((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8));
};

// 新增：标准欧几里得距离（简单快速）
const euclideanDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

// 新增：CIELAB 颜色空间距离（最精确但计算较慢）
const rgbToLab = (r: number, g: number, b: number) => {
  // 先转换到 XYZ 颜色空间
  let lr = r / 255;
  let lg = g / 255;
  let lb = b / 255;

  lr = lr > 0.04045 ? Math.pow((lr + 0.055) / 1.055, 2.4) : lr / 12.92;
  lg = lg > 0.04045 ? Math.pow((lg + 0.055) / 1.055, 2.4) : lg / 12.92;
  lb = lb > 0.04045 ? Math.pow((lb + 0.055) / 1.055, 2.4) : lb / 12.92;

  lr *= 100;
  lg *= 100;
  lb *= 100;

  let x = lr * 0.4124 + lg * 0.3576 + lb * 0.1805;
  let y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  let z = lr * 0.0193 + lg * 0.1192 + lb * 0.9505;

  // 再转换到 Lab 颜色空间
  x /= 95.047;
  y /= 100.000;
  z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return {
    L: (116 * y) - 16,
    a: 500 * (x - y),
    b: 200 * (y - z)
  };
};

const cielabDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
  const lab1 = rgbToLab(r1, g1, b1);
  const lab2 = rgbToLab(r2, g2, b2);

  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;

  return Math.sqrt(dL * dL + da * da + db * db);
};

// 统一的颜色距离计算函数
const calculateColorDistance = (
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
  algorithm: ColorMatchAlgorithm = 'weighted'
): number => {
  switch (algorithm) {
    case 'euclidean':
      return euclideanDistance(r1, g1, b1, r2, g2, b2);
    case 'cielab':
      return cielabDistance(r1, g1, b1, r2, g2, b2);
    case 'weighted':
    default:
      return weightedRGBDistance(r1, g1, b1, r2, g2, b2);
  }
};

// Cache for nearest color lookups to speed up processing
const nearestColorCache = new Map<string, BeadColor>();

// 导出：清除颜色缓存
export const clearColorCache = () => {
  nearestColorCache.clear();
};

// 新增：优化的颜色空间索引（按颜色分区以提高查找速度）
interface ColorSpaceIndex {
  redRegion: BeadColor[];
  greenRegion: BeadColor[];
  blueRegion: BeadColor[];
  neutralRegion: BeadColor[];
}

const buildColorSpaceIndex = (palette: BeadColor[]): ColorSpaceIndex => {
  const index: ColorSpaceIndex = {
    redRegion: [],
    greenRegion: [],
    blueRegion: [],
    neutralRegion: []
  };

  for (const color of palette) {
    const rgb = hexToRgb(color.hex);
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    const range = max - min;

    // 根据颜色特性分区
    if (rgb.r > rgb.g && rgb.r > rgb.b && range > 30) {
      index.redRegion.push(color);
    } else if (rgb.g > rgb.r && rgb.g > rgb.b && range > 30) {
      index.greenRegion.push(color);
    } else if (rgb.b > rgb.r && rgb.b > rgb.g && range > 30) {
      index.blueRegion.push(color);
    } else {
      index.neutralRegion.push(color);
    }
  }

  return index;
};

// 新增：增强的最近颜色查找函数（支持多种算法和优化）
export const findNearestColor = (
  r: number,
  g: number,
  b: number,
  palette: BeadColor[],
  config?: ColorMatchConfig
): BeadColor => {
  // 检查调色板是否为空
  if (!palette || palette.length === 0) {
    // 返回默认的白色作为后备
    return { id: "DEFAULT", name: "White", hex: "#FFFFFF", brand: "Default" };
  }

  const algorithm = config?.algorithm || 'weighted';
  const useCache = config?.useCache !== false; // 默认使用缓存

  // 使用缓存
  if (useCache) {
    const key = `${r},${g},${b},${algorithm},${palette.length}`;
    if (nearestColorCache.has(key)) return nearestColorCache.get(key)!;
  }

  let minDist = Infinity;
  let nearest = palette[0];

  // 优化：先检查是否可以精确匹配
  const targetHex = rgbToHex(r, g, b).toUpperCase();
  const exactMatch = palette.find(c => c && c.hex && c.hex.toUpperCase() === targetHex);
  if (exactMatch) {
    if (useCache) {
      nearestColorCache.set(`${r},${g},${b},${algorithm},${palette.length}`, exactMatch);
    }
    return exactMatch;
  }

  // 遍历调色板查找最近颜色
  for (const color of palette) {
    if (!color || !color.hex) continue; // 跳过无效颜色
    const target = hexToRgb(color.hex);
    const dist = calculateColorDistance(r, g, b, target.r, target.g, target.b, algorithm);
    if (dist < minDist) {
      minDist = dist;
      nearest = color;
    }
  }

  if (useCache && nearest) {
    nearestColorCache.set(`${r},${g},${b},${algorithm},${palette.length}`, nearest);
  }

  return nearest || { id: "DEFAULT", name: "White", hex: "#FFFFFF", brand: "Default" };
};

// 新增：带颜色空间索引优化的查找函数（适合大型调色板）
let colorSpaceIndexCache: Map<string, ColorSpaceIndex> = new Map();

export const findNearestColorOptimized = (
  r: number,
  g: number,
  b: number,
  palette: BeadColor[],
  config?: ColorMatchConfig
): BeadColor => {
  const algorithm = config?.algorithm || 'weighted';
  const paletteKey = `${palette[0]?.brand}_${palette.length}`;

  // 构建或获取颜色空间索引
  if (!colorSpaceIndexCache.has(paletteKey)) {
    colorSpaceIndexCache.set(paletteKey, buildColorSpaceIndex(palette));
  }
  const index = colorSpaceIndexCache.get(paletteKey)!;

  // 确定当前颜色所在区域
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const range = max - min;

  let searchColors: BeadColor[];
  if (r > g && r > b && range > 30) {
    searchColors = index.redRegion;
  } else if (g > r && g > b && range > 30) {
    searchColors = index.greenRegion;
  } else if (b > r && b > g && range > 30) {
    searchColors = index.blueRegion;
  } else {
    searchColors = index.neutralRegion;
  }

  // 优先在对应区域查找
  if (searchColors.length > 0) {
    let minDist = Infinity;
    let nearest = searchColors[0];

    for (const color of searchColors) {
      const target = hexToRgb(color.hex);
      const dist = calculateColorDistance(r, g, b, target.r, target.g, target.b, algorithm);
      if (dist < minDist) {
        minDist = dist;
        nearest = color;
      }
    }

    return nearest;
  }

  // 如果区域为空，则在整个调色板中查找
  return findNearestColor(r, g, b, palette, config);
};

export const processImage = (
  originalPixels: Uint8ClampedArray,
  width: number,
  height: number,
  palette: BeadColor[],
  dither: boolean,
  ditherStrength: number = 1.0,
  ignoreWhite: boolean = false,
  ignoreBlack: boolean = false,
  colorMatchConfig?: ColorMatchConfig
): ProcessedResult => {
  const length = originalPixels.length;
  // Deep copy pixel data for dithering because we modify it in place
  const processingPixels = new Float32Array(length); 
  for(let i=0; i<length; i++) processingPixels[i] = originalPixels[i];
  
  const outputPixels = new Uint8ClampedArray(length);
  const colorCounts = new Map<string, number>();
  const beadGrid = new Array(width * height).fill(null);

  nearestColorCache.clear(); // Clear cache for new processing run

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      const oldR = processingPixels[idx];
      const oldG = processingPixels[idx + 1];
      const oldB = processingPixels[idx + 2];
      const alpha = processingPixels[idx + 3];

      // Handle transparency
      if (alpha < 128) {
        outputPixels[idx + 3] = 0;
        continue;
      }
      
      // Find nearest color
      const nearest = findNearestColor(
        Math.max(0, Math.min(255, oldR)),
        Math.max(0, Math.min(255, oldG)),
        Math.max(0, Math.min(255, oldB)),
        palette,
        colorMatchConfig
      );
      
      // Handle Ignore White
      const isWhite = nearest.name.toLowerCase() === "white" ||
                      nearest.name === "白色" ||
                      nearest.name === "极浅灰" ||
                      nearest.hex.toLowerCase() === "#ffffff" ||
                      nearest.hex.toLowerCase() === "#fbfbfb" ||
                      nearest.id === "H02"; // MARD 极浅灰（作为白色使用）
      if (ignoreWhite && isWhite) {
        outputPixels[idx + 3] = 0; // Transparent
        beadGrid[y * width + x] = null;
        continue;
      }

      // Handle Ignore Black
      const isBlack = nearest.name.toLowerCase() === "black" ||
                      nearest.name === "黑色" ||
                      nearest.name === "炭黑1" ||
                      nearest.hex.toLowerCase() === "#000000" ||
                      nearest.hex.toLowerCase() === "#010101" ||
                      nearest.id === "H07"; // MARD 炭黑1
      if (ignoreBlack && isBlack) {
        outputPixels[idx + 3] = 0; // Transparent
        beadGrid[y * width + x] = null;
        continue;
      }

      const nearestRgb = hexToRgb(nearest.hex);

      // Set output pixel
      outputPixels[idx] = nearestRgb.r;
      outputPixels[idx + 1] = nearestRgb.g;
      outputPixels[idx + 2] = nearestRgb.b;
      outputPixels[idx + 3] = 255;

      // Update counts
      colorCounts.set(nearest.id, (colorCounts.get(nearest.id) || 0) + 1);
      
      // Update grid
      beadGrid[y * width + x] = nearest.id;

      // Apply Dithering (Floyd-Steinberg)
      if (dither) {
        const errR = (oldR - nearestRgb.r) * ditherStrength;
        const errG = (oldG - nearestRgb.g) * ditherStrength;
        const errB = (oldB - nearestRgb.b) * ditherStrength;

        const distributeError = (dx: number, dy: number, factor: number) => {
          if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            processingPixels[nIdx] += errR * factor;
            processingPixels[nIdx + 1] += errG * factor;
            processingPixels[nIdx + 2] += errB * factor;
          }
        };

        distributeError(1, 0, 7/16);
        distributeError(-1, 1, 3/16);
        distributeError(0, 1, 5/16);
        distributeError(1, 1, 1/16);
      }
    }
  }

  return { pixels: outputPixels, colorCounts, beadGrid };
};
