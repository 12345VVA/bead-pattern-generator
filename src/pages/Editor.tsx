import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Image as ImageIcon, ZoomIn, ZoomOut, Grid3X3, Download, Palette, List, Settings2, X, ChevronLeft, Eye, EyeOff, Edit3, Pipette, Undo } from "lucide-react";
import { cn } from "@/lib/utils";
import { PixelButton, PixelCard } from "@/components/PixelUI";
import { loadImage, getPixelData, processImage, clearColorCache, hexToRgb } from "@/lib/image-processing";
import type { ProcessedResult, ColorMatchConfig, ColorMatchAlgorithm } from "@/lib/image-processing";
import { PALETTES, loadDomesticBrandPalette, SUPPORTED_BRANDS, type BrandCode } from "@/lib/colors";
import type { PaletteKey } from "@/lib/colors";
import { ExportDialog } from "@/components/Editor/ExportDialog";
import { PalettePreviewDialog } from "@/components/Editor/PalettePreviewDialog";
import { ImageCropper } from "@/components/Editor/ImageCropper";
import { ColorStatsPanel, type ColorStat } from "@/components/Editor/ColorStatsPanel";
import { ColorSelector } from "@/components/Editor/ColorSelector";
import { useCanvasTransform } from "@/components/Editor/useCanvasTransform";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header, Footer } from "@/components/Layout";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { BeadColor } from "@/lib/colors";

interface EditorState {
  originalImage: HTMLImageElement | null;
  gridWidth: number;
  gridHeight: number;
  showGrid: boolean;
  pixelSize: number;
  palette: PaletteKey | 'custom'; // 支持自定义调色板
  domesticBrand?: BrandCode; // 国产品牌选择
  colorMatchAlgorithm: ColorMatchAlgorithm; // 颜色匹配算法
  dither: boolean;
  ditherStrength: number;
  ignoreWhite: boolean;
  ignoreBlack: boolean;
  hideWhiteLabels: boolean;
  hideBlackLabels: boolean;
  showLabels: boolean;
  processedData: ProcessedResult | null;
  showExportDialog: boolean;
  imageSrc: string | null;
  showCropper: boolean;
  customPalette: BeadColor[]; // 自定义调色板
  showColorStats: boolean; // 显示色号统计面板
  // 杂色过滤设置
  filterNoise: boolean; // 是否启用杂色过滤
  noiseThreshold: number; // 杂色阈值（使用数量少于该值的颜色会被过滤）
  // 颜色合并设置
  mergeColors: boolean; // 是否启用颜色合并
  mergeTolerance: number; // 颜色合并容差（0-100，值越大合并越激进）
  // 色号显示控制
  hiddenColorIds: Set<string>; // 被隐藏的色号ID（不显示标签）
  // 色卡预览
  showPalettePreviewDialog: boolean; // 显示色卡预览对话框
  // 编辑模式
  isEditMode: boolean; // 编辑模式开关
  selectedColor: BeadColor | null; // 当前选中的颜色
  isPipetteMode: boolean; // 取色器模式
  showColorSelector: boolean; // 显示色号选择器
}

// 历史记录类型
interface HistoryEntry {
  pixels: Uint8ClampedArray;
  colorCounts: Map<string, number>;
  beadGrid: (string | null)[];
}

