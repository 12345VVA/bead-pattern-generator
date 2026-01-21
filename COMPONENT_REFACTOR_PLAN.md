# 📋 Editor 和 BlueprintEditor 组件拆分计划

## 📊 当前状态分析

### Editor.tsx
- **文件大小**: 1368行，53KB
- **复杂度**: 17个函数/方法
- **主要问题**: 
  - 状态管理复杂（25+个状态变量）
  - UI渲染逻辑和业务逻辑混合
  - 侧边栏配置区域代码冗长
  - 画布渲染逻辑嵌入在主组件中

### BlueprintEditor.tsx
- **文件大小**: 2156行，82KB ⚠️
- **复杂度**: 39个函数/方法
- **主要问题**:
  - 文件过大，超过2000行
  - 包含已废弃的函数（detectBeadRegions等）
  - 侧边栏配置区域极其冗长
  - 工具栏、画布、对话框都在一个文件中

## ✅ 已有的组件（可复用）

```
src/components/Editor/
├── ColorSelector.tsx          # 色号选择器
├── ColorStatsPanel.tsx        # 色号统计面板
├── ExportDialog.tsx           # 导出对话框
├── ImageCropper.tsx           # 图片裁剪器
├── PalettePreviewDialog.tsx   # 调色板预览
├── ToolbarControls.tsx        # 工具栏控制
└── useCanvasTransform.ts      # 画布变换Hook
```

---

## 🎯 拆分策略

### 原则
1. **单一职责**: 每个组件只负责一个功能
2. **可复用性**: 通用组件可在两个页面间共享
3. **逻辑分离**: UI组件和业务逻辑分离
4. **文件大小**: 每个文件控制在300行以内

### 优先级
- 🔴 **P0 (紧急)**: BlueprintEditor.tsx 过大，必须拆分
- 🟡 **P1 (重要)**: Editor.tsx 侧边栏拆分
- 🟢 **P2 (优化)**: 共享组件提取

---

## 📦 拆分计划

### Phase 1: BlueprintEditor 拆分 (P0)

#### 1.1 清理废弃代码
**文件**: `BlueprintEditor.tsx`
**删除内容**:
- `detectBeadRegions` (第514-559行) - 已被增强版替代
- `estimateGridSpacing` (第561-599行) - 已被增强版替代
- `findBeadBounds` (第601-624行) - 已被增强版替代
- `calculateAverageColor` (第626-651行) - 已被增强版替代
- `findClosestColor` (第653-678行) - 已被增强版替代
- `hexToRgb` (第680-687行) - 可移到utils

**预期减少**: ~200行

#### 1.2 创建侧边栏组件
**新文件**: `src/components/BlueprintEditor/Sidebar.tsx`

**包含内容**:
- 上传区域
- 色卡选择
- 显示设置
- 杂色过滤设置
- 增强识别设置
- 操作按钮

**Props接口**:
```typescript
interface SidebarProps {
  state: BlueprintEditorState;
  onStateChange: (updates: Partial<BlueprintEditorState>) => void;
  onExport: () => void;
  onNewGrid: () => void;
  currentPalette: BeadColor[];
  isDragActive: boolean;
  getRootProps: () => any;
  getInputProps: () => any;
}
```

**预期减少**: ~300行

#### 1.3 创建工具栏组件
**新文件**: `src/components/BlueprintEditor/Toolbar.tsx`

**包含内容**:
- 缩放控制
- 撤销/重做按钮
- 编辑模式切换
- 取色器按钮
- 状态信息显示

**Props接口**:
```typescript
interface ToolbarProps {
  canvasScale: number;
  onScaleChange: (scale: number) => void;
  onResetTransform: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  isPipetteMode: boolean;
  onTogglePipette: () => void;
  beadCount: number;
}
```

**预期减少**: ~150行

#### 1.4 创建画布组件
**新文件**: `src/components/BlueprintEditor/Canvas.tsx`

