import type { BeadColor } from "@/lib/colors";
import type { ProcessedResult } from "@/lib/image-processing";
import { hexToRgb } from "@/lib/canvas-utils";

export const applyGenerationNoiseFilter = (
    pixels: Uint8ClampedArray,
    colorCounts: Map<string, number>,
    beadGrid: (string | null)[],
    width: number,
    height: number,
    threshold: number,
    palette: BeadColor[]
): ProcessedResult => {
    const newPixels = new Uint8ClampedArray(pixels);
    const newColorCounts = new Map<string, number>();
    const newBeadGrid: (string | null)[] = new Array(width * height).fill(null);

    const validColors = new Set<string>();
    const colorReplacementMap = new Map<string, string>();
    const sortedColors = Array.from(colorCounts.entries()).sort(([, a], [, b]) => b - a);

    for (const [colorId, count] of sortedColors) {
        if (count >= threshold) {
            validColors.add(colorId);
            continue;
        }

        const noiseColor = palette.find(color => color.id === colorId);
        if (!noiseColor) continue;

        const noiseRgb = hexToRgb(noiseColor.hex);
        let minDist = Infinity;
        let replacementColor = "";

        for (const validId of validColors) {
            const validColor = palette.find(color => color.id === validId);
            if (!validColor) continue;

            const validRgb = hexToRgb(validColor.hex);
            const dist = Math.sqrt(
                Math.pow(noiseRgb.r - validRgb.r, 2) +
                Math.pow(noiseRgb.g - validRgb.g, 2) +
                Math.pow(noiseRgb.b - validRgb.b, 2)
            );

            if (dist < minDist) {
                minDist = dist;
                replacementColor = validId;
            }
        }

        if (replacementColor) {
            colorReplacementMap.set(colorId, replacementColor);
        } else if (validColors.size > 0) {
            const mostUsedId = sortedColors[0]?.[0];
            if (mostUsedId) {
                colorReplacementMap.set(colorId, mostUsedId);
            }
        }
    }

    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const originalBeadId = beadGrid[i];

        if (originalBeadId === null) {
            newPixels[idx + 3] = 0;
            continue;
        }

        let finalBeadId = originalBeadId;
        if (colorReplacementMap.has(originalBeadId)) {
            finalBeadId = colorReplacementMap.get(originalBeadId)!;
        }

        const finalColor = palette.find(color => color.id === finalBeadId);
        if (finalColor) {
            const rgb = hexToRgb(finalColor.hex);
            newPixels[idx] = rgb.r;
            newPixels[idx + 1] = rgb.g;
            newPixels[idx + 2] = rgb.b;
            newPixels[idx + 3] = 255;
        }

        newBeadGrid[i] = finalBeadId;
        newColorCounts.set(finalBeadId, (newColorCounts.get(finalBeadId) || 0) + 1);
    }

    return { pixels: newPixels, colorCounts: newColorCounts, beadGrid: newBeadGrid };
};

export const applyGenerationColorMerge = (
    pixels: Uint8ClampedArray,
    colorCounts: Map<string, number>,
    beadGrid: (string | null)[],
    width: number,
    height: number,
    tolerance: number,
    palette: BeadColor[]
): ProcessedResult => {
    const newPixels = new Uint8ClampedArray(pixels);
    const newColorCounts = new Map<string, number>();
    const newBeadGrid: (string | null)[] = new Array(width * height).fill(null);
    const distanceThreshold = (tolerance / 100) * 150;
    const usedColorIds = Array.from(colorCounts.keys()).filter((id): id is string => id !== null);
    const mergeMapping = new Map<string, string>();
    const processedColors = new Set<string>();

    for (const colorId of usedColorIds) {
        if (processedColors.has(colorId)) continue;

        const color = palette.find(candidate => candidate.id === colorId);
        if (!color) continue;

        const colorRgb = hexToRgb(color.hex);
        const similarColors: string[] = [];

        for (const otherId of usedColorIds) {
            if (otherId === colorId || processedColors.has(otherId)) continue;

            const otherColor = palette.find(candidate => candidate.id === otherId);
            if (!otherColor) continue;

            const otherRgb = hexToRgb(otherColor.hex);
            const distance = Math.sqrt(
                Math.pow(colorRgb.r - otherRgb.r, 2) +
                Math.pow(colorRgb.g - otherRgb.g, 2) +
                Math.pow(colorRgb.b - otherRgb.b, 2)
            );

            if (distance <= distanceThreshold) {
                similarColors.push(otherId);
            }
        }

        if (similarColors.length > 0) {
            const allSimilarColors = [colorId, ...similarColors];
            let maxCount = 0;
            let targetColorId = colorId;

            for (const id of allSimilarColors) {
                const count = colorCounts.get(id) || 0;
                if (count > maxCount) {
                    maxCount = count;
                    targetColorId = id;
                }
            }

            for (const id of allSimilarColors) {
                mergeMapping.set(id, targetColorId);
                processedColors.add(id);
            }
        } else {
            mergeMapping.set(colorId, colorId);
            processedColors.add(colorId);
        }
    }

    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const originalBeadId = beadGrid[i];

        if (originalBeadId === null) {
            newPixels[idx + 3] = 0;
            continue;
        }

        const targetBeadId = mergeMapping.get(originalBeadId) || originalBeadId;
        const targetColor = palette.find(color => color.id === targetBeadId);
        if (targetColor) {
            const rgb = hexToRgb(targetColor.hex);
            newPixels[idx] = rgb.r;
            newPixels[idx + 1] = rgb.g;
            newPixels[idx + 2] = rgb.b;
            newPixels[idx + 3] = 255;
        }

        newBeadGrid[i] = targetBeadId;
        newColorCounts.set(targetBeadId, (newColorCounts.get(targetBeadId) || 0) + 1);
    }

    return { pixels: newPixels, colorCounts: newColorCounts, beadGrid: newBeadGrid };
};
