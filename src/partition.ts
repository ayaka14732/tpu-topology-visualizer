import { countChips, type Coordinates } from "./model";
export interface Partition {
  error?: string;
  axes: Record<string, number>;
  mode: string;
  active: string | null;
  values: Map<string, Record<string, number>>;
}
export const rainbow = [
  "#ff0000",
  "#ff8800",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#0088ff",
  "#0000ff",
  "#8800ff",
];
type Shape = [number, number];
function traversal([x, y]: Shape, ring: boolean): Shape[] {
  if (!ring)
    return Array.from({ length: x * y }, (_, i) => [Math.floor(i / y), i % y]);
  if (x === 1 && y === 1) return [[0, 0]];
  if (x % 2 && y % 2) throw Error("A ring requires an even dimension");
  if (x % 2) return traversal([y, x], true).map(([a, b]) => [b, a]);
  const result: Shape[] = Array.from({ length: x }, (_, i) => [i, 0]);
  for (let i = x - 1; i >= 0; i--)
    for (let j = 1; j < y; j++) result.push([i, i % 2 ? j : y - j]);
  return result;
}
function fit(size: number, remaining: Shape): Shape {
  const candidates: Shape[] = [];
  for (let x = 1; x <= size; x++)
    if (
      size % x === 0 &&
      remaining[0] % x === 0 &&
      remaining[1] % (size / x) === 0
    )
      candidates.push([x, size / x]);
  const score = ([x, y]: Shape) =>
    Math.abs(x - y) +
    (x !== 1 && y !== 1 && x % 2 && y % 2 ? 1000 : 0) +
    ((x > 2 && y < 2) || (y > 2 && x < 2) ? 100 : 0);
  candidates.sort((a, b) => score(a) - score(b));
  if (!candidates.length) throw Error("Invalid stacked partition");
  return candidates[0];
}
function parseAxes(raw: string | null): Record<string, number> {
  const axes: Record<string, number> = {};
  for (const item of raw?.split(",") || []) {
    const [key, value, extra] = item.split(":");
    const size = Number(value);
    if (
      !key ||
      extra !== undefined ||
      Object.hasOwn(axes, key) ||
      ["__proto__", "constructor", "prototype"].includes(key) ||
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > 8192
    )
      throw Error("Invalid axis");
    axes[key] = size;
  }
  return axes;
}
export function makePartition(
  t: Coordinates,
  params: URLSearchParams,
): Partition {
  let error: string | undefined;
  let axes = { data: t.x, model: t.y, seq: t.z } as Record<string, number>;
  let mode = params.get("partition_mode") || "split-axes";
  const values = new Map<string, Record<string, number>>();
  try {
    if (mode === "split-axes") {
      if (params.has("mesh_axes")) {
        const parsed = parseAxes(params.get("mesh_axes"));
        if (Object.values(parsed).reduce((a, b) => a * b, 1) !== countChips(t))
          throw Error("Invalid mesh");
        axes = parsed;
      }
    } else {
      if (t.z > 1)
        throw Error(
          "Stacked configurations are reset on 3D topologies by the reference app",
        );
      axes = parseAxes(params.get("stack_axes"));
      const sizes = Object.values(axes);
      const rings =
        mode === "grid-of-rings"
          ? [true, false]
          : mode === "ring-of-rings"
            ? [true, true]
            : mode === "ring-of-rings-of-rings"
              ? [true, true, true]
              : mode === "grid-of-grids-of-rings"
                ? [true, false, false]
                : [];
      if (
        sizes.length !== rings.length ||
        sizes.reduce((a, b) => a * b, 1) !== countChips(t)
      )
        throw Error("Invalid stack");
      let remaining: Shape = [t.x, t.y];
      const shapes = sizes.map((s, i) => {
        const shape = i === sizes.length - 1 ? remaining : fit(s, remaining);
        remaining = [remaining[0] / shape[0], remaining[1] / shape[1]];
        return shape;
      });
      function visit(level: number, offset: Shape): number[] {
        const shape = shapes[level];
        return traversal(shape, rings[level]).flatMap(([x, y]) => {
          const next: Shape = [
            offset[0] * shape[0] + x,
            offset[1] * shape[1] + y,
          ];
          return level === 0
            ? [next[0] * t.y + next[1]]
            : visit(level - 1, next);
        });
      }
      visit(shapes.length - 1, [0, 0]).forEach((device, index) => {
        let value = index;
        const logical: Record<string, number> = {};
        Object.entries(axes).forEach(([name, size]) => {
          logical[name] = value % size;
          value = Math.floor(value / size);
        });
        values.set(`${Math.floor(device / t.y)},${device % t.y},0`, logical);
      });
    }
  } catch {
    error = "Invalid partition";
    mode = "split-axes";
    axes = { data: t.x, model: t.y, seq: t.z };
    values.clear();
  }
  if (mode === "split-axes")
    for (let x = 0; x < t.x; x++)
      for (let y = 0; y < t.y; y++)
        for (let z = 0; z < t.z; z++) {
          let value = x * t.y * t.z + y * t.z + z;
          const logical: Record<string, number> = {};
          for (const [name, size] of Object.entries(axes).reverse()) {
            logical[name] = value % size;
            value = Math.floor(value / size);
          }
          values.set(`${x},${y},${z}`, logical);
        }
  const active = params.get("active_axis");
  return {
    error,
    axes,
    mode,
    values,
    active: active && Object.hasOwn(axes, active) ? active : null,
  };
}