**包含内容**:
- 画布渲染
- 鼠标交互处理
- 编辑模式提示
- 豆子太小提示

**Props接口**:
```typescript
interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  beadRegions: BeadRegion[];
  canvasScale: number;
  canvasTranslate: { x: number; y: number };
  isEditMode: boolean;
  isPipetteMode: boolean;
  selectedColor: BeadColor | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}
```

**预期减少**: ~200行

#### 1.5 创建对话框组件
**新文件**: `src/components/BlueprintEditor/NewGridDialog.tsx`

**包含内容**:
- 新建图纸对话框
- 宽高输入
- 锁定比例

**预期减少**: ~100行

#### 1.6 提取业务逻辑Hooks
**新文件**: `src/components/BlueprintEditor/useBlueprintEditor.ts`

**包含内容**:
- 状态管理
- 历史记录管理
- 图纸处理逻辑
- 杂色过滤逻辑

**预期减少**: ~300行

**拆分后 BlueprintEditor.tsx 预期大小**: ~900行 (减少约1200行)

---

### Phase 2: Editor 拆分 (P1)

#### 2.1 创建侧边栏组件
**新文件**: `src/components/Editor/Sidebar.tsx`

**包含内容**:
- 上传区域
- 基础设置（宽高、像素大小）
- 调色板选择
- 颜色匹配算法
- 抖动设置
- 杂色过滤
- 颜色合并
- 显示设置

**预期减少**: ~400行

#### 2.2 创建工具栏组件
**新文件**: `src/components/Editor/Toolbar.tsx`

**包含内容**:
- 缩放控制
- 撤销/重做
- 编辑模式切换
- 显示开关
- 状态信息

**预期减少**: ~150行

#### 2.3 创建画布组件
**新文件**: `src/components/Editor/Canvas.tsx`

**包含内容**:
- 画布渲染
- 编辑模式交互
- 提示信息

**预期减少**: ~200行

#### 2.4 提取业务逻辑Hooks
**新文件**: `src/components/Editor/useEditor.ts`

**包含内容**:
- 状态管理
- 图像处理逻辑
- 历史记录管理
- 颜色过滤/合并逻辑

**预期减少**: ~300行

**拆分后 Editor.tsx 预期大小**: ~300行 (减少约1000行)

---

### Phase 3: 共享组件提取 (P2)

#### 3.1 通用画布控制
**新文件**: `src/components/shared/CanvasControls.tsx`

**功能**: 缩放、重置、拖动提示等通用控制

#### 3.2 通用设置面板
**新文件**: `src/components/shared/SettingsPanel.tsx`

**功能**: 可折叠的设置面板容器

#### 3.3 通用工具函数
**新文件**: `src/lib/canvas-utils.ts`

**功能**: 画布相关的工具函数（hexToRgb等）

---

## 📁 最终目录结构

```
src/
├── components/
│   ├── Editor/
│   │   ├── Canvas.tsx              # 新增
│   │   ├── Sidebar.tsx             # 新增
│   │   ├── Toolbar.tsx             # 新增
│   │   ├── useEditor.ts            # 新增
│   │   ├── ColorSelector.tsx       # 已有
│   │   ├── ColorStatsPanel.tsx     # 已有
│   │   ├── ExportDialog.tsx        # 已有
│   │   ├── ImageCropper.tsx        # 已有
│   │   ├── PalettePreviewDialog.tsx # 已有
│   │   ├── ToolbarControls.tsx     # 已有（可能废弃）
│   │   └── useCanvasTransform.ts   # 已有
│   │
│   ├── BlueprintEditor/
│   │   ├── Canvas.tsx              # 新增
│   │   ├── Sidebar.tsx             # 新增
│   │   ├── Toolbar.tsx             # 新增
│   │   ├── NewGridDialog.tsx       # 新增
│   │   └── useBlueprintEditor.ts   # 新增
│   │
│   ├── shared/
│   │   ├── CanvasControls.tsx      # 新增
│   │   └── SettingsPanel.tsx       # 新增
│   │
│   └── Layout.tsx                  # 已有
│
├── lib/
│   ├── canvas-utils.ts             # 新增
│   ├── blueprint-processing.ts     # 已有
│   └── image-processing.ts         # 已有
│
└── pages/
    ├── Editor.tsx                  # 简化到~300行
    └── BlueprintEditor.tsx         # 简化到~900行
```

