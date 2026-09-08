# 实现与验证记录

对照时间：2026-09-08。原站地址：<https://tpu-visualizer.uc.r.appspot.com/>。

## 页面范围

直接使用 Chromium 检查原站主页、配色设置、布局切换、URL 恢复及滚动面板。公开版本只有主面板和配色面板；部署资源中虽然存在其他逻辑，但未在当前公开 UI 中显示的上传、分区编辑等入口不另行添加。

原站 `ntk-data.json` 返回空对象，当前公开面板因此没有工艺、功耗、时钟等扩展规格。复刻显示相同的芯片数、主机数、尺寸和拓扑类型，不补造硬件数据。

## 视觉对照

`reference/layout-measurements.json` 记录 1440 × 1000 视口下两个页面的 DOM 实测位置。面板为 `(20, 20, 380, 900)`，标题为 `(41, 41, 235, 28)`；两组下拉框和四个布局单选框的实测边界完全一致。

| 原站                                                 | 本地                                              |
| ---------------------------------------------------- | ------------------------------------------------- |
| ![原站主页](reference/original-main.png)             | ![本地主页](reference/local-main.png)             |
| ![原站配色](reference/original-colors.png)           | ![本地配色](reference/local-colors.png)           |
| ![原站环面](reference/original-torus-zoomed-out.png) | ![本地环面](reference/local-torus-zoomed-out.png) |

截图并非逐像素同一动画帧。场景旋转角度、Three.js 版本的渲染细节和透明几何排序会产生差异；未宣称整页像素差为零。

重新生成参考：`node scripts/inspect-original.mjs`；本地截图：`node scripts/capture-local.mjs`；双站测量：`node scripts/compare.mjs`。这些脚本需开发服务器运行，参考截图脚本另外需要访问原站。

## 验证覆盖

- TypeScript 严格模式和 Vite 生产构建。
- 156 个公开拓扑的连线数量、端点范围、OCS 连接边界、twisted wrap 偏移和可用布局。
- 型号切换时匹配芯片数量；所有布局的几何位置均为有限数。
- split-axes 和四种 stacked 分区的映射、双射性、非法输入回退。
- Chromium 中的型号/拓扑切换、网格/圆柱布局切换、自动旋转停止、规格折叠。
- 色值输入验证、持久化、单项和整套重置、不同面板显隐状态同步。
- URL 中的型号、拓扑、布局、配色、隐藏类别和逻辑分区恢复。
- 真实 WebGL 射线拾取芯片、坐标详情显示、空白点击清除、高亮交互。
- 8192 芯片场景，以及最大场景后连续切换拓扑。
- 390 × 844 小屏控制面板和 WebGL 不可用的回退提示。

浏览器测试通过 Chromium 的 SwiftShader 执行真实 WebGL 渲染，不使用静态画布替身。正式浏览器使用设备可用的 WebGL 2 实现。

最终验证结果：14 项 Vitest 测试和 7 项 Chromium 端到端测试全部通过。生产预览另外在阻断所有外部请求的条件下验证了 WebGL 场景、配色与型号切换，未发生外部请求或页面异常。可在 `pnpm build && pnpm preview` 后运行 `node scripts/smoke-production.mjs` 重现。
