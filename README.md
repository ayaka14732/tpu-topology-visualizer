# TPU Topology Visualizer

使用 pnpm、TypeScript、React、Tailwind CSS 和 Three.js，复刻 [TPU Topology Visualizer](https://tpu-visualizer.uc.r.appspot.com/) 的公开网站。独立静态前端，字体和拓扑数据均在本地，无后端或原站运行时依赖。

## 启动

```sh
cd ~/tpu-topology-visualizer
pnpm install --frozen-lockfile
pnpm dev
```

打开 <http://localhost:5173/>。通过 VS Code Remote SSH 使用时转发 `5173` 端口即可。开发服务器监听 `0.0.0.0`；仅本机访问可运行 `pnpm dev --host 127.0.0.1`。

```sh
pnpm build        # TypeScript 严格检查 + 生产构建
pnpm preview      # 在 4173 端口预览 dist/
pnpm test         # 物理拓扑与逻辑分区测试
```

首次使用手动截图工具：`pnpm exec playwright install --with-deps chromium`。

## 工具链

2026-09-08 从 npm registry 的 `latest` 稳定标签核验并安装，实际依赖由 `pnpm-lock.yaml` 锁定：

| 工具              | 版本    |
| ----------------- | ------- |
| pnpm              | 12.3.4  |
| TypeScript        | 7.0.2   |
| React / React DOM | 19.2.8  |
| Tailwind CSS      | 4.3.3   |
| Vite              | 8.2.2   |
| Three.js          | 0.185.1 |
| Node.js（本机）   | 26.8.1  |

Vite 要求 Node.js `^20.19.0 || >=22.12.0`。本机 Node 和 pnpm 安装在 `~/.local/`，可直接在 shell 中使用。

## 已复刻的行为

- 5 个系列：TPU V4、v5e、v5p、v6e、TPU7x Ironwood，共 156 种拓扑，最多 8192 芯片。
- Mesh、Cylinder、Torus、Twisted Torus 的连接关系；Cartesian Grid、按可用物理轴展开的环形布局。
- 芯片与底座、主机、PCIe、三个方向的铜互连、OCS cube 间互连和环绕连线。
- 旋转、缩放、平移、自动旋转；手动操作停止自动旋转，切换拓扑重新启动。
- 芯片、主机、直线与曲线连接的点选、高亮、选择详情；空白处点击清除选择。
- 11 项显隐开关、轮廓线、Original / Pastel / Google / Greyscale 配色、自定义色值、色值校验、单项及整套重置、localStorage 持久化。
- 系统规格展开和折叠；切换系列时选择芯片数量和尺寸最接近的拓扑。
- 原站 URL 参数恢复，以及加载后清除 URL 查询字符串的行为。
- 小屏面板滚动与宽度适配、键盘可操作的表单、WebGL 不可用时的提示及重试。

默认值与原站一致：TPU v5p、`4x4x4`、Cartesian Grid、Google 配色、全显隐开启、轮廓线开启、自动旋转开启。

## URL 参数

```text
/?platform=ghostlite_pod&topo=16x16&layout=xy&theme=pastel&hide=host,pcie
/?platform=viperfish&topo=4x4x4&partition_mode=split-axes&mesh_axes=data:8,model:8&mapping=X:data,Y:model&active_axis=model
/?platform=viperlite_pod&topo=8x8&partition_mode=grid-of-rings&stack_axes=model:4,data:16&active_axis=model
```

`platform` 使用原站 ID：`pufferfish`、`viperlite_pod`、`viperfish`、`ghostlite_pod`、`ghostfish`。`topo` 与下拉框标签完全相同。`layout` 支持 `grid`、`xy`、`yx`、`yz`、`zy`、`zx`、`xz`、`x`、`y`、`z`，按所选拓扑约束可用选项。

`hide` 支持 `node`、`node-base`、`host`、`pcie`、`ici-x`、`ici-y`、`ici-z`、`ici-ocs`、`wrap-copper`、`wrap-ocs-x`、`wrap-ocs-y`、`wrap-ocs-z`。

分区支持 `split-axes`、`grid-of-rings`、`ring-of-rings`、`ring-of-rings-of-rings`、`grid-of-grids-of-rings`。`active_axis` 启用对应的芯片着色、数字标签和图例。与当前原站一致，3D 拓扑初始化时会将 stacked 配置恢复为默认 split-axes。无效分区安全回退至默认配置。

原站公开面板没有分区编辑器、路径上传或分享按钮，复刻保留其实际可见 UI。`mapping` 参数被兼容接收；与原站当前算法一致，split-axes 的坐标按 Z 最快的线性设备序号及逻辑轴大小计算。

## 源码

| 文件                    | 职责                                              |
| ----------------------- | ------------------------------------------------- |
| `src/App.tsx`           | React 状态、主面板、选择详情和图例                |
| `src/ColorSettings.tsx` | 配色面板和输入校验                                |
| `src/model.ts`          | 型号、拓扑连接、布局选项、URL 与本地设置          |
| `src/geometry.ts`       | 网格、圆柱和环面位置及曲线控制点                  |
| `src/partition.ts`      | 逻辑分区与设备坐标映射                            |
| `src/scene.ts`          | Three.js 实例化渲染、拾取、轮廓、GPU 资源生命周期 |
| `src/data/`             | 原站公开的型号拓扑和配色数据                      |
| `tests/`                | 拓扑与分区算法的 Vitest 测试                      |
| `docs/reference/`       | 原站与本地页面截图、布局尺寸测量                  |

场景使用 InstancedMesh、合并曲线几何和合并轮廓，避免每芯片独立 draw call。切换拓扑、React Strict Mode 重建和卸载时释放几何、材质、纹理、监听器和动画循环。

## 对照依据与差异

详见 [实现与验证记录](docs/verification.md)。这是可维护的 TypeScript / React 重写；没有嵌入原站页面、执行下载的原站 bundle，或调用原站私有接口。公开拓扑数值、配色和 favicon 来自原站的公开静态资源，来源记录见 [SOURCES.md](SOURCES.md)。

桌面使用 380px 宽的全高左侧栏，内容独立滚动，3D 场景占用右侧剩余空间。Three.js 的新版材质处理、曲线批次排序、抗锯齿及截图时旋转角度可能导致细微像素差异。移动端使用可折叠控制面板：竖屏为底部面板，横屏展开为侧栏。默认折叠，展开时为场景预留独立视口；表单触控区域、安全区和窄屏视角均做了适配。

## GitHub Pages 部署

公开仓库：<https://github.com/ayaka14732/tpu-topology-visualizer>

在线访问：<https://ayaka14732.github.io/tpu-topology-visualizer/>

推送到 `main` 或在 Actions 中手动运行 `Deploy to GitHub Pages`，会安装锁定依赖、运行拓扑算法测试、构建并通过官方 Pages artifact 部署。部署源为 GitHub Actions，无需 `gh-pages` 分支或额外密钥。

工作流使用 `.node-version` 和 `package.json` 中的 pnpm 版本；Actions 版本于 2026-09-08 按各项目最新稳定发布核验。Vite 根据 Pages 元数据的 `base_path` 设置资源前缀，本地开发默认保持 `/`。