---

## 🚀 实施步骤

### Step 1: BlueprintEditor 清理 (30分钟)
1. 删除废弃函数
2. 移动hexToRgb到utils
3. 测试确保功能正常

### Step 2: BlueprintEditor 侧边栏拆分 (1小时)
1. 创建 `Sidebar.tsx`
2. 提取侧边栏代码
3. 更新主组件引用
4. 测试

### Step 3: BlueprintEditor 工具栏拆分 (45分钟)
1. 创建 `Toolbar.tsx`
2. 提取工具栏代码
3. 更新主组件引用
4. 测试

### Step 4: BlueprintEditor 画布拆分 (1小时)
1. 创建 `Canvas.tsx`
2. 提取画布渲染和交互逻辑
3. 更新主组件引用
4. 测试

### Step 5: BlueprintEditor Hook提取 (1.5小时)
1. 创建 `useBlueprintEditor.ts`
2. 提取状态管理和业务逻辑
3. 更新主组件使用Hook
4. 测试

### Step 6: Editor 拆分 (3小时)
重复Step 2-5的流程

### Step 7: 共享组件提取 (1小时)
1. 识别可复用代码
2. 创建共享组件
3. 更新两个页面引用

**总预计时间**: 8-10小时

---

## 📊 预期效果

### 代码质量提升
- ✅ 文件大小减少60-80%
- ✅ 可维护性大幅提升
- ✅ 代码复用率提高
- ✅ 测试更容易编写

### 具体指标
| 文件 | 当前行数 | 拆分后行数 | 减少比例 |
|------|---------|-----------|---------|
| BlueprintEditor.tsx | 2156 | ~900 | 58% |
| Editor.tsx | 1368 | ~300 | 78% |
| **总计** | **3524** | **~1200** | **66%** |

### 新增文件
- 10个新组件文件
- 2个新Hook文件
- 1个新工具文件
- **总计**: 13个文件

---

## ⚠️ 注意事项

### 风险
1. **状态管理复杂**: 需要仔细处理状态提升和传递
2. **性能影响**: 过度拆分可能导致不必要的重渲染
3. **测试工作量**: 需要为新组件编写测试

### 缓解措施
1. 使用 `React.memo` 优化性能
2. 合理使用 `useCallback` 和 `useMemo`
3. 保持Props接口简洁
4. 逐步拆分，每步都测试

---

## 🎯 建议

### 立即执行 (P0)
✅ **强烈建议立即执行 BlueprintEditor 拆分**
- 文件过大（2156行）严重影响开发效率
- 包含大量废弃代码
- 拆分后可减少58%代码量

### 近期执行 (P1)
✅ **建议在1-2周内执行 Editor 拆分**
- 文件较大（1368行）但尚可接受
- 拆分后维护更容易
- 可减少78%代码量

### 长期优化 (P2)
🟢 **可选，根据需求决定**
- 提取共享组件
- 优化性能
- 完善测试覆盖

---

## 📝 总结

**是否建议拆分**: ✅ **强烈建议**

**主要理由**:
1. BlueprintEditor.tsx 超过2000行，严重超标
2. 两个文件都包含大量重复逻辑
3. 拆分后可减少66%的代码量
4. 维护性和可读性将大幅提升
5. 为未来功能扩展打下良好基础

**投入产出比**: ⭐⭐⭐⭐⭐
- 投入: 8-10小时
- 产出: 代码量减少66%，维护效率提升50%+

**建议优先级**:
1. 🔴 BlueprintEditor 清理和拆分（必须）
2. 🟡 Editor 拆分（重要）
3. 🟢 共享组件提取（优化）
