# 图纸生成页 / 图纸识别页业务与架构分析

## 1. 结论摘要

当前项目里有两条核心业务链路：

1. `图纸生成页（Editor）`
2. `图纸识别页（BlueprintEditor）`

它们共享“拼豆图纸编辑器”的一部分能力，但不属于同一个业务问题。

- 图纸生成页：输入普通图片，输出适合制作的拼豆图纸
- 图纸识别页：输入已有图纸图片，输出尽量忠实还原的结构化图纸

因此，后续重构应遵循：

1. 共用编辑器能力，不共用处理心智
2. 生成页走“参数驱动”
3. 识别页走“流程驱动”

---

## 2. 业务需求拆解

### 2.1 图纸生成页

#### 业务目标

用户上传任意图片，通过调色板、网格尺寸、抖动和后处理规则，快速生成可制作、可导出的拼豆图纸。

#### 用户核心诉求

1. 生成结果要好看
2. 颜色数量要可控
3. 能快速试错和调参
4. 能导出制作清单

#### 业务特征

1. 输入不结构化：任意图片
2. 输出是“优化后的制作图纸”，不是对原图忠实还原
3. 用户接受算法主动美化

#### 当前功能对应

- 上传与裁剪
- 网格尺寸控制
- 色卡与品牌选择
- 抖动开关与强度
- 忽略白色/黑色
- 杂色过滤
- 颜色合并
- 编辑修正
- 色号统计
- 导出 PDF / PNG

#### 业务上合理的处理策略

`原图 -> 缩放采样 -> 色卡量化 -> 结果优化 -> 用户修正 -> 导出`

---

### 2.2 图纸识别页

#### 业务目标

用户上传已有图纸图片，系统识别其中的网格、颜色和结构，恢复成可编辑、可导出的拼豆数据。

#### 用户核心诉求

1. 识别要准
2. 能区分主图和干扰区域
3. 能在识别失败时定位原因
4. 能在识别后快速修正

#### 业务特征

1. 输入是“已有图纸”，不是普通图片
2. 输出是“结构化恢复结果”，强调还原正确
3. 后处理只能谨慎修正，不能随意美化

#### 当前功能对应

- 上传与裁剪
- 网格识别 / 边界识别
- 颜色采样与色卡匹配
- 杂色过滤
- 颜色合并
- 手工编辑
- 导出 PDF / PNG

#### 业务上合理的处理策略

`图纸图片 -> 页面分析 -> 主图区提取 -> 网格恢复 -> cell 颜色采样 -> 颜色匹配 -> 谨慎后处理 -> 用户修正 -> 导出`

---

## 3. 两个页面的核心差异

| 维度 | 图纸生成页 | 图纸识别页 |
|------|-----------|------------|
| 输入 | 普通图片 | 已有图纸图片 |
| 核心任务 | 生成制作图纸 | 恢复结构化图纸 |
| 目标 | 好看、可做、颜色可控 | 准确、可修正、可追踪 |
| 算法立场 | 允许主动美化 | 尽量忠实还原 |
| 页面模式 | 参数调优型 | 识别流程型 |
| 结果变化 | 参数变化即自动重算 | 需要分阶段重跑 |

这意味着一些同名功能在两个页面里的业务含义并不相同：

- `颜色合并`
  - 生成页：优化
  - 识别页：可能造成信息损失

- `杂色过滤`
  - 生成页：减少无意义颜色
  - 识别页：可能误删有效小面积标记色

- `抖动`
  - 生成页：合理
  - 识别页：不应存在

---

## 4. 当前代码结构判断

### 4.1 图纸生成页代码特点

当前主文件：[src/pages/Editor.tsx](/e:/project/bead-pattern-generator/src/pages/Editor.tsx)

优点：

1. 业务目标单一
2. 参数变化与结果变化一致
3. `processedData` 作为统一结果载体，逻辑清晰

问题：

1. 页面过胖，处理逻辑、导出逻辑、编辑逻辑都在一个文件里
2. `applyNoiseFilter` / `applyColorMerge` 等业务逻辑写在页面内部
3. 编辑链路和生成链路耦合较高

### 4.2 图纸识别页代码特点

当前主文件：[src/pages/BlueprintEditor.tsx](/e:/project/bead-pattern-generator/src/pages/BlueprintEditor.tsx)

优点：

1. 已开始向“分阶段识别”演进
2. 已引入原始识别结果和后处理结果的分离
3. 已有调试可视化基础

问题：

1. 页面仍然过胖
2. 识别状态、后处理状态、编辑状态仍部分混合
3. 缺少“流程状态”的明确表达
4. 页面 UI 仍然把识别参数和修正参数放得过近

---

## 5. 建议的前端模块边界

### 5.1 共享模块

这些能力应该共享：

1. `图纸编辑画布`
2. `颜色选择器`
3. `色号统计`
4. `导出 PNG / PDF`
5. `编辑历史`
6. `颜色显示控制`

