# 色块边框/分隔线处理策略详解

## 问题分析

### 常见的边框类型

```
┌──────────────────────────────────────────────────────────────┐
│  1. 黑色轮廓线                                              │
│  ┌─────┐                                                    │
│  │ 🔴  │  ← 黑色轮廓包围豆子                                │
│  └─────┘                                                    │
├──────────────────────────────────────────────────────────────┤
│  2. 网格线                                                  │
│  ┌───┬───┬───┐                                             │
│  │───│───│───│  ← 网格线穿过豆子                          │
│  │ 🔴│ 🟢│ 🔵│                                             │
│  │───│───│───│                                             │
│  └───┴───┴───┘                                             │
├──────────────────────────────────────────────────────────────┤
│  3. 分隔线                                                  │
│  ┌───────────┐                                             │
│  │    🔴     │                                             │
│  ├───────────┤  ← 水平/垂直分隔线                          │
│  │    🟢     │                                             │
│  └───────────┘                                             │
├──────────────────────────────────────────────────────────────┤
│  4. 混合情况                                                │
│  ┌─────┬─────┐                                             │
│  ║─────║─────║  ← 黑色边框 + 网格线                        │
│  ║ 🔴  ║ 🟢  ║                                             │
│  ║─────║─────║                                             │
│  └─────┴─────┘                                             │
└──────────────────────────────────────────────────────────────┘
```

## 处理策略对比

### 策略1: 预处理去除边框

**优点**：
- 在检测前去除干扰，避免影响边界检测
- 可以一次性处理所有边框

**缺点**：
- 可能破坏豆子边界
- 填充算法可能产生伪影
- 对细小豆子不利

**适用场景**：
- 边框较粗（3-5像素）
- 豆子较大
- 边框颜色单一

```typescript
// 使用示例
const cleanData = removeBordersPreprocess(imageData, width, height, {
    enabled: true,
    method: 'preprocess',
    removeGridLines: true,
    gridTolerance: 2,
    fillStrategy: 'nearest'
});
```

---

### 策略2: 检测时忽略边框

**优点**：
- 不修改原始数据
- 可以精确控制哪些像素被忽略
- 保留原始颜色信息

**缺点**：
- 需要额外的存储空间
- 可能影响连通区域检测

**适用场景**：
- 边框较细（1-2像素）
- 需要保留原始数据
- 使用洪水填充算法

```typescript
// 使用示例
const borderMask = createBorderMask(imageData, width, height, {
    enabled: true,
    method: 'ignore',
    borderColors: ['#000000', '#333333']
});

// 在检测时跳过边框像素
if (borderMask[y * width + x] === 1) {
    continue; // 跳过边框像素
}
```

---

### 策略3: 后处理清理

**优点**：
- 先完整检测，再过滤干扰
- 可以基于多个特征判断
- 不影响检测过程

**缺点**：
- 边框可能被检测为独立区域
- 需要额外的过滤逻辑

**适用场景**：
- 边框与豆子尺寸相近
- 需要基于区域特征过滤
- 作为补充方法使用

```typescript
// 使用示例
let regions = detectBeadRegions(...);
regions = postProcessBorders(regions, {
    minRegionSize: 50,      // 过滤小区域
    maxAspectRatio: 5,       // 过滤细长区域（可能是线）
    requireMatchedColor: true // 要求必须有匹配颜色
});
```

---

## 算法详解

### 1. 边框检测算法

#### 边缘颜色检测

```typescript
// 原理：图像边缘的集中颜色通常是边框颜色
const detectEdgeColors = (data, width, height) => {
    // 1. 采样图像边缘（上/下/左/右各5像素）
    // 2. 统计颜色频率
    // 3. 占比>10%的颜色判定为边框颜色
    
    return ['#000000', '#333333', '#CCCCCC'];
};
```

#### 网格模式检测

```typescript
// 原理：使用投影法检测规律间隔的线条
const detectGridPattern = (data, width, height) => {
    // 1. 水平投影：统计每行的暗像素数量
    // 2. 垂直投影：统计每列的暗像素数量
    // 3. 检测峰值位置，计算间距
    // 4. 检查间距一致性（CV < 0.3）
    
    return { isGrid: true, spacing: { h: 25, v: 25 } };
};
```

**投影示例**：
```
暗像素数量
  100% ┃                    █
   75% ┃                    █
   50% ┃  █  █  █  █  █  █  █  ← 规律的峰值 = 网格线
   25% ┃  █  █  █  █  █  █  █
    0% └─────────────────────→ 位置
       0  10  20  30  40  50
```

#### 直线检测

```typescript
// 原理：检测连续的暗色像素形成的直线
const detectStraightLines = (data, width, height) => {
    // 1. 扫描每一行/列
    // 2. 检测连续的暗色像素（brightness < 100）
    // 3. 长度 > 50% 图像尺寸的判定为直线
    
    return [
        { x1: 0, y1: 25, x2: 100, y2: 25, length: 100 }, // 水平线
        { x1: 25, y1: 0, x2: 25, y2: 100, length: 100 }  // 垂直线
    ];
};
```

---

### 2. 边框移除算法

#### 网格线移除

