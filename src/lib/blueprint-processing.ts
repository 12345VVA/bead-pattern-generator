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
    edgeThreshold?: number; // 边缘检测阈值（已弃用，现在使用自适应阈值）
    colorSimilarityThreshold?: number; // 颜色相似性阈值（0-255），用于边界扩展
    gridSpacingTolerance?: number; // 网格间距容差
    searchRadiusRatio?: number; // 搜索半径比例（相对于估计尺寸）
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
    contentRegion?: { x: number; y: number; width: number; height: number; confidence: number };
    gridConfidence?: number;
}

interface GridDetectionResult {
    spacingX: number;
    spacingY: number;
    verticalLines: number[];
    horizontalLines: number[];
    confidence: number;
}

interface LineMask {
    width: number;
    height: number;
    data: Uint8Array;
}

interface ContentRegion {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
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

    // 计算自适应边缘阈值
    const adaptiveThreshold = calculateAdaptiveThreshold(data, width, height);

    // 方法1：水平方向边缘检测
    const horizontalSpacings = detectEdgeSpacings(data, width, height, 'horizontal', adaptiveThreshold);
    spacings.push(...horizontalSpacings);

    // 方法2：垂直方向边缘检测
    const verticalSpacings = detectEdgeSpacings(data, width, height, 'vertical', adaptiveThreshold);
    spacings.push(...verticalSpacings);

    // 方法3：投影周期检测
    const projectionSpacings = detectProjectionSpacings(data, width, height);
    spacings.push(...projectionSpacings);

    if (spacings.length === 0) {
        return { spacing: 20, confidence: 0 };
    }

    // 使用众数（mode）而不是平均值，更鲁棒
    const spacingMode = calculateMode(spacings);

    // 改进的置信度计算
    const confidence = calculateDetectionConfidence(spacings, spacingMode);

    return { spacing: spacingMode, confidence };
};

const detectProjectionSpacings = (
    data: Uint8ClampedArray,
    width: number,
    height: number
): number[] => {
    const xScores = calculateLineScores(data, width, height, 'vertical');
    const yScores = calculateLineScores(data, width, height, 'horizontal');

    return [
        ...collectPeakSpacings(xScores, Math.max(6, Math.floor(width / 150)), 120),
        ...collectPeakSpacings(yScores, Math.max(6, Math.floor(height / 150)), 120),
    ];
};

/**
 * 计算自适应边缘阈值
 * 分析图像的颜色分布，自动确定合适的边缘检测阈值
 */
const calculateAdaptiveThreshold = (
    data: Uint8ClampedArray,
    width: number,
    height: number
): number => {
    // 采样分析图像的颜色变化
    const sampleSize = Math.min(1000, width * height);
    const step = Math.max(1, Math.floor((width * height) / sampleSize));

    const diffs: number[] = [];
    for (let i = 0; i < width * height - 1; i += step) {
        const idx = i * 4;
        if (idx + 7 < data.length) {
            const diff = Math.abs(data[idx] - data[idx + 4]) +
                        Math.abs(data[idx + 1] - data[idx + 5]) +
                        Math.abs(data[idx + 2] - data[idx + 6]);
            diffs.push(diff);
        }
    }

    if (diffs.length === 0) return 50;

    // 计算差异的平均值和标准差
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / diffs.length;
    const stdDev = Math.sqrt(variance);

    // 自适应阈值 = 平均值 + 1.5 * 标准差
    const threshold = Math.max(20, Math.min(100, mean + 1.5 * stdDev));

    return threshold;
};

/**
 * 改进的检测置信度计算
 * 考虑多个因素：间距一致性、检测数量、分布均匀性
 */
const calculateDetectionConfidence = (
    spacings: number[],
    spacingMode: number
): number => {
    if (spacings.length === 0) return 0;

    // 因素1：间距一致性（在众数附近的占比）
    const closeToMode = spacings.filter(s => Math.abs(s - spacingMode) <= 2).length;
    const consistency = closeToMode / spacings.length;

    // 因素2：检测数量（足够多的检测点）
    const countScore = Math.min(1, spacings.length / 50); // 至少50个检测点

    // 因素3：分布均匀性（检测的间距是否在合理范围内）
    const minSpacing = Math.min(...spacings);
    const maxSpacing = Math.max(...spacings);
    const range = maxSpacing - minSpacing;
    const distributionScore = Math.max(0, 1 - range / 100);

    // 综合评分
    const confidence = (consistency * 0.5 + countScore * 0.2 + distributionScore * 0.3);

    return Math.max(0, Math.min(1, confidence));
};

