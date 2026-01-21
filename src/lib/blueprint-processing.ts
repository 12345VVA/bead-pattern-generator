import type { BeadColor } from "./colors";
import { findNearestColor, hexToRgb, type ColorMatchConfig } from "./image-processing";

/**
 * 豆子区域类型
 */
export interface BeadRegion {
    x: number;
    y: number;
    width: number;
    height: number;
    color: { r: number; g: number; b: number };
    matchedColor?: BeadColor;
    gridX: number;
    gridY: number;
    confidence?: number; // 识别置信度 0-1
}

/**
 * 边界检测配置
 */
export interface BoundaryDetectionConfig {
    method: 'grid' | 'contour' | 'adaptive'; // 检测方法
    minBeadSize?: number; // 最小豆子尺寸（像素）
    maxBeadSize?: number; // 最大豆子尺寸（像素）
    edgeThreshold?: number; // 边缘检测阈值
    gridSpacingTolerance?: number; // 网格间距容差
}

/**
 * 颜色识别配置
 */
export interface ColorRecognitionConfig {
    sampleMethod: 'average' | 'median' | 'dominant'; // 采样方法
    excludeEdgePixels?: boolean; // 排除边缘像素
    edgeExclusionRatio?: number; // 边缘排除比例 (0-0.5)
    colorMatchConfig?: ColorMatchConfig; // 颜色匹配配置
}

/**
 * 图纸处理结果
 */
export interface BlueprintProcessResult {
    regions: BeadRegion[];
    gridWidth: number;
    gridHeight: number;
    estimatedBeadSize: number;
    detectionQuality: number; // 检测质量评分 0-1
}

// ============ 边界检测算法 ============

/**
 * 估算网格间距（增强版）
 * 使用多种方法综合判断，提高准确性
 */
export const estimateGridSpacing = (
    data: Uint8ClampedArray,
    width: number,
    height: number
): { spacing: number; confidence: number } => {
    const spacings: number[] = [];

    // 方法1：水平方向边缘检测
    const horizontalSpacings = detectEdgeSpacings(data, width, height, 'horizontal');
    spacings.push(...horizontalSpacings);

    // 方法2：垂直方向边缘检测
    const verticalSpacings = detectEdgeSpacings(data, width, height, 'vertical');
    spacings.push(...verticalSpacings);

    if (spacings.length === 0) {
        return { spacing: 20, confidence: 0 };
    }

    // 使用众数（mode）而不是平均值，更鲁棒
    const spacingMode = calculateMode(spacings);

    // 计算置信度（基于间距的一致性）
    const variance = calculateVariance(spacings, spacingMode);
    const confidence = Math.max(0, 1 - variance / 100);

    return { spacing: spacingMode, confidence };
};

/**
 * 检测边缘间距
 */
const detectEdgeSpacings = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    direction: 'horizontal' | 'vertical'
): number[] => {
    const spacings: number[] = [];
    const sampleLines = 5; // 采样行数/列数

    if (direction === 'horizontal') {
        // 水平方向：在多行中检测垂直边缘
        for (let lineIdx = 0; lineIdx < sampleLines; lineIdx++) {
            const y = Math.floor(height * (lineIdx + 1) / (sampleLines + 1));
            let lastEdgeX = -1;

            for (let x = 1; x < width; x++) {
                const idx1 = (y * width + x - 1) * 4;
                const idx2 = (y * width + x) * 4;

                // 计算颜色差异
                const diff = Math.abs(data[idx1] - data[idx2]) +
                    Math.abs(data[idx1 + 1] - data[idx2 + 1]) +
                    Math.abs(data[idx1 + 2] - data[idx2 + 2]);

                // 检测到显著边缘
                if (diff > 50) {
                    if (lastEdgeX >= 0) {
                        const spacing = x - lastEdgeX;
                        if (spacing > 5 && spacing < 100) {
                            spacings.push(spacing);
                        }
                    }
                    lastEdgeX = x;
                }
            }
        }
    } else {
        // 垂直方向：在多列中检测水平边缘
        for (let lineIdx = 0; lineIdx < sampleLines; lineIdx++) {
            const x = Math.floor(width * (lineIdx + 1) / (sampleLines + 1));
            let lastEdgeY = -1;

            for (let y = 1; y < height; y++) {
                const idx1 = ((y - 1) * width + x) * 4;
                const idx2 = (y * width + x) * 4;

                const diff = Math.abs(data[idx1] - data[idx2]) +
                    Math.abs(data[idx1 + 1] - data[idx2 + 1]) +
                    Math.abs(data[idx1 + 2] - data[idx2 + 2]);

                if (diff > 50) {
                    if (lastEdgeY >= 0) {
                        const spacing = y - lastEdgeY;
                        if (spacing > 5 && spacing < 100) {
                            spacings.push(spacing);
                        }
                    }
                    lastEdgeY = y;
                }
            }
        }
    }

    return spacings;
};

