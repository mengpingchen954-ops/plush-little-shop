# 实际验收记录

日期：2026-10-21（中国时间）。

- 浏览器：Chrome 155.0.8059.85，Playwright 控制的真实鼠标输入，无登录 Cookie。
- 设备：Intel(R) Core(TM) Ultra 7 265KF，32 GiB RAM，Windows；GPU 为 NVIDIA GeForce RTX 3060（ANGLE D3D11）。
- 视口：1440×960、1366×768 与 390×844；手机版为桌面浏览器模拟，尚未在真实手机实测。
- 完整流程：132 项通过，控制台和运行错误 0。两份委托、一份修复、第三种完整成品均由实际鼠标裁剪／对齐／缝合／封口完成，测试未直接修改作品数据。
- 额外异常检查：6 项通过，含库存购买、取消、quota 保存失败提示、坏 JSON 导入拒绝和反复工具切换。
- 性能：初始约 55 FPS；最后约 60 FPS，帧耗时中位数 16.7 ms，P95 16.8 ms；238 次 draw call、203370 三角形。此性能仅代表当前设备。
- 下载照片来自 renderer 真实画面；存档 export/import 与刷新恢复保持完整资金、订单、库存、作品工艺和外观数据。

## 已知边界

- 参数化几何和受控形变，未实现完整布料物理、自由制版、逐根毛发或任意动物生成。
- 正反裁片用成对纸样共同裁剪，吸附帮助固定路径；封口与修复操作区以放大的局部工具板呈现。
- 三种布料用程序化织纹、bump 和 sheen 区分；没有调用 imagegen，当前会话无可调用图像生成工具。
- 无云存档、后端、账号系统；存档依赖浏览器 localStorage，清理浏览器数据会丢失，建议下载 JSON 备份。
- 首版仅两份制作与一份修复委托，自由制作可继续；没有复杂经营、清洗、任意破洞或换肢。

本地原始 JSON、截图及照片在 artifacts/，均由 .gitignore 排除，不上传玩家存档与测试产物。

## 公开发布验收

- 网页：https://mengpingchen954-ops.github.io/plush-little-shop/
- 源码：https://github.com/mengpingchen954-ops/plush-little-shop
- GitHub Actions Pages 部署成功；独立仓库，不涉及其他工作区内容。
- 匿名 Chrome 实际重跑 132 项完整流程检查，错误 0；三种完整成品、两份制作和一份修复全部完成。
- 公共 HTML、CSS 和 JavaScript 均返回 200，资产均位于仓库子路径。无登录 Cookie。
- 额外验证成品正/侧/背面、按压模型形变与回弹、1024px 视口。
- 源码排除了 artifacts/、node_modules/、dist/、本地存档与凭据；运行时无外部资产请求。