/**
 * 检测边缘间距（改进版）
 * 增加采样量，使用自适应阈值
 */
const detectEdgeSpacings = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    direction: 'horizontal' | 'vertical',
    adaptiveThreshold: number
): number[] => {
    const spacings: number[] = [];
    const sampleLines = 15; // 增加采样行数，从5增加到15

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

                // 使用自适应阈值检测显著边缘
                if (diff > adaptiveThreshold) {
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

                // 使用自适应阈值
                if (diff > adaptiveThreshold) {
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

const calculateLineScores = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    direction: 'vertical' | 'horizontal'
): number[] => {
    const length = direction === 'vertical' ? width : height;
    const scores = new Array<number>(length).fill(0);

    if (direction === 'vertical') {
        for (let x = 0; x < width; x++) {
            let darknessSum = 0;
            let gradientSum = 0;

            for (let y = 0; y < height; y++) {
                const idx = (y * width + x) * 4;
                const luminance = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
                darknessSum += 255 - luminance;

                if (x > 0) {
                    const prevIdx = (y * width + x - 1) * 4;
                    gradientSum += Math.abs(data[idx] - data[prevIdx]) +
                        Math.abs(data[idx + 1] - data[prevIdx + 1]) +
                        Math.abs(data[idx + 2] - data[prevIdx + 2]);
                }
            }

            scores[x] = darknessSum / height + gradientSum / Math.max(1, height - 1) * 0.35;
        }
    } else {
        for (let y = 0; y < height; y++) {
            let darknessSum = 0;
            let gradientSum = 0;

            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const luminance = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
                darknessSum += 255 - luminance;

                if (y > 0) {
                    const prevIdx = ((y - 1) * width + x) * 4;
                    gradientSum += Math.abs(data[idx] - data[prevIdx]) +
                        Math.abs(data[idx + 1] - data[prevIdx + 1]) +
                        Math.abs(data[idx + 2] - data[prevIdx + 2]);
                }
            }

            scores[y] = darknessSum / width + gradientSum / Math.max(1, width - 1) * 0.35;
        }
    }

    return smoothScores(scores, 3);
};

const smoothScores = (scores: number[], radius: number): number[] => {
    return scores.map((_, index) => {
        let sum = 0;
        let count = 0;

        for (let offset = -radius; offset <= radius; offset++) {
            const pos = index + offset;
            if (pos < 0 || pos >= scores.length) continue;
            sum += scores[pos];
            count++;
        }

        return count > 0 ? sum / count : scores[index];
    });
};

const collectPeakSpacings = (scores: number[], minSpacing: number, maxSpacing: number): number[] => {
    const peaks: number[] = [];
    const mean = scores.reduce((sum, value) => sum + value, 0) / Math.max(1, scores.length);
    const variance = scores.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / Math.max(1, scores.length);
    const stdDev = Math.sqrt(variance);
    const threshold = mean + stdDev * 0.6;

    for (let i = 1; i < scores.length - 1; i++) {
        if (scores[i] >= threshold && scores[i] >= scores[i - 1] && scores[i] >= scores[i + 1]) {
            peaks.push(i);
        }
    }

    const spacings: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
        const spacing = peaks[i] - peaks[i - 1];
        if (spacing >= minSpacing && spacing <= maxSpacing) {
            spacings.push(spacing);
        }
    }

    return spacings;
};

/**
 * 计算方差
 */
const calculateVariance = (numbers: number[], mean: number): number => {
    if (numbers.length === 0) return 0;

    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
};

