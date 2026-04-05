# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 React + TypeScript + Vite 的拼豆图纸生成器，用于将图片转换为拼豆（Perler/Hama Beads）图纸。应用使用 shadcn/ui 组件库和 Tailwind CSS 4.x 构建像素风格的用户界面。

**核心功能**：
- 图片上传和智能裁剪
- 像素化处理和多算法颜色匹配
- 支持多种调色板（Perler、Hama、Artkal、MARD 221色、Nabbi、国产品牌）
- 颜色抖动、杂色过滤、颜色合并
- PDF/PNG 导出，支持色号统计
- 图纸识别和编辑（BlueprintEditor）
- 画布编辑功能（修改豆子颜色、取色器）

## 开发命令

```bash
# 开发服务器
npm run dev

# 构建（先类型检查再打包）
npm run build

# 代码检查
npm run lint

# 预览构建产物
npm run preview
```

**注意**：项目目前没有配置测试框架。Vitest 已安装但未配置，`package.json` 中无测试命令。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 19.2.0 | UI 框架 |
| TypeScript | 5.9.3 | 类型系统 |
| Vite | 7.2.4 | 构建工具 |
| Tailwind CSS | 4.1.18 | 样式框架 |
| shadcn/ui | - | UI 组件库（56个组件） |
| Wouter | 3.9.0 | 前端路由（hash-based） |
| jsPDF | 4.0.0 | PDF 生成 |
| react-dropzone | 14.3.8 | 文件上传 |
| react-easy-crop | 5.5.6 | 图片裁剪 |
| Framer Motion | 12.24.12 | 动画库 |
| Zod | 4.3.5 | 数据验证 |

## 架构要点

### 目录结构

```
src/
├── components/
│   ├── BlueprintEditor/    # 图纸编辑器组件
│   ├── Editor/              # 主编辑器组件
│   ├── ui/                  # shadcn/ui 组件（56个）
│   ├── ErrorBoundary.tsx
│   ├── Layout.tsx           # 布局组件
│   └── PixelUI.tsx          # 像素风格组件
├── contexts/
│   └── ThemeContext.tsx     # 主题上下文
├── hooks/
│   └── use-mobile.ts        # 响应式 Hook
├── lib/
│   ├── blueprint-processing.ts  # 图纸处理算法
│   ├── canvas-utils.ts          # 画布工具函数
│   ├── colors.ts                # 调色板管理
│   ├── cropUtils.ts             # 裁剪工具
│   ├── image-processing.ts      # 图像处理核心算法
│   ├── pdf-generator.ts         # PDF 生成
│   └── utils.ts                 # 通用工具
├── pages/
│   ├── BlueprintEditor.tsx  # 图纸编辑器页面
│   ├── Editor.tsx           # 主编辑器页面
│   ├── Home.tsx             # 首页
│   └── NotFound.tsx         # 404页面
├── App.tsx
└── main.tsx
```

### 核心模块 (`src/lib/`)

#### **`colors.ts`** - 调色板管理系统

**类型定义**：
```typescript
interface BeadColor {
  id: string;
  name: string;
  hex: string;
  brand: string;
}

interface ColorMapping {
  hex: string;
  brands: BrandMapping;
  name?: string;
}
```

**调色板**：
- `PERLER_COLORS` - Perler 色号（约80色）
- `HAMA_MIDI_COLORS` - Hama Midi 基础色号
- `HAMA_ENHANCED_COLORS` - Hama 增强色号（来自 fuse-bead-tool）
- `ARTKAL_S_COLORS` - Artkal S 色号
- `MARD_COLORS` - MARD 完整色号系统（221色）
  - A系列：黄色/橙色系（33色）
  - B系列：绿色系（33色）
  - C系列：蓝色系（29色）
  - D系列：紫色系（27色）
  - E系列：粉色系（24色）
  - F系列：红色系（27色）
  - G系列：棕色系（22色）
  - H系列：灰色/黑色/白色系（23色）
  - M系列：混合色系（15色）
- `NABBI_COLORS` - Nabbi 色号
- `BRAND_COLOR_MAPPING` - 国产品牌色号映射表

**API**：
```typescript
// 调色板访问
const PALETTES = {
  perler, hama, artkal, mard, hamaEnhanced, nabbi,
  coco, manman, panpan, mixiaowo
};

// 国产品牌加载
loadDomesticBrandPalette(brandCode: BrandCode): BeadColor[]

// 自定义色号
addCustomColor(color: BeadColor): void
getCustomPalette(): BeadColor[]
clearCustomColors(): void
```

