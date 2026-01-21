import React, { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Palette, ChevronDown, ChevronRight } from "lucide-react";
import type { BeadColor } from "@/lib/colors";

interface PalettePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colors: BeadColor[];
  paletteName: string;
}

export function PalettePreviewDialog({
  open,
  onOpenChange,
  colors,
  paletteName,
}: PalettePreviewDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedSeries, setCollapsedSeries] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // 过滤颜色
  const filteredColors = useMemo(() => {
    if (!searchQuery) return colors;

    const query = searchQuery.toLowerCase();
    return colors.filter(
      (color) =>
        color.id.toLowerCase().includes(query) ||
        color.name.toLowerCase().includes(query) ||
        color.hex.toLowerCase().includes(query)
    );
  }, [colors, searchQuery]);

  // 按色号前缀分组
  const groupedColors = useMemo(() => {
    const groups: Record<string, BeadColor[]> = {};

    filteredColors.forEach((color) => {
      const prefix = color.id.replace(/[0-9]/g, '') || 'OTHER';

      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(color);
    });

    // 排序组内颜色
    Object.keys(groups).forEach((prefix) => {
      groups[prefix].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    });

    // 按系列名称排序
    const sortedGroups: Record<string, BeadColor[]> = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [filteredColors]);

  const totalColors = colors.length;
  const filteredCount = filteredColors.length;

  // 切换系列折叠状态
  const toggleSeries = (prefix: string) => {
    setCollapsedSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(prefix)) {
        newSet.delete(prefix);
      } else {
        newSet.add(prefix);
      }
      return newSet;
    });
  };

  // 全部展开/折叠
  const expandAll = () => setCollapsedSeries(new Set());
  const collapseAll = () => setCollapsedSeries(new Set(Object.keys(groupedColors)));

  // 跳转到指定系列 - 使用 scrollIntoView
  const scrollToSeries = (prefix: string) => {
    const element = sectionRefs.current[prefix];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const seriesList = Object.keys(groupedColors);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!w-[600px] !max-w-none border-4 border-black bg-background p-0 h-[90vh] !rounded-lg overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* 头部 */}
          <DialogHeader className="p-4 border-b-4 border-black bg-muted shrink-0">
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {paletteName} 色卡预览
            </DialogTitle>
            <DialogDescription className="text-sm">
              查看色号、颜色名称和色值对应关系（共 {totalColors} 种颜色）
            </DialogDescription>
          </DialogHeader>

          {/* 搜索框 */}
          <div className="p-4 space-y-3 shrink-0 border-b border-black/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="搜索色号、颜色名称或色值..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-2 border-black h-9"
              />
            </div>

            {searchQuery && (
              <div className="text-xs text-muted-foreground">
                找到 {filteredCount} 个结果
              </div>
            )}
          </div>

          {/* 主要内容区域 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 左侧快速导航 - 固定不滚动 */}
            <aside className="w-28 border-r-4 border-black bg-muted/50 flex flex-col shrink-0">
              <div className="p-3 border-b-2 border-black/10 shrink-0">
                <div className="flex items-center justify-center">
                  <Palette className="h-4 w-4 shrink-0" />
                  <span className="font-bold text-xs ml-1.5">系列</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {seriesList.map((prefix) => (
                  <button
                    key={prefix}
                    onClick={() => scrollToSeries(prefix)}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-black/10 transition-colors flex items-center justify-between"
                  >
                    <span className="font-mono font-medium">{prefix}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-1">({groupedColors[prefix].length})</span>
                  </button>
                ))}
              </div>

              <div className="p-2 border-t-2 border-black/10 space-y-1.5 shrink-0">
                <button
                  onClick={expandAll}
                  className="w-full text-[10px] px-2 py-1.5 rounded border border-black/20 hover:bg-black/5 transition-colors"
                >
                  全部展开
                </button>
                <button
                  onClick={collapseAll}
                  className="w-full text-[10px] px-2 py-1.5 rounded border border-black/20 hover:bg-black/5 transition-colors"
                >
                  全部折叠
                </button>
              </div>
            </aside>

            {/* 右侧颜色列表 - 独立滚动 */}
            <main
              ref={contentScrollRef}
              className="flex-1 overflow-y-auto px-4 pb-4"
            >
              <div className="space-y-3">
                {seriesList.map((prefix) => {
                  const isCollapsed = collapsedSeries.has(prefix);
                  const colorGroup = groupedColors[prefix];

                  return (
                    <div
                      key={prefix}
                      ref={(el) => { sectionRefs.current[prefix] = el; }}
                      className="border-2 border-black/10 rounded-lg overflow-hidden"
                    >
                      {/* 可折叠的系列标题 */}
                      <button
                        onClick={() => toggleSeries(prefix)}
                        className="w-full px-4 py-2.5 bg-muted/50 hover:bg-muted transition-colors flex items-center gap-2 sticky top-0 z-10"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        )}
                        <h3 className="font-bold text-sm">{prefix} 系列</h3>
                        <span className="text-xs text-muted-foreground">({colorGroup.length})</span>
                      </button>

                      {/* 颜色网格 */}
                      {!isCollapsed && (
                        <div className="p-2 bg-background">
                          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                            {colorGroup.map((color) => (
                              <div
                                key={color.id}
                                className="flex items-start gap-2 p-2 rounded border border-black/10 hover:border-black/30 hover:bg-muted/50 transition-colors min-h-[60px]"
                              >
                                {/* 色块 */}
                                <div
                                  className="w-8 h-8 rounded border border-black flex-shrink-0 shadow-sm"
                                  style={{ backgroundColor: color.hex }}
                                  title={color.hex}
                                />

                                {/* 文本信息 */}
                                <div className="flex-1 overflow-hidden py-0.5">
                                  <div className="font-mono font-bold text-xs leading-tight truncate">
                                    {color.id}
                                  </div>
                                  <div className="font-mono text-[10px] text-muted-foreground leading-tight truncate mt-0.5">
                                    {color.hex}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">
                                    {color.name}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredColors.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    没有找到匹配的颜色
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}