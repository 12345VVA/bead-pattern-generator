import { useCallback, useState } from "react";
import { PALETTES, type PaletteKey } from "@/lib/colors";
import type { ColorMatchAlgorithm } from "@/lib/image-processing";
import {
    processBlueprint as processBlueprintEnhanced,
    type BoundaryDetectionConfig,
    type ColorRecognitionConfig,
} from "@/lib/blueprint-processing";
import { postProcessBlueprintRegions } from "@/lib/blueprint-postprocess";
import type { BeadRegion } from "@/components/BlueprintEditor/types";

export interface BlueprintRecognitionDebug {
    detectionQuality: number;
    estimatedBeadSize: number;
    gridConfidence?: number;
    contentRegion?: { x: number; y: number; width: number; height: number; confidence: number };
}

interface BlueprintRecognitionOptions {
    selectedPalette: PaletteKey;
    boundaryDetectionMethod: "grid" | "contour" | "adaptive";
    colorSampleMethod: "average" | "median" | "dominant";
    excludeEdgePixels: boolean;
    colorMatchAlgorithm: ColorMatchAlgorithm;
    filterNoise: boolean;
    noiseThreshold: number;
    mergeColors: boolean;
    mergeTolerance: number;
}

interface ApplyPostProcessOptions {
    paletteKey?: PaletteKey;
    algorithm?: ColorMatchAlgorithm;
}

const calculateGridBounds = (regions: BeadRegion[]) => ({
    gridWidth: regions.reduce((max, region) => Math.max(max, region.gridX), -1) + 1,
    gridHeight: regions.reduce((max, region) => Math.max(max, region.gridY), -1) + 1,
});

export function useBlueprintRecognition(options: BlueprintRecognitionOptions) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [rawBeadRegions, setRawBeadRegions] = useState<BeadRegion[]>([]);
    const [recognitionDebug, setRecognitionDebug] = useState<BlueprintRecognitionDebug | null>(null);

    const applyPostProcessingToRegions = useCallback((
        sourceRegions: BeadRegion[],
        applyOptions?: ApplyPostProcessOptions
    ) => {
        const paletteKey = applyOptions?.paletteKey ?? options.selectedPalette;
        const algorithm = applyOptions?.algorithm ?? options.colorMatchAlgorithm;
        const processed = postProcessBlueprintRegions(sourceRegions, {
            paletteKey,
            algorithm,
            filterNoise: options.filterNoise,
            noiseThreshold: options.noiseThreshold,
            mergeColors: options.mergeColors,
            mergeTolerance: options.mergeTolerance,
        });

        return {
            processed,
            ...calculateGridBounds(processed),
        };
    }, [
        options.selectedPalette,
        options.colorMatchAlgorithm,
        options.filterNoise,
        options.noiseThreshold,
        options.mergeColors,
        options.mergeTolerance,
    ]);

    const processBlueprint = useCallback(async (img: HTMLImageElement) => {
        setIsProcessing(true);

        try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("无法获取 canvas 上下文");

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const boundaryConfig: BoundaryDetectionConfig = {
                method: options.boundaryDetectionMethod,
                minBeadSize: 5,
                maxBeadSize: 100,
                edgeThreshold: 50,
            };

            const colorConfig: ColorRecognitionConfig = {
                sampleMethod: options.colorSampleMethod,
                excludeEdgePixels: options.excludeEdgePixels,
                edgeExclusionRatio: 0.2,
                colorMatchConfig: {
                    algorithm: options.colorMatchAlgorithm,
                    useCache: true,
                },
            };

            const palette = PALETTES[options.selectedPalette]?.colors || [];
            const result = processBlueprintEnhanced(imageData, palette, boundaryConfig, colorConfig);
            const rawRegions = result.regions as BeadRegion[];
            setRawBeadRegions(JSON.parse(JSON.stringify(rawRegions)));

            const postProcessed = applyPostProcessingToRegions(rawRegions);
            const nextDebug: BlueprintRecognitionDebug = {
                detectionQuality: result.detectionQuality,
                estimatedBeadSize: result.estimatedBeadSize,
                gridConfidence: result.gridConfidence,
                contentRegion: result.contentRegion,
            };
            setRecognitionDebug(nextDebug);

            return {
                processedCanvas: canvas,
                rawRegions,
                finalRegions: postProcessed.processed,
                gridWidth: result.gridWidth || postProcessed.gridWidth,
                gridHeight: result.gridHeight || postProcessed.gridHeight,
                recognitionDebug: nextDebug,
                detectionQuality: result.detectionQuality,
            };
        } finally {
            setIsProcessing(false);
        }
    }, [
        options.selectedPalette,
        options.boundaryDetectionMethod,
        options.colorSampleMethod,
        options.excludeEdgePixels,
        options.colorMatchAlgorithm,
        applyPostProcessingToRegions,
    ]);

    return {
        isProcessing,
        rawBeadRegions,
        setRawBeadRegions,
        recognitionDebug,
        setRecognitionDebug,
        applyPostProcessingToRegions,
        processBlueprint,
    };
}
