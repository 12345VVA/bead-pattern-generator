import type { PaletteKey, BeadColor } from "@/lib/colors";
import { PALETTES } from "@/lib/colors";
import { findNearestColor, type ColorMatchAlgorithm } from "@/lib/image-processing";
import { hexToRgb } from "@/lib/canvas-utils";
import type { BeadRegion } from "@/components/BlueprintEditor/types";

export interface BlueprintPostProcessOptions {
    paletteKey: PaletteKey;
    algorithm: ColorMatchAlgorithm;
    filterNoise: boolean;
    noiseThreshold: number;
    mergeColors: boolean;
    mergeTolerance: number;
}

const getPaletteColors = (paletteKey: PaletteKey): BeadColor[] => {
    return PALETTES[paletteKey]?.colors || [];
};

export const rematchBlueprintRegions = (
    beadRegions: BeadRegion[],
    paletteKey: PaletteKey,
    algorithm: ColorMatchAlgorithm
): BeadRegion[] => {
    const paletteColors = getPaletteColors(paletteKey);

    return beadRegions.map(region => ({
        ...region,
        matchedColor: findNearestColor(region.color.r, region.color.g, region.color.b, paletteColors, {
            algorithm,
            useCache: true,
        }),
    }));
};

export const applyBlueprintNoiseFilter = (
    beadRegions: BeadRegion[],
    threshold: number,
    paletteColors: BeadColor[]
): BeadRegion[] => {
    const colorCounts = new Map<string, number>();
    beadRegions.forEach(region => {
        if (region.matchedColor) {
            colorCounts.set(region.matchedColor.id, (colorCounts.get(region.matchedColor.id) || 0) + 1);
        }
    });

    const validColors = new Set<string>();
    const colorReplacementMap = new Map<string, string>();
    const sortedColors = Array.from(colorCounts.entries()).sort(([, a], [, b]) => b - a);

    for (const [colorId, count] of sortedColors) {
        if (count >= threshold) {
            validColors.add(colorId);
            continue;
        }

        const noiseColor = paletteColors.find(color => color.id === colorId);
        if (!noiseColor) continue;

        const noiseRgb = hexToRgb(noiseColor.hex);
        let minDist = Infinity;
        let replacementColor = "";

        for (const validId of validColors) {
            const validColor = paletteColors.find(color => color.id === validId);
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

    return beadRegions.map(region => {
        if (!region.matchedColor) return region;

        const newColorId = colorReplacementMap.get(region.matchedColor.id);
        if (!newColorId) return region;

        const newColor = paletteColors.find(color => color.id === newColorId);
        return {
            ...region,
            matchedColor: newColor || region.matchedColor,
        };
    });
};

export const applyBlueprintColorMerge = (
    beadRegions: BeadRegion[],
    tolerance: number,
    paletteColors: BeadColor[]
): BeadRegion[] => {
    const distanceThreshold = (tolerance / 100) * 150;
    const usedColorIds = Array.from(
        new Set(
            beadRegions
                .filter(region => region.matchedColor)
                .map(region => region.matchedColor!.id)
        )
    );

    const colorCounts = new Map<string, number>();
    beadRegions.forEach(region => {
        if (region.matchedColor) {
            colorCounts.set(region.matchedColor.id, (colorCounts.get(region.matchedColor.id) || 0) + 1);
        }
    });

    const mergeMapping = new Map<string, string>();
    const processedColors = new Set<string>();
    const sortedColorIds = usedColorIds.sort((a, b) =>
        (colorCounts.get(b) || 0) - (colorCounts.get(a) || 0)
    );

    for (const colorId of sortedColorIds) {
        if (processedColors.has(colorId)) continue;

        const color = paletteColors.find(candidate => candidate.id === colorId);
        if (!color) continue;

        const colorRgb = hexToRgb(color.hex);
        const similarColors: string[] = [];

        for (const otherId of sortedColorIds) {
            if (otherId === colorId || processedColors.has(otherId)) continue;

            const otherColor = paletteColors.find(candidate => candidate.id === otherId);
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
            const targetColorId = allSimilarColors[0];

            for (const id of allSimilarColors) {
                mergeMapping.set(id, targetColorId);
                processedColors.add(id);
            }
        } else {
            mergeMapping.set(colorId, colorId);
            processedColors.add(colorId);
        }
    }

    return beadRegions.map(region => {
        if (!region.matchedColor) return region;

        const targetColorId = mergeMapping.get(region.matchedColor.id);
        if (!targetColorId || targetColorId === region.matchedColor.id) return region;

        const targetColor = paletteColors.find(color => color.id === targetColorId);
        if (!targetColor) return region;

        return {
            ...region,
            matchedColor: targetColor,
        };
    });
};

export const postProcessBlueprintRegions = (
    sourceRegions: BeadRegion[],
    options: BlueprintPostProcessOptions
): BeadRegion[] => {
    const paletteColors = getPaletteColors(options.paletteKey);

    let processed = rematchBlueprintRegions(sourceRegions, options.paletteKey, options.algorithm);

    if (options.filterNoise) {
        processed = applyBlueprintNoiseFilter(processed, options.noiseThreshold, paletteColors);
    }

    if (options.mergeColors) {
        processed = applyBlueprintColorMerge(processed, options.mergeTolerance, paletteColors);
    }

    return processed;
};