const detectGridStructure = (
    data: Uint8ClampedArray,
    width: number,
    height: number
): GridDetectionResult => {
    const { spacing: estimatedSpacing, confidence: spacingConfidence } = estimateGridSpacing(data, width, height);

    const verticalScores = calculateLineScores(data, width, height, 'vertical');
    const horizontalScores = calculateLineScores(data, width, height, 'horizontal');

    const verticalLines = detectPeriodicLines(verticalScores, estimatedSpacing);
    const horizontalLines = detectPeriodicLines(horizontalScores, estimatedSpacing);

    const spacingX = calculateAverageLineSpacing(verticalLines, estimatedSpacing);
    const spacingY = calculateAverageLineSpacing(horizontalLines, estimatedSpacing);

    const spacingConsistencyX = assessLineSpacing(verticalLines, spacingX);
    const spacingConsistencyY = assessLineSpacing(horizontalLines, spacingY);
    const confidence = Math.max(0, Math.min(1,
        spacingConfidence * 0.5 +
        spacingConsistencyX * 0.25 +
        spacingConsistencyY * 0.25
    ));

    return {
        spacingX,
        spacingY,
        verticalLines,
        horizontalLines,
        confidence,
    };
};

const calculateAverageLineSpacing = (lines: number[], fallback: number): number => {
    if (lines.length < 2) return fallback;

    const spacings: number[] = [];
    for (let i = 1; i < lines.length; i++) {
        const spacing = lines[i] - lines[i - 1];
        if (spacing > 0) {
            spacings.push(spacing);
        }
    }

    if (spacings.length === 0) return fallback;
    return Math.round(spacings.reduce((sum, spacing) => sum + spacing, 0) / spacings.length);
};

const detectPeriodicLines = (scores: number[], spacing: number): number[] => {
    if (scores.length === 0) return [];

    const normalizedSpacing = Math.max(6, Math.round(spacing));
    const searchRadius = Math.max(1, Math.floor(normalizedSpacing * 0.2));
    let bestOffset = 0;
    let bestScore = -Infinity;

    for (let offset = 0; offset < normalizedSpacing; offset++) {
        let score = 0;
        let count = 0;

        for (let pos = offset; pos < scores.length; pos += normalizedSpacing) {
            score += scores[pos];
            count++;
        }

        const averageScore = count > 0 ? score / count : 0;
        if (averageScore > bestScore) {
            bestScore = averageScore;
            bestOffset = offset;
        }
    }

    const lines: number[] = [];
    for (let expected = bestOffset; expected < scores.length; expected += normalizedSpacing) {
        let bestPos = expected;
        let localBest = -Infinity;

        for (let delta = -searchRadius; delta <= searchRadius; delta++) {
            const pos = expected + delta;
            if (pos < 0 || pos >= scores.length) continue;
            if (scores[pos] > localBest) {
                localBest = scores[pos];
                bestPos = pos;
            }
        }

        if (lines.length === 0 || bestPos - lines[lines.length - 1] >= Math.floor(normalizedSpacing * 0.6)) {
            lines.push(bestPos);
        }
    }

    if (lines[0] !== 0) {
        lines.unshift(0);
    }
    if (lines[lines.length - 1] !== scores.length - 1) {
        lines.push(scores.length - 1);
    }

    return lines;
};

const assessLineSpacing = (lines: number[], expectedSpacing: number): number => {
    if (lines.length < 3) return 0;

    const spacings: number[] = [];
    for (let i = 1; i < lines.length; i++) {
        spacings.push(lines[i] - lines[i - 1]);
    }

    const validSpacings = spacings.filter(spacing => spacing > 0);
    if (validSpacings.length === 0) return 0;

    const avgError = validSpacings.reduce((sum, spacing) => sum + Math.abs(spacing - expectedSpacing), 0) / validSpacings.length;
    return Math.max(0, 1 - avgError / Math.max(1, expectedSpacing));
};

const detectPrimaryContentRegion = (
    data: Uint8ClampedArray,
    width: number,
    height: number
): ContentRegion => {
    const background = estimateBackgroundColor(data, width, height);
    const threshold = calculateForegroundThreshold(data, width, height, background);
    const foregroundColumns = new Array<number>(width).fill(0);
    const foregroundRows = new Array<number>(height).fill(0);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const distance = colorDistance(
                { r: data[idx], g: data[idx + 1], b: data[idx + 2] },
                background
            );

            if (distance < threshold) continue;

            foregroundColumns[x]++;
            foregroundRows[y]++;
        }
    }

    const xScores = smoothScores(foregroundColumns.map(value => value / Math.max(1, height)), 6);
    const yScores = smoothScores(foregroundRows.map(value => value / Math.max(1, width)), 6);

    const xBand = selectDominantBand(xScores, width, 0.08);
    const yBand = selectDominantBand(yScores, height, 0.08);

    if (!xBand || !yBand) {
        return { x: 0, y: 0, width, height, confidence: 0 };
    }

    const marginX = Math.max(2, Math.floor((xBand.end - xBand.start + 1) * 0.03));
    const marginY = Math.max(2, Math.floor((yBand.end - yBand.start + 1) * 0.03));

    const regionX = Math.max(0, xBand.start - marginX);
    const regionY = Math.max(0, yBand.start - marginY);
    const regionWidth = Math.min(width - regionX, xBand.end - xBand.start + 1 + marginX * 2);
    const regionHeight = Math.min(height - regionY, yBand.end - yBand.start + 1 + marginY * 2);

    return {
        x: regionX,
        y: regionY,
        width: regionWidth,
        height: regionHeight,
        confidence: Math.min(1, (xBand.coverage + yBand.coverage) / 2),
    };
};