/**
 * 计算众数（最常出现的值）
 */
const calculateMode = (numbers: number[]): number => {
    if (numbers.length === 0) return 20;

    // 将数字分组（容忍±2的误差）
    const groups = new Map<number, number>();

    for (const num of numbers) {
        const roundedNum = Math.round(num);
        let found = false;

        // 查找相近的组
        for (const [key, count] of groups.entries()) {
            if (Math.abs(key - roundedNum) <= 2) {
                groups.set(key, count + 1);
                found = true;
                break;
            }
        }

        if (!found) {
            groups.set(roundedNum, 1);
        }
    }

    // 找出出现次数最多的组
    let maxCount = 0;
    let mode = 20;

    for (const [num, count] of groups.entries()) {
        if (count > maxCount) {
            maxCount = count;
            mode = num;
        }
    }

    return mode;
};

/**
 * 计算方差
 */
const calculateVariance = (numbers: number[], mean: number): number => {
    if (numbers.length === 0) return 0;

    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
};

/**
 * 自适应边界检测
 * 根据图像特征自动调整检测参数
 */
export const detectBeadRegionsAdaptive = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    config?: BoundaryDetectionConfig
): BeadRegion[] => {
    const method = config?.method || 'adaptive';

    // 估算网格间距
    const { spacing, confidence } = estimateGridSpacing(data, width, height);

    console.log(`检测到网格间距: ${spacing}px, 置信度: ${(confidence * 100).toFixed(1)}%`);

    // 根据置信度选择检测方法
    if (method === 'adaptive') {
        if (confidence > 0.7) {
            // 高置信度：使用快速网格检测
            return detectBeadRegionsGrid(data, width, height, spacing, config);
        } else {
            // 低置信度：使用轮廓检测
            return detectBeadRegionsContour(data, width, height, config);
        }
    } else if (method === 'grid') {
        return detectBeadRegionsGrid(data, width, height, spacing, config);
    } else {
        return detectBeadRegionsContour(data, width, height, config);
    }
};

/**
 * 基于网格的豆子检测（快速，适合规则图纸）
 */
const detectBeadRegionsGrid = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    gridSpacing: number,
    config?: BoundaryDetectionConfig
): BeadRegion[] => {
    const regions: BeadRegion[] = [];
    const visited = new Set<string>();

    const minSize = config?.minBeadSize || 5;
    const maxSize = config?.maxBeadSize || 100;

    // 网格扫描
    for (let y = 0; y < height; y += gridSpacing) {
        for (let x = 0; x < width; x += gridSpacing) {
            const key = `${x},${y}`;
            if (visited.has(key)) continue;

            // 采样当前点
            const idx = (y * width + x) * 4;
            const a = data[idx + 3];

            if (a < 128) continue; // 跳过透明

            // 精确定位豆子边界
            const bounds = findBeadBoundsPrecise(data, width, height, x, y, gridSpacing);

            if (bounds) {
                const beadWidth = bounds.maxX - bounds.minX;
                const beadHeight = bounds.maxY - bounds.minY;

                // 尺寸过滤
                if (beadWidth >= minSize && beadWidth <= maxSize &&
                    beadHeight >= minSize && beadHeight <= maxSize) {

                    const avgColor = calculateAverageColor(data, width, bounds);

                    regions.push({
                        x: bounds.minX,
                        y: bounds.minY,
                        width: beadWidth,
                        height: beadHeight,
                        color: avgColor,
                        gridX: Math.round(x / gridSpacing),
                        gridY: Math.round(y / gridSpacing),
                        confidence: 0.8,
                    });
                }
            }

            visited.add(key);
        }
    }

    return regions;
};