#### **`image-processing.ts`** - 图像处理算法

**类型定义**：
```typescript
type ColorMatchAlgorithm = 'weighted' | 'euclidean' | 'cielab';

interface ColorMatchConfig {
  algorithm: ColorMatchAlgorithm;
  tolerance?: number;
  useCache?: boolean;
}

interface ProcessedResult {
  pixels: Uint8ClampedArray;
  colorCounts: Map<string, number>;
  beadGrid: (string | null)[];
}
```

**核心函数**：
```typescript
// 图像加载和像素提取
loadImage(file: File): Promise<HTMLImageElement>
getPixelData(img, width, height): Uint8ClampedArray

// 颜色匹配（带缓存）
findNearestColor(r, g, b, palette, config?): BeadColor
clearColorCache(): void

// 图像处理（主流程）
processImage(
  originalPixels, width, height, palette,
  dither, ditherStrength, ignoreWhite, ignoreBlack,
  colorMatchConfig?
): ProcessedResult
```

**颜色匹配算法**：
1. **weighted**（默认）- 加权RGB距离，人眼感知优化
2. **euclidean** - 标准欧几里得距离，简单快速
3. **cielab** - CIELAB颜色空间距离，最精确但计算较慢

**Floyd-Steinberg 抖动**：可调节强度（0-1），误差分布到周围像素

#### **`pdf-generator.ts`** - PDF 导出

```typescript
generatePDF(
  processedData: ProcessedResult,
  palette: BeadColor[],
  width, height,
  filename?: string,
  showLabels?: boolean,
  hideWhiteLabels?: boolean
): void
```

使用 Canvas API 绘制颜色列表以避免中文乱码，生成包含色号统计和图纸预览的多页 PDF。

#### **`blueprint-processing.ts`** - 图纸处理算法

**类型定义**：
```typescript
interface BeadRegion {
  x, y, width, height: number;
  color: { r, g, b };
  matchedColor?: BeadColor;
  gridX, gridY: number;
  confidence?: number;
}

interface BoundaryDetectionConfig {
  method: 'grid' | 'contour' | 'adaptive';
  minBeadSize?, maxBeadSize?: number;
  edgeThreshold?: number;
}

interface ColorRecognitionConfig {
  sampleMethod: 'average' | 'median' | 'dominant';
  excludeEdgePixels?: boolean;
  edgeExclusionRatio?: number;
  colorMatchConfig?: ColorMatchConfig;
}
```

**核心函数**：
```typescript
// 边界检测
detectBeadRegionsAdaptive(data, width, height, config?): BeadRegion[]
estimateGridSpacing(data, width, height): { spacing, confidence }

// 颜色识别
calculateAverageColor(data, width, bounds, config?): { r, g, b }
matchColorsToRegions(regions, palette, config?): BeadRegion[]

// 完整处理流程
processBlueprint(imageData, palette, boundaryConfig, colorConfig): BlueprintProcessResult
```

### 页面组件 (`src/pages/`)

#### **`Editor.tsx`** - 主编辑器（核心页面）

**功能特性**：
- 图片上传（react-dropzone）和智能裁剪（ImageCropper）
- 画布交互：滚轮缩放、左键拖动
- 侧边栏控制：色卡选择、抖动、杂色过滤、颜色合并、网格尺寸
- 悬浮色号统计面板
- 编辑模式：批量修改豆子颜色、取色器
- 历史记录和撤回（Ctrl+Z）

**编辑器状态（`EditorState`）**：
```typescript
interface EditorState {
  originalImage: HTMLImageElement | null;
  gridWidth, gridHeight: number;
  showGrid, showLabels: boolean;
  palette: PaletteKey | 'custom';
  domesticBrand?: BrandCode;
  colorMatchAlgorithm: ColorMatchAlgorithm;
  dither: boolean;
  ditherStrength: number;
  ignoreWhite, ignoreBlack: boolean;
  hideWhiteLabels, hideBlackLabels: boolean;
  processedData: ProcessedResult | null;
  showExportDialog: boolean;
  filterNoise: boolean;
  noiseThreshold: number;
  mergeColors: boolean;
  mergeTolerance: number;
  hiddenColorIds: Set<string>;
  isEditMode: boolean;
  selectedColor: BeadColor | null;
  isPipetteMode: boolean;
  showColorStats: boolean;
}
```

