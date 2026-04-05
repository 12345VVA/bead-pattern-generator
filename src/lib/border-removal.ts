/**
 * 边框/分隔线处理模块
 *
 * 用于处理图纸中的边框、网格线、轮廓线等干扰因素
 */

import type { BeadColor } from "./colors";

/**
 * 边框检测结果
 */
export interface BorderDetectionResult {
    hasBorder: boolean;
    borderColors: Set<string>; // hex colors
    borderThickness: number; // 平均边框厚度（像素）
    isGridPattern: boolean; // 是否是网格模式
    gridSpacing?: { h: number; v: number }; // 网格间距
}

/**
 * 边框移除配置
 */
export interface BorderRemovalConfig {
    enabled: boolean;
    method: 'preprocess' | 'ignore' | 'postprocess';
    borderWidth?: { min: number; max: number }; // 边框宽度范围
    borderColors?: string[]; // 指定边框颜色（hex），如 ["#000000", "#333333"]
    removeGridLines?: boolean; // 是否移除网格线
    gridTolerance?: number; // 网格间距容差（像素）
    fillStrategy: 'nearest' | 'dominant' | 'average'; // 填充策略
}

/**
 * 边框像素信息
 */
interface BorderPixel {
    x: number;
    y: number;
    color: string; // hex
}

// ============ 边框检测算法 ============

/**
 * 检测图像中的边框/分隔线
 * 使用多种方法综合判断
 */
export const detectBorders = (
    data: Uint8ClampedArray,
    width: number,
    height: number
): BorderDetectionResult => {
    const result: BorderDetectionResult = {
        hasBorder: false,
        borderColors: new Set(),
        borderThickness: 0,
        isGridPattern: false,
    };

    // 方法1：检测图像边缘的纯色区域（边框）
    const edgeColors = detectEdgeColors(data, width, height);
    edgeColors.forEach(c => result.borderColors.add(c));

    // 方法2：检测网格模式
    const gridInfo = detectGridPattern(data, width, height);
    if (gridInfo.isGrid) {
        result.isGridPattern = true;
        result.gridSpacing = gridInfo.spacing;
    }

    // 方法3：检测直线/分隔线
    const lines = detectStraightLines(data, width, height);
    if (lines.length > 0) {
        result.hasBorder = true;
    }

    // 综合判断
    result.hasBorder = result.hasBorder ||
                     result.borderColors.size > 0 ||
                     result.isGridPattern;

    return result;
};

/**
 * 检测图像边缘的颜色
 * 找出图像边缘最集中的颜色
 */
const detectEdgeColors = (
    data: Uint8ClampedArray,
    width: number,
    height: number
): string[] => {
    const edgeColors: string[] = [];
    const edgeWidth = 5; // 检查图像边缘5个像素

    // 收集边缘像素颜色
    const collectEdgePixels = (startX: number, startY: number, countX: number, countY: number) => {
        for (let dy = 0; dy < countY; dy++) {
            for (let dx = 0; dx < countX; dx++) {
                const x = startX + dx;
                const y = startY + dy;
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const idx = (y * width + x) * 4;
                    const hex = rgbToHex(data[idx], data[idx + 1], data[idx + 2]);
                    edgeColors.push(hex);
                }
            }
        }
    };

    // 上边缘
    collectEdgePixels(0, 0, width, edgeWidth);
    // 下边缘
    collectEdgePixels(0, height - edgeWidth, width, edgeWidth);
    // 左边缘
    collectEdgePixels(0, edgeWidth, edgeWidth, height - edgeWidth * 2);
    // 右边缘
    collectEdgePixels(width - edgeWidth, edgeWidth, edgeWidth, height - edgeWidth * 2);

    // 统计颜色频率
    const colorCount = new Map<string, number>();
    edgeColors.forEach(c => {
        colorCount.set(c, (colorCount.get(c) || 0) + 1);
    });

    // 找出占比超过10%的颜色作为边框颜色
    const threshold = edgeColors.length * 0.1;
    const dominantColors: string[] = [];
    for (const [color, count] of colorCount.entries()) {
        if (count >= threshold) {
            dominantColors.push(color);
        }
    }

    return dominantColors;
};

/**
 * 检测网格模式
 * 寻找重复的水平和垂直线条
 */