/**
 * 精确定位豆子边界
 */
const findBeadBoundsPrecise = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    estimatedSize: number
): { minX: number; maxX: number; minY: number; maxY: number } | null => {

    const searchRadius = Math.floor(estimatedSize * 0.6);

    // 获取中心点颜色作为参考
    const centerIdx = (centerY * width + centerX) * 4;
    const refR = data[centerIdx];
    const refG = data[centerIdx + 1];
    const refB = data[centerIdx + 2];

    // 向四个方向扩展，找到边界
    let minX = centerX;
    let maxX = centerX;
    let minY = centerY;
    let maxY = centerY;

    const colorThreshold = 50; // 颜色差异阈值

    // 向左扩展
    for (let x = centerX; x >= Math.max(0, centerX - searchRadius); x--) {
        const idx = (centerY * width + x) * 4;
        const diff = Math.abs(data[idx] - refR) +
            Math.abs(data[idx + 1] - refG) +
            Math.abs(data[idx + 2] - refB);

        if (diff > colorThreshold || data[idx + 3] < 128) break;
        minX = x;
    }

    // 向右扩展
    for (let x = centerX; x <= Math.min(width - 1, centerX + searchRadius); x++) {
        const idx = (centerY * width + x) * 4;
        const diff = Math.abs(data[idx] - refR) +
            Math.abs(data[idx + 1] - refG) +
            Math.abs(data[idx + 2] - refB);

        if (diff > colorThreshold || data[idx + 3] < 128) break;
        maxX = x;
    }

    // 向上扩展
    for (let y = centerY; y >= Math.max(0, centerY - searchRadius); y--) {
        const idx = (y * width + centerX) * 4;
        const diff = Math.abs(data[idx] - refR) +
            Math.abs(data[idx + 1] - refG) +
            Math.abs(data[idx + 2] - refB);

        if (diff > colorThreshold || data[idx + 3] < 128) break;
        minY = y;
    }

    // 向下扩展
    for (let y = centerY; y <= Math.min(height - 1, centerY + searchRadius); y++) {
        const idx = (y * width + centerX) * 4;
        const diff = Math.abs(data[idx] - refR) +
            Math.abs(data[idx + 1] - refG) +
            Math.abs(data[idx + 2] - refB);

        if (diff > colorThreshold || data[idx + 3] < 128) break;
        maxY = y;
    }

    return { minX, maxX, minY, maxY };
};

/**
 * 基于轮廓的豆子检测（精确，适合不规则图纸）
 */
const detectBeadRegionsContour = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    config?: BoundaryDetectionConfig
): BeadRegion[] => {
    const regions: BeadRegion[] = [];
    const visited = new Set<string>();

    const minSize = config?.minBeadSize || 5;
    const maxSize = config?.maxBeadSize || 100;

    // 逐像素扫描
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const key = `${x},${y}`;
            if (visited.has(key)) continue;

            const idx = (y * width + x) * 4;
            const a = data[idx + 3];

            if (a < 128) {
                visited.add(key);
                continue;
            }

            // 洪水填充算法找到连通区域
            const region = floodFill(data, width, height, x, y, visited);

            if (region && region.pixels.length >= minSize * minSize) {
                const bounds = calculateBounds(region.pixels);
                const beadWidth = bounds.maxX - bounds.minX + 1;
                const beadHeight = bounds.maxY - bounds.minY + 1;

                if (beadWidth <= maxSize && beadHeight <= maxSize) {
                    regions.push({
                        x: bounds.minX,
                        y: bounds.minY,
                        width: beadWidth,
                        height: beadHeight,
                        color: region.avgColor,
                        gridX: Math.floor(bounds.minX / 20), // 粗略估计
                        gridY: Math.floor(bounds.minY / 20),
                        confidence: 0.9,
                    });
                }
            }
        }
    }

    return regions;
};