const estimateBackgroundColor = (
    data: Uint8ClampedArray,
    width: number,
    height: number
): { r: number; g: number; b: number } => {
    const samplePoints = [
        { x: 0, y: 0 },
        { x: width - 1, y: 0 },
        { x: 0, y: height - 1 },
        { x: width - 1, y: height - 1 },
        { x: Math.floor(width * 0.05), y: Math.floor(height * 0.05) },
        { x: Math.floor(width * 0.95), y: Math.floor(height * 0.05) },
        { x: Math.floor(width * 0.05), y: Math.floor(height * 0.95) },
        { x: Math.floor(width * 0.95), y: Math.floor(height * 0.95) },
    ];

    const colors = samplePoints.map(point => {
        const x = Math.max(0, Math.min(width - 1, point.x));
        const y = Math.max(0, Math.min(height - 1, point.y));
        const idx = (y * width + x) * 4;
        return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
    });

    return calculateMeanColor(colors);
};

const calculateForegroundThreshold = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    background: { r: number; g: number; b: number }
): number => {
    const sampleSize = Math.min(2000, width * height);
    const step = Math.max(1, Math.floor((width * height) / sampleSize));
    const distances: number[] = [];

    for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += step) {
        const idx = pixelIndex * 4;
        distances.push(colorDistance(
            { r: data[idx], g: data[idx + 1], b: data[idx + 2] },
            background
        ));
    }

    if (distances.length === 0) return 28;

    const mean = distances.reduce((sum, value) => sum + value, 0) / distances.length;
    const variance = distances.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(18, Math.min(64, mean + stdDev * 0.8));
};

const colorDistance = (
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number }
): number => Math.sqrt(
    Math.pow(a.r - b.r, 2) +
    Math.pow(a.g - b.g, 2) +
    Math.pow(a.b - b.b, 2)
);

const selectDominantBand = (
    scores: number[],
    length: number,
    minCoverage: number
): { start: number; end: number; coverage: number } | null => {
    if (scores.length === 0) return null;

    const maxScore = Math.max(...scores);
    if (maxScore <= 0) return null;

    const threshold = Math.max(maxScore * 0.25, minCoverage);
    const segments: Array<{ start: number; end: number; score: number; coverage: number }> = [];
    let start = -1;
    let scoreSum = 0;

    for (let i = 0; i < scores.length; i++) {
        if (scores[i] >= threshold) {
            if (start === -1) {
                start = i;
                scoreSum = 0;
            }
            scoreSum += scores[i];
        } else if (start !== -1) {
            const end = i - 1;
            segments.push({
                start,
                end,
                score: scoreSum,
                coverage: (end - start + 1) / Math.max(1, length),
            });
            start = -1;
            scoreSum = 0;
        }
    }

    if (start !== -1) {
        const end = scores.length - 1;
        segments.push({
            start,
            end,
            score: scoreSum,
            coverage: (end - start + 1) / Math.max(1, length),
        });
    }

    if (segments.length === 0) return null;

    const best = segments
        .filter(segment => segment.coverage >= minCoverage)
        .sort((a, b) => {
            const scoreA = a.score * (0.65 + (1 - a.start / Math.max(1, length)) * 0.35);
            const scoreB = b.score * (0.65 + (1 - b.start / Math.max(1, length)) * 0.35);
            return scoreB - scoreA;
        })[0];

    return best || segments.sort((a, b) => b.score - a.score)[0] || null;
};

