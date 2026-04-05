# 图纸识别处理逻辑分析

## 当前处理流程

```
上传图片 → 裁剪 → 边界检测 → 颜色识别 → 颜色匹配 → 杂色过滤 → 完成
```

## 存在的问题分析

### 1. 网格间距估算问题 (`estimateGridSpacing`)

**位置**: `src/lib/blueprint-processing.ts:57-84`

**问题点**：
```typescript
// 问题1：使用固定的边缘差异阈值 (50)
const diff = Math.abs(data[idx1] - data[idx2]) +
    Math.abs(data[idx1 + 1] - data[idx2 + 1]) +
    Math.abs(data[idx1 + 2] - data[idx2 + 2]);

if (diff > 50) { // ← 阈值固定，对不同图纸可能不适用
    // ...
}

// 问题2：只采样5行/5列，可能不够代表性
const sampleLines = 5; // ← 采样量太少

// 问题3：置信度计算过于简单
const variance = calculateVariance(spacings, spacingMode);
const confidence = Math.max(0, 1 - variance / 100); // ← 阈值100是经验值
```

**影响**：
- 对有网格线的图纸，边缘检测会混淆豆子边界和网格线
- 置信度计算不准确，可能导致选择错误的检测方法

---

### 2. 边界检测方法问题

#### 2.1 网格检测 (`detectBeadRegionsGrid`)

**位置**: `src/lib/blueprint-processing.ts:242-298`

**问题点**：
```typescript
// 问题1：完全依赖网格间距估算的准确性
for (let y = 0; y < height; y += gridSpacing) { // ← 如果gridSpacing不准，会漏检
    for (let x = 0; x < width; x += gridSpacing) {
        // ...
    }
}

// 问题2：精确定位边界时颜色阈值固定
const colorThreshold = 50; // ← 固定阈值，对不同颜色可能不适用

// 问题3：搜索半径固定为估计尺寸的60%
const searchRadius = Math.floor(estimatedSize * 0.6); // ← 比例固定
```

**影响**：
- 网格间距估算不准确会导致漏检或误检
- 对不规则排列的图纸效果差

#### 2.2 轮廓检测 (`detectBeadRegionsContour`)

**位置**: `src/lib/blueprint-processing.ts:378-429`

**问题点**：
```typescript
// 问题1：洪水填充的颜色阈值固定
const colorThreshold = 30; // ← 固定阈值

// 问题2：最大像素数限制可能导致大区域被截断
const maxPixels = 10000; // ← 可能不够

// 问题3：网格坐标估算过于粗糙
gridX: Math.floor(bounds.minX / 20), // ← 硬编码的20
gridY: Math.floor(bounds.minY / 20),
```

**影响**：
- 对渐变色或噪声敏感的图纸效果差
- 网格坐标不准确，影响后续编辑

---

### 3. 颜色识别问题

#### 3.1 边缘排除逻辑

**位置**: `src/lib/blueprint-processing.ts:528-580`

**问题点**：
```typescript
// 边缘排除比例固定
const edgeRatio = config?.edgeExclusionRatio || 0.2; // ← 默认20%

// 但实际采样时，边缘像素可能已经被包含
for (let y = Math.max(0, sampleMinY); y <= sampleMaxY; y++) {
    for (let x = Math.max(0, sampleMinX); x <= sampleMaxX; x++) {
        // 所有像素都会被采样，边缘排除只是缩小了采样范围
    }
}
```

**影响**：
- 边缘排除效果有限，仍会受到边界颜色影响

#### 3.2 采样方法局限性

| 方法 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| `average` | 快速 | 对噪声敏感 | 颜色均匀的区域 |
| `median` | 抗噪声 | 计算较慢 | 有噪声的区域 |
| `dominant` | 抗噪声 | 丢失细节 | 颜色分明的区域 |

---

### 4. 杂色过滤问题

**位置**: `src/pages/BlueprintEditor.tsx:218-292`

**问题点**：
```typescript
// 问题1：只考虑数量，不考虑空间分布
if (count >= threshold) {
    validColors.add(colorId);
}

// 问题2：替换策略简单，只找最近颜色
for (const validId of validColors) {
    // 只计算颜色距离，不考虑空间上下文
    const dist = Math.sqrt(/* ... */);
    if (dist < minDist) {
        minDist = dist;
        replacementColor = validId;
    }
}

// 问题3：没有颜色合并选项
// 只有杂色过滤，没有类似 Editor.tsx 中的颜色合并功能
```

**影响**：
- 可能错误地将重要的小面积颜色过滤掉
- 替换颜色可能不自然，忽略空间连续性

---

### 5. 整体架构问题

#### 5.1 缺少迭代优化