/**
 * 洪水填充算法
 */
const floodFill = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    visited: Set<string>
): { pixels: { x: number; y: number }[]; avgColor: { r: number; g: number; b: number } } | null => {

    const startIdx = (startY * width + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];

    const pixels: { x: number; y: number }[] = [];
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];

    let sumR = 0, sumG = 0, sumB = 0;
    const colorThreshold = 30;
    const maxPixels = 10000; // 防止无限扩展

    while (queue.length > 0 && pixels.length < maxPixels) {
        const { x, y } = queue.shift()!;
        const key = `${x},${y}`;

        if (visited.has(key)) continue;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a < 128) continue;

        // 颜色相似性检查
        const diff = Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB);
        if (diff > colorThreshold) continue;

        visited.add(key);
        pixels.push({ x, y });
        sumR += r;
        sumG += g;
        sumB += b;

        // 添加四邻域
        queue.push({ x: x + 1, y });
        queue.push({ x: x - 1, y });
        queue.push({ x, y: y + 1 });
        queue.push({ x, y: y - 1 });
    }

    if (pixels.length === 0) return null;

    return {
        pixels,
        avgColor: {
            r: Math.round(sumR / pixels.length),
            g: Math.round(sumG / pixels.length),
            b: Math.round(sumB / pixels.length),
        }
    };
};

/**
 * 计算像素集合的边界
 */
const calculateBounds = (pixels: { x: number; y: number }[]): {
    minX: number; maxX: number; minY: number; maxY: number;
} => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const { x, y } of pixels) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }

    return { minX, maxX, minY, maxY };
};

// ============ 颜色识别算法 ============

/**
 * 计算区域平均颜色（增强版）
 */
export const calculateAverageColor = (
    data: Uint8ClampedArray,
    width: number,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    config?: ColorRecognitionConfig
): { r: number; g: number; b: number } => {

    const method = config?.sampleMethod || 'average';
    const excludeEdge = config?.excludeEdgePixels || false;
    const edgeRatio = config?.edgeExclusionRatio || 0.2;

    // 计算实际采样区域
    let sampleMinX = bounds.minX;
    let sampleMaxX = bounds.maxX;
    let sampleMinY = bounds.minY;
    let sampleMaxY = bounds.maxY;

    if (excludeEdge) {
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        const marginX = Math.floor(width * edgeRatio);
        const marginY = Math.floor(height * edgeRatio);

        sampleMinX = Math.max(bounds.minX, bounds.minX + marginX);
        sampleMaxX = Math.min(bounds.maxX, bounds.maxX - marginX);
        sampleMinY = Math.max(bounds.minY, bounds.minY + marginY);
        sampleMaxY = Math.min(bounds.maxY, bounds.maxY - marginY);
    }

    const colors: { r: number; g: number; b: number }[] = [];

    for (let y = Math.max(0, sampleMinY); y <= sampleMaxY; y++) {
        for (let x = Math.max(0, sampleMinX); x <= sampleMaxX; x++) {
            const idx = (y * width + x) * 4;
            if (data[idx + 3] < 128) continue; // 跳过透明

            colors.push({
                r: data[idx],
                g: data[idx + 1],
                b: data[idx + 2],
            });
        }
    }

    if (colors.length === 0) {
        return { r: 255, g: 255, b: 255 };
    }

    switch (method) {
        case 'median':
            return calculateMedianColor(colors);
        case 'dominant':
            return calculateDominantColor(colors);
        case 'average':
        default:
            return calculateMeanColor(colors);
    }
};