const cropImageData = (
    data: Uint8ClampedArray,
    width: number,
    bounds: ContentRegion
): Uint8ClampedArray => {
    const cropped = new Uint8ClampedArray(bounds.width * bounds.height * 4);

    for (let y = 0; y < bounds.height; y++) {
        for (let x = 0; x < bounds.width; x++) {
            const sourceIdx = ((bounds.y + y) * width + (bounds.x + x)) * 4;
            const targetIdx = (y * bounds.width + x) * 4;
            cropped[targetIdx] = data[sourceIdx];
            cropped[targetIdx + 1] = data[sourceIdx + 1];
            cropped[targetIdx + 2] = data[sourceIdx + 2];
            cropped[targetIdx + 3] = data[sourceIdx + 3];
        }
    }

    return cropped;
};

const detectBeadRegionsByGridCells = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    config?: BoundaryDetectionConfig,
    colorConfig?: ColorRecognitionConfig
): {
    regions: BeadRegion[];
    gridWidth: number;
    gridHeight: number;
    estimatedBeadSize: number;
    confidence: number;
    contentRegion: ContentRegion;
} => {
    const contentRegion = detectPrimaryContentRegion(data, width, height);
    const targetData = contentRegion.confidence >= 0.18 &&
        contentRegion.width >= Math.floor(width * 0.35) &&
        contentRegion.height >= Math.floor(height * 0.35)
        ? cropImageData(data, width, contentRegion)
        : data;
    const targetWidth = targetData === data ? width : contentRegion.width;
    const targetHeight = targetData === data ? height : contentRegion.height;
    const offsetX = targetData === data ? 0 : contentRegion.x;
    const offsetY = targetData === data ? 0 : contentRegion.y;

    const grid = detectGridStructure(targetData, targetWidth, targetHeight);
    const lineThickness = Math.max(1, Math.round(Math.min(grid.spacingX, grid.spacingY) * 0.08));
    const lineMask = buildGridLineMask(targetWidth, targetHeight, grid.verticalLines, grid.horizontalLines, lineThickness);

    const regions: BeadRegion[] = [];
    const minSize = config?.minBeadSize || 5;
    const maxSize = config?.maxBeadSize || 100;

    for (let row = 0; row < grid.horizontalLines.length - 1; row++) {
        for (let col = 0; col < grid.verticalLines.length - 1; col++) {
            const minX = grid.verticalLines[col] + 1;
            const maxX = grid.verticalLines[col + 1] - 1;
            const minY = grid.horizontalLines[row] + 1;
            const maxY = grid.horizontalLines[row + 1] - 1;

            if (maxX <= minX || maxY <= minY) continue;

            const cellWidth = maxX - minX + 1;
            const cellHeight = maxY - minY + 1;
            if (cellWidth < minSize || cellHeight < minSize || cellWidth > maxSize || cellHeight > maxSize) continue;

            const sampledColor = sampleCellColor(
                targetData,
                targetWidth,
                targetHeight,
                { minX, maxX, minY, maxY },
                lineMask,
                colorConfig
            );

            if (!sampledColor) continue;

            regions.push({
                x: minX + offsetX,
                y: minY + offsetY,
                width: cellWidth,
                height: cellHeight,
                color: sampledColor.color,
                gridX: col,
                gridY: row,
                confidence: sampledColor.confidence * grid.confidence * Math.max(0.6, contentRegion.confidence || 1),
            });
        }
    }

    const normalizedRegions = normalizeRegionGrid(filterBoundaryBackground(regions));

    return {
        regions: normalizedRegions,
        gridWidth: Math.max(0, ...normalizedRegions.map(region => region.gridX)) + (normalizedRegions.length > 0 ? 1 : 0),
        gridHeight: Math.max(0, ...normalizedRegions.map(region => region.gridY)) + (normalizedRegions.length > 0 ? 1 : 0),
        estimatedBeadSize: Math.round((grid.spacingX + grid.spacingY) / 2),
        confidence: grid.confidence * Math.max(0.7, contentRegion.confidence || 1),
        contentRegion,
    };
};