```typescript
// 当前流程：一次性处理，没有反馈
const result = processBlueprintEnhanced(imageData, palette, boundaryConfig, colorConfig);

// 建议流程：
// 1. 初始检测
// 2. 质量评估
// 3. 参数调整
// 4. 重新检测（如果质量不够）
// 5. 用户手动修正
```

#### 5.2 检测质量评估不准确

```typescript
// 当前质量评估：只考虑平均置信度
const avgConfidence = regions.reduce((sum, r) => sum + (r.confidence || 0), 0) / regions.length;

// 问题：置信度计算过于简单
// 在 detectBeadRegionsGrid 中固定为 0.8
confidence: 0.8, // ← 固定值，不是实际计算的
```

#### 5.3 缺少用户交互反馈

```typescript
// 当前：处理完直接显示结果，没有中间状态
// 建议：显示中间结果，让用户可以：
// - 调整边界检测参数
// - 手动标记豆子位置
// - 修正颜色匹配错误
```

---

## 对比 Editor.tsx 的差异

| 功能 | Editor.tsx | BlueprintEditor.tsx |
|------|-----------|---------------------|
| 颜色合并 | ✅ 支持 | ❌ 缺失 |
| 杂色过滤 | ✅ 支持 | ✅ 支持 |
| 编辑模式 | ✅ 支持 | ✅ 支持 |
| 历史记录 | ✅ 支持 | ✅ 支持 |
| 检测方法 | - | 3种（grid/contour/adaptive）|
| 颜色采样 | - | 3种（average/median/dominant）|
| 边缘排除 | - | ✅ 支持 |

**建议**：BlueprintEditor 应该添加类似 Editor.tsx 的颜色合并功能。

---

## 改进建议

### 优先级 P0（严重影响功能）

1. **添加颜色合并功能**
   - 参考 Editor.tsx 的 `applyColorMerge` 实现
   - 允许用户设置合并容差

2. **修复网格间距估算**
   - 增加采样行数（从5增加到10-15）
   - 使用自适应阈值而非固定值
   - 考虑网格线的存在，先检测并去除网格线

### 优先级 P1（影响用户体验）

3. **改进边界检测**
   - `findBeadBoundsPrecise` 使用自适应颜色阈值
   - 添加用户可调的最小/最大豆子尺寸参数
   - 改进网格坐标计算逻辑

4. **优化杂色过滤**
   - 考虑空间分布，不只是数量
   - 添加"保留小面积颜色"选项
   - 提供更智能的替换策略

### 优先级 P2（长期改进）

5. **添加迭代优化**
   - 检测后进行质量评估
   - 自动调整参数重新检测
   - 显示中间结果供用户确认

6. **用户交互反馈**
   - 显示检测置信度热图
   - 允许手动修正错误检测
   - 提供批量修正工具

---

## 测试建议

### 测试用例

1. **标准图纸**：规则排列，清晰边界
2. **有网格线图纸**：包含网格线的图纸
3. **噪声图纸**：背景有噪声或干扰
4. **渐变图纸**：颜色有渐变过渡
5. **不规则排列**：豆子排列不规则
6. **小面积颜色**：包含少量使用的重要颜色

### 预期结果

| 图纸类型 | 当前方法 | grid方法 | contour方法 |
|----------|---------|----------|-------------|
| 标准图纸 | ✅ 好 | ✅ 好 | ⚠️ 慢 |
| 有网格线 | ❌ 差 | ❌ 差 | ⚠️ 一般 |
| 噪声图纸 | ⚠️ 一般 | ⚠️ 一般 | ❌ 差 |
| 渐变图纸 | ⚠️ 一般 | ✅ 好 | ❌ 差 |
| 不规则排列 | ⚠️ 一般 | ❌ 差 | ✅ 好 |
| 小面积颜色 | ⚠️ 可能被过滤 | ⚠️ 可能被过滤 | ⚠️ 可能被过滤 |

---

## 代码示例：建议的改进

### 1. 添加颜色合并功能

```typescript
// 添加到 BlueprintEditor.tsx
const applyColorMerge = (beadRegions: BeadRegion[], tolerance: number) => {
  // 参考 Editor.tsx 的实现
  // ...
};
```

### 2. 改进网格间距估算

```typescript
// 改进 estimateGridSpacing 函数
const sampleLines = 15; // 增加采样量

// 使用自适应阈值
const adaptiveThreshold = calculateAdaptiveThreshold(data, width, height);
```

### 3. 添加质量评估

```typescript
// 更准确的质量评估
const assessDetectionQuality = (regions: BeadRegion[]): number => {
  // 考虑：
  // 1. 检测到的豆子数量是否符合预期
  // 2. 置信度分布
  // 3. 空洞检测（是否有漏检）
  // 4. 重叠检测（是否有重复）
};
```
