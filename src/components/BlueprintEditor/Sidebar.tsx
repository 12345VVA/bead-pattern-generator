/**
 * BlueprintEditor 侧边栏组件
 * 包含上传、配置和设置面板
 */

import React from 'react';
import { Upload, Plus, Download, FileImage, X } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { PixelButton } from '@/components/PixelUI';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import type { PaletteKey } from '@/lib/colors';
import type { BeadColor } from '@/lib/colors';
import type { ColorMatchAlgorithm } from '@/lib/image-processing';
import type { BeadRegion } from '@/components/BlueprintEditor/types';


interface SidebarProps {
    // 状态
    selectedPalette: PaletteKey;
    showGrid: boolean;
    showLabels: boolean;
    hideWhiteLabels: boolean;
    hideBlackLabels: boolean;
    filterNoise: boolean;
    noiseThreshold: number;
    boundaryDetectionMethod: 'grid' | 'contour' | 'adaptive';
    colorSampleMethod: 'average' | 'median' | 'dominant';
    excludeEdgePixels: boolean;
    colorMatchAlgorithm: ColorMatchAlgorithm;
    beadRegions: BeadRegion[];
    isProcessing: boolean;

    // 回调
    onStateChange: (updates: any) => void;
    onPaletteChange: (palette: PaletteKey) => void;
    onNoiseFilterApply: () => void;
    onUndo: () => void;
    onExport: () => void;
    onNewGrid: () => void;

    // 上传相关
    getRootProps: () => any;
    getInputProps: () => any;
    isDragActive: boolean;

    // 其他
    currentPalette: BeadColor[];
    history: any[];
}

