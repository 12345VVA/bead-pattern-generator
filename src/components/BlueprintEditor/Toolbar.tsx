import React from 'react';
import { Button } from '@/components/ui/button';
import {
    ZoomIn,
    ZoomOut,
    FlipVertical,
    FlipHorizontal,
    Edit3,
    Pipette,
    Undo,
    X,
    Palette,
    Eye
} from 'lucide-react';
import type { BeadColor } from '@/lib/colors';
import type { BeadRegion } from './types';

interface ToolbarProps {
    canvasScale: number;
    beadRegions: BeadRegion[];
    isEditMode: boolean;
    isPipetteMode: boolean;
    showColorSelector: boolean;
    selectedColor: BeadColor | null;
    historyIndex: number;
    showColorStats: boolean;
    colorStatsCount: number;
    showRecognitionPreview?: boolean;

    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    onFlipVertical: () => void;
    onFlipHorizontal: () => void;
    onToggleEditMode: () => void;
    onTogglePipetteMode: () => void;
    onUndo: () => void;
    onClearSelection: () => void;
    onToggleColorSelector: () => void;
    onToggleColorStats: () => void;
    onToggleRecognitionPreview?: () => void;
}

export function Toolbar({
    canvasScale,
    beadRegions,
    isEditMode,
    isPipetteMode,
    showColorSelector,
    selectedColor,
    historyIndex,
    showColorStats,
    colorStatsCount,
    showRecognitionPreview = false,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFlipVertical,
    onFlipHorizontal,
    onToggleEditMode,
    onTogglePipetteMode,
    onUndo,
    onClearSelection,
    onToggleColorSelector,
    onToggleColorStats,
    onToggleRecognitionPreview,
}: ToolbarProps) {
    return (
        <div className="h-14 border-b-4 border-black bg-white flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-4">
                {/* 缩放控制 */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-muted-foreground">缩放:</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onZoomOut}
                        className="h-8 w-8 p-0"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="w-14 text-center font-mono text-sm">{Math.round(canvasScale * 100)}%</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onZoomIn}
                        className="h-8 w-8 p-0"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onResetZoom}
                        className="text-xs h-8"
                    >
                        重置
                    </Button>
                </div>

                <div className="h-8 w-px bg-black/20" />

                {/* 镜像控制 */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={beadRegions.length === 0}
                        onClick={onFlipVertical}
                        className="h-8"
                    >
                        <FlipVertical className="w-4 h-4 mr-1" /> 上下镜像
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={beadRegions.length === 0}
                        onClick={onFlipHorizontal}
                        className="h-8"
                    >
                        <FlipHorizontal className="w-4 h-4 mr-1" /> 左右镜像
                    </Button>
                </div>

                <div className="h-8 w-px bg-black/20" />

                {/* 编辑模式控制 */}
                <div className="flex items-center gap-2">
                    <Button
                        variant={isEditMode ? "default" : "outline"}
                        size="sm"
                        disabled={beadRegions.length === 0}
                        onClick={onToggleEditMode}
                        className="h-8"
                    >
                        <Edit3 className="w-4 h-4 mr-1" /> 编辑模式
                    </Button>
                    {isEditMode && (
                        <>
                            <Button
                                variant={isPipetteMode ? "default" : "outline"}
                                size="sm"
                                onClick={onTogglePipetteMode}
                                className="h-8"
                            >
                                <Pipette className="w-4 h-4 mr-1" /> 取色
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onUndo}
                                disabled={historyIndex <= 0}
                                className="h-8"
                            >
                                <Undo className="w-4 h-4 mr-1" /> 撤回
                            </Button>
                            {selectedColor && (
                                <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded border">
                                    <div
                                        className="w-5 h-5 rounded border border-black"
                                        style={{ backgroundColor: selectedColor.hex }}
                                    />
                                    <span className="text-xs font-mono font-bold">{selectedColor.id}</span>
                                    <X
                                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                                        onClick={onClearSelection}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="h-8 w-px bg-black/20" />

                <span className="text-sm text-muted-foreground">
                    {beadRegions.length > 0
                        ? `已识别 ${beadRegions.length} 个豆子`
                        : '请先上传图纸'}
                </span>
            </div>

            {/* 右侧按钮 */}
            <div className="flex items-center gap-2">
                {/* 编辑模式下的色号选择器开关 */}
                {isEditMode && (
                    <Button
                        variant={showColorSelector ? "default" : "outline"}
                        size="sm"
                        onClick={onToggleColorSelector}
                        className="h-8"
                    >
                        <Palette className="w-4 h-4 mr-1" /> 色号
                    </Button>
                )}

                {/* 色号统计 */}
                {colorStatsCount > 0 && (
                    <Button
                        variant={showColorStats ? "default" : "outline"}
                        size="sm"
                        onClick={onToggleColorStats}
                        className="border-2 border-black"
                    >
                        <Palette className="w-4 h-4 mr-1" />
                        色号统计
                        <span className="ml-1 bg-black text-white text-xs px-1.5 rounded">
                            {colorStatsCount}
                        </span>
                    </Button>
                )}

                {onToggleRecognitionPreview && (
                    <Button
                        variant={showRecognitionPreview ? "default" : "outline"}
                        size="sm"
                        onClick={onToggleRecognitionPreview}
                        className="border-2 border-black"
                    >
                        <Eye className="w-4 h-4 mr-1" />
                        预览
                    </Button>
                )}
            </div>
        </div>
    );
}
