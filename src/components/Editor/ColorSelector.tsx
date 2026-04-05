import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Palette, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BeadColor } from "@/lib/colors";

export interface ColorSelectorProps {
  colors: BeadColor[];
  selectedColor: BeadColor | null;
  onSelectColor: (color: BeadColor) => void;
  onClearSelection?: () => void;
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  mode?: "floating" | "docked";
  showHeader?: boolean;
}

// 颜色转 RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
};

// 计算文字颜色（根据背景亮度）
const getTextColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? "#000000" : "#FFFFFF";
};

export function ColorSelector({
  colors,
  selectedColor,
  onSelectColor,
  onClearSelection,
  isVisible,
  onClose,
  title = "色号选择器",
  mode = "floating",
  showHeader = true,
}: ColorSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isVisible) return null;

  // 过滤颜色
  const filteredColors = colors.filter(color =>
    color.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    color.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn(
      "bg-white",
      mode === "floating" && "absolute top-16 left-4 w-80 shadow-2xl z-20",
      mode === "floating" && "border-4 border-black",
      mode === "docked" && "h-full w-full shadow-none border-0"
    )}>
      {showHeader && (
        <div className={cn(
          "flex items-center justify-between p-3 bg-muted",
          mode === "floating" ? "border-b-2 border-black" : "border-b border-black/10"
        )}>
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="font-bold text-sm">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              {colors.length} 色
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
        </div>
      )}

      <div className="p-3 space-y-3">
        {/* 搜索框 */}
        <Input
          placeholder="搜索色号或名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm"
        />

        {/* 色号网格 */}
        <ScrollArea className={cn(
          "rounded",
          mode === "floating" ? "h-64 border-2 border-black" : "h-[22rem] border border-black/10 bg-muted/20"
        )}>
          <div className="p-2 grid grid-cols-6 gap-1">
            {filteredColors.map((color) => {
              const textColor = getTextColor(color.hex);
              const isSelected = selectedColor?.id === color.id;

              return (
                <button
                  key={color.id}
                  onClick={() => onSelectColor(color)}
                  className={cn(
                    "w-full aspect-square rounded border-2 border-black/20 hover:border-black hover:scale-110 transition-all relative flex items-center justify-center",
                    isSelected && "ring-2 ring-black ring-offset-2"
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={`${color.id} - ${color.name}`}
                >
                  <span
                    className="text-xs font-bold font-mono leading-tight"
                    style={{ color: textColor }}
                  >
                    {color.id}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* 当前选中颜色 */}
        {selectedColor && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded border-2 border-black">
            <div
              className="w-12 h-12 rounded border-2 border-black flex-shrink-0"
              style={{ backgroundColor: selectedColor.hex }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-mono font-bold text-lg">{selectedColor.id}</div>
              <div className="text-sm text-muted-foreground truncate">{selectedColor.name}</div>
            </div>
            {onClearSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
