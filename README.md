# 布偶小铺 · Plush Little Shop

一个使用 Three.js + Vite 制作的浏览器 3D 布偶制作与修复店。工作台、织物、纸样、裁剪、对齐缝合、填充、封口、装饰、检查、照片、收藏、委托与存档都在同一件作品数据上运行。

## 本地启动

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:5197/`。生产检查使用 `npm test`、`npm run build`；浏览器验收使用已安装的 Chrome 与 Playwright：`npm run dev` 后另开终端运行 `npm run test:browser`。

## 已实现

- 参数化圆耳小熊、工作台木纹、布料纹理、接缝线、可旋转正/侧/背/近景镜头。
- 棉布、短绒、亚麻格纹三种材质；8 组独立裁片；裁剪与缝合均由拖动路径累积进度。
- 填充量改变身体深度和按压回弹；封口、表情、蝴蝶结/布贴/心形/小花附着。
- 自由制作和两份制作委托（两份制作 + 一份旧物修复）；真实条件检查、收支、库存、重复交付保护。
- 修复阿栗的具体右侧开线和填充不足，保留蓝耳、纽扣眼与旧心形补丁。
- 撤销、JSON 下载、刷新恢复、照片下载、收藏柜和移动端布局。

## 视觉和性能

所有运行时美术使用程序化 3D 几何、Canvas 织物/木纹贴图、SVG 图标和标准材质，避免外部资源阻断加载。默认使用阴影、环境光、接触阴影和织物 bump；设置中可切换流畅与精细画质。

验收摘要见 [docs/verification.md](docs/verification.md)。本地原始记录写入 `artifacts/playthrough-report.json`，包含设备视口、错误、FPS、绘制调用和截图路径。

## 发布

源码发布到独立 GitHub 仓库，GitHub Actions 使用 `npm ci`、规则测试和 Vite 构建部署 GitHub Pages。资产使用相对路径，支持仓库子路径。`tests/deploy.mjs` 复用本机 Git Credential Manager 认证，凭据只留在内存，不写入仓库或日志。