const buildGridLineMask = (
    width: number,
    height: number,
    verticalLines: number[],
    horizontalLines: number[],
    thickness: number
): LineMask => {
    const data = new Uint8Array(width * height);

    const markPixel = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        data[y * width + x] = 1;
    };

    for (const x of verticalLines) {
        for (let dx = -thickness; dx <= thickness; dx++) {
            for (let y = 0; y < height; y++) {
                markPixel(x + dx, y);
            }
        }
    }

    for (const y of horizontalLines) {
        for (let dy = -thickness; dy <= thickness; dy++) {
            for (let x = 0; x < width; x++) {
                markPixel(x, y + dy);
            }
        }
    }

    return { width, height, data };
};

const sampleCellColor = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    lineMask: LineMask,
    config?: ColorRecognitionConfig
): { color: { r: number; g: number; b: number }; confidence: number } | null => {
    const sampleMethod = config?.sampleMethod || 'median';
    const focusRatio = config?.excludeEdgePixels === false ? 0.72 : 0.5;
    const boundsWidth = bounds.maxX - bounds.minX + 1;
    const boundsHeight = bounds.maxY - bounds.minY + 1;
    const innerWidth = Math.max(1, Math.floor(boundsWidth * focusRatio));
    const innerHeight = Math.max(1, Math.floor(boundsHeight * focusRatio));
    const startX = bounds.minX + Math.floor((boundsWidth - innerWidth) / 2);
    const startY = bounds.minY + Math.floor((boundsHeight - innerHeight) / 2);
    const endX = Math.min(bounds.maxX, startX + innerWidth - 1);
    const endY = Math.min(bounds.maxY, startY + innerHeight - 1);

    const colors: { r: number; g: number; b: number }[] = [];
    for (let y = Math.max(0, startY); y <= Math.min(height - 1, endY); y++) {
        for (let x = Math.max(0, startX); x <= Math.min(width - 1, endX); x++) {
            if (lineMask.data[y * width + x]) continue;
            const idx = (y * width + x) * 4;
            if (data[idx + 3] < 128) continue;
            colors.push({
                r: data[idx],
                g: data[idx + 1],
                b: data[idx + 2],
            });
        }
    }

    if (colors.length === 0) return null;

    const color = sampleMethod === 'average'
        ? calculateMeanColor(colors)
        : sampleMethod === 'dominant'
            ? calculateDominantColor(colors)
            : calculateMedianColor(colors);

    const meanDistance = colors.reduce((sum, candidate) => sum + Math.sqrt(
        Math.pow(candidate.r - color.r, 2) +
        Math.pow(candidate.g - color.g, 2) +
        Math.pow(candidate.b - color.b, 2)
    ), 0) / colors.length;

    return {
        color,
        confidence: Math.max(0.2, 1 - meanDistance / 80),
    };
};

const filterBoundaryBackground = (regions: BeadRegion[]): BeadRegion[] => {
    if (regions.length === 0) return regions;

    const maxGridX = Math.max(...regions.map(region => region.gridX));
    const maxGridY = Math.max(...regions.map(region => region.gridY));
    const borderRegions = regions.filter(region =>
        region.gridX <= 1 ||
        region.gridY <= 1 ||
        region.gridX >= maxGridX - 1 ||
        region.gridY >= maxGridY - 1
    );

    if (borderRegions.length === 0) return regions;

    const colorGroups = new Map<string, number>();
    for (const region of borderRegions) {
        const key = `${Math.round(region.color.r / 16)},${Math.round(region.color.g / 16)},${Math.round(region.color.b / 16)}`;
        colorGroups.set(key, (colorGroups.get(key) || 0) + 1);
    }

    const [backgroundKey, backgroundCount] = Array.from(colorGroups.entries()).sort((a, b) => b[1] - a[1])[0] || [];
    if (!backgroundKey || !backgroundCount || backgroundCount / borderRegions.length < 0.35) {
        return regions;
    }

    const backgroundRegions = borderRegions.filter(region => {
        const key = `${Math.round(region.color.r / 16)},${Math.round(region.color.g / 16)},${Math.round(region.color.b / 16)}`;
        return key === backgroundKey;
    });

    const backgroundModel = calculateMeanColor(backgroundRegions.map(region => region.color));
    const regionMap = new Map<string, BeadRegion>();
    regions.forEach(region => regionMap.set(`${region.gridX},${region.gridY}`, region));

    const queue = backgroundRegions.map(region => ({ x: region.gridX, y: region.gridY }));
    const removed = new Set<string>();

    while (queue.length > 0) {
        const current = queue.shift()!;
        const key = `${current.x},${current.y}`;
        if (removed.has(key)) continue;

        const region = regionMap.get(key);
        if (!region) continue;

        const distance = Math.sqrt(
            Math.pow(region.color.r - backgroundModel.r, 2) +
            Math.pow(region.color.g - backgroundModel.g, 2) +
            Math.pow(region.color.b - backgroundModel.b, 2)
        );

        if (distance > 38) continue;

        removed.add(key);
        queue.push({ x: current.x + 1, y: current.y });
        queue.push({ x: current.x - 1, y: current.y });
        queue.push({ x: current.x, y: current.y + 1 });
        queue.push({ x: current.x, y: current.y - 1 });
    }

    const filtered = regions.filter(region => !removed.has(`${region.gridX},${region.gridY}`));
    return filtered.length > 0 ? filtered : regions;
};

