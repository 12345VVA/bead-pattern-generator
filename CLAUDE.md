# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 React + TypeScript + Vite 的拼豆图纸生成器，用于将图片转换为拼豆（Perler/Hama Beads）图纸。应用使用 shadcn/ui 组件库和 Tailwind CSS 4.x 构建像素风格的用户界面。

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

## 架构要点

### 核心模块 (`src/lib/`)

- **`colors.ts`** - 调色板管理系统
  - 定义 `BeadColor` 接口（id, name, hex, brand）
  - 内置多个品牌的完整色号：Perler、Hama、Artkal、MARD（221色）、Nabbi
  - 支持国产品牌映射（COCO、漫漫、盼盼、咪小窝）通过 `BRAND_COLOR_MAPPING`
  - `PALETTES` 对象统一管理所有调色板
  - 提供自定义色号支持：`addCustomColor()`, `getCustomPalette()`

- **`image-processing.ts`** - 图像处理算法
  - 核心函数：`processImage()` - 像素化、颜色匹配、抖动
  - 支持三种颜色匹配算法：`weighted`（默认）、`euclidean`、`cielab`
  - Floyd-Steinberg 抖动算法，可调节强度
  - `findNearestColor()` - 带缓存的最近颜色查找
  - 返回 `ProcessedResult` 包含：pixels (RGBA)、colorCounts (Map)、beadGrid (数组)

- **`pdf-generator.ts`** - PDF 导出
  - 使用 jsPDF 生成多页 PDF
  - 使用 Canvas API 绘制颜色列表（避免中文乱码）
  - 支持导出色号统计和图纸预览

### 页面组件 (`src/pages/`)

- **`Editor.tsx`** - 主编辑器（核心页面）
  - 使用 react-dropzone 上传图片
  - ImageCropper 组件裁剪图片
  - 画布支持滚轮缩放和左键拖动（通过 `canvasScale`, `canvasTranslateX/Y`）
  - 侧边栏控制：色卡选择、抖动、杂色过滤、颜色合并、网格尺寸
  - 悬浮色号统计面板显示所有使用颜色的数量和占比

- **`BlueprintEditor.tsx`** - 图纸编辑器，用于后期编辑

### 关键架构模式

1. **状态管理**：使用 React useState + useEffect，无全局状态管理库
2. **路径别名**：`@` 映射到 `src` 目录（在 `vite.config.ts` 配置）
3. **颜色缓存**：`nearestColorCache` Map 缓存颜色匹配结果，切换调色板时需清除 `clearColorCache()`
4. **AI 友好**：自定义 Babel 插件 `babel-plugin-jsx-source-location.cjs` 为 JSX 元素注入 `data-source` 属性
5. **路由**：Wouter 基于 hash 的前端路由
6. **样式**：Tailwind CSS 4.x + 自定义像素风格组件（`PixelUI.tsx`）

### shadcn/ui 配置

- 配置文件：`components.json`
- 组件位于：`src/components/ui/`
- 已安装约 56 个组件

### 编辑器状态 (`EditorState`)

重要字段：
- `palette`: PaletteKey 或 'custom'
- `domesticBrand`: 国产品牌代码
- `colorMatchAlgorithm`: 'weighted' | 'euclidean' | 'cielab'
- `dither`, `filterNoise`, `mergeColors`: 图像处理开关
- `hiddenColorIds`: Set<string> 控制哪些颜色的标签不显示

### 颜色处理注意事项

- 白色/黑色识别：不仅检查 hex 值，还检查 `name` 字段（支持中英文）和特殊 ID（如 MARD 的 H02=极浅灰, H07=炭黑1）
- 透明像素：alpha < 128 视为透明
- 颜色匹配默认使用加权 RGB 距离算法（人眼感知优化）

## 自定义 Babel 插件

位置：`scripts/babel-plugin-jsx-source-location.cjs`

为所有原生 HTML 元素注入 `data-source` 属性，格式为 `"filename:line:column"`，方便 AI 工具定位源代码位置。
