import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Palette, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BeadColor } from "@/lib/colors";

export interface ColorStat {
  colorId: string;
  count: number;
  color: BeadColor;
  percentage?: number;
}

export interface ColorStatsPanelProps {
  colorStats: ColorStat[];
  hiddenColorIds: Set<string>;
  onToggleVisibility: (colorId: string) => void;
  isVisible: boolean;
  onClose: () => void;
  totalBeads?: number;
  // 编辑模式相关
  isEditMode?: boolean;
  selectedColor?: BeadColor | null;
  onSelectColor?: (color: BeadColor) => void;
}

export function ColorStatsPanel({
  colorStats,
  hiddenColorIds,
  onToggleVisibility,
  isVisible,
  onClose,
  totalBeads,
  isEditMode = false,
  selectedColor,
  onSelectColor,
}: ColorStatsPanelProps) {
  if (!isVisible || colorStats.length === 0) return null;

  return (
    <div className="absolute top-16 right-4 w-72 bg-white border-4 border-black shadow-2xl transition-transform duration-300 z-20">
      {/* 面板头部 */}
      <div className="flex items-center justify-between p-3 border-b-2 border-black bg-muted">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4" />
          <span className="font-bold text-sm">色号统计</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 w-7 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 色号列表 */}
      <ScrollArea className="h-64 max-h-[calc(100vh-200px)]">
        <div className="p-2 space-y-1">
          {colorStats.map((stat) => {
            const isHidden = hiddenColorIds.has(stat.colorId);
            const isSelected = selectedColor?.id === stat.colorId;

            return (
              <div
                key={stat.colorId}
                onClick={() => isEditMode && onSelectColor && onSelectColor(stat.color)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded transition-colors",
                  isEditMode && "cursor-pointer hover:bg-muted",
                  isEditMode && isSelected && "ring-2 ring-black",
                  !isEditMode && "hover:bg-muted/50"
                )}
              >
                {/* 颜色预览 */}
                <div
                  className="w-8 h-8 rounded border-2 border-black flex-shrink-0"
                  style={{ backgroundColor: stat.color.hex }}
                />

                {/* 色号信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm">{stat.colorId}</span>
                    <span className="text-xs text-muted-foreground">{stat.count}个</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{stat.color.name}</span>
                    {stat.percentage !== undefined && <span>{stat.percentage}%</span>}
                  </div>
                </div>

                {/* 隐藏/显示标签按钮 */}
                {!isEditMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(stat.colorId);
                    }}
                    className={cn(
                      "h-8 w-8 p-0 flex-shrink-0",
                      isHidden && "text-muted-foreground"
                    )}
                    title={isHidden ? "显示色号" : "隐藏色号"}
                  >
                    {isHidden ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* 总计信息 */}
      {totalBeads !== undefined && (
        <div className="p-3 border-t-2 border-black bg-muted/50">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">总色号数</span>
            <span className="font-mono">{colorStats.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>总珠子数</span>
            <span className="font-mono">{totalBeads}</span>
          </div>
        </div>
      )}
    </div>
  );
}
