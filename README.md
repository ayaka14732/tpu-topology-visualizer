# TPU Topology Visualizer

在线体验：<https://ayaka14732.github.io/tpu-topology-visualizer/>

本项目是 TPU Topology Visualizer (<https://tpu-visualizer.uc.r.appspot.com/>) 的复刻。

## 功能特性

**型号与拓扑**
- 5 个系列：TPU V4、v5e、v5p、v6e、TPU7x Ironwood，共 156 种拓扑，最多 8192 芯片。
- Mesh、Cylinder、Torus、Twisted Torus 的连接关系；Cartesian Grid、按可用物理轴展开的环形布局。
- 芯片与底座、主机、PCIe、三个方向的铜互连、OCS cube 间互连和环绕连线。
- 切换系列时自动选择芯片数量和尺寸最接近的拓扑。

**交互**
- 旋转、缩放、平移、自动旋转；手动操作会停止自动旋转，切换拓扑后重新启动。
- 芯片、主机、直线与曲线连接的点选、高亮与选择详情面板；点击空白处清除选择。
- 键盘可操作的表单，以及系统规格的展开 / 折叠。

**显示与配色**
- 11 项显隐开关、轮廓线开关。
- Original / Pastel / Google / Greyscale 四套配色，支持自定义色值、色值校验、单项及整套重置。
- 配色通过 localStorage 持久化；点击复制链接时，将当前拓扑、布局、分区、配色、显隐和轮廓设置写入分享 URL，不修改当前页面地址。

**分区与分享**
- 逻辑分区编辑器支持五种模式、逻辑轴大小、按轴着色与重置；无效输入会提示并阻止应用。
- 分享配置一栏可直接复制当前配置链接；按钮文字保持不变，成功后弹出短暂的“链接已复制”轻提示，剪贴板不可用时提示允许访问后重试。

## URL 参数

链接可以携带完整状态，方便直接分享某个具体的拓扑配置：

```text
/?platform=ghostlite_pod&topo=16x16&layout=xy&theme=pastel&hide=host,pcie
/?platform=viperfish&topo=4x4x4&partition_mode=split-axes&mesh_axes=data:8,model:8&mapping=X:data,Y:model&active_axis=model
/?platform=viperlite_pod&topo=8x8&partition_mode=grid-of-rings&stack_axes=model:4,data:16&active_axis=model
```

| 参数 | 说明 |
| -- | -- |
| `platform` | 原站 ID：`pufferfish`、`viperlite_pod`、`viperfish`、`ghostlite_pod`、`ghostfish`。 |
| `topo` | 与下拉框标签完全相同。 |
| `layout` | `grid`、`xy`、`yx`、`yz`、`zy`、`zx`、`xz`、`x`、`y`、`z`，按所选拓扑约束可用选项。 |
| `hide` | `node`、`node-base`、`host`、`pcie`、`ici-x`、`ici-y`、`ici-z`、`ici-ocs`、`wrap-copper`、`wrap-ocs-x`、`wrap-ocs-y`、`wrap-ocs-z`。 |
| `partition_mode` | `split-axes`、`grid-of-rings`、`ring-of-rings`、`ring-of-rings-of-rings`、`grid-of-grids-of-rings`。 |
| `mesh_axes` / `stack_axes` | split-axes / stacked 模式的逻辑轴，格式为 `data:8,model:8`；大小乘积须等于芯片数。 |
| `theme` / `color_<key>` | 配色方案及自定义 `#RRGGBB` 色值。 |
| `outlines` | `0` 隐藏轮廓，`1` 显示。 |
| `active_axis` | 启用对应的芯片着色、数字标签和图例。 |
| `mapping` | 兼容接收；split-axes 的坐标按 Z 最快的线性设备序号及逻辑轴大小计算，与原站当前算法一致。 |

与原站行为一致：3D 拓扑初始化时会将 stacked 配置恢复为默认 split-axes；无效分区参数会安全回退至默认配置。

本复刻在原站公开 UI 基础上增加了分区编辑器和分享按钮，使已有 URL 功能可直接操作。路径上传尚未实现。

## 本地开发

```sh
git clone https://github.com/ayaka14732/tpu-topology-visualizer.git
cd tpu-topology-visualizer
pnpm install --frozen-lockfile
pnpm dev
```

打开 <http://localhost:5173/>。

```sh
pnpm build        # TypeScript 严格检查 + 生产构建
pnpm preview      # 在 4173 端口预览 dist/
pnpm test         # 物理拓扑与逻辑分区测试
```

首次使用手动截图工具需安装浏览器依赖：

```sh
pnpm exec playwright install --with-deps chromium
```

## 项目结构

| 文件 | 职责 |
| -- | -- |
| `src/App.tsx` | React 状态、主面板、选择详情和图例 |
| `src/ColorSettings.tsx` | 配色面板和输入校验 |
| `src/model.ts` | 型号、拓扑连接、布局选项、URL 与本地设置 |
| `src/geometry.ts` | 网格、圆柱和环面位置及曲线控制点 |
| `src/partition.ts` | 逻辑分区与设备坐标映射 |
| `src/scene.ts` | Three.js 实例化渲染、拾取、轮廓、GPU 资源生命周期 |
| `src/data/` | 原站公开的型号拓扑和配色数据 |
| `tests/` | 拓扑与分区算法的 Vitest 测试 |
| `docs/reference/` | 原站与本地页面截图、布局尺寸测量 |

场景使用 InstancedMesh、合并曲线几何和合并轮廓，避免每芯片独立 draw call。切换拓扑、React Strict Mode 重建和卸载时会释放几何、材质、纹理、监听器和动画循环。

## SEO

`public/social-preview.png` 是 1200×630 的实际界面截图。

## 对照依据与差异

这是一次可维护的 TypeScript / React 重写：**没有**嵌入原站页面、执行下载的原站 bundle，或调用原站私有接口。公开拓扑数值、配色和 favicon 来自原站的公开静态资源，来源记录见 [SOURCES.md](SOURCES.md)。

Three.js 的新版材质处理、曲线批次排序、抗锯齿以及截图时的旋转角度可能导致细微像素差异。完整的实现与验证记录见 [docs/verification.md](docs/verification.md)。