const normalizeRegionGrid = (regions: BeadRegion[]): BeadRegion[] => {
    if (regions.length === 0) return regions;

    const minGridX = Math.min(...regions.map(region => region.gridX));
    const minGridY = Math.min(...regions.map(region => region.gridY));

    return regions.map(region => ({
        ...region,
        gridX: region.gridX - minGridX,
        gridY: region.gridY - minGridY,
    }));
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
    const gridResult = detectBeadRegionsByGridCells(data, width, height, config);

    console.log(`检测到网格间距: ${gridResult.estimatedBeadSize}px, 置信度: ${(gridResult.confidence * 100).toFixed(1)}%`);

    if (method === 'grid') {
        return gridResult.regions;
    }

    if (method === 'adaptive' && gridResult.confidence >= 0.45 && gridResult.regions.length > 0) {
        return gridResult.regions;
    }

    return detectBeadRegionsContour(data, width, height, config);
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
            const bounds = findBeadBoundsPrecise(data, width, height, x, y, gridSpacing, config);

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
 * 精确定位豆子边界（改进版）
 */
const findBeadBoundsPrecise = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    estimatedSize: number,
    config?: BoundaryDetectionConfig
): { minX: number; maxX: number; minY: number; maxY: number } | null => {

    // 使用可配置的搜索半径比例，默认 0.6
    const searchRadiusRatio = config?.searchRadiusRatio ?? 0.6;
    const searchRadius = Math.floor(estimatedSize * searchRadiusRatio);

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

    // 使用可配置的颜色相似性阈值，默认 50
    const colorThreshold = config?.colorSimilarityThreshold ?? 50;

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
            const region = floodFill(data, width, height, x, y, visited, config);

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
 * 洪水填充算法（改进版）
 * 使用可配置的颜色相似性阈值
 */
const floodFill = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    visited: Set<string>,
    config?: BoundaryDetectionConfig
): { pixels: { x: number; y: number }[]; avgColor: { r: number; g: number; b: number } } | null => {

    const startIdx = (startY * width + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];

    const pixels: { x: number; y: number }[] = [];
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];

    let sumR = 0, sumG = 0, sumB = 0;
    // 使用可配置的颜色相似性阈值，默认 30
    const colorThreshold = config?.colorSimilarityThreshold ?? 30;
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
 * 完整的图纸处理流程（改进版）
 */