/**
 * 计算平均颜色
 */
const calculateMeanColor = (colors: { r: number; g: number; b: number }[]): {
    r: number; g: number; b: number;
} => {
    let sumR = 0, sumG = 0, sumB = 0;

    for (const color of colors) {
        sumR += color.r;
        sumG += color.g;
        sumB += color.b;
    }

    return {
        r: Math.round(sumR / colors.length),
        g: Math.round(sumG / colors.length),
        b: Math.round(sumB / colors.length),
    };
};

/**
 * 计算中位数颜色（更抗噪声）
 */
const calculateMedianColor = (colors: { r: number; g: number; b: number }[]): {
    r: number; g: number; b: number;
} => {
    const rs = colors.map(c => c.r).sort((a, b) => a - b);
    const gs = colors.map(c => c.g).sort((a, b) => a - b);
    const bs = colors.map(c => c.b).sort((a, b) => a - b);

    const mid = Math.floor(colors.length / 2);

    return {
        r: rs[mid],
        g: gs[mid],
        b: bs[mid],
    };
};

/**
 * 计算主导颜色（最常出现的颜色）
 */
const calculateDominantColor = (colors: { r: number; g: number; b: number }[]): {
    r: number; g: number; b: number;
} => {
    // 将颜色量化到较粗的粒度（减少噪声）
    const quantize = (v: number) => Math.round(v / 16) * 16;

    const colorMap = new Map<string, number>();

    for (const color of colors) {
        const key = `${quantize(color.r)},${quantize(color.g)},${quantize(color.b)}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    // 找出出现次数最多的颜色
    let maxCount = 0;
    let dominantKey = '';

    for (const [key, count] of colorMap.entries()) {
        if (count > maxCount) {
            maxCount = count;
            dominantKey = key;
        }
    }

    const [r, g, b] = dominantKey.split(',').map(Number);
    return { r, g, b };
};

/**
 * 批量匹配颜色
 */
export const matchColorsToRegions = (
    regions: BeadRegion[],
    palette: BeadColor[],
    config?: ColorRecognitionConfig
): BeadRegion[] => {
    const colorMatchConfig = config?.colorMatchConfig;

    return regions.map(region => {
        const matchedColor = findNearestColor(
            region.color.r,
            region.color.g,
            region.color.b,
            palette,
            colorMatchConfig
        );

        return {
            ...region,
            matchedColor,
        };
    });
};

/**
 * 完整的图纸处理流程
 */
export const processBlueprint = (
    imageData: ImageData,
    palette: BeadColor[],
    boundaryConfig?: BoundaryDetectionConfig,
    colorConfig?: ColorRecognitionConfig
): BlueprintProcessResult => {

    const { data, width, height } = imageData;

    // 1. 边界检测
    const regions = detectBeadRegionsAdaptive(data, width, height, boundaryConfig);

    // 2. 颜色识别
    const regionsWithColors = matchColorsToRegions(regions, palette, colorConfig);

    // 3. 计算网格尺寸
    const maxGridX = regions.reduce((max, r) => Math.max(max, r.gridX), 0);
    const maxGridY = regions.reduce((max, r) => Math.max(max, r.gridY), 0);

    // 4. 估算豆子尺寸
    const avgBeadSize = regions.length > 0
        ? regions.reduce((sum, r) => sum + (r.width + r.height) / 2, 0) / regions.length
        : 20;

    // 5. 计算检测质量
    const avgConfidence = regions.length > 0
        ? regions.reduce((sum, r) => sum + (r.confidence || 0), 0) / regions.length
        : 0;

    return {
        regions: regionsWithColors,
        gridWidth: maxGridX + 1,
        gridHeight: maxGridY + 1,
        estimatedBeadSize: Math.round(avgBeadSize),
        detectionQuality: avgConfidence,
    };
};