const detectGridPattern = (
    data: Uint8ClampedArray,
    width: number,
    height: number
): { isGrid: boolean; spacing: { h: number; v: number } | undefined } => {
    // 水平投影 - 检测水平线
    const hProjection = new Array(height).fill(0);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            if (brightness < 128) { // 暗色像素
                hProjection[y]++;
            }
        }
    }

    // 垂直投影 - 检测垂直线
    const vProjection = new Array(width).fill(0);
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const idx = (y * width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            if (brightness < 128) {
                vProjection[x]++;
            }
        }
    }

    // 检测投影中的峰值（代表线条）
    const hPeaks = detectProjectionPeaks(hProjection);
    const vPeaks = detectProjectionPeaks(vProjection);

    // 如果有规律的峰值，可能是网格
    if (hPeaks.length >= 3 && vPeaks.length >= 3) {
        // 计算平均间距
        const hSpacing = calculateAverageSpacing(hPeaks);
        const vSpacing = calculateAverageSpacing(vPeaks);

        // 检查间距的一致性
        const hConsistency = checkSpacingConsistency(hPeaks);
        const vConsistency = checkSpacingConsistency(vPeaks);

        if (hConsistency > 0.7 && vConsistency > 0.7) {
            return {
                isGrid: true,
                spacing: { h: hSpacing, v: vSpacing }
            };
        }
    }

    return { isGrid: false, spacing: undefined };
};

/**
 * 检测投影中的峰值
 */
const detectProjectionPeaks = (projection: number[]): number[] => {
    const peaks: number[] = [];
    const threshold = Math.max(...projection) * 0.3; // 30%阈值

    for (let i = 1; i < projection.length - 1; i++) {
        // 局部最大值且超过阈值
        if (projection[i] > projection[i - 1] &&
            projection[i] > projection[i + 1] &&
            projection[i] > threshold) {
            peaks.push(i);
        }
    }

    return peaks;
};

/**
 * 计算平均间距
 */
const calculateAverageSpacing = (peaks: number[]): number => {
    if (peaks.length < 2) return 0;

    const spacings: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
        spacings.push(peaks[i] - peaks[i - 1]);
    }

    return spacings.reduce((a, b) => a + b, 0) / spacings.length;
};

/**
 * 检查间距的一致性
 * 返回 0-1 之间的分数
 */
const checkSpacingConsistency = (peaks: number[]): number => {
    if (peaks.length < 3) return 0;

    const spacings: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
        spacings.push(peaks[i] - peaks[i - 1]);
    }

    const avg = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    const variance = spacings.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / spacings.length;
    const stdDev = Math.sqrt(variance);

    // 变异系数越小，一致性越好
    const cv = avg > 0 ? stdDev / avg : 1;
    return Math.max(0, 1 - cv * 2);
};

/**
 * 检测直线（使用霍夫变换的简化版本）
 */
const detectStraightLines = (
    data: Uint8ClampedArray,
    width: number,
    height: number
): Array<{ x1: number; y1: number; x2: number; y2: number; length: number }> => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; length: number }> = [];

    // 简化版本：检测水平和垂直直线
    // 水平直线
    for (let y = 0; y < height; y++) {
        let startX = -1;
        let consecutiveDark = 0;

        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

            if (brightness < 100) { // 暗色
                if (startX === -1) startX = x;
                consecutiveDark++;
            } else {
                if (consecutiveDark > width * 0.5) { // 超过一半宽度
                    lines.push({
                        x1: startX,
                        y1: y,
                        x2: startX + consecutiveDark,
                        y2: y,
                        length: consecutiveDark
                    });
                }
                startX = -1;
                consecutiveDark = 0;
            }
        }
    }

    // 垂直直线
    for (let x = 0; x < width; x++) {
        let startY = -1;
        let consecutiveDark = 0;

        for (let y = 0; y < height; y++) {
            const idx = (y * width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

            if (brightness < 100) {
                if (startY === -1) startY = y;
                consecutiveDark++;
            } else {
                if (consecutiveDark > height * 0.5) {
                    lines.push({
                        x1: x,
                        y1: startY,
                        x2: x,
                        y2: startY + consecutiveDark,
                        length: consecutiveDark
                    });
                }
                startY = -1;
                consecutiveDark = 0;
            }
        }
    }

    return lines;
};

// ============ 边框移除算法 ============

/**
 * 方法1：预处理 - 去除边框后再检测
 */
export const removeBordersPreprocess = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    config: BorderRemovalConfig
): Uint8ClampedArray => {
    const result = new Uint8ClampedArray(data);

    // 检测边框
    const borderResult = detectBorders(data, width, height);

    if (borderResult.isGridPattern && config.removeGridLines) {
        // 移除网格线
        removeGridLines(result, width, height, borderResult.gridSpacing!, config);
    } else if (borderResult.borderColors.size > 0) {
        // 移除指定颜色的边框
        removeBorderColorPixels(result, width, height, borderResult.borderColors, config);
    }

    return result;
};

/**
 * 移除网格线
 */