建议抽象为：

```ts
src/features/pattern-editor/
  canvas/
  export/
  history/
  color-controls/
  stats/
```

### 5.2 生成页专属模块

建议抽象为：

```ts
src/features/pattern-generation/
  state/
  processing/
  palette-selection/
  postprocess/
```

职责：

1. 普通图片转 bead grid
2. 抖动与量化
3. 颜色优化
4. 结果重算

### 5.3 识别页专属模块

建议抽象为：

```ts
src/features/blueprint-recognition/
  page-analysis/
  content-region/
  grid-detection/
  cell-sampling/
  recognition-debug/
  postprocess/
```

职责：

1. 页面结构分析
2. 主图区定位
3. 网格恢复
4. cell 级颜色采样
5. 识别结果诊断
6. 识别后谨慎修正

---

## 6. 两个页面建议的状态模型

### 6.1 生成页状态模型

建议维持“参数驱动”：

```ts
sourceImage
generationParams
processedPattern
editorState
exportState
```

特点：

1. 参数变化自动触发重算
2. 不需要复杂流程状态

### 6.2 识别页状态模型

建议改为“流程驱动”：

```ts
sourceImage
pageAnalysisResult
rawRecognitionResult
postProcessedResult
editorState
debugState
exportState
```

特点：

1. 页面分析、识别、后处理、编辑是分阶段结果
2. 每阶段都应可重跑、可观察

---

## 7. 两个页面各自的产品交互建议

### 7.1 图纸生成页

页面应强调“调参生成”：

1. 上传图片
2. 裁剪
3. 调网格和色卡
4. 调优化参数
5. 查看统计
6. 编辑微调
7. 导出

建议继续保持实时重算，不需要强行引入“重新生成”按钮。

### 7.2 图纸识别页

页面应强调“识别工作流”：

1. 上传图纸
2. 裁剪
3. 页面识别
4. 网格恢复
5. 颜色识别
6. 识别预览
7. 后处理修正
8. 手工修正
9. 导出

建议 UI 分区：

1. `识别设置`
2. `识别结果预览`
3. `后处理设置`
4. `编辑工具`

不要继续把所有控制项都放成一长列。

---

## 8. 重构优先级建议

### P0

1. 明确两个页面的业务定位
2. 保持识别页“重新识别”和“后处理”严格分离
3. 停止在识别页引入任何偏生成场景的策略

### P1

1. 抽出共享编辑器能力
2. 将导出逻辑从两个页面中进一步下沉
3. 将颜色统计和颜色显示控制组件化

### P2

1. 将生成页处理逻辑移出页面文件
2. 将识别页流程状态拆出页面文件
3. 为识别页建立独立的诊断数据结构

### P3

1. 为识别页加入页面类型识别
2. 对“纯图纸 / 说明书图 / 拍照图”建立不同分支策略
3. 引入图例区识别与校验

---

## 9. 具体实施建议

### 第一阶段

目标：先稳定业务边界

1. 保持生成页继续围绕 `processedData`
2. 识别页围绕 `rawRecognitionResult` / `postProcessedResult`
3. 将识别页侧边栏拆成“识别”和“后处理”两个分区

### 第二阶段

目标：开始工程拆分

1. 从 [src/pages/Editor.tsx](/e:/project/bead-pattern-generator/src/pages/Editor.tsx) 中抽出：
   - `generation-postprocess.ts`
   - `generation-state.ts`

2. 从 [src/pages/BlueprintEditor.tsx](/e:/project/bead-pattern-generator/src/pages/BlueprintEditor.tsx) 中抽出：
   - `recognition-workflow.ts`
   - `recognition-debug.ts`
   - `recognition-postprocess.ts`

### 第三阶段

目标：建立统一编辑器能力层

1. 抽 `PatternCanvas`
2. 抽 `PatternExport`
3. 抽 `PatternHistory`
4. 抽 `PatternStats`

---

## 10. 推荐的最终目录方向

```ts
src/
  features/
    pattern-editor/
      canvas/
      export/
      history/
      stats/
      color-selector/
    pattern-generation/
      processing/
      postprocess/
      hooks/
      state/
    blueprint-recognition/
      page-analysis/
      content-region/
      grid-detection/
      sampling/
      postprocess/
      debug/
      hooks/
  pages/
    Editor.tsx
    BlueprintEditor.tsx
```

页面文件只负责：

1. 路由级组装
2. 面板布局
3. 工作流切换

不要继续承担全部业务实现。

---

## 11. 最终建议

最重要的不是先继续堆算法，而是先把产品心智和代码心智对齐：

1. 图纸生成页是“创作工具”
2. 图纸识别页是“恢复工具”

只要这两个页面还用同一种组织方式，后面无论继续加功能还是优化算法，都会越来越难维护。
