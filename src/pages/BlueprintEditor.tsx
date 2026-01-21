import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload, Image as ImageIcon, Download, FlipVertical, FlipHorizontal,
  ZoomIn, ZoomOut, RotateCw, Palette, FileImage, X,
  Eye, EyeOff, Loader2, Pipette, Undo, Edit3, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PixelButton, PixelCard } from "@/components/PixelUI";
import { Header, Footer } from "@/components/Layout";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PALETTES, type PaletteKey } from "@/lib/colors";
import type { BeadColor } from "@/lib/colors";
import { ImageCropper } from "@/components/Editor/ImageCropper";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  processBlueprint as processBlueprintEnhanced,
  type BeadRegion as EnhancedBeadRegion,
  type BoundaryDetectionConfig,
  type ColorRecognitionConfig
} from "@/lib/blueprint-processing";
import type { ColorMatchAlgorithm } from "@/lib/image-processing";
import { hexToRgb } from "@/lib/canvas-utils";
import { findNearestColor } from "@/lib/image-processing";
import { Sidebar } from "@/components/BlueprintEditor/Sidebar";
import { Toolbar } from "@/components/BlueprintEditor/Toolbar";
import type { BeadRegion } from "@/components/BlueprintEditor/types";





// 豆子区域类型


interface BlueprintEditorState {
  originalImage: HTMLImageElement | null;
  imageSrc: string | null;
  processedCanvas: HTMLCanvasElement | null;
  beadRegions: BeadRegion[];
  selectedPalette: PaletteKey;
  showGrid: boolean;
  showLabels: boolean;
  hideWhiteLabels: boolean;
  hideBlackLabels: boolean;
  hiddenColorIds: Set<string>;
  showColorStats: boolean;
  isProcessing: boolean;
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
  gridWidth: number;
  gridHeight: number;
  showCropper: boolean;
  // 编辑模式
  isEditMode: boolean;
  selectedColor: BeadColor | null;
  isPipetteMode: boolean;
  showColorSelector: boolean;
  // 杂色过滤
  filterNoise: boolean;
  noiseThreshold: number;
  // 增强的边界检测配置
  boundaryDetectionMethod: 'grid' | 'contour' | 'adaptive';
  // 增强的颜色识别配置
  colorSampleMethod: 'average' | 'median' | 'dominant';
  excludeEdgePixels: boolean;
  colorMatchAlgorithm: ColorMatchAlgorithm;
}

// 历史记录类型
interface HistoryEntry {
  beadRegions: BeadRegion[];
}

