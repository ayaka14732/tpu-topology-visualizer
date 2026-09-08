# TPU Topology Visualizer

Live demo: <https://ayaka14732.github.io/tpu-topology-visualizer/>

This project is a reimplementation of TPU Topology Visualizer (<https://tpu-visualizer.uc.r.appspot.com/>).

## Features

**Models and Topologies**
- 5 series: TPU V4, v5e, v5p, v6e, and TPU7x Ironwood, covering 156 topologies with up to 8192 chips.
- Connection types for Mesh, Cylinder, Torus, and Twisted Torus; Cartesian Grid layout and ring layouts expanded by available physical axes.
- Chips with their bases, hosts, PCIe, copper interconnects along three directions, OCS cube-to-cube interconnects, and wraparound links.
- When switching series, the topology with the closest chip count and dimensions is selected automatically.

**Interaction**
- Rotate, zoom, pan, and auto-rotate; manual operation stops auto-rotation, which resumes after switching topologies.
- Click selection, highlighting, and a details panel for chips, hosts, and both straight and curved connections; clicking empty space clears the selection.
- Keyboard-operable forms, plus expand/collapse controls for system specifications.

**Display and Color**
- 11 visibility toggles, plus an outline toggle.
- Four color schemes (Original, Pastel, Google, Greyscale) with support for custom color values, value validation, per-item reset, and full reset.
- Color settings persist via localStorage.

**Partitioning and Sharing**
- The logical partition editor supports five modes, logical axis sizes, per-axis coloring, and reset; invalid input triggers a warning and blocks the change.
- The share configuration section lets you copy a link to the current configuration directly; a brief "link copied" toast appears on success, and if the clipboard is unavailable, you're prompted to grant access and retry.

## URL Parameters

Links can carry the full state, making it easy to share a specific topology configuration directly:

```text
/?platform=ghostlite_pod&topo=16x16&layout=xy&theme=pastel&hide=host,pcie
/?platform=viperfish&topo=4x4x4&partition_mode=split-axes&mesh_axes=data:8,model:8&mapping=X:data,Y:model&active_axis=model
/?platform=viperlite_pod&topo=8x8&partition_mode=grid-of-rings&stack_axes=model:4,data:16&active_axis=model
```

| Parameter | Description |
| -- | -- |
| `platform` | ID from the original site: `pufferfish`, `viperlite_pod`, `viperfish`, `ghostlite_pod`, `ghostfish`. |
| `topo` | Must match the dropdown label exactly. |
| `layout` | `grid`, `xy`, `yx`, `yz`, `zy`, `zx`, `xz`, `x`, `y`, `z`, constrained by which options are available for the selected topology. |
| `hide` | `node`, `node-base`, `host`, `pcie`, `ici-x`, `ici-y`, `ici-z`, `ici-ocs`, `wrap-copper`, `wrap-ocs-x`, `wrap-ocs-y`, `wrap-ocs-z`. |
| `partition_mode` | `split-axes`, `grid-of-rings`, `ring-of-rings`, `ring-of-rings-of-rings`, `grid-of-grids-of-rings`. |
| `mesh_axes` / `stack_axes` | Logical axes for split-axes / stacked modes, formatted as `data:8,model:8`; the product of the sizes must equal the chip count. |
| `theme` / `color_<key>` | Color scheme and custom `#RRGGBB` values. |
| `outlines` | `0` hides outlines, `1` shows them. |
| `active_axis` | Enables chip coloring, numeric labels, and a legend for the corresponding axis. |
| `mapping` | Accepted for compatibility; in split-axes mode, coordinates are computed from a linear device index with Z varying fastest and the given logical axis sizes, matching the original site's current algorithm. |

Behavior matches the original site: on initialization, 3D topologies restore stacked configurations to the default split-axes mode, and invalid partition parameters safely fall back to the default configuration.

## Local Development

```sh
git clone https://github.com/ayaka14732/tpu-topology-visualizer.git
cd tpu-topology-visualizer
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:5173/>.

```sh
pnpm build        # TypeScript strict checks + production build
pnpm preview      # Preview dist/ on port 4173
pnpm test         # Tests for physical topology and logical partitioning
```

Before using the manual screenshot tool for the first time, install the browser dependencies:

```sh
pnpm exec playwright install --with-deps chromium
```

## Project Structure

| File | Responsibility |
| -- | -- |
| `src/App.tsx` | React state, main panel, selection details, and legend |
| `src/ColorSettings.tsx` | Color panel and input validation |
| `src/model.ts` | Models, topology connections, layout options, URL and local settings |
| `src/geometry.ts` | Grid, cylinder, and torus positions, plus curve control points |
| `src/partition.ts` | Logical partitioning and device coordinate mapping |
| `src/scene.ts` | Three.js instanced rendering, picking, outlines, and GPU resource lifecycle |
| `src/data/` | Publicly available model topology and color data from the original site |
| `tests/` | Vitest tests for topology and partitioning algorithms |
| `docs/reference/` | Screenshots and layout dimension measurements from the original site and this local page |

The scene uses InstancedMesh, merged curve geometry, and merged outlines to avoid a separate draw call per chip. Geometries, materials, textures, listeners, and animation loops are released when switching topologies, on React Strict Mode remounts, and on unmount.

## SEO

`public/social-preview.png` is an actual 1200x630 screenshot of the interface.

## Reference Basis and Differences

This is a maintainable TypeScript / React rewrite. It does **not** embed the original site's page, execute downloaded bundles from the original site, or call the original site's private APIs. Public topology values and color data come from the original site's public static resources; sourcing is documented in [SOURCES.md](SOURCES.md).

Differences in Three.js's newer material handling, curve batch ordering, anti-aliasing, and rotation angles during screenshots may cause minor pixel-level discrepancies. The full implementation and verification record is in [docs/verification.md](docs/verification.md).

## License

The original code and documentation in this project are licensed under the [MIT License](LICENSE). Topology data, color schemes, and screenshots from the original site are not covered by the MIT license granted here; fonts and other dependencies retain their own licenses. Third-party asset details are in [SOURCES.md](SOURCES.md).
