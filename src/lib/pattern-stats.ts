import type { BeadColor } from "@/lib/colors";
import type { ProcessedResult } from "@/lib/image-processing";
import type { BeadRegion } from "@/components/BlueprintEditor/types";

export interface PatternColorStat {
    colorId: string;
    count: number;
    color: BeadColor;
    percentage: number;
}

export const getProcessedPatternStats = (
    processedData: ProcessedResult | null,
    palette: BeadColor[],
    totalBeads: number
): PatternColorStat[] => {
    if (!processedData) return [];

    const stats: PatternColorStat[] = [];
    for (const [id, count] of processedData.colorCounts.entries()) {
        const color = palette.find(candidate => candidate.id === id);
        if (!color) continue;

        stats.push({
            colorId: id,
            count,
            color,
            percentage: parseFloat((((count / Math.max(1, totalBeads)) * 100).toFixed(1))),
        });
    }

    return stats.sort((a, b) => b.count - a.count);
};

export const getBlueprintPatternStats = (
    beadRegions: BeadRegion[],
    totalBeads?: number
): PatternColorStat[] => {
    const colorCounts = new Map<string, { count: number; color: BeadColor }>();

    beadRegions.forEach(region => {
        if (!region.matchedColor) return;

        const existing = colorCounts.get(region.matchedColor.id);
        if (existing) {
            existing.count += 1;
        } else {
            colorCounts.set(region.matchedColor.id, {
                count: 1,
                color: region.matchedColor,
            });
        }
    });

    const denominator = Math.max(1, totalBeads ?? beadRegions.length);
    return Array.from(colorCounts.entries())
        .map(([colorId, value]) => ({
            colorId,
            count: value.count,
            color: value.color,
            percentage: parseFloat((((value.count / denominator) * 100).toFixed(1))),
        }))
        .sort((a, b) => b.count - a.count);
};