export function Sidebar(props: SidebarProps) {
    const {
        selectedPalette,
        showGrid,
        showLabels,
        hideWhiteLabels,
        hideBlackLabels,
        filterNoise,
        noiseThreshold,
        boundaryDetectionMethod,
        colorSampleMethod,
        excludeEdgePixels,
        colorMatchAlgorithm,
        beadRegions,
        isProcessing,
        onStateChange,
        onPaletteChange,
        onNoiseFilterApply,
        onUndo,
        onExport,
        onNewGrid,
        getRootProps,
        getInputProps,
        isDragActive,
        currentPalette,
        history,
    } = props;

    return (
        <aside className="w-72 border-r-4 border-black bg-card flex flex-col overflow-hidden">
            {/* 固定头部 */}
            <div className="p-4 border-b-4 border-black/10 flex-shrink-0">
                <Link href="/">
                    <Button variant="ghost" size="sm" className="mb-2">
                        <X className="w-4 h-4 mr-1" /> 返回首页
                    </Button>
                </Link>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                    <FileImage className="w-5 h-5" /> 图纸编辑
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                    导入带边界的图纸，自动识别色号
                </p>
            </div>

            {/* 可滚动的中间区域 */}
            <div className="flex-1 overflow-y-auto">
                {/* 上传区域 */}
                <div className="p-4 space-y-2">
                    <div
                        {...getRootProps()}
                        className={cn(
                            "border-4 border-dashed border-input p-4 text-center cursor-pointer transition-colors hover:bg-muted/50",
                            isDragActive && "border-primary bg-primary/10"
                        )}
                    >
                        <input {...(getInputProps() as React.InputHTMLAttributes<HTMLInputElement>)} />
                        <div className="flex flex-col items-center gap-2">
                            {isProcessing ? (
                                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                            ) : (
                                <Upload className="w-6 h-6 text-muted-foreground" />
                            )}
                            <p className="text-xs text-muted-foreground">
                                {isProcessing ? "处理中..." : "点击或拖拽上传图纸"}
                            </p>
                        </div>
                    </div>
                    <PixelButton
                        variant="outline"
                        className="w-full"
                        onClick={onNewGrid}
                    >
                        <Plus className="mr-2 h-4 w-4" /> 新增空白图纸
                    </PixelButton>
                </div>

                {/* 色卡选择 */}
                <div className="p-4 border-t-4 border-black/10">
                    <Label className="text-sm">色卡品牌</Label>
                    <Select value={selectedPalette} onValueChange={onPaletteChange}>
                        <SelectTrigger className="border-2 border-black h-9 mt-2">
                            <SelectValue placeholder="选择色卡" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="perler">Perler</SelectItem>
                            <SelectItem value="hama">Hama Midi</SelectItem>
                            <SelectItem value="artkal">Artkal S</SelectItem>
                            <SelectItem value="mard">MARD</SelectItem>
                            <SelectItem value="hamaEnhanced">Hama Enhanced</SelectItem>
                            <SelectItem value="nabbi">Nabbi</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* 显示设置 */}
                <div className="p-4 border-t-4 border-black/10 space-y-3">
                    <h3 className="font-bold text-sm">显示设置</h3>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="blueprint-grid" className="text-sm">网格</Label>
                        <Switch
                            id="blueprint-grid"
                            checked={showGrid}
                            onCheckedChange={(c) => onStateChange({ showGrid: c })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="blueprint-labels" className="text-sm">色号标签</Label>
                        <Switch
                            id="blueprint-labels"
                            checked={showLabels}
                            onCheckedChange={(c) => onStateChange({ showLabels: c })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="blueprint-white" className="text-sm">隐藏白色标签</Label>
                        <Switch
                            id="blueprint-white"
                            checked={hideWhiteLabels}
                            onCheckedChange={(c) => onStateChange({ hideWhiteLabels: c })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="blueprint-black" className="text-sm">隐藏黑色标签</Label>
                        <Switch
                            id="blueprint-black"
                            checked={hideBlackLabels}
                            onCheckedChange={(c) => onStateChange({ hideBlackLabels: c })}
                        />
                    </div>
                </div>

                {/* 杂色过滤设置 */}
                <div className="p-4 border-t-4 border-black/10 space-y-3">
                    <h3 className="font-bold text-sm">杂色过滤</h3>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="noise-toggle" className="text-sm">启用杂色过滤</Label>
                        <Switch
                            id="noise-toggle"
                            checked={filterNoise}
                            onCheckedChange={(c) => {
                                onStateChange({ filterNoise: c });
                                if (beadRegions.length > 0 && c) {
                                    onNoiseFilterApply();
                                } else if (beadRegions.length > 0 && !c) {
                                    onUndo();
                                }
                            }}
                        />
                    </div>
                    {filterNoise && (
                        <div className="space-y-2 pt-2 pl-3 border-l-2 border-black/10">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>最少珠子数</span>
                                <span>{noiseThreshold}</span>
                            </div>
                            <Slider
                                value={[noiseThreshold]}
                                min={1}
                                max={50}
                                step={1}
                                onValueChange={(v) => onStateChange({ noiseThreshold: v[0] })}
                                onValueCommit={() => {
                                    if (beadRegions.length > 0) {
                                        onNoiseFilterApply();
                                    }
                                }}
                            />
                            <p className="text-xs text-muted-foreground">过滤使用数量少于该值的颜色</p>
                        </div>
                    )}
                </div>

                {/* 增强识别设置 */}
                <div className="p-4 border-t-4 border-black/10 space-y-3">
                    <h3 className="font-bold text-sm">🔍 增强识别</h3>

                    {/* 边界检测方法 */}
                    <div className="space-y-2">
                        <Label className="text-sm">边界检测方法</Label>
                        <Select
                            value={boundaryDetectionMethod}
                            onValueChange={(v) => onStateChange({ boundaryDetectionMethod: v as 'grid' | 'contour' | 'adaptive' })}
                        >
                            <SelectTrigger className="border-2 border-black/50 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="adaptive">自适应（推荐）</SelectItem>
                                <SelectItem value="grid">网格检测（快速）</SelectItem>
                                <SelectItem value="contour">轮廓检测（精确）</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {boundaryDetectionMethod === 'adaptive' && '根据图片质量自动选择最佳方法'}
                            {boundaryDetectionMethod === 'grid' && '适合规则排列的图纸'}
                            {boundaryDetectionMethod === 'contour' && '适合不规则或复杂图纸'}
                        </p>
                    </div>

                    {/* 颜色采样方法 */}
                    <div className="space-y-2">
                        <Label className="text-sm">颜色采样方法</Label>
                        <Select
                            value={colorSampleMethod}
                            onValueChange={(v) => onStateChange({ colorSampleMethod: v as 'average' | 'median' | 'dominant' })}
                        >
                            <SelectTrigger className="border-2 border-black/50 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="median">中位数（推荐）</SelectItem>
                                <SelectItem value="average">平均值</SelectItem>
                                <SelectItem value="dominant">主导色</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {colorSampleMethod === 'median' && '抗噪声能力强，适合大多数情况'}
                            {colorSampleMethod === 'average' && '简单快速，适合清晰图片'}
                            {colorSampleMethod === 'dominant' && '识别最常出现的颜色'}
                        </p>
                    </div>

                    {/* 颜色匹配算法 */}
                    <div className="space-y-2">
                        <Label className="text-sm">颜色匹配算法</Label>
                        <Select
                            value={colorMatchAlgorithm}
                            onValueChange={(v) => onStateChange({ colorMatchAlgorithm: v as ColorMatchAlgorithm })}
                        >
                            <SelectTrigger className="border-2 border-black/50 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="weighted">加权RGB（推荐）</SelectItem>
                                <SelectItem value="euclidean">欧几里得距离</SelectItem>
                                <SelectItem value="cielab">CIELAB（最精确）</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {colorMatchAlgorithm === 'weighted' && '符合人眼感知，速度快'}
                            {colorMatchAlgorithm === 'euclidean' && '简单快速的数学距离'}
                            {colorMatchAlgorithm === 'cielab' && '最接近人眼感知，计算较慢'}
                        </p>
                    </div>

                    {/* 排除边缘像素 */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="exclude-edge" className="text-sm">排除边缘像素</Label>
                        <Switch
                            id="exclude-edge"
                            checked={excludeEdgePixels}
                            onCheckedChange={(c) => onStateChange({ excludeEdgePixels: c })}
                        />
                    </div>
                    {excludeEdgePixels && (
                        <p className="text-xs text-muted-foreground pl-3 border-l-2 border-black/10">
                            只采样豆子中心区域，避免边缘阴影影响
                        </p>
                    )}
                </div>
            </div>

            {/* 固定底部按钮 */}
            <div className="p-4 border-t-4 border-black/10 space-y-2 flex-shrink-0">
                <PixelButton
                    className="w-full"
                    variant="outline"
                    disabled={beadRegions.length === 0}
                    onClick={onExport}
                >
                    <Download className="mr-2 h-4 w-4" /> 导出图纸
                </PixelButton>
            </div>
        </aside>
    );
}
