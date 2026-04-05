import { useEffect, useState } from "react";
import { getPixelData, processImage, type ProcessedResult, type ColorMatchConfig, type ColorMatchAlgorithm } from "@/lib/image-processing";
import type { BeadColor } from "@/lib/colors";
import { applyGenerationColorMerge, applyGenerationNoiseFilter } from "@/lib/generation-postprocess";

interface UsePatternGenerationOptions {
    originalImage: HTMLImageElement | null;
    gridWidth: number;
    gridHeight: number;
    currentPalette: BeadColor[];
    colorMatchAlgorithm: ColorMatchAlgorithm;
    dither: boolean;
    ditherStrength: number;
    ignoreWhite: boolean;
    ignoreBlack: boolean;
    filterNoise: boolean;
    noiseThreshold: number;
    mergeColors: boolean;
    mergeTolerance: number;
}

export function usePatternGeneration(options: UsePatternGenerationOptions) {
    const [processedData, setProcessedData] = useState<ProcessedResult | null>(null);

    useEffect(() => {
        if (!options.originalImage) {
            setProcessedData(null);
            return;
        }

        const rawPixels = getPixelData(options.originalImage, options.gridWidth, options.gridHeight);
        const colorMatchConfig: ColorMatchConfig = {
            algorithm: options.colorMatchAlgorithm,
            useCache: true,
        };

        let result = processImage(
            rawPixels,
            options.gridWidth,
            options.gridHeight,
            options.currentPalette,
            options.dither,
            options.ditherStrength,
            options.ignoreWhite,
            options.ignoreBlack,
            colorMatchConfig
        );

        if (options.filterNoise) {
            result = applyGenerationNoiseFilter(
                result.pixels,
                result.colorCounts,
                result.beadGrid,
                options.gridWidth,
                options.gridHeight,
                options.noiseThreshold,
                options.currentPalette
            );
        }

        if (options.mergeColors) {
            result = applyGenerationColorMerge(
                result.pixels,
                result.colorCounts,
                result.beadGrid,
                options.gridWidth,
                options.gridHeight,
                options.mergeTolerance,
                options.currentPalette
            );
        }

        setProcessedData(result);
    }, [
        options.originalImage,
        options.gridWidth,
        options.gridHeight,
        options.currentPalette,
        options.colorMatchAlgorithm,
        options.dither,
        options.ditherStrength,
        options.ignoreWhite,
        options.ignoreBlack,
        options.filterNoise,
        options.noiseThreshold,
        options.mergeColors,
        options.mergeTolerance,
    ]);

    return {
        processedData,
        setProcessedData,
    };
}