```typescript
// 原理：检测到网格位置后，填充网格线像素
const removeGridLines = (data, width, height, gridSpacing) => {
    // 对每条水平网格线
    for (let y = gridSpacing.h; y < height; y += gridSpacing.h) {
        // 考虑容差（±2像素）
        for (let dy = -2; dy <= 2; dy++) {
            // 找到暗色像素
            if (brightness < 150) {
                // 用邻近像素填充
                fillPixelFromNeighbors(data, width, height, x, y);
            }
        }
    }
};
```

**填充策略**：
1. **nearest** - 使用最近邻居的颜色
2. **dominant** - 使用周围出现最多的颜色
3. **average** - 使用周围颜色的平均值

#### 颜色相似度判断

```typescript
// 原理：判断两个颜色是否相似（允许一定误差）
const colorSimilar = (hex1, hex2, threshold) => {
    const diff = |r1-r2| + |g1-g2| + |b1-b2|;
    return diff <= threshold; // 默认 threshold=30
};
```

**示例**：
```typescript
colorSimilar('#000000', '#111111', 30)  // true  (diff=17)
colorSimilar('#000000', '#333333', 30)  // true  (diff=51)
colorSimilar('#000000', '#FFFFFF', 30)  // false (diff=765)
```

---

### 3. 改进的检测算法

#### 边框感知的边界检测

```typescript
// 在原有边界检测基础上，增加边框检测
const detectBeadRegionsWithBorder = (data, width, height, config) => {
    // 1. 先检测边框
    const borderResult = detectBorders(data, width, height);
    
    // 2. 创建边框掩码
    const borderMask = createBorderMask(data, width, height, {
        borderColors: Array.from(borderResult.borderColors)
    });
    
    // 3. 边界检测时跳过边框像素
    const regions = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (borderMask[y * width + x] === 1) {
                continue; // 跳过边框像素
            }
            // 正常检测逻辑...
        }
    }
    
    return regions;
};
```

#### 形态学操作

```typescript
// 原理：使用形态学操作去除细线
const morphologicalClean = (data, width, height) => {
    // 1. 腐蚀：去除细小噪声（包括边框线）
    const eroded = erode(data, width, height, { size: 2 });
    
    // 2. 膨胀：恢复豆子大小
    const dilated = dilate(eroded, width, height, { size: 2 });
    
    return dilated;
};
```

**效果示意**：
```
原始:    ████████  ← 边框线
腐蚀后:   ░░░░░░░░  ← 去除
膨胀后:   ████████  ← 恢复（豆子区域变大）
```

---

## 集成到 BlueprintEditor

### UI 配置选项

```typescript
// 边框处理配置
interface BorderRemovalSettings {
    enabled: boolean;
    method: 'preprocess' | 'ignore' | 'postprocess';
    autoDetect: boolean;  // 自动检测边框
    customColors: string[];  // 自定义边框颜色
    removeGrid: boolean;
    gridTolerance: number;
}
```

### 处理流程

```typescript
const processBlueprint = () => {
    // 1. 检测边框
    const borderResult = detectBorders(imageData, width, height);
    
    // 2. 根据配置选择处理方法
    if (borderSettings.enabled) {
        switch (borderSettings.method) {
            case 'preprocess':
                cleanData = removeBordersPreprocess(imageData, ...);
                break;
            case 'ignore':
                borderMask = createBorderMask(imageData, ...);
                break;
            case 'postprocess':
                // 正常检测
                regions = detectBeadRegions(...);
                // 后处理清理
                regions = postProcessBorders(regions, ...);
                break;
        }
    }
    
    // 3. 正常处理流程
    // ...
};
```

---

## 算法选择建议

| 场景 | 推荐策略 | 配置 |
|------|----------|------|
| 有明显黑色边框 | `preprocess` | `borderColors: ['#000000']` |
| 有细网格线 | `ignore` | `removeGridLines: true` |
| 有粗分隔线 | `preprocess` | `borderWidth: { min: 3, max: 10 }` |
| 不确定边框类型 | `postprocess` | `minRegionSize: 50` |
| 复杂图纸 | 混合策略 | 预处理 + 后处理 |

---

## 性能考虑

| 算法 | 时间复杂度 | 适用规模 |
|------|-----------|----------|
| 边缘颜色检测 | O(W + H) | 所有 |
| 网格检测 | O(W × H) | 中大型 |
| 直线检测 | O(W × H) | 所有 |
| 预处理去除 | O(W × H) | 小中型 |
| 后处理清理 | O(N) | 所有 |

W = 宽度, H = 高度, N = 检测到的区域数

---

## 常见问题及解决

### Q1: 边框和豆子颜色相近怎么办？
**A**: 使用形状特征而非颜色区分
- 边框通常细长（高宽比 > 5）
- 边框通常在图像边缘或豆子之间

### Q2: 填充后颜色不自然？
**A**: 改进填充策略
- 使用 `dominant` 策略而非 `average`
- 考虑空间连续性，优先填充为相邻豆子的颜色

### Q3: 网格检测不准确？
**A**: 调整容差参数
```typescript
const gridTolerance = 2; // 增加容差到 2-3 像素
const threshold = Math.max(...projection) * 0.25; // 降低峰值阈值
```

### Q4: 处理后丢失豆子？
**A**: 检查日志，调整参数
```typescript
console.log(`边框颜色: ${borderResult.borderColors}`);
console.log(`网格间距: ${borderResult.gridSpacing}`);
console.log(`检测到直线: ${lines.length}`);
```