export default function BlueprintEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 批量绘制状态
  const [isPainting, setIsPainting] = useState(false);
  const [paintedBeads, setPaintedBeads] = useState<Set<string>>(new Set());

  // 历史记录
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 色号搜索
  const [colorSearchQuery, setColorSearchQuery] = useState("");

  // 导出对话框
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'pdf'>('png');
  const [includeColorKey, setIncludeColorKey] = useState(true);

  // 新增图纸对话框
  const [showNewGridDialog, setShowNewGridDialog] = useState(false);
  const [newGridWidth, setNewGridWidth] = useState(20);
  const [newGridHeight, setNewGridHeight] = useState(20);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  const [state, setState] = useState<BlueprintEditorState>({
    originalImage: null,
    imageSrc: null,
    processedCanvas: null,
    beadRegions: [],
    selectedPalette: "mard",
    showGrid: true,
    showLabels: true,
    hideWhiteLabels: false,
    hideBlackLabels: false,
    hiddenColorIds: new Set<string>(),
    showColorStats: false,
    isProcessing: false,
    canvasScale: 1,
    canvasTranslateX: 0,
    canvasTranslateY: 0,
    gridWidth: 0,
    gridHeight: 0,
    showCropper: false,
    isEditMode: false,
    selectedColor: null,
    isPipetteMode: false,
    showColorSelector: true,
    filterNoise: false,
    noiseThreshold: 5,
    // 增强的边界检测配置
    boundaryDetectionMethod: 'adaptive',
    // 增强的颜色识别配置
    colorSampleMethod: 'median',
    excludeEdgePixels: true,
    colorMatchAlgorithm: 'weighted',
  });

  const currentPalette = PALETTES[state.selectedPalette]?.colors || [];

  // 文件上传处理
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = () => {
      setState(prev => ({
        ...prev,
        imageSrc: reader.result as string,
        showCropper: true,
      }));
    };
    reader.readAsDataURL(file);
  };

  // 剪裁完成处理
  const handleCropComplete = (croppedImage: HTMLImageElement) => {
    setState(prev => ({
      ...prev,
      originalImage: croppedImage,
      gridWidth: croppedImage.width,
      gridHeight: croppedImage.height,
      showCropper: false,
    }));
    // 处理图纸
    processBlueprint(croppedImage);
    toast.success("图片处理成功！");
  };

  // 创建空白图纸
  const createNewGrid = (width: number, height: number) => {
    const newBeadRegions: BeadRegion[] = [];
    const pixelSize = 20; // 每个豆子的像素大小

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        newBeadRegions.push({
          x: x * pixelSize,
          y: y * pixelSize,
          width: pixelSize,
          height: pixelSize,
          color: { r: 255, g: 255, b: 255 },
          gridX: x,
          gridY: y,
        });
      }
    }

    // 保存初始状态到历史记录
    setHistory([{ beadRegions: JSON.parse(JSON.stringify(newBeadRegions)) }]);
    setHistoryIndex(0);

    setState(prev => ({
      ...prev,
      processedCanvas: null,
      originalImage: null,
      imageSrc: null,
      beadRegions: newBeadRegions,
      gridWidth: width,
      gridHeight: height,
      isEditMode: true, // 自动进入编辑模式
    }));

    setShowNewGridDialog(false);
    toast.success(`已创建 ${width} x ${height} 的空白图纸`);
  };

  // 杂色过滤函数
  const applyNoiseFilter = (beadRegions: BeadRegion[], threshold: number) => {
    // 统计颜色使用次数
    const colorCounts = new Map<string, number>();
    beadRegions.forEach(region => {
      if (region.matchedColor) {
        colorCounts.set(region.matchedColor.id, (colorCounts.get(region.matchedColor.id) || 0) + 1);
      }
    });

    // 找出有效颜色（使用数量 >= 阈值）
    const validColors = new Set<string>();
    const colorReplacementMap = new Map<string, string>(); // 噪声颜色 -> 替换颜色

    const sortedColors = Array.from(colorCounts.entries())
      .sort(([, a], [, b]) => b - a);

    for (const [colorId, count] of sortedColors) {
      if (count >= threshold) {
        validColors.add(colorId);
      } else {
        // 找到最接近的有效颜色作为替换
        const noiseColor = currentPalette.find(c => c.id === colorId);
        if (!noiseColor) continue;

        const noiseRgb = hexToRgb(noiseColor.hex);
        let minDist = Infinity;
        let replacementColor = '';

        for (const validId of validColors) {
          const validColor = currentPalette.find(c => c.id === validId);
          if (!validColor) continue;

          const validRgb = hexToRgb(validColor.hex);
          const dist = Math.sqrt(
            Math.pow(noiseRgb.r - validRgb.r, 2) +
            Math.pow(noiseRgb.g - validRgb.g, 2) +
            Math.pow(noiseRgb.b - validRgb.b, 2)
          );

          if (dist < minDist) {
            minDist = dist;
            replacementColor = validId;
          }
        }

        if (replacementColor) {
          colorReplacementMap.set(colorId, replacementColor);
        } else if (validColors.size > 0) {
          // 如果没有找到，使用使用最多的颜色
          const mostUsedId = sortedColors[0]?.[0];
          if (mostUsedId) {
            colorReplacementMap.set(colorId, mostUsedId);
          }
        }
      }
    }

    // 应用替换
    const newBeadRegions = beadRegions.map(region => {
      if (region.matchedColor) {
        const newColorId = colorReplacementMap.get(region.matchedColor.id);
        if (newColorId) {
          const newColor = currentPalette.find(c => c.id === newColorId);
          return {
            ...region,
            matchedColor: newColor || region.matchedColor
          };
        }
      }
      return region;
    });

    return newBeadRegions;
  };

  // 保存到历史记录
  const saveToHistory = useCallback((beadRegions: BeadRegion[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ beadRegions: JSON.parse(JSON.stringify(beadRegions)) });
      // 限制历史记录数量
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // 撤回
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1];
      if (prevEntry) {
        setState(prev => ({
          ...prev,
          beadRegions: JSON.parse(JSON.stringify(prevEntry.beadRegions)),
        }));
        setHistoryIndex(historyIndex - 1);
        toast.success("已撤回");
      }
    }
  }, [history, historyIndex]);

  // 键盘事件监听（Ctrl+Z 撤回）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (historyIndex > 0) {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, undo]);

  // 选择颜色
  const selectColor = (color: BeadColor) => {
    setState(prev => ({ ...prev, selectedColor: color, isPipetteMode: false }));
  };

  // 切换取色器模式
  const togglePipetteMode = () => {
    setState(prev => ({ ...prev, isPipetteMode: !prev.isPipetteMode, selectedColor: null }));
  };

  // 画布点击处理（编辑模式）
  const paintBead = (gridX: number, gridY: number) => {
    // 查找点击的豆子
    const clickedRegion = state.beadRegions.find(
      r => r.gridX === gridX && r.gridY === gridY
    );

    const beadKey = `${gridX},${gridY}`;

    // 取色模式
    if (state.isPipetteMode) {
      if (clickedRegion && clickedRegion.matchedColor) {
        selectColor(clickedRegion.matchedColor);
        setState(prev => ({ ...prev, isPipetteMode: false }));
        // toast.success(`已吸取色号: ${clickedRegion.matchedColor.id}`);
        return true;
      }
      return false;
    }

    // 绘制模式 (修改或新增)
    if (state.selectedColor && !paintedBeads.has(beadKey)) {
      setPaintedBeads(prev => new Set(prev).add(beadKey));

      if (clickedRegion) {
        // 修改现有豆子
        setState(prev => ({
          ...prev,
          beadRegions: prev.beadRegions.map(region =>
            region.gridX === gridX && region.gridY === gridY
              ? { ...region, matchedColor: state.selectedColor! }
              : region
          ),
        }));
      } else {
        // 新增豆子
        // 确保坐标非负
        if (gridX < 0 || gridY < 0) return false;

        const newRegion: BeadRegion = {
          x: gridX * 15, // 估算坐标
          y: gridY * 15,
          width: 15,
          height: 15,
          gridX,
          gridY,
          color: hexToRgb(state.selectedColor.hex), // 使用选中颜色作为原始颜色
          matchedColor: state.selectedColor
        };

        setState(prev => ({
          ...prev,
          beadRegions: [...prev.beadRegions, newRegion]
        }));
      }
      return true;
    }
    return false;
  };

  // 画布鼠标按下
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 中键（1）和右键（2）不处理，让它们冒泡到容器
    if (e.button !== 0) return;

    // 左键在编辑模式下处理绘制逻辑
    if (state.isEditMode) {
      // 阻止左键事件冒泡，防止触发容器的拖动逻辑
      e.stopPropagation();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / state.canvasScale;
      const y = (e.clientY - rect.top) / state.canvasScale;

      const pixelSize = 15;
      const gridX = Math.floor(x / pixelSize);
      const gridY = Math.floor(y / pixelSize);

      console.log(`点击位置: Screen(${e.clientX},${e.clientY}) Canvas(${x.toFixed(1)},${y.toFixed(1)}) Grid(${gridX},${gridY}) Scale(${state.canvasScale})`);

      // 开始批量绘制
      if (state.selectedColor && !state.isPipetteMode) {
        setIsPainting(true);
        setPaintedBeads(new Set());
        // 保存当前状态到历史记录（在开始绘制时保存一次）
        saveToHistory(state.beadRegions);
      }

      paintBead(gridX, gridY);
    }
    // 非编辑模式下左键也不处理，让它冒泡
  };

  // 画布鼠标移动
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting || !state.selectedColor) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / state.canvasScale;
    const y = (e.clientY - rect.top) / state.canvasScale;

    const pixelSize = 15;
    const gridX = Math.floor(x / pixelSize);
    const gridY = Math.floor(y / pixelSize);

    paintBead(gridX, gridY);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': []
    },
    maxFiles: 1
  } as any);

  // 处理图纸 - 识别豆子边界和颜色（增强版）
  const processBlueprint = (img: HTMLImageElement) => {
    setState(prev => ({ ...prev, isProcessing: true }));

    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法获取 canvas 上下文');

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 配置边界检测
        const boundaryConfig: BoundaryDetectionConfig = {
          method: state.boundaryDetectionMethod,
          minBeadSize: 5,
          maxBeadSize: 100,
          edgeThreshold: 50,
        };

        // 配置颜色识别
        const colorConfig: ColorRecognitionConfig = {
          sampleMethod: state.colorSampleMethod,
          excludeEdgePixels: state.excludeEdgePixels,
          edgeExclusionRatio: 0.2,
          colorMatchConfig: {
            algorithm: state.colorMatchAlgorithm,
            useCache: true,
          },
        };

        // 使用增强的处理函数
        const palette = PALETTES[state.selectedPalette]?.colors || [];
        const result = processBlueprintEnhanced(imageData, palette, boundaryConfig, colorConfig);

        console.log(`检测质量: ${(result.detectionQuality * 100).toFixed(1)}%`);
        console.log(`估算豆子尺寸: ${result.estimatedBeadSize}px`);

        // 应用杂色过滤
        let finalRegions = result.regions;
        if (state.filterNoise) {
          finalRegions = applyNoiseFilter(finalRegions, state.noiseThreshold);
        }

        // 保存初始状态到历史记录
        setHistory([{ beadRegions: JSON.parse(JSON.stringify(finalRegions)) }]);
        setHistoryIndex(0);

        setState(prev => ({
          ...prev,
          processedCanvas: canvas,
          beadRegions: finalRegions,
          gridWidth: result.gridWidth,
          gridHeight: result.gridHeight,
          isProcessing: false,
        }));

        const qualityText = result.detectionQuality > 0.7 ? '优秀' :
          result.detectionQuality > 0.5 ? '良好' : '一般';
        toast.success(`识别完成！检测到 ${finalRegions.length} 个豆子，质量: ${qualityText}`);
      } catch (error) {
        console.error('处理图纸失败:', error);
        toast.error('处理图纸失败，请检查图片格式');
        setState(prev => ({ ...prev, isProcessing: false }));
      }
    }, 100);
  };

  // ============ 画布交互功能 ============

  // 鼠标滚轮缩放
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setState(prev => {
      const newScale = Math.max(0.1, Math.min(5, prev.canvasScale + delta));
      return { ...prev, canvasScale: newScale };
    });
  };

  // 鼠标按下开始拖动（支持左键和中键）
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 左键（0）或中键（1）都可以拖动
    // 但在编辑模式下，左键只能在画布外拖动（由 handleCanvasMouseDown 阻止冒泡）
    if (e.button !== 0 && e.button !== 1) return;

    // 开始拖动
    setIsDragging(true);
    setDragStart({ x: e.clientX - state.canvasTranslateX, y: e.clientY - state.canvasTranslateY });

    // 中键时防止默认滚动行为
    if (e.button === 1) {
      e.preventDefault();
    }
  };

  // 鼠标移动
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setState(prev => ({ ...prev, canvasTranslateX: newX, canvasTranslateY: newY }));
    }
  };

  // 鼠标释放
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 鼠标离开容器
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // 重置画布变换
  const resetCanvasTransform = () => {
    setState(prev => ({ ...prev, canvasScale: 1, canvasTranslateX: 0, canvasTranslateY: 0 }));
  };

  // 全局鼠标释放事件
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  // 添加滚轮事件监听器（非被动模式）
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // 垂直镜像
  const flipVertical = () => {
    if (state.beadRegions.length === 0) {
      toast.error('请先导入图纸');
      return;
    }

    setState(prev => {
      const maxGridY = prev.beadRegions.reduce((max, r) => Math.max(max, r.gridY), 0);
      const newRegions = prev.beadRegions.map(region => ({
        ...region,
        gridY: maxGridY - region.gridY,
        y: prev.originalImage ? prev.originalImage.height - region.y - region.height : region.y,
      }));

      return {
        ...prev,
        beadRegions: newRegions.sort((a, b) => a.gridY - b.gridY || a.gridX - b.gridX),
      };
    });

    toast.success('已垂直镜像');
  };

  // 水平镜像
  const flipHorizontal = () => {
    if (state.beadRegions.length === 0) {
      toast.error('请先导入图纸');
      return;
    }

    setState(prev => {
      const maxGridX = prev.beadRegions.reduce((max, r) => Math.max(max, r.gridX), 0);
      const newRegions = prev.beadRegions.map(region => ({
        ...region,
        gridX: maxGridX - region.gridX,
        x: prev.originalImage ? prev.originalImage.width - region.x - region.width : region.x,
      }));

      return {
        ...prev,
        beadRegions: newRegions.sort((a, b) => a.gridY - b.gridY || a.gridX - b.gridX),
      };
    });

    toast.success('已水平镜像');
  };

  // 切换颜色标签可见性
  const toggleColorVisibility = (colorId: string) => {
    setState(prev => {
      const newHiddenIds = new Set(prev.hiddenColorIds);
      if (newHiddenIds.has(colorId)) {
        newHiddenIds.delete(colorId);
      } else {
        newHiddenIds.add(colorId);
      }
      return { ...prev, hiddenColorIds: newHiddenIds };
    });
  };

  // 获取色号统计
  const getColorStats = () => {
    const stats = new Map<string, number>();
    state.beadRegions.forEach(region => {
      if (region.matchedColor) {
        stats.set(region.matchedColor.id, (stats.get(region.matchedColor.id) || 0) + 1);
      }
    });
    return Array.from(stats.entries()).sort((a, b) => b[1] - a[1]);
  };

  // 导出处理
  const handleExport = async () => {
    if (state.beadRegions.length === 0) return;

    const colorStats = getColorStats();
    const gridWidth = state.beadRegions.reduce((max, r) => Math.max(max, r.gridX), 0) + 1;
    const gridHeight = state.beadRegions.reduce((max, r) => Math.max(max, r.gridY), 0) + 1;

    // 创建临时 canvas 用于导出（高分辨率）
    const exportPixelSize = 30; // 导出时的像素大小
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = gridWidth * exportPixelSize;
    exportCanvas.height = gridHeight * exportPixelSize;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    // 绘制背景
    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // 绘制豆子
    state.beadRegions.forEach(region => {
      const x = region.gridX * exportPixelSize;
      const y = region.gridY * exportPixelSize;

      if (region.matchedColor) {
        exportCtx.fillStyle = region.matchedColor.hex;
      } else {
        exportCtx.fillStyle = `rgb(${region.color.r}, ${region.color.g}, ${region.color.b})`;
      }

      exportCtx.fillRect(x + 1, y + 1, exportPixelSize - 2, exportPixelSize - 2);

      // 绘制标签（根据 state.showLabels 决定）
      if (state.showLabels && region.matchedColor && !state.hiddenColorIds.has(region.matchedColor.id)) {
        // 检查是否隐藏白色标签
        if (state.hideWhiteLabels) {
          const isWhite = (
            region.matchedColor.name.toLowerCase() === "white" ||
            region.matchedColor.name === "白色" ||
            region.matchedColor.name === "极浅灰" ||
            region.matchedColor.hex.toLowerCase() === "#ffffff" ||
            region.matchedColor.hex.toLowerCase() === "#fbfbfb" ||
            region.matchedColor.id === "H02"
          );
          if (isWhite) return;
        }

        // 检查是否隐藏黑色标签
        if (state.hideBlackLabels) {
          const isBlack = (
            region.matchedColor.name.toLowerCase() === "black" ||
            region.matchedColor.name === "黑色" ||
            region.matchedColor.name === "炭黑1" ||
            region.matchedColor.hex.toLowerCase() === "#000000" ||
            region.matchedColor.hex.toLowerCase() === "#010101" ||
            region.matchedColor.id === "H07"
          );
          if (isBlack) return;
        }

        const fontSize = Math.floor(exportPixelSize * 0.28);
        exportCtx.font = `bold ${fontSize}px Arial, sans-serif`;
        exportCtx.textAlign = "center";
        exportCtx.textBaseline = "middle";

        const centerX = x + exportPixelSize / 2;
        const centerY = y + exportPixelSize / 2;

        // 根据背景亮度选择文字颜色
        const brightness = (region.color.r * 299 + region.color.g * 587 + region.color.b * 114) / 1000;
        const textColor = brightness > 128 ? "#000000" : "#FFFFFF";
        exportCtx.fillStyle = textColor;
        exportCtx.fillText(region.matchedColor.id, centerX, centerY);
      }
    });

    // 绘制网格
    exportCtx.lineWidth = 1;
    exportCtx.strokeStyle = "rgba(0,0,0,0.15)";
    exportCtx.beginPath();
    for (let x = 0; x <= gridWidth; x++) {
      if (x % 5 === 0) continue;
      exportCtx.moveTo(x * exportPixelSize, 0);
      exportCtx.lineTo(x * exportPixelSize, exportCanvas.height);
    }
    for (let y = 0; y <= gridHeight; y++) {
      if (y % 5 === 0) continue;
      exportCtx.moveTo(0, y * exportPixelSize);
      exportCtx.lineTo(exportCanvas.width, y * exportPixelSize);
    }
    exportCtx.stroke();

    // 绘制 5x5 网格
    exportCtx.lineWidth = 3;
    exportCtx.strokeStyle = "rgba(0,0,0,0.6)";
    exportCtx.beginPath();
    for (let x = 0; x <= gridWidth; x += 5) {
      exportCtx.moveTo(x * exportPixelSize, 0);
      exportCtx.lineTo(x * exportPixelSize, exportCanvas.height);
    }
    for (let y = 0; y <= gridHeight; y += 5) {
      exportCtx.moveTo(0, y * exportPixelSize);
      exportCtx.lineTo(exportCanvas.width, y * exportPixelSize);
    }
    exportCtx.stroke();

    const imgData = exportCanvas.toDataURL('image/png');

    if (exportFormat === 'png') {
      // 导出为 PNG
      const link = document.createElement('a');
      link.download = 'bead-blueprint.png';
      link.href = imgData;
      link.click();
      toast.success('PNG 导出成功');

      // 如果需要保存色号，导出色号统计为文本文件
      if (includeColorKey && colorStats.length > 0) {
        const colorKeyText = generateColorKeyText(colorStats);
        const colorKeyBlob = new Blob([colorKeyText], { type: 'text/plain' });
        const colorKeyUrl = URL.createObjectURL(colorKeyBlob);
        const colorKeyLink = document.createElement('a');
        colorKeyLink.download = 'bead-color-key.txt';
        colorKeyLink.href = colorKeyUrl;
        colorKeyLink.click();
        URL.revokeObjectURL(colorKeyUrl);
        toast.success('色号统计已导出');
      }
    } else {
      // 导出为 PDF
      try {
        // 动态导入 jsPDF
        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF();

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (exportCanvas.height / exportCanvas.width) * (pdfWidth - 20);

        // 第一页：图纸（使用图片方式避免中文问题）
        pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, pdfHeight);

        // 添加色号统计页面（使用 Canvas 绘制避免中文乱码）
        if (includeColorKey && colorStats.length > 0) {
          pdf.addPage();

          // 使用 Canvas 绘制色号统计
          const listCanvas = document.createElement('canvas');
          const listCtx = listCanvas.getContext('2d');
          if (!listCtx) throw new Error('无法创建 canvas context');

          // 配置
          const padding = 40;
          const tableWidth = 500;
          const rowHeight = 28;
          const headerHeight = 40;
          const titleHeight = 80;

          // 计算总高度
          const totalHeight = titleHeight + headerHeight + colorStats.length * rowHeight + padding;

          // 设置 canvas 尺寸（2x 分辨率）
          const scale = 2;
          listCanvas.width = (tableWidth + padding * 2) * scale;
          listCanvas.height = totalHeight * scale;
          listCtx.scale(scale, scale);

          // 背景
          listCtx.fillStyle = '#ffffff';
          listCtx.fillRect(0, 0, tableWidth + padding * 2, totalHeight);

          // 标题
          listCtx.fillStyle = '#000000';
          listCtx.font = 'bold 24px Arial, sans-serif';
          listCtx.textAlign = 'left';
          listCtx.fillText('拼豆色号统计', padding, 35);

          // 信息行
          listCtx.font = '14px Arial, sans-serif';
          listCtx.fillStyle = '#666666';
          const paletteName = PALETTES[state.selectedPalette]?.name || state.selectedPalette;
          listCtx.fillText(`色卡: ${paletteName}`, padding, 55);
          listCtx.fillText(`总豆子数: ${state.beadRegions.length}`, padding + 200, 55);

          // 表头背景
          listCtx.fillStyle = '#f0f0f0';
          listCtx.fillRect(padding, titleHeight, tableWidth, headerHeight);

          // 表头文字
          listCtx.fillStyle = '#000000';
          listCtx.font = 'bold 14px Arial, sans-serif';
          listCtx.textAlign = 'center';
          listCtx.fillText('编号', padding + 30, titleHeight + 25);
          listCtx.fillText('颜色', padding + 90, titleHeight + 25);
          listCtx.fillText('色块', padding + 280, titleHeight + 25);
          listCtx.fillText('数量', padding + 340, titleHeight + 25);

          // 表格内容
          let y = titleHeight + headerHeight;
          listCtx.font = '13px Arial, sans-serif';

          colorStats.forEach(([colorId, count], index) => {
            const color = currentPalette.find(c => c.id === colorId);
            if (!color) return;

            // 行背景（交替）
            if (index % 2 === 0) {
              listCtx.fillStyle = '#fafafa';
              listCtx.fillRect(padding, y, tableWidth, rowHeight);
            }

            // 边框
            listCtx.strokeStyle = '#dddddd';
            listCtx.lineWidth = 1;
            listCtx.strokeRect(padding, y, tableWidth, rowHeight);

            // 编号
            listCtx.fillStyle = '#000000';
            listCtx.textAlign = 'center';
            listCtx.fillText(colorId, padding + 30, y + 18);

            // 颜色名称
            listCtx.textAlign = 'left';
            listCtx.fillText(color.name, padding + 50, y + 18);

            // 色块
            listCtx.fillStyle = color.hex;
            listCtx.fillRect(padding + 265, y + 6, 30, 16);
            listCtx.strokeStyle = '#000000';
            listCtx.lineWidth = 1;
            listCtx.strokeRect(padding + 265, y + 6, 30, 16);

            // 数量
            listCtx.fillStyle = '#000000';
            listCtx.textAlign = 'center';
            listCtx.fillText(`${count}个`, padding + 340, y + 18);

            y += rowHeight;
          });

          // 将 canvas 添加到 PDF
          const listImgData = listCanvas.toDataURL('image/png');
          const listImgWidth = pdfWidth - 20;
          const listImgHeight = (listCanvas.height / listCanvas.width) * listImgWidth;

          // 分页处理
          let remainingHeight = listImgHeight;
          let sourceY = 0;
          let yPos = 10;

          while (remainingHeight > 0) {
            const pageHeight = pdf.internal.pageSize.getHeight() - 20;
            const sliceHeight = Math.min(remainingHeight, pageHeight);

            // 裁剪 canvas
            const sliceCanvas = document.createElement('canvas');
            const sliceHeightPixels = (listCanvas.height * sliceHeight) / listImgHeight;
            const sourceYPixels = (listCanvas.height * sourceY) / listImgHeight;
            sliceCanvas.width = listCanvas.width;
            sliceCanvas.height = sliceHeightPixels;
            const sliceCtx = sliceCanvas.getContext('2d');
            if (sliceCtx) {
              sliceCtx.drawImage(
                listCanvas,
                0, sourceYPixels, listCanvas.width, sliceHeightPixels,
                0, 0, sliceCanvas.width, sliceCanvas.height
              );
            }

            const sliceImgData = sliceCanvas.toDataURL('image/png');
            pdf.addImage(sliceImgData, 'PNG', 10, yPos, listImgWidth, sliceHeight);

            remainingHeight -= sliceHeight;
            sourceY += sliceHeight;

            if (remainingHeight > 0) {
              pdf.addPage();
              yPos = 10;
            }
          }

          // 清理
          listCanvas.remove();
        }

        pdf.save('bead-blueprint.pdf');
        toast.success('PDF 导出成功');
      } catch (error) {
        console.error('PDF 导出失败:', error);
        toast.error('PDF 导出失败，请检查网络连接');
      }
    }

    setShowExportDialog(false);
  };

  // 生成色号统计文本
  const generateColorKeyText = (colorStats: [string, number][]) => {
    let text = `拼豆色号统计\n`;
    text += `生成时间: ${new Date().toLocaleString()}\n`;
    text += `色卡: ${PALETTES[state.selectedPalette]?.name || state.selectedPalette}\n`;
    text += `总豆子数: ${state.beadRegions.length}\n`;
    text += `\n色号列表:\n`;
    text += `----------------\n`;

    colorStats.forEach(([colorId, count]) => {
      const color = currentPalette.find(c => c.id === colorId);
      text += `${colorId}: ${count}个 - ${color?.name || ''}\n`;
    });

    text += `\n合计: ${colorStats.length} 种颜色\n`;
    return text;
  };

  // 绘制画布
  useEffect(() => {
    if (!canvasRef.current || state.beadRegions.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const pixelSize = 15;
    const scale = state.canvasScale;
    const gridWidth = state.beadRegions.reduce((max, r) => Math.max(max, r.gridX), 0) + 1;
    const gridHeight = state.beadRegions.reduce((max, r) => Math.max(max, r.gridY), 0) + 1;

    const displayWidth = gridWidth * pixelSize;
    const displayHeight = gridHeight * pixelSize;

    // 根据 canvasScale 调整 canvas 物理分辨率
    canvasRef.current.width = displayWidth * scale;
    canvasRef.current.height = displayHeight * scale;

    ctx.clearRect(0, 0, displayWidth * scale, displayHeight * scale);

    // 缩放 context 以匹配画布分辨率
    ctx.scale(scale, scale);

    // 绘制豆子
    state.beadRegions.forEach(region => {
      const x = region.gridX * pixelSize;
      const y = region.gridY * pixelSize;

      if (region.matchedColor) {
        ctx.fillStyle = region.matchedColor.hex;
      } else {
        ctx.fillStyle = `rgb(${region.color.r}, ${region.color.g}, ${region.color.b})`;
      }

      ctx.fillRect(x + 1, y + 1, pixelSize - 2, pixelSize - 2);

      // 绘制标签
      if (state.showLabels && region.matchedColor && !state.hiddenColorIds.has(region.matchedColor.id)) {
        // 检查是否隐藏白色标签
        if (state.hideWhiteLabels) {
          const isWhite = (
            region.matchedColor.name.toLowerCase() === "white" ||
            region.matchedColor.name === "白色" ||
            region.matchedColor.name === "极浅灰" ||
            region.matchedColor.hex.toLowerCase() === "#ffffff" ||
            region.matchedColor.hex.toLowerCase() === "#fbfbfb" ||
            region.matchedColor.id === "H02"
          );
          if (isWhite) return;
        }

        // 检查是否隐藏黑色标签
        if (state.hideBlackLabels) {
          const isBlack = (
            region.matchedColor.name.toLowerCase() === "black" ||
            region.matchedColor.name === "黑色" ||
            region.matchedColor.name === "炭黑1" ||
            region.matchedColor.hex.toLowerCase() === "#000000" ||
            region.matchedColor.hex.toLowerCase() === "#010101" ||
            region.matchedColor.id === "H07"
          );
          if (isBlack) return;
        }

        // 计算实际显示的字体大小（考虑画布缩放）
        const displayedFontSize = Math.floor(pixelSize * state.canvasScale * 0.28);

        // 文字小于5px时不显示
        if (displayedFontSize < 5) return;

        // 使用原始像素大小来绘制
        const fontSize = Math.floor(pixelSize * 0.28);

        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const centerX = x + pixelSize / 2;
        const centerY = y + pixelSize / 2;

        // 根据背景亮度选择文字颜色
        const brightness = (region.color.r * 299 + region.color.g * 587 + region.color.b * 114) / 1000;
        const textColor = brightness > 128 ? "#000000" : "#FFFFFF";

        // 文字阴影效果
        ctx.shadowColor = textColor === "#FFFFFF" ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.15)";
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;

        // 绘制文字
        ctx.fillStyle = textColor;
        ctx.fillText(region.matchedColor.id, centerX, centerY);

        // 重置阴影
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
    });

    // 绘制网格
    if (state.showGrid) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let x = 0; x <= gridWidth; x++) {
        ctx.moveTo(x * pixelSize, 0);
        ctx.lineTo(x * pixelSize, displayHeight);
      }
      for (let y = 0; y <= gridHeight; y++) {
        ctx.moveTo(0, y * pixelSize);
        ctx.lineTo(displayWidth, y * pixelSize);
      }
      ctx.stroke();

      // 每5格加粗
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let x = 0; x <= gridWidth; x += 5) {
        ctx.moveTo(x * pixelSize, 0);
        ctx.lineTo(x * pixelSize, displayHeight);
      }
      for (let y = 0; y <= gridHeight; y += 5) {
        ctx.moveTo(0, y * pixelSize);
        ctx.lineTo(displayWidth, y * pixelSize);
      }
      ctx.stroke();
    }
  }, [state.beadRegions, state.showGrid, state.showLabels, state.hideWhiteLabels, state.hideBlackLabels, state.hiddenColorIds, state.canvasScale]);

  // 全局鼠标释放事件（用于结束批量绘制）
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPainting) {
        setIsPainting(false);
        setPaintedBeads(new Set());
        if (state.selectedColor && paintedBeads.size > 0) {
          toast.success(`已修改 ${paintedBeads.size} 个豆子为: ${state.selectedColor.id}`);
        }

      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isPainting, state.selectedColor]);

  const colorStats = getColorStats();

  return (
    <div className="h-screen flex flex-col bg-background font-body overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧控制面板 */}
        <Sidebar
          // 状态
          selectedPalette={state.selectedPalette}
          showGrid={state.showGrid}
          showLabels={state.showLabels}
          hideWhiteLabels={state.hideWhiteLabels}
          hideBlackLabels={state.hideBlackLabels}
          filterNoise={state.filterNoise}
          noiseThreshold={state.noiseThreshold}
          boundaryDetectionMethod={state.boundaryDetectionMethod}
          colorSampleMethod={state.colorSampleMethod}
          excludeEdgePixels={state.excludeEdgePixels}
          colorMatchAlgorithm={state.colorMatchAlgorithm}
          beadRegions={state.beadRegions}
          isProcessing={state.isProcessing}

          // 回调
          onStateChange={(updates) => setState(prev => ({ ...prev, ...updates }))}
          onPaletteChange={(palette) => {
            setState(prev => ({ ...prev, selectedPalette: palette }));
            // 重新匹配颜色
            if (state.beadRegions.length > 0) {
              const paletteColors = PALETTES[palette]?.colors || [];
              setState(prev => ({
                ...prev,
                beadRegions: prev.beadRegions.map(region => ({
                  ...region,
                  matchedColor: findNearestColor(region.color.r, region.color.g, region.color.b, paletteColors, { algorithm: 'weighted' }),
                })),
              }));
            }
          }}
          onNoiseFilterApply={() => {
            const filtered = applyNoiseFilter(state.beadRegions, state.noiseThreshold);
            setState(prev => ({ ...prev, beadRegions: filtered }));
            saveToHistory(filtered);
          }}
          onUndo={undo}
          onExport={() => setShowExportDialog(true)}
          onNewGrid={() => setShowNewGridDialog(true)}

          // 上传相关
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          isDragActive={isDragActive}

          // 其他
          currentPalette={currentPalette}
          history={history}
        />


        {/* 主画布区域 */}
        <main className="flex-1 bg-muted/20 relative overflow-hidden flex flex-col">
          {/* 工具栏 */}
          <Toolbar
            canvasScale={state.canvasScale}
            beadRegions={state.beadRegions}
            isEditMode={state.isEditMode}
            isPipetteMode={state.isPipetteMode}
            showColorSelector={state.showColorSelector}
            selectedColor={state.selectedColor}
            historyIndex={historyIndex}
            showColorStats={state.showColorStats}
            colorStatsCount={colorStats.length}

            onZoomIn={() => setState(prev => ({ ...prev, canvasScale: Math.min(5, prev.canvasScale + 0.2) }))}
            onZoomOut={() => setState(prev => ({ ...prev, canvasScale: Math.max(0.1, prev.canvasScale - 0.2) }))}
            onResetZoom={resetCanvasTransform}
            onFlipVertical={flipVertical}
            onFlipHorizontal={flipHorizontal}
            onToggleEditMode={() => setState(prev => ({ ...prev, isEditMode: !prev.isEditMode, isPipetteMode: false, selectedColor: null }))}
            onTogglePipetteMode={togglePipetteMode}
            onUndo={undo}
            onClearSelection={() => setState(prev => ({ ...prev, selectedColor: null }))}
            onToggleColorSelector={() => setState(prev => ({ ...prev, showColorSelector: !prev.showColorSelector }))}
            onToggleColorStats={() => setState(prev => ({ ...prev, showColorStats: !prev.showColorStats }))}
          />



          {/* 画布显示区域 */}
          <div
            ref={canvasContainerRef}
            className="flex-1 overflow-hidden p-8 flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgydjJIMUMxeiIgZmlsbD0iIzAwMDAwMDIwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] relative select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {state.beadRegions.length > 0 ? (
              <div
                className="bg-white p-1 border-4 border-black shadow-2xl origin-center"
                style={{
                  transform: `translate(${state.canvasTranslateX}px, ${state.canvasTranslateY}px)`,
                  cursor: isDragging ? 'grabbing' : (state.isEditMode ? (state.isPipetteMode ? 'crosshair' : 'pointer') : 'grab'),
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="block"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                />
              </div>
            ) : state.originalImage ? (
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">正在处理图纸...</p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto border-4 border-black border-dashed rounded-full flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-display text-2xl">请先上传图纸</h3>
                <p className="text-sm text-muted-foreground">
                  支持导入有明确边界的拼豆图纸
                </p>
                <p className="text-xs text-muted-foreground">
                  提示：滚轮缩放 · 中键拖动
                </p>
              </div>
            )}

            {/* 编辑模式提示 */}
            {state.isEditMode && state.beadRegions.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 bg-white border-4 border-black shadow-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    {state.isPipetteMode ? (
                      <span className="font-bold text-primary">🔍 取色模式：点击豆子吸取颜色</span>
                    ) : state.selectedColor ? (
                      <span className="font-bold">✏️ 点击或拖动画布批量替换为 <span className="text-primary">{state.selectedColor.id}</span></span>
                    ) : (
                      <span className="text-muted-foreground">请从右侧色号选择器选择颜色，或使用取色器</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    中键拖动移动视图 · Ctrl+Z 撤回
                  </div>
                </div>
              </div>
            )}
            {/* 豆子太小提示 - 显示在画布底部中央 */}
            {state.showLabels && state.beadRegions.length > 0 && Math.floor(20 * state.canvasScale * 0.28) < 5 && !state.isEditMode && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-50 border-2 border-amber-400 shadow-lg px-4 py-2 rounded">
                <span className="text-xs text-amber-700 font-medium">⚠️ 当前显示豆子太小，色号不显示（建议放大画布）</span>
              </div>
            )}
          </div>

          {/* 色号统计面板 */}
          {state.showColorStats && colorStats.length > 0 && (
            <div className="absolute top-16 right-4 w-72 bg-white border-4 border-black shadow-2xl">
              <div className="flex items-center justify-between p-3 border-b-2 border-black bg-muted">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  <span className="font-bold text-sm">色号统计</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, showColorStats: false }))}
                  className="h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="h-64">
                <div className="p-2 space-y-1">
                  {colorStats.map(([colorId, count]) => {
                    const color = currentPalette.find(c => c.id === colorId);
                    if (!color) return null;

                    return (
                      <div
                        key={colorId}
                        onClick={() => state.isEditMode && selectColor(color)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded hover:bg-muted/50",
                          state.isEditMode && "cursor-pointer hover:bg-muted",
                          state.isEditMode && state.selectedColor?.id === colorId && "ring-2 ring-black"
                        )}
                      >
                        <div
                          className="w-8 h-8 rounded border-2 border-black flex-shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm">{colorId}</span>
                            <span className="text-xs text-muted-foreground">{count}个</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {color.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* 色号选择器面板（编辑模式） */}
          {state.isEditMode && state.showColorSelector && (
            <div className="absolute top-16 left-4 w-80 bg-white border-4 border-black shadow-2xl">
              <div className="flex items-center justify-between p-3 border-b-2 border-black bg-muted">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  <span className="font-bold text-sm">色号选择器</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">
                    {currentPalette.length} 色
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, showColorSelector: false }))}
                    className="h-7 w-7 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {/* 搜索框 */}
                <Input
                  placeholder="搜索色号或名称..."
                  value={colorSearchQuery}
                  onChange={(e) => setColorSearchQuery(e.target.value)}
                  className="h-8 text-sm"
                />

                {/* 色号网格 */}
                <ScrollArea className="h-64 border-2 border-black rounded">
                  <div className="p-2 grid grid-cols-6 gap-1">
                    {currentPalette
                      .filter(color =>
                        color.id.toLowerCase().includes(colorSearchQuery.toLowerCase()) ||
                        color.name.toLowerCase().includes(colorSearchQuery.toLowerCase())
                      )
                      .map((color) => {
                        // 计算文字颜色
                        const rgb = hexToRgb(color.hex);
                        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                        const textColor = brightness > 128 ? "#000000" : "#FFFFFF";

                        return (
                          <button
                            key={color.id}
                            onClick={() => selectColor(color)}
                            className={cn(
                              "w-full aspect-square rounded border-2 border-black/20 hover:border-black hover:scale-110 transition-all relative flex items-center justify-center",
                              state.selectedColor?.id === color.id && "ring-2 ring-black ring-offset-2"
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
                {state.selectedColor && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded border-2 border-black">
                    <div
                      className="w-12 h-12 rounded border-2 border-black flex-shrink-0"
                      style={{ backgroundColor: state.selectedColor.hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-bold text-lg">{state.selectedColor.id}</div>
                      <div className="text-sm text-muted-foreground truncate">{state.selectedColor.name}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, selectedColor: null }))}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div >

      <Footer />

      <ImageCropper
        open={state.showCropper}
        onClose={() => setState(prev => ({ ...prev, showCropper: false }))}
        onComplete={handleCropComplete}
        imageSrc={state.imageSrc}
      />

      {/* 导出对话框 */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-lg w-full border-4 border-black shadow-pixel-lg">
          <DialogHeader className="border-b-4 border-black/10">
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Download className="w-5 h-5" /> 导出图纸
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* 图纸预览 */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">预览</Label>
              <div className="border-4 border-black rounded bg-white/50 p-2 flex items-center justify-center min-h-[150px] max-h-[300px] overflow-hidden">
                {canvasRef.current ? (
                  <img
                    src={canvasRef.current.toDataURL('image/png')}
                    alt="图纸预览"
                    className="max-w-full max-h-[280px] object-contain border border-black/20"
                  />
                ) : (
                  <span className="text-muted-foreground text-sm">暂无预览</span>
                )}
              </div>
            </div>

            {/* 导出格式选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">导出格式</Label>
              <div className="grid grid-cols-2 gap-2">
                <PixelButton
                  variant={exportFormat === 'png' ? 'default' : 'outline'}
                  onClick={() => setExportFormat('png')}
                  className="justify-start"
                >
                  <FileImage className="w-4 h-4 mr-2" /> PNG 图片
                </PixelButton>
                <PixelButton
                  variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                  onClick={() => setExportFormat('pdf')}
                  className="justify-start"
                >
                  <FileImage className="w-4 h-4 mr-2" /> PDF 文档
                </PixelButton>
              </div>
            </div>

            {/* 在图中显示色号选项 */}
            <div className="flex items-center justify-between p-3 border-2 border-black rounded bg-muted">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <div className="flex flex-col">
                  <Label htmlFor="export-show-labels" className="text-sm font-bold leading-tight">在图纸上显示色号</Label>
                  <span className="text-xs text-muted-foreground">导出的图片中包含色号标签</span>
                </div>
              </div>
              <Switch
                id="export-show-labels"
                checked={state.showLabels}
                onCheckedChange={(checked) => setState(prev => ({ ...prev, showLabels: checked }))}
              />
            </div>

            {/* 单独导出色号统计选项 */}
            <div className="flex items-center justify-between p-3 border-2 border-black rounded bg-muted">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4" />
                <div className="flex flex-col">
                  <Label htmlFor="export-color-key" className="text-sm font-bold leading-tight">单独导出色号统计</Label>
                  <span className="text-xs text-muted-foreground">
                    {exportFormat === 'png' ? '保存为 .txt 文件' : '添加到 PDF 中'}
                  </span>
                </div>
              </div>
              <Switch
                id="export-color-key"
                checked={includeColorKey}
                onCheckedChange={setIncludeColorKey}
              />
            </div>
          </div>

          <DialogFooter className="border-t-4 border-black/10">
            <PixelButton variant="ghost" onClick={() => setShowExportDialog(false)}>
              取消
            </PixelButton>
            <PixelButton onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> 导出
            </PixelButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增图纸对话框 */}
      <Dialog open={showNewGridDialog} onOpenChange={setShowNewGridDialog}>
        <DialogContent className="max-w-sm w-full border-4 border-black shadow-pixel-lg">
          <DialogHeader className="border-b-4 border-black/10">
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Plus className="w-5 h-5" /> 新增空白图纸
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 space-y-6">
            {/* 预设尺寸 */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">预设尺寸</Label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 25, 30].map((size) => (
                  <PixelButton
                    key={size}
                    variant={newGridWidth === size && newGridHeight === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setNewGridWidth(size);
                      setNewGridHeight(size);
                    }}
                  >
                    {size}x{size}
                  </PixelButton>
                ))}
              </div>
            </div>

            {/* 宽高相等开关 */}
            <div className="flex items-center justify-between">
              <Label htmlFor="lock-aspect" className="text-sm font-bold">宽高相等</Label>
              <Switch
                id="lock-aspect"
                checked={lockAspectRatio}
                onCheckedChange={setLockAspectRatio}
              />
            </div>

            {/* 自定义尺寸 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="grid-width" className="text-sm font-bold">宽度（格数）</Label>
                <Input
                  id="grid-width"
                  type="number"
                  min={1}
                  max={200}
                  value={newGridWidth}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(200, parseInt(e.target.value) || 1));
                    setNewGridWidth(val);
                    if (lockAspectRatio) setNewGridHeight(val);
                  }}
                  className="border-2 border-black"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grid-height" className="text-sm font-bold">高度（格数）</Label>
                <Input
                  id="grid-height"
                  type="number"
                  min={1}
                  max={200}
                  value={newGridHeight}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(200, parseInt(e.target.value) || 1));
                    setNewGridHeight(val);
                    if (lockAspectRatio) setNewGridWidth(val);
                  }}
                  className="border-2 border-black"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded border">
              将创建一个 {newGridWidth} x {newGridHeight} 的空白图纸，共 {newGridWidth * newGridHeight} 个格子
            </div>
          </div>

          <DialogFooter className="border-t-4 border-black/10">
            <PixelButton variant="ghost" onClick={() => setShowNewGridDialog(false)}>
              取消
            </PixelButton>
            <PixelButton onClick={() => createNewGrid(newGridWidth, newGridHeight)}>
              <Plus className="mr-2 h-4 w-4" /> 创建
            </PixelButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