#### **`BlueprintEditor.tsx`** - 图纸编辑器

**功能特性**：
- 图纸识别（边界检测 + 颜色识别）
- 创建空白图纸
- 水平/垂直镜像翻转
- 画布编辑（修改豆子颜色、取色器）
- PNG/PDF 导出（可选色号统计）

**图纸编辑器状态（`BlueprintEditorState`）**：
```typescript
interface BlueprintEditorState {
  originalImage: HTMLImageElement | null;
  beadRegions: BeadRegion[];
  selectedPalette: PaletteKey;
  boundaryDetectionMethod: 'grid' | 'contour' | 'adaptive';
  colorSampleMethod: 'average' | 'median' | 'dominant';
  excludeEdgePixels: boolean;
  colorMatchAlgorithm: ColorMatchAlgorithm;
  isEditMode: boolean;
  selectedColor: BeadColor | null;
  isPipetteMode: boolean;
  filterNoise: boolean;
}
```

### 关键架构模式

1. **状态管理**：React useState + useEffect，无全局状态管理库
2. **路径别名**：`@` 映射到 `src` 目录（vite.config.ts）
3. **颜色缓存**：`nearestColorCache` Map 缓存颜色匹配结果，切换调色板时需清除 `clearColorCache()`
4. **AI 友好**：自定义 Babel 插件为 JSX 元素注入 `data-source` 属性（格式：`"filename:line:column"`）
5. **路由**：Wouter 基于 hash 的前端路由
6. **样式**：Tailwind CSS 4.x + 自定义像素风格组件（PixelUI.tsx）
7. **画布交互**：`useCanvasTransform` Hook 统一管理画布缩放和拖动

### shadcn/ui 组件

配置文件：`components.json`
组件位置：`src/components/ui/`

已安装约 56 个组件，包括：
- 基础组件：button, input, label, switch, slider, select...
- 布局组件：card, separator, scroll-area, resizable...
- 反馈组件：alert, dialog, toast, sonner...
- 数据展示：table, badge, progress, chart...

### 颜色处理注意事项

**白色/黑色识别**：
```typescript
// 检查逻辑：hex + name + 特殊 ID
const isWhite = color.hex.toLowerCase() === "#ffffff" ||
                color.name === "白色" ||
                color.name === "极浅灰" ||
                color.id === "H02"; // MARD 极浅灰

const isBlack = color.hex.toLowerCase() === "#000000" ||
                color.name === "黑色" ||
                color.name === "炭黑1" ||
                color.id === "H07"; // MARD 炭黑1
```

**透明像素**：alpha < 128 视为透明

**默认颜色匹配**：使用加权 RGB 距离算法（人眼感知优化）

### 画布交互

**`useCanvasTransform` Hook**：
```typescript
interface CanvasTransform {
  scale: number;        // 画布缩放（0.1 - 5）
  translateX: number;   // X 轴平移
  translateY: number;   // Y 轴平移
}

// 使用示例
const canvasTransform = useCanvasTransform({
  minScale: 0.1,
  maxScale: 5,
  scaleStep: 0.2,
  disableDragOnCanvas: false, // 编辑模式设为 true
});
```

**交互方式**：
- 滚轮：缩放画布
- 左键拖动：移动视图（非编辑模式）
- 中键拖动：移动视图（始终可用）

## 自定义 Babel 插件

位置：`scripts/babel-plugin-jsx-source-location.cjs`

为所有原生 HTML 元素注入 `data-source` 属性，格式为 `"filename:line:column"`，方便 AI 工具定位源代码位置。

## 配置文件

| 文件 | 说明 |
|------|------|
| `vite.config.ts` | Vite 配置（路径别名、Babel 插件、Tailwind） |
| `components.json` | shadcn/ui 配置 |
| `tsconfig.json` | TypeScript 配置 |
| `tailwind.config.js` | Tailwind CSS 配置（由 Vite 插件管理） |

## 开发建议

1. **修改调色板**：编辑 `src/lib/colors.ts` 中的调色板数组
2. **添加新的颜色匹配算法**：在 `src/lib/image-processing.ts` 中添加算法函数
3. **修改导出格式**：编辑 `src/lib/pdf-generator.ts` 或页面中的导出处理函数
4. **新增 UI 组件**：使用 `npx shadcn@latest add [component]` 添加 shadcn/ui 组件
