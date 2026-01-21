# 拼豆图纸生成器

一个将任意图片转为拼豆图纸的网页应用，支持选择板子尺寸、色卡（Perler/Hama）、抖动、颜色统计与导出。

## 功能特性

- **图片上传与裁剪** - 支持拖拽上传，内置图片裁剪功能
- **多品牌色卡支持** - Perler、Hama、Artkal、MARD、Nabbi 及国产品牌（COCO、漫漫、盼盼、咪小窝）
- **智能图像处理**
  - 三种颜色匹配算法（加权RGB、欧几里得、CIELAB）
  - Floyd-Steinberg 抖动算法，可调节强度
  - 杂色过滤功能
  - 颜色合并功能
- **实时预览** - 画布支持缩放和拖动，实时查看处理效果
- **色号统计** - 自动统计各色号使用数量和占比
- **图纸导出** - 导出 PDF 格式图纸，包含颜色列表和图案预览
- **网格控制** - 可隐藏/显示网格、色号标签，支持忽略白色/黑色

## 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite
- **UI 组件**: shadcn/ui + Tailwind CSS 4.x
- **路由**: Wouter
- **图像处理**: Canvas API
- **PDF 导出**: jsPDF

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint

# 预览构建产物
npm run preview
```

## 项目结构

```
├── src/
│   ├── components/      # UI 组件
│   │   ├── Editor/      # 编辑器专用组件
│   │   └── ui/          # shadcn/ui 组件
│   ├── lib/             # 核心业务逻辑
│   │   ├── colors.ts           # 色卡管理
│   │   ├── image-processing.ts # 图像处理算法
│   │   └── pdf-generator.ts    # PDF 导出
│   ├── pages/           # 页面组件
│   └── contexts/        # React Context
├── scripts/             # 构建脚本
└── public/              # 静态资源
```

## 部署

项目支持 Docker 部署，详见 [DOCKER_GUIDE.md](./DOCKER_GUIDE.md)。

```bash
# 构建镜像
docker build -t bead-pattern-generator .

# 运行容器
docker run -p 8080:80 bead-pattern-generator
```

## 开源协议

MIT
