import type { BeadColor } from "@/lib/colors";
import type { ProcessedResult } from "@/lib/image-processing";
import type { BeadRegion } from "@/components/BlueprintEditor/types";

interface PatternCell {
    gridX: number;
    gridY: number;
    color: { r: number; g: number; b: number };
    label?: string;
    matchedColor?: BeadColor;
}

interface RenderPatternOptions {
    cells: PatternCell[];
    gridWidth: number;
    gridHeight: number;
    pixelSize: number;
    showLabels: boolean;
    hideWhiteLabels?: boolean;
    hideBlackLabels?: boolean;
    hiddenColorIds?: Set<string>;
}

const isWhiteLike = (color?: BeadColor) => {
    if (!color) return false;
    return (
        color.name.toLowerCase() === "white" ||
        color.name === "白色" ||
        color.name === "极浅灰" ||
        color.hex.toLowerCase() === "#ffffff" ||
        color.hex.toLowerCase() === "#fbfbfb" ||
        color.id === "H02"
    );
};

const isBlackLike = (color?: BeadColor) => {
    if (!color) return false;
    return (
        color.name.toLowerCase() === "black" ||
        color.name === "黑色" ||
        color.name === "炭黑1" ||
        color.hex.toLowerCase() === "#000000" ||
        color.hex.toLowerCase() === "#010101" ||
        color.id === "H07"
    );
};

export const renderPatternToCanvas = ({
    cells,
    gridWidth,
    gridHeight,
    pixelSize,
    showLabels,
    hideWhiteLabels = false,
    hideBlackLabels = false,
    hiddenColorIds,
}: RenderPatternOptions): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = gridWidth * pixelSize;
    canvas.height = gridHeight * pixelSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    cells.forEach(cell => {
        const x = cell.gridX * pixelSize;
        const y = cell.gridY * pixelSize;

        ctx.fillStyle = `rgb(${cell.color.r},${cell.color.g},${cell.color.b})`;
        ctx.fillRect(x + 1, y + 1, pixelSize - 2, pixelSize - 2);

        if (!showLabels || !cell.label) return;
        if (hiddenColorIds?.has(cell.label)) return;
        if (hideWhiteLabels && isWhiteLike(cell.matchedColor)) return;
        if (hideBlackLabels && isBlackLike(cell.matchedColor)) return;

        const displayColor = cell.matchedColor
            ? hexToRgbSafe(cell.matchedColor.hex, cell.color)
            : cell.color;
        const brightness = (displayColor.r * 299 + displayColor.g * 587 + displayColor.b * 114) / 1000;
        ctx.fillStyle = brightness > 128 ? "#000000" : "#FFFFFF";
        ctx.font = `bold ${pixelSize * 0.28}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cell.label, x + pixelSize / 2, y + pixelSize / 2);
    });

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    for (let x = 0; x <= gridWidth; x++) {
        if (x % 5 === 0) continue;
        ctx.moveTo(x * pixelSize, 0);
        ctx.lineTo(x * pixelSize, canvas.height);
    }
    for (let y = 0; y <= gridHeight; y++) {
        if (y % 5 === 0) continue;
        ctx.moveTo(0, y * pixelSize);
        ctx.lineTo(canvas.width, y * pixelSize);
    }
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    for (let x = 0; x <= gridWidth; x += 5) {
        ctx.moveTo(x * pixelSize, 0);
        ctx.lineTo(x * pixelSize, canvas.height);
    }
    for (let y = 0; y <= gridHeight; y += 5) {
        ctx.moveTo(0, y * pixelSize);
        ctx.lineTo(canvas.width, y * pixelSize);
    }
    ctx.stroke();

    return canvas;
};

export const createProcessedPatternExportCanvas = (
    processedData: ProcessedResult,
    palette: BeadColor[],
    width: number,
    height: number,
    pixelSize: number,
    showLabels: boolean,
    hideWhiteLabels = false
): HTMLCanvasElement => {
    const cells: PatternCell[] = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            const pixelIndex = index * 4;
            if (processedData.pixels[pixelIndex + 3] < 10) continue;

            const beadId = processedData.beadGrid[index] || undefined;
            const matchedColor = beadId ? palette.find(color => color.id === beadId) : undefined;
            cells.push({
                gridX: x,
                gridY: y,
                color: {
                    r: processedData.pixels[pixelIndex],
                    g: processedData.pixels[pixelIndex + 1],
                    b: processedData.pixels[pixelIndex + 2],
                },
                label: beadId,
                matchedColor,
            });
        }
    }

    return renderPatternToCanvas({
        cells,
        gridWidth: width,
        gridHeight: height,
        pixelSize,
        showLabels,
        hideWhiteLabels,
    });
};

export const createBlueprintExportCanvas = (
    beadRegions: BeadRegion[],
    pixelSize: number,
    showLabels: boolean,
    options?: {
        hideWhiteLabels?: boolean;
        hideBlackLabels?: boolean;
        hiddenColorIds?: Set<string>;
    }
): HTMLCanvasElement => {
    const gridWidth = beadRegions.reduce((max, region) => Math.max(max, region.gridX), -1) + 1;
    const gridHeight = beadRegions.reduce((max, region) => Math.max(max, region.gridY), -1) + 1;

    const cells: PatternCell[] = beadRegions.map(region => ({
        gridX: region.gridX,
        gridY: region.gridY,
        color: region.matchedColor
            ? hexToRgbSafe(region.matchedColor.hex, region.color)
            : region.color,
        label: region.matchedColor?.id,
        matchedColor: region.matchedColor,
    }));

    return renderPatternToCanvas({
        cells,
        gridWidth,
        gridHeight,
        pixelSize,
        showLabels,
        hideWhiteLabels: options?.hideWhiteLabels,
        hideBlackLabels: options?.hideBlackLabels,
        hiddenColorIds: options?.hiddenColorIds,
    });
};

const hexToRgbSafe = (hex: string, fallback: { r: number; g: number; b: number }) => {
    const normalized = hex.replace("#", "");
    if (normalized.length !== 6) return fallback;

    const value = parseInt(normalized, 16);
    if (Number.isNaN(value)) return fallback;

    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255,
    };
};

export const downloadCanvasAsPng = (canvas: HTMLCanvasElement, filename: string) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
};
