import React from "react";
import { Button } from "@/components/ui/button";
import { PixelButton } from "@/components/PixelUI";
import { ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface DisplaySettings {
  showGrid: boolean;
  showLabels: boolean;
  hideWhiteLabels?: boolean;
  hideBlackLabels?: boolean;
}

export interface ToolbarControlsProps {
  // 缩放控制
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetTransform: () => void;
  minScale?: number;
  maxScale?: number;

  // 显示设置
  displaySettings: DisplaySettings;
  onToggleGrid: () => void;
  onToggleLabels: () => void;
  onToggleWhiteLabels?: () => void;
  onToggleBlackLabels?: () => void;

  // 尺寸信息
  sizeInfo?: string;
  warningInfo?: React.ReactNode;

  // 额外控制区域（左右两侧）
  leftControls?: React.ReactNode;
  rightControls?: React.ReactNode;

  // 自定义样式
  className?: string;
}

export function ToolbarControls({
  scale,
  onZoomIn,
  onZoomOut,
  onResetTransform,
  minScale = 0.1,
  maxScale = 5,
  displaySettings,
  onToggleGrid,
  onToggleLabels,
  onToggleWhiteLabels,
  onToggleBlackLabels,
  sizeInfo,
  warningInfo,
  leftControls,
  rightControls,
  className,
}: ToolbarControlsProps) {
  const canZoomIn = scale < maxScale;
  const canZoomOut = scale > minScale;
  const scalePercent = Math.round(scale * 100);

  return (
    <div className={cn("h-14 border-b-4 border-black bg-white flex items-center justify-between px-4", className)}>
      <div className="flex items-center gap-4">
        {/* 左侧额外控制 */}
        {leftControls}

        {/* 缩放控制 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-muted-foreground">缩放:</span>
          <PixelButton
            size="sm"
            variant="ghost"
            onClick={onZoomOut}
            disabled={!canZoomOut}
          >
            <ZoomOut className="w-4 h-4" />
          </PixelButton>
          <span className="w-14 text-center font-mono text-sm">{scalePercent}%</span>
          <PixelButton
            size="sm"
            variant="ghost"
            onClick={onZoomIn}
            disabled={!canZoomIn}
          >
            <ZoomIn className="w-4 h-4" />
          </PixelButton>
          <PixelButton
            size="sm"
            variant="outline"
            onClick={onResetTransform}
            className="text-xs"
          >
            重置
          </PixelButton>
        </div>

        {/* 显示设置 */}
        <DisplaySettingsControls
          displaySettings={displaySettings}
          onToggleGrid={onToggleGrid}
          onToggleLabels={onToggleLabels}
          onToggleWhiteLabels={onToggleWhiteLabels}
          onToggleBlackLabels={onToggleBlackLabels}
        />

        {/* 尺寸信息 */}
        {sizeInfo && (
          <div className="text-xs text-muted-foreground">
            {sizeInfo}
          </div>
        )}

        {/* 警告信息 */}
        {warningInfo}
      </div>

      {/* 右侧额外控制 */}
      {rightControls && (
        <div className="flex items-center gap-3">
          {rightControls}
        </div>
      )}
    </div>
  );
}

interface DisplaySettingsControlsProps {
  displaySettings: DisplaySettings;
  onToggleGrid: () => void;
  onToggleLabels: () => void;
  onToggleWhiteLabels?: () => void;
  onToggleBlackLabels?: () => void;
}

function DisplaySettingsControls({
  displaySettings,
  onToggleGrid,
  onToggleLabels,
  onToggleWhiteLabels,
  onToggleBlackLabels,
}: DisplaySettingsControlsProps) {
  return (
    <>
      <div className="h-8 w-px bg-black/20" />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Label htmlFor="toolbar-grid-toggle" className="text-xs cursor-pointer">网格</Label>
          <Switch
            id="toolbar-grid-toggle"
            checked={displaySettings.showGrid}
            onCheckedChange={onToggleGrid}
          />
        </div>
        <div className="flex items-center gap-1">
          <Label htmlFor="toolbar-labels-toggle" className="text-xs cursor-pointer">色号</Label>
          <Switch
            id="toolbar-labels-toggle"
            checked={displaySettings.showLabels}
            onCheckedChange={onToggleLabels}
          />
        </div>
        {onToggleWhiteLabels !== undefined && (
          <div className="flex items-center gap-1">
            <Label htmlFor="toolbar-white-toggle" className="text-xs cursor-pointer">白色</Label>
            <Switch
              id="toolbar-white-toggle"
              checked={displaySettings.hideWhiteLabels || false}
              onCheckedChange={onToggleWhiteLabels}
            />
          </div>
        )}
        {onToggleBlackLabels !== undefined && (
          <div className="flex items-center gap-1">
            <Label htmlFor="toolbar-black-toggle" className="text-xs cursor-pointer">黑色</Label>
            <Switch
              id="toolbar-black-toggle"
              checked={displaySettings.hideBlackLabels || false}
              onCheckedChange={onToggleBlackLabels}
            />
          </div>
        )}
      </div>
    </>
  );
}