export default function Editor() {
  const [state, setState] = useState<EditorState>({
    originalImage: null,
    gridWidth: 30,
    gridHeight: 29,
    showGrid: true,
    pixelSize: 15,
    palette: "mard",
    domesticBrand: undefined,
    colorMatchAlgorithm: 'weighted',
    dither: false,
    ditherStrength: 1.0,
    ignoreWhite: false,
    ignoreBlack: false,
    hideWhiteLabels: false,
    hideBlackLabels: false,
    showLabels: false,
    processedData: null,
    showExportDialog: false,
    imageSrc: null,
    showCropper: false,
    customPalette: [],
    showColorStats: true, // 默认显示色号统计
    filterNoise: false, // 默认关闭杂色过滤
    noiseThreshold: 5, // 默认过滤使用少于5个的颜色
    mergeColors: false, // 默认关闭颜色合并
    mergeTolerance: 30, // 默认颜色合并容差
    hiddenColorIds: new Set<string>(), // 隐藏的色号ID
    showPalettePreviewDialog: false, // 色卡预览对话框
    // 编辑模式
    isEditMode: false,
    selectedColor: null,
    isPipetteMode: false,
    showColorSelector: false,
  });

  // 历史记录
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 批量绘制状态
  const [isPainting, setIsPainting] = useState(false);
  const [paintedBeads, setPaintedBeads] = useState<Set<string>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 使用画布交互 Hook
  // 在编辑模式下，禁用画布内的拖动（只允许画布外拖动）
  const canvasTransform = useCanvasTransform({
    disableDragOnCanvas: state.isEditMode
  });

  // 动态获取当前调色板
  const currentPalette = useMemo(() => {
    if (state.palette === 'custom') {
      return state.customPalette.length > 0 ? state.customPalette : [
        { id: "DEFAULT", name: "White", hex: "#FFFFFF", brand: "Default" }
      ];
    }

    // 处理国产品牌调色板
    if (state.domesticBrand && ['coco', 'manman', 'panpan', 'mixiaowo'].includes(state.palette as PaletteKey)) {
      const colors = loadDomesticBrandPalette(state.domesticBrand);
      return colors.length > 0 ? colors : [
        { id: "DEFAULT", name: "White", hex: "#FFFFFF", brand: "Default" }
      ];
    }

    return PALETTES[state.palette as PaletteKey]?.colors || [
      { id: "DEFAULT", name: "White", hex: "#FFFFFF", brand: "Default" }
    ];
  }, [state.palette, state.domesticBrand, state.customPalette]);

  // File Upload Handler
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = () => {
      setState(prev => ({
        ...prev,
        imageSrc: reader.result as string,
        showCropper: true
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImage: HTMLImageElement) => {
    const aspectRatio = croppedImage.height / croppedImage.width;
    const newHeight = Math.round(state.gridWidth * aspectRatio);

    setState(prev => ({
      ...prev,
      originalImage: croppedImage,
      gridHeight: newHeight,
      showCropper: false,
    }));
    toast.success("图片处理成功！");
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

  // 加载示例图片
  const loadExampleImage = () => {
    const src = "/example.png";
    const img = new Image();

    img.crossOrigin = "anonymous";
    img.onload = () => {
      setState(prev => ({
        ...prev,
        imageSrc: src,
        showCropper: true
      }));
      toast.success("已加载示例图片");
    };
    img.onerror = () => {
      toast.error("无法加载示例图片，请确保 public/example.png 存在");
    };
    img.src = src;
  };


  // 清除缓存 Effect - 当品牌或调色板变化时清除缓存
  useEffect(() => {
    // 当品牌或调色板变化时，清除颜色匹配缓存
    // 确保使用新的调色板重新计算颜色
    clearColorCache();
  }, [state.palette, state.domesticBrand, state.customPalette]);

  // Process Image Effect
  useEffect(() => {
    if (!state.originalImage) return;

    // Get raw pixels first
    const rawPixels = getPixelData(state.originalImage, state.gridWidth, state.gridHeight);

    // 颜色匹配配置
    const colorMatchConfig: ColorMatchConfig = {
      algorithm: state.colorMatchAlgorithm,
      useCache: true
    };

    // Quantize and Dither
    let result = processImage(
      rawPixels,
      state.gridWidth,
      state.gridHeight,
      currentPalette,
      state.dither,
      state.ditherStrength,
      state.ignoreWhite,
      state.ignoreBlack,
      colorMatchConfig
    );

    // 应用杂色过滤
    if (state.filterNoise) {
      const { pixels: filteredPixels, colorCounts: filteredCounts, beadGrid: filteredGrid } = applyNoiseFilter(
        result.pixels,
        result.colorCounts,
        result.beadGrid,
        state.gridWidth,
        state.gridHeight,
        state.noiseThreshold,
        currentPalette
      );
      result = { pixels: filteredPixels, colorCounts: filteredCounts, beadGrid: filteredGrid };
    }

    // 应用颜色合并
    if (state.mergeColors) {
      const { pixels: mergedPixels, colorCounts: mergedCounts, beadGrid: mergedGrid } = applyColorMerge(
        result.pixels,
        result.colorCounts,
        result.beadGrid,
        state.gridWidth,
        state.gridHeight,
        state.mergeTolerance,
        currentPalette
      );
      result = { pixels: mergedPixels, colorCounts: mergedCounts, beadGrid: mergedGrid };
    }

    setState(prev => ({ ...prev, processedData: result }));
  }, [state.originalImage, state.gridWidth, state.gridHeight, state.palette, state.domesticBrand, state.customPalette, state.dither, state.ditherStrength, state.ignoreWhite, state.ignoreBlack, state.colorMatchAlgorithm, currentPalette, state.filterNoise, state.noiseThreshold, state.mergeColors, state.mergeTolerance]);

  // 杂色过滤函数
  const applyNoiseFilter = (
    pixels: Uint8ClampedArray,
    colorCounts: Map<string, number>,
    beadGrid: (string | null)[],
    width: number,
    height: number,
    threshold: number,
    palette: BeadColor[]
  ) => {
    const newPixels = new Uint8ClampedArray(pixels);
    const newColorCounts = new Map<string, number>();
    const newBeadGrid: (string | null)[] = new Array(width * height).fill(null);

    // 找出需要保留的颜色（使用数量 >= 阈值）
    const validColors = new Set<string>();
    const colorReplacementMap = new Map<string, string>(); // 噪声颜色 -> 替换颜色

    // 统计每个颜色，找出有效颜色和需要替换的噪声颜色
    const sortedColors = Array.from(colorCounts.entries())
      .sort(([, a], [, b]) => b - a);

    for (const [colorId, count] of sortedColors) {
      if (count >= threshold) {
        validColors.add(colorId);
      } else {
        // 找到最接近的有效颜色作为替换
        const noiseColor = palette.find(c => c.id === colorId);
        if (!noiseColor) continue;

        const noiseRgb = hexToRgb(noiseColor.hex);
        let minDist = Infinity;
        let replacementColor = '';

        for (const validId of validColors) {
          const validColor = palette.find(c => c.id === validId);
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
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const originalBeadId = beadGrid[i];

      if (originalBeadId === null) {
        // 透明像素保持不变
        newPixels[idx + 3] = 0;
        continue;
      }

      let finalBeadId = originalBeadId;

      // 如果是需要过滤的颜色，使用替换颜色
      if (colorReplacementMap.has(originalBeadId)) {
        finalBeadId = colorReplacementMap.get(originalBeadId)!;
      }

      // 获取最终颜色的 RGB 值
      const finalColor = palette.find(c => c.id === finalBeadId);
      if (finalColor) {
        const rgb = hexToRgb(finalColor.hex);
        newPixels[idx] = rgb.r;
        newPixels[idx + 1] = rgb.g;
        newPixels[idx + 2] = rgb.b;
        newPixels[idx + 3] = 255;
      }

      newBeadGrid[i] = finalBeadId;
      newColorCounts.set(finalBeadId, (newColorCounts.get(finalBeadId) || 0) + 1);
    }

    return { pixels: newPixels, colorCounts: newColorCounts, beadGrid: newBeadGrid };
  };

  // 颜色合并函数
  const applyColorMerge = (
    pixels: Uint8ClampedArray,
    colorCounts: Map<string, number>,
    beadGrid: (string | null)[],
    width: number,
    height: number,
    tolerance: number,
    palette: BeadColor[]
  ) => {
    const newPixels = new Uint8ClampedArray(pixels);
    const newColorCounts = new Map<string, number>();
    const newBeadGrid: (string | null)[] = new Array(width * height).fill(null);

    // 计算容差对应的颜色距离阈值（将0-100的容差值转换为实际的颜色距离）
    // 颜色距离范围大约是0-441（sqrt(255^2 * 3)）
    const distanceThreshold = (tolerance / 100) * 150;

    // 获取所有使用的颜色ID
    const usedColorIds = Array.from(colorCounts.keys()).filter(id => id !== null);

    // 为每个颜色找到要合并到的目标颜色
    const mergeMapping = new Map<string, string>();
    const processedColors = new Set<string>();

    for (const colorId of usedColorIds) {
      if (processedColors.has(colorId)) continue;

      const color = palette.find(c => c.id === colorId);
      if (!color) continue;

      // 找到所有与此颜色相似的其他颜色
      const colorRgb = hexToRgb(color.hex);
      const similarColors: string[] = [];

      for (const otherId of usedColorIds) {
        if (otherId === colorId || processedColors.has(otherId)) continue;

        const otherColor = palette.find(c => c.id === otherId);
        if (!otherColor) continue;

        const otherRgb = hexToRgb(otherColor.hex);
        const distance = Math.sqrt(
          Math.pow(colorRgb.r - otherRgb.r, 2) +
          Math.pow(colorRgb.g - otherRgb.g, 2) +
          Math.pow(colorRgb.b - otherRgb.b, 2)
        );

        if (distance <= distanceThreshold) {
          similarColors.push(otherId);
        }
      }

      // 如果有相似颜色，将它们都合并到使用最多的颜色
      if (similarColors.length > 0) {
        const allSimilarColors = [colorId, ...similarColors];

        // 找到使用最多的颜色作为目标
        let maxCount = 0;
        let targetColorId = colorId;

        for (const id of allSimilarColors) {
          const count = colorCounts.get(id) || 0;
          if (count > maxCount) {
            maxCount = count;
            targetColorId = id;
          }
        }

        // 将所有相似颜色映射到目标颜色
        for (const id of allSimilarColors) {
          mergeMapping.set(id, targetColorId);
          processedColors.add(id);
        }
      } else {
        // 没有相似颜色，保持原样
        mergeMapping.set(colorId, colorId);
        processedColors.add(colorId);
      }
    }

    // 应用颜色映射
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const originalBeadId = beadGrid[i];

      if (originalBeadId === null) {
        // 透明像素保持不变
        newPixels[idx + 3] = 0;
        continue;
      }

      // 获取映射后的颜色ID
      const targetBeadId = mergeMapping.get(originalBeadId) || originalBeadId;

      // 获取目标颜色的 RGB 值
      const targetColor = palette.find(c => c.id === targetBeadId);
      if (targetColor) {
        const rgb = hexToRgb(targetColor.hex);
        newPixels[idx] = rgb.r;
        newPixels[idx + 1] = rgb.g;
        newPixels[idx + 2] = rgb.b;
        newPixels[idx + 3] = 255;
      }

      newBeadGrid[i] = targetBeadId;
      newColorCounts.set(targetBeadId, (newColorCounts.get(targetBeadId) || 0) + 1);
    }

    return { pixels: newPixels, colorCounts: newColorCounts, beadGrid: newBeadGrid };
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

  // ============ 编辑模式相关函数 ============

  // 保存到历史记录
  const saveToHistory = useCallback((data: ProcessedResult) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      // 深拷贝数据
      const entry: HistoryEntry = {
        pixels: new Uint8ClampedArray(data.pixels),
        colorCounts: new Map(data.colorCounts),
        beadGrid: [...data.beadGrid],
      };
      newHistory.push(entry);
      // 限制历史记录数量
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // 初始化历史记录（在图像处理完成后调用）
  useEffect(() => {
    if (state.processedData && history.length === 0) {
      saveToHistory(state.processedData);
    }
  }, [state.processedData, history.length, saveToHistory]);

  // 撤回
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1];
      if (prevEntry) {
        // 恢复数据（深拷贝）
        const restoredData: ProcessedResult = {
          pixels: new Uint8ClampedArray(prevEntry.pixels),
          colorCounts: new Map(prevEntry.colorCounts),
          beadGrid: [...prevEntry.beadGrid],
        };
        setState(prev => ({ ...prev, processedData: restoredData }));
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
  const selectColor = useCallback((color: BeadColor) => {
    setState(prev => ({ ...prev, selectedColor: color, isPipetteMode: false }));
  }, []);

  // 切换取色器模式
  const togglePipetteMode = useCallback(() => {
    setState(prev => ({ ...prev, isPipetteMode: !prev.isPipetteMode, selectedColor: null }));
  }, []);

  // 画布编辑：修改单个豆子的颜色
  const paintBead = useCallback((gridX: number, gridY: number) => {
    if (!state.processedData) return false;

    const i = gridY * state.gridWidth + gridX;
    const beadId = state.processedData.beadGrid[i];

    if (beadId === null) return false;

    const beadKey = `${gridX},${gridY}`;

    if (state.isPipetteMode && beadId) {
      // 取色模式：吸取颜色
      const color = currentPalette.find(c => c.id === beadId);
      if (color) {
        selectColor(color);
        setState(prev => ({ ...prev, isPipetteMode: false }));
        toast.success(`已吸取色号: ${beadId}`);
      }
      return true;
    } else if (state.selectedColor && !paintedBeads.has(beadKey)) {
      // 替换颜色模式 - 批量绘制
      setPaintedBeads(prev => new Set(prev).add(beadKey));

      const newColorId = state.selectedColor.id;
      const newColor = currentPalette.find(c => c.id === newColorId);
      if (!newColor) return false;

      // 更新像素数据
      const newPixels = new Uint8ClampedArray(state.processedData.pixels);
      const idx = i * 4;
      const rgb = hexToRgb(newColor.hex);
      newPixels[idx] = rgb.r;
      newPixels[idx + 1] = rgb.g;
      newPixels[idx + 2] = rgb.b;
      newPixels[idx + 3] = 255;

      // 更新颜色统计
      const newColorCounts = new Map(state.processedData.colorCounts);
      const oldColorId = beadId;
      newColorCounts.set(oldColorId, (newColorCounts.get(oldColorId) || 1) - 1);
      if (newColorCounts.get(oldColorId) === 0) {
        newColorCounts.delete(oldColorId);
      }
      newColorCounts.set(newColorId, (newColorCounts.get(newColorId) || 0) + 1);

      // 更新豆子网格
      const newBeadGrid = [...state.processedData.beadGrid];
      newBeadGrid[i] = newColorId;

      const newProcessedData: ProcessedResult = {
        pixels: newPixels,
        colorCounts: newColorCounts,
        beadGrid: newBeadGrid,
      };

      setState(prev => ({ ...prev, processedData: newProcessedData }));
      return true;
    }
    return false;
  }, [state.processedData, state.gridWidth, state.isPipetteMode, state.selectedColor, paintedBeads, currentPalette, selectColor]);

  // 画布鼠标按下（编辑模式）
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state.isEditMode || !state.processedData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvasTransform.transform.scale;
    const y = (e.clientY - rect.top) / canvasTransform.transform.scale;

    const pixelSize = state.pixelSize;
    const gridX = Math.floor(x / pixelSize);
    const gridY = Math.floor(y / pixelSize);

    // 边界检查
    if (gridX < 0 || gridX >= state.gridWidth || gridY < 0 || gridY >= state.gridHeight) return;

    // 开始批量绘制
    if (state.selectedColor && !state.isPipetteMode) {
      setIsPainting(true);
      setPaintedBeads(new Set());
      // 保存当前状态到历史记录（在开始绘制时保存一次）
      saveToHistory(state.processedData);
    }

    paintBead(gridX, gridY);
  };

  // 画布鼠标移动（编辑模式）
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting || !state.selectedColor || !state.processedData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;



    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvasTransform.transform.scale;
    const y = (e.clientY - rect.top) / canvasTransform.transform.scale;

    const pixelSize = state.pixelSize;
    const gridX = Math.floor(x / pixelSize);
    const gridY = Math.floor(y / pixelSize);

    // 边界检查
    if (gridX < 0 || gridX >= state.gridWidth || gridY < 0 || gridY >= state.gridHeight) return;

    paintBead(gridX, gridY);
  };

  // 全局鼠标释放事件（用于结束批量绘制）
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPainting) {
        setIsPainting(false);
        setPaintedBeads(new Set());
        if (state.selectedColor) {
          toast.success(`已批量修改为: ${state.selectedColor.id}`);
          // 注意：历史记录已在 handleCanvasMouseDown 中保存，这里不需要再次保存
        }
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isPainting, state.selectedColor]);

  // Render Canvas Effect
  useEffect(() => {
    if (!state.processedData || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // 根据 canvasScale 调整 canvas 物理分辨率，保证缩放后文字清晰
    const scale = canvasTransform.transform.scale;
    const displayWidth = state.gridWidth * state.pixelSize;
    const displayHeight = state.gridHeight * state.pixelSize;
    canvasRef.current.width = displayWidth * scale;
    canvasRef.current.height = displayHeight * scale;

    ctx.clearRect(0, 0, displayWidth * scale, displayHeight * scale);

    // 缩放 context 以匹配画布分辨率
    ctx.scale(scale, scale);

    // 绘制豆子间隙的背景（模拟 margin 效果）
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Draw processed pixels
    const pixels = state.processedData.pixels;
    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        const i = (y * state.gridWidth + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        if (a < 10) continue;

        // 绘制豆子，留出间隙（参考 0s1.cn 的 1px margin）
        const gap = 2; // 上下左右各1px的间隙
        const beadSize = state.pixelSize - gap;
        const beadX = x * state.pixelSize + 1;
        const beadY = y * state.pixelSize + 1;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(beadX, beadY, beadSize, beadSize);

        // Draw Labels
        if (state.showLabels && state.processedData.beadGrid && state.pixelSize >= 10) {
          const beadId = state.processedData.beadGrid[i / 4];
          if (beadId) {
            // Check if this color label is hidden
            if (state.hiddenColorIds.has(beadId)) {
              continue;
            }

            // Check hide white labels
            if (state.hideWhiteLabels) {
              const color = currentPalette.find(c => c.id === beadId);
              const isWhite = color && (
                color.name.toLowerCase() === "white" ||
                color.name === "白色" ||
                color.name === "极浅灰" ||
                color.hex.toLowerCase() === "#ffffff" ||
                color.hex.toLowerCase() === "#fbfbfb" ||
                color.id === "H02" // MARD 极浅灰（作为白色使用）
              );
              if (isWhite) {
                continue;
              }
            }

            // Check hide black labels
            if (state.hideBlackLabels) {
              const color = currentPalette.find(c => c.id === beadId);
              const isBlack = color && (
                color.name.toLowerCase() === "black" ||
                color.name === "黑色" ||
                color.name === "炭黑1" ||
                color.hex.toLowerCase() === "#000000" ||
                color.hex.toLowerCase() === "#010101" ||
                color.id === "H07" // MARD 炭黑1
              );
              if (isBlack) {
                continue;
              }
            }

            // 计算实际显示的字体大小（考虑画布缩放）
            const displayedFontSize = Math.floor(state.pixelSize * canvasTransform.transform.scale * 0.28);

            // 文字小于5px时不显示（与警告条件保持一致）
            if (displayedFontSize < 5) {
              continue;
            }

            // 参考设计：粗体文字 + 文字阴影 + 动态颜色
            // 使用原始像素大小来绘制（因为canvas本身通过CSS缩放）
            const fontSize = Math.floor(state.pixelSize * 0.28);

            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const centerX = beadX + beadSize / 2;
            const centerY = beadY + beadSize / 2;

            // 根据背景亮度选择文字颜色
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            const textColor = brightness > 128 ? "#000000" : "#FFFFFF";

            // 文字阴影效果（参考 0s1.cn: text-shadow: rgba(0, 0, 0, 0.3) 0px 1px 2px）
            ctx.shadowColor = textColor === "#FFFFFF" ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.15)";
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 1;

            // 绘制文字
            ctx.fillStyle = textColor;
            ctx.fillText(beadId, centerX, centerY);

            // 重置阴影
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          }
        }
      }
    }

    // Draw Grid
    if (state.showGrid) {
      // 1. Standard lines (Thin)
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let x = 0; x <= state.gridWidth; x++) {
        if (x % 5 === 0) continue;
        ctx.moveTo(x * state.pixelSize, 0);
        ctx.lineTo(x * state.pixelSize, displayHeight);
      }
      for (let y = 0; y <= state.gridHeight; y++) {
        if (y % 5 === 0) continue;
        ctx.moveTo(0, y * state.pixelSize);
        ctx.lineTo(displayWidth, y * state.pixelSize);
      }
      ctx.stroke();

      // 2. Major lines (Thick, every 5)
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let x = 0; x <= state.gridWidth; x += 5) {
        ctx.moveTo(x * state.pixelSize, 0);
        ctx.lineTo(x * state.pixelSize, displayHeight);
      }
      for (let y = 0; y <= state.gridHeight; y += 5) {
        ctx.moveTo(0, y * state.pixelSize);
        ctx.lineTo(displayWidth, y * state.pixelSize);
      }
      ctx.stroke();
    }
  }, [state.processedData, state.showGrid, state.showLabels, state.hideWhiteLabels, state.hideBlackLabels, state.hiddenColorIds, state.pixelSize, state.gridWidth, state.gridHeight, state.palette, state.domesticBrand, state.customPalette, currentPalette, canvasTransform.transform.scale]);

  // Handle Width Change
  const handleWidthChange = (value: number[]) => {
    const newWidth = value[0];
    if (state.originalImage) {
      const aspectRatio = state.originalImage.height / state.originalImage.width;
      const newHeight = Math.round(newWidth * aspectRatio);
      setState(prev => ({ ...prev, gridWidth: newWidth, gridHeight: newHeight }));
    } else {
      setState(prev => ({ ...prev, gridWidth: newWidth }));
    }
  };



  // 获取色号统计数据
  const getColorStats = useCallback((): ColorStat[] => {
    if (!state.processedData) return [];

    const stats: ColorStat[] = [];
    const totalBeads = state.gridWidth * state.gridHeight;

    for (const [id, count] of state.processedData.colorCounts.entries()) {
      const color = currentPalette.find(c => c.id === id);
      if (color) {
        stats.push({
          colorId: id,
          count,
          color,
          percentage: parseFloat((((count / totalBeads) * 100).toFixed(1))),
        });
      }
    }

    return stats.sort((a, b) => b.count - a.count);
  }, [state.processedData, currentPalette, state.gridWidth, state.gridHeight]);

  const colorStats = getColorStats();

  return (
    <div className="h-screen flex flex-col bg-background font-body overflow-hidden">
      <Header />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

        {/* Sidebar Controls - 固定不滚动 */}
        <aside className="w-full md:w-72 border-r-4 border-black bg-card flex flex-col z-10 shadow-xl">
          <div className="p-4 border-b-4 border-black/10">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <ImageIcon className="w-5 h-5" /> 图片来源
            </h2>
          </div>

          <div className="p-4">
            <div
              {...getRootProps()}
              className={cn(
                "border-4 border-dashed border-input p-4 text-center cursor-pointer transition-colors hover:bg-muted/50",
                isDragActive && "border-primary bg-primary/10"
              )}
            >
              <input {...(getInputProps() as React.InputHTMLAttributes<HTMLInputElement>)} />
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">点击或拖拽上传</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={loadExampleImage}
            >
              使用示例图片
            </Button>
          </div>


          <div className="p-4 border-t-4 border-black/10 space-y-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Settings2 className="w-5 h-5" /> 基础设置
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">色卡品牌</Label>
                <button
                  onClick={() => setState(prev => ({ ...prev, showPalettePreviewDialog: true }))}
                  className="text-xs flex items-center gap-1 text-primary hover:underline"
                >
                  <Palette className="h-3 w-3" />
                  查看色卡
                </button>
              </div>
              <Select
                value={state.palette}
                onValueChange={(v) => {
                  setState(prev => ({ ...prev, palette: v as PaletteKey | 'custom' }));
                  if (['coco', 'manman', 'panpan', 'mixiaowo'].includes(v)) {
                    const firstBrand = Object.keys(SUPPORTED_BRANDS).find(key =>
                      key.toUpperCase() === v.toUpperCase().replace('（国产品牌）', '')
                    ) as BrandCode;
                    if (firstBrand) {
                      setState(prev => ({ ...prev, domesticBrand: firstBrand }));
                    }
                  }
                }}
              >
                <SelectTrigger className="border-2 border-black h-9">
                  <SelectValue placeholder="选择色卡" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perler">Perler</SelectItem>
                  <SelectItem value="hama">Hama Midi</SelectItem>
                  <SelectItem value="artkal">Artkal S</SelectItem>
                  <SelectItem value="mard">MARD</SelectItem>
                  <SelectItem value="hamaEnhanced">Hama Enhanced</SelectItem>
                  <SelectItem value="nabbi">Nabbi</SelectItem>
                  <SelectItem value="coco">COCO (国产品牌)</SelectItem>
                  <SelectItem value="manman">漫漫 (国产品牌)</SelectItem>
                  <SelectItem value="panpan">盼盼 (国产品牌)</SelectItem>
                  <SelectItem value="mixiaowo">咪小窝 (国产品牌)</SelectItem>
                </SelectContent>
              </Select>

              {['coco', 'manman', 'panpan', 'mixiaowo'].includes(state.palette) && (
                <div className="pl-3 border-l-2 border-black/10 space-y-2">
                  <Label className="text-xs text-muted-foreground">选择具体品牌</Label>
                  <Select
                    value={state.domesticBrand || ''}
                    onValueChange={(v) => setState(prev => ({ ...prev, domesticBrand: v as BrandCode }))}
                  >
                    <SelectTrigger className="border-2 border-black/50 h-8">
                      <SelectValue placeholder="选择品牌" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.palette === 'coco' && <SelectItem value="COCO">COCO</SelectItem>}
                      {state.palette === 'manman' && <SelectItem value="MANMAN">漫漫</SelectItem>}
                      {state.palette === 'panpan' && <SelectItem value="PANPAN">盼盼</SelectItem>}
                      {state.palette === 'mixiaowo' && <SelectItem value="MIXIAOWO">咪小窝</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dither-toggle" className="text-sm">颜色抖动</Label>
                <Switch
                  id="dither-toggle"
                  checked={state.dither}
                  onCheckedChange={(c) => setState(prev => ({ ...prev, dither: c }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="noise-toggle" className="text-sm">杂色过滤</Label>
                <Switch
                  id="noise-toggle"
                  checked={state.filterNoise}
                  onCheckedChange={(c) => setState(prev => ({ ...prev, filterNoise: c }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="merge-toggle" className="text-sm">颜色合并</Label>
                <Switch
                  id="merge-toggle"
                  checked={state.mergeColors}
                  onCheckedChange={(c) => setState(prev => ({ ...prev, mergeColors: c }))}
                />
              </div>
            </div>

            {state.dither && (
              <div className="space-y-2 pt-2 pl-3 border-l-2 border-black/10">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>混色强度</span>
                  <span>{Math.round(state.ditherStrength * 100)}%</span>
                </div>
                <Slider
                  value={[state.ditherStrength]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={(v) => setState(prev => ({ ...prev, ditherStrength: v[0] }))}
                />
              </div>
            )}

            {state.filterNoise && (
              <div className="space-y-2 pt-2 pl-3 border-l-2 border-black/10">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>最少珠子数</span>
                  <span>{state.noiseThreshold}</span>
                </div>
                <Slider
                  value={[state.noiseThreshold]}
                  min={1}
                  max={50}
                  step={1}
                  onValueChange={(v) => setState(prev => ({ ...prev, noiseThreshold: v[0] }))}
                />
                <p className="text-xs text-muted-foreground">过滤少于该值的杂色</p>
              </div>
            )}

            {state.mergeColors && (
              <div className="space-y-2 pt-2 pl-3 border-l-2 border-black/10">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>合并容差</span>
                  <span>{state.mergeTolerance}</span>
                </div>
                <Slider
                  value={[state.mergeTolerance]}
                  min={5}
                  max={100}
                  step={5}
                  onValueChange={(v) => setState(prev => ({ ...prev, mergeTolerance: v[0] }))}
                />
                <p className="text-xs text-muted-foreground">相似颜色合并，值越大合并越多</p>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-dashed border-black/20">
              <div className="flex justify-between items-center">
                <Label className="text-sm">宽度 (格)</Label>
                <span className="font-mono bg-muted px-2 rounded border border-black/10 text-xs">{state.gridWidth}</span>
              </div>
              <Slider
                value={[state.gridWidth]}
                min={10}
                max={150}
                step={1}
                onValueChange={handleWidthChange}
                className="py-2"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[20, 25, 30, 35, 40, 45, 50, 55, 60].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleWidthChange([size])}
                    className={`
                      px-2.5 py-1 text-xs font-mono rounded border-2 transition-all
                      ${state.gridWidth === size
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-black/10 hover:border-black/30 hover:bg-muted'
                      }
                    `}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">高度: {state.gridHeight} 格</div>
            </div>
          </div>

          <div className="mt-auto p-4 border-t-4 border-black/10">
            <PixelButton
              className="w-full"
              disabled={!state.processedData}
              onClick={() => setState(prev => ({ ...prev, showExportDialog: true }))}
            >
              <Download className="mr-2 h-4 w-4" /> 导出图纸
            </PixelButton>
          </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 bg-muted/20 relative overflow-hidden flex flex-col">
          {/* Toolbar - 增强版工具栏 */}
          <div className="h-14 border-b-4 border-black bg-white flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              {/* 缩放控制 - 画布缩放 */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-muted-foreground">缩放:</span>
                <PixelButton
                  size="sm"
                  variant="ghost"
                  onClick={() => canvasTransform.updateScale(canvasTransform.transform.scale - 0.2)}
                >
                  <ZoomOut className="w-4 h-4" />
                </PixelButton>
                <span className="w-14 text-center font-mono text-sm">{Math.round(canvasTransform.transform.scale * 100)}%</span>
                <PixelButton
                  size="sm"
                  variant="ghost"
                  onClick={() => canvasTransform.updateScale(canvasTransform.transform.scale + 0.2)}
                >
                  <ZoomIn className="w-4 h-4" />
                </PixelButton>
                <PixelButton
                  size="sm"
                  variant="outline"
                  onClick={canvasTransform.resetTransform}
                  className="text-xs"
                >
                  重置
                </PixelButton>
              </div>

              <div className="h-8 w-px bg-black/20" />

              {/* 编辑模式控制 */}
              <div className="flex items-center gap-2">
                <Button
                  variant={state.isEditMode ? "default" : "outline"}
                  size="sm"
                  disabled={!state.processedData}
                  onClick={() => setState(prev => ({ ...prev, isEditMode: !prev.isEditMode, isPipetteMode: false, selectedColor: null, showColorSelector: false }))}
                  className="h-8"
                >
                  <Edit3 className="w-4 h-4 mr-1" /> 编辑模式
                </Button>
                {state.isEditMode && (
                  <>
                    <Button
                      variant={state.isPipetteMode ? "default" : "outline"}
                      size="sm"
                      onClick={togglePipetteMode}
                      className="h-8"
                    >
                      <Pipette className="w-4 h-4 mr-1" /> 取色
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (historyIndex > 0) undo();
                      }}
                      disabled={historyIndex <= 0}
                      className="h-8"
                    >
                      <Undo className="w-4 h-4 mr-1" /> 撤回
                    </Button>
                    {state.selectedColor && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded border">
                        <div
                          className="w-5 h-5 rounded border border-black"
                          style={{ backgroundColor: state.selectedColor.hex }}
                        />
                        <span className="text-xs font-mono font-bold">{state.selectedColor.id}</span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => setState(prev => ({ ...prev, selectedColor: null }))}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="h-8 w-px bg-black/20" />

              {/* 显示设置 */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Label htmlFor="toolbar-grid-toggle" className="text-xs cursor-pointer">网格</Label>
                  <Switch
                    id="toolbar-grid-toggle"
                    checked={state.showGrid}
                    onCheckedChange={(c) => setState(prev => ({ ...prev, showGrid: c }))}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="toolbar-labels-toggle" className="text-xs cursor-pointer">色号</Label>
                  <Switch
                    id="toolbar-labels-toggle"
                    checked={state.showLabels}
                    onCheckedChange={(c) => setState(prev => ({ ...prev, showLabels: c }))}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="toolbar-white-toggle" className="text-xs cursor-pointer">白色</Label>
                  <Switch
                    id="toolbar-white-toggle"
                    checked={state.ignoreWhite}
                    onCheckedChange={(c) => setState(prev => ({ ...prev, ignoreWhite: c }))}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="toolbar-black-toggle" className="text-xs cursor-pointer">黑色</Label>
                  <Switch
                    id="toolbar-black-toggle"
                    checked={state.ignoreBlack}
                    onCheckedChange={(c) => setState(prev => ({ ...prev, ignoreBlack: c }))}
                  />
                </div>
              </div>

              <div className="h-8 w-px bg-black/20" />

              {/* 尺寸信息 */}
              <div className="text-xs text-muted-foreground">
                {state.originalImage ? `${state.gridWidth}×${state.gridHeight} 格` : '未加载图片'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 编辑模式下的色号选择器开关 */}
              {state.isEditMode && (
                <Button
                  variant={state.showColorSelector ? "default" : "outline"}
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, showColorSelector: !prev.showColorSelector }))}
                  className="h-8"
                >
                  <Palette className="w-4 h-4 mr-1" /> 色号
                </Button>
              )}

              {/* 色号统计按钮 */}
              {state.processedData && state.processedData.colorCounts.size > 0 && (
                <Button
                  variant={state.showColorStats ? "default" : "outline"}
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, showColorStats: !prev.showColorStats }))}
                  className="border-2 border-black"
                >
                  <List className="w-4 h-4 mr-1" />
                  色号统计
                  <span className="ml-1 bg-black text-white text-xs px-1.5 rounded">
                    {state.processedData.colorCounts.size}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* Canvas Display Area - 支持滚轮缩放和拖动 */}
          <div
            ref={canvasTransform.containerRef}
            className="flex-1 overflow-hidden p-8 flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgydjJIMUMxeiIgZmlsbD0iIzAwMDAwMDIwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] relative select-none"
            onMouseDown={canvasTransform.handleMouseDown}
            onMouseMove={canvasTransform.handleMouseMove}
            onMouseUp={canvasTransform.handleMouseUp}
            onMouseLeave={canvasTransform.handleMouseLeave}
          >
            {state.originalImage ? (
              <div
                className="bg-white p-1 border-4 border-black shadow-2xl origin-center"
                style={{
                  transform: `translate(${canvasTransform.transform.translateX}px, ${canvasTransform.transform.translateY}px)`,
                  cursor: canvasTransform.isDragging ? 'grabbing' : (state.isEditMode ? (state.isPipetteMode ? 'crosshair' : 'pointer') : 'grab'),
                  transition: canvasTransform.isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="block"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                />
              </div>
            ) : (
              <div className="text-center space-y-4 opacity-50">
                <div className="w-24 h-24 mx-auto border-4 border-black border-dashed rounded-full flex items-center justify-center">
                  <ImageIcon className="w-10 h-10" />
                </div>
                <h3 className="font-display text-2xl">请先上传图片</h3>
                <p className="text-sm">提示：滚轮缩放 · 左键拖动</p>
              </div>
            )}

            {/* 编辑模式提示 */}
            {state.isEditMode && state.processedData && (
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
                    画布外拖动移动视图 · Ctrl+Z 撤回
                  </div>
                </div>
              </div>
            )}
            {/* 豆子太小提示 - 显示在画布底部中央 */}
            {state.showLabels && state.processedData && Math.floor(state.pixelSize * canvasTransform.transform.scale * 0.28) < 5 && !state.isEditMode && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-50 border-2 border-amber-400 shadow-lg px-4 py-2 rounded">
                <span className="text-xs text-amber-700 font-medium">⚠️ 当前显示豆子太小，色号不显示（建议放大画布）</span>
              </div>
            )}
          </div>

          {/* 悬浮色号统计面板 */}
          <ColorStatsPanel
            colorStats={colorStats}
            hiddenColorIds={state.hiddenColorIds}
            onToggleVisibility={toggleColorVisibility}
            isVisible={state.showColorStats}
            onClose={() => setState(prev => ({ ...prev, showColorStats: false }))}
            totalBeads={state.gridWidth * state.gridHeight}
          />

          {/* 色号选择器面板（编辑模式） */}
          <ColorSelector
            colors={currentPalette}
            selectedColor={state.selectedColor}
            onSelectColor={selectColor}
            onClearSelection={() => setState(prev => ({ ...prev, selectedColor: null }))}
            isVisible={state.isEditMode && state.showColorSelector}
            onClose={() => setState(prev => ({ ...prev, showColorSelector: false }))}
            title="色号选择器"
          />
        </main>
      </div>

      <ExportDialog
        open={state.showExportDialog}
        onOpenChange={(open) => setState(prev => ({ ...prev, showExportDialog: open }))}
        processedData={state.processedData}
        palette={currentPalette}
        width={state.gridWidth}
        height={state.gridHeight}
        hideWhiteLabels={state.hideWhiteLabels}
      />

      <PalettePreviewDialog
        open={state.showPalettePreviewDialog}
        onOpenChange={(open) => setState(prev => ({ ...prev, showPalettePreviewDialog: open }))}
        colors={currentPalette}
        paletteName={state.palette === 'custom' ? '自定义' : PALETTES[state.palette]?.name || state.palette}
      />

      <ImageCropper
        open={state.showCropper}
        onClose={() => setState(prev => ({ ...prev, showCropper: false }))}
        onComplete={handleCropComplete}
        imageSrc={state.imageSrc}
      />
    </div>
  );
}