export const processBlueprint = (
    imageData: ImageData,
    palette: BeadColor[],
    boundaryConfig?: BoundaryDetectionConfig,
    colorConfig?: ColorRecognitionConfig
): BlueprintProcessResult => {

    const { data, width, height } = imageData;

    let regions: BeadRegion[] = [];
    let gridWidth = 0;
    let gridHeight = 0;
    let estimatedBeadSize = 20;
    let structuralConfidence = 0;
    let detectedContentRegion: ContentRegion | undefined;

    if (boundaryConfig?.method !== 'contour') {
        const gridResult = detectBeadRegionsByGridCells(data, width, height, boundaryConfig, colorConfig);
        regions = gridResult.regions;
        gridWidth = gridResult.gridWidth;
        gridHeight = gridResult.gridHeight;
        estimatedBeadSize = gridResult.estimatedBeadSize;
        structuralConfidence = gridResult.confidence;
        detectedContentRegion = gridResult.contentRegion;
    }

    if (regions.length === 0) {
        regions = detectBeadRegionsAdaptive(data, width, height, boundaryConfig);
        gridWidth = Math.max(0, ...regions.map(region => region.gridX)) + (regions.length > 0 ? 1 : 0);
        gridHeight = Math.max(0, ...regions.map(region => region.gridY)) + (regions.length > 0 ? 1 : 0);
        estimatedBeadSize = regions.length > 0
            ? regions.reduce((sum, region) => sum + (region.width + region.height) / 2, 0) / regions.length
            : estimatedBeadSize;
    }

    const regionsWithColors = matchColorsToRegions(regions, palette, colorConfig);

    if (gridWidth === 0) {
        gridWidth = Math.max(0, ...regionsWithColors.map(region => region.gridX)) + (regionsWithColors.length > 0 ? 1 : 0);
    }
    if (gridHeight === 0) {
        gridHeight = Math.max(0, ...regionsWithColors.map(region => region.gridY)) + (regionsWithColors.length > 0 ? 1 : 0);
    }

    const detectionQuality = Math.max(
        structuralConfidence * 0.35,
        assessDetectionQuality(regionsWithColors, gridWidth, gridHeight, width, height)
    );

    return {
        regions: regionsWithColors,
        gridWidth,
        gridHeight,
        estimatedBeadSize: Math.round(estimatedBeadSize),
        detectionQuality,
        contentRegion: detectedContentRegion,
        gridConfidence: structuralConfidence || undefined,
    };
};

/**
 * 改进的检测质量评估
 * 考虑多个因素：检测完整性、置信度分布、空间连续性
 */
const assessDetectionQuality = (
    regions: BeadRegion[],
    gridWidth: number,
    gridHeight: number,
    imageWidth: number,
    imageHeight: number
): number => {
    if (regions.length === 0) return 0;

    const factors: number[] = [];

    // 因素1：检测覆盖率（检测到的豆子数量 vs 网格总数）
    const expectedCount = gridWidth * gridHeight;
    const coverageRate = regions.length / expectedCount;
    // 期望覆盖率在 0.8-1.2 之间（允许有一些误差）
    const coverageScore = coverageRate >= 0.8 && coverageRate <= 1.2 ? 1 : Math.max(0, 1 - Math.abs(coverageRate - 1) * 2);
    factors.push(coverageScore * 0.3);

    // 因素2：尺寸一致性（豆子尺寸的标准差）
    const sizes = regions.map(r => (r.width + r.height) / 2);
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const sizeVariance = sizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0) / sizes.length;
    const sizeStdDev = Math.sqrt(sizeVariance);
    const sizeConsistency = Math.max(0, 1 - sizeStdDev / avgSize);
    factors.push(sizeConsistency * 0.2);

    // 因素3：空间连续性（检查是否有明显的空洞）
    const continuityScore = assessSpatialContinuity(regions, gridWidth, gridHeight);
    factors.push(continuityScore * 0.3);

    // 因素4：颜色匹配质量（匹配颜色的比例）
    const matchedCount = regions.filter(r => r.matchedColor).length;
    const matchRate = matchedCount / regions.length;
    factors.push(matchRate * 0.2);

    // 综合评分
    return factors.reduce((sum, f) => sum + f, 0);
};

/**
 * 评估空间连续性
 * 检查检测到的豆子是否在空间上连续，是否有明显的空洞
 */
const assessSpatialContinuity = (
    regions: BeadRegion[],
    gridWidth: number,
    gridHeight: number
): number => {
    // 创建网格占用图
    const occupied = new Set<string>();
    for (const r of regions) {
        occupied.add(`${r.gridX},${r.gridY}`);
    }

    // 检查空洞：如果某个位置周围8个邻居都有被占用，但该位置为空，则为空洞
    let holes = 0;
    let totalChecked = 0;

    for (let x = 1; x < gridWidth - 1; x++) {
        for (let y = 1; y < gridHeight - 1; y++) {
            const key = `${x},${y}`;
            if (occupied.has(key)) continue;

            // 检查周围8个邻居
            let neighbors = 0;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    if (occupied.has(`${x + dx},${y + dy}`)) {
                        neighbors++;
                    }
                }
            }

            if (neighbors >= 6) { // 周围大部分被占用，认为是空洞
                holes++;
            }
            totalChecked++;
        }
    }

    // 空洞率越低，连续性越好
    const holeRate = totalChecked > 0 ? holes / totalChecked : 0;
    return Math.max(0, 1 - holeRate * 2); // 允许一定程度的空洞
};