const removeGridLines = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    gridSpacing: { h: number; v: number },
    config: BorderRemovalConfig
): void => {
    const tolerance = config.gridTolerance || 2;

    // 移除水平网格线
    for (let y = gridSpacing.h; y < height; y += gridSpacing.h) {
        for (let dy = -tolerance; dy <= tolerance; dy++) {
            const lineY = y + dy;
            if (lineY >= 0 && lineY < height) {
                for (let x = 0; x < width; x++) {
                    const idx = (lineY * width + x) * 4;
                    // 检查是否是暗色（网格线）
                    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    if (brightness < 150) {
                        // 用邻近像素填充
                        fillPixelFromNeighbors(data, width, height, x, lineY);
                    }
                }
            }
        }
    }

    // 移除垂直网格线
    for (let x = gridSpacing.v; x < width; x += gridSpacing.v) {
        for (let dx = -tolerance; dx <= tolerance; dx++) {
            const lineX = x + dx;
            if (lineX >= 0 && lineX < width) {
                for (let y = 0; y < height; y++) {
                    const idx = (y * width + lineX) * 4;
                    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    if (brightness < 150) {
                        fillPixelFromNeighbors(data, width, height, lineX, y);
                    }
                }
            }
        }
    }
};

/**
 * 移除指定颜色的像素
 */
const removeBorderColorPixels = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    borderColors: Set<string>,
    config: BorderRemovalConfig
): void => {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const hex = rgbToHex(data[idx], data[idx + 1], data[idx + 2]);

            // 检查是否是边框颜色（允许一定误差）
            const isBorderColor = Array.from(borderColors).some(borderColor => {
                return colorSimilar(hex, borderColor, 30);
            });

            if (isBorderColor) {
                // 用邻近像素填充
                fillPixelFromNeighbors(data, width, height, x, y);
            }
        }
    }
};

/**
 * 从邻近像素填充当前像素
 */
const fillPixelFromNeighbors = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number
): void => {
    const neighbors: Array<{ r: number; g: number; b: number }> = [];

    // 收集8个邻居
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = (ny * width + nx) * 4;
                neighbors.push({
                    r: data[idx],
                    g: data[idx + 1],
                    b: data[idx + 2]
                });
            }
        }
    }

    if (neighbors.length > 0) {
        // 使用平均值
        const avg = neighbors.reduce((sum, n) => ({
            r: sum.r + n.r / neighbors.length,
            g: sum.g + n.g / neighbors.length,
            b: sum.b + n.b / neighbors.length
        }), { r: 0, g: 0, b: 0 });

        const idx = (y * width + x) * 4;
        data[idx] = avg.r;
        data[idx + 1] = avg.g;
        data[idx + 2] = avg.b;
        data[idx + 3] = 255;
    }
};

/**
 * 方法2：检测时忽略 - 标记边框像素，检测时跳过
 */
export const createBorderMask = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    config: BorderRemovalConfig
): Uint8Array => {
    const mask = new Uint8Array(width * height); // 1 = 边框, 0 = 正常

    // 检测边框颜色
    const borderResult = detectBorders(data, width, height);
    const colorsToIgnore = config.borderColors || Array.from(borderResult.borderColors);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const hex = rgbToHex(data[idx], data[idx + 1], data[idx + 2]);

            const isBorderColor = colorsToIgnore.some(borderColor =>
                colorSimilar(hex, borderColor, 30)
            );

            if (isBorderColor) {
                mask[y * width + x] = 1;
            }
        }
    }

    return mask;
};

/**
 * 方法3：后处理 - 清理检测到的小区域（边框线）
 */
export const postProcessBorders = (
    regions: import('./blueprint-processing').BeadRegion[],
    minRegionSize: number = 50 // 最小区域面积（像素平方）
): import('./blueprint-processing').BeadRegion[] => {
    // 过滤掉面积太小的区域（可能是边框线）
    return regions.filter(region => {
        const area = region.width * region.height;
        return area >= minRegionSize;
    });
};

// ============ 工具函数 ============

/**
 * RGB 转 Hex
 */
const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};

/**
 * 颜色相似度判断
 */
const colorSimilar = (hex1: string, hex2: string, threshold: number): boolean => {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);

    const diff = Math.abs(c1.r - c2.r) +
                Math.abs(c1.g - c2.g) +
                Math.abs(c1.b - c2.b);

    return diff <= threshold;
};

/**
 * Hex 转 RGB
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

/**
 * 计算两个位置的距离
 */
const distance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * 根据位置推断填充颜色
 * 找到最近的非边框豆子，使用其颜色
 */
export const inferColorFromNeighbors = (
    gridX: number,
    gridY: number,
    grid: (import('./blueprint-processing').BeadRegion | null)[][],
    gridWidth: number,
    gridHeight: number
): import('./blueprint-processing').BeadRegion | null => {
    // 搜索范围
    const searchRadius = 3;

    for (let radius = 1; radius <= searchRadius; radius++) {
        const neighbors: import('./blueprint-processing').BeadRegion[] = [];

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                const nx = gridX + dx;
                const ny = gridY + dy;

                if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                    const region = grid[ny][nx];
                    if (region && region.matchedColor) {
                        neighbors.push(region);
                    }
                }
            }
        }

        if (neighbors.length > 0) {
            // 返回最近的邻居
            return neighbors[0];
        }
    }

    return null;
};
