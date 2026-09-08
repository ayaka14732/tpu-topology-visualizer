import { describe, expect, it } from "vitest";
import {
  readInitialState,
  stateParams,
  closestTopology,
  countChips,
  families,
  layouts,
  topologyEdges,
  type Topology,
} from "../src/model";
import { nodePosition } from "../src/geometry";
import { makePartition } from "../src/partition";
describe("physical topology", () => {
  it("all 156 published topologies have in-bounds neighbors and expected directional link counts", () => {
    expect(families.flatMap((f) => f.topologies)).toHaveLength(156);
    for (const f of families)
      for (const t of f.topologies) {
        const torus = t.type === "torus" || t.type === "twisted_torus";
        const expected =
          (t.x - 1) * t.y * t.z +
          t.x * (t.y - 1) * t.z +
          t.x * t.y * (t.z - 1) +
          (torus && t.x > 1 ? t.y * t.z : 0) +
          ((torus || t.type === "cylinder") && t.y > 1 ? t.x * t.z : 0) +
          (torus && t.z > 1 ? t.x * t.y : 0);
        const edges = topologyEdges(f, t);
        expect(edges.length).toBe(expected);
        for (const e of edges)
          for (const axis of ["x", "y", "z"] as const) {
            if (e.to[axis] < 0 || e.to[axis] >= t[axis])
              throw Error(`Out-of-range ${f.id} ${t.label}`);
          }
      }
  });
  it("twists both X and Y wrap destinations by half Z", () => {
    const f = families[2],
      t = f.topologies.find((t) => t.label === "4x4x8_twisted")!;
    const wraps = topologyEdges(f, t).filter((e) => e.wrap);
    expect(
      wraps
        .filter((e) => e.axis !== "z")
        .every((e) => e.to.z === (e.from.z + 4) % 8),
    ).toBe(true);
    expect(wraps.every((e) => e.optical)).toBe(true);
  });
  it("uses OCS only across 4-chip cube boundaries", () => {
    const f = families[2],
      t = f.topologies.find((t) => t.label === "4x8x8")!;
    expect(
      topologyEdges(f, t).filter((e) => e.optical && !e.wrap),
    ).toHaveLength(64);
    const mesh = f.topologies.find((t) => t.label === "2x4x4")!;
    expect(topologyEdges(f, mesh).some((e) => e.optical)).toBe(false);
  });
  it("preserves chip count when switching compatible platforms", () => {
    const t = families[2].topologies[6];
    expect(
      countChips(families[3].topologies[closestTopology(t, families[3])]),
    ).toBe(64);
  });
  it("offers only valid wrapping layouts", () => {
    const f = families[1];
    expect(layouts(f.topologies[0])).toEqual([["grid", "Cartesian Grid"]]);
    expect(layouts(f.topologies[6]).map(([id]) => id)).toEqual(["grid", "y"]);
    expect(layouts(f.topologies[7]).map(([id]) => id)).toEqual([
      "grid",
      "xy",
      "yx",
    ]);
  });
  it("produces finite geometric positions for every offered layout", () => {
    for (const f of families)
      for (const t of f.topologies)
        for (const [layout] of layouts(t))
          for (const c of [
            { x: 0, y: 0, z: 0 },
            { x: t.x - 1, y: t.y - 1, z: t.z - 1 },
          ])
            expect(
              nodePosition(c, t, layout).toArray().every(Number.isFinite),
            ).toBe(true);
  });
});
describe("URL partition compatibility", () => {
  const t = { x: 4, y: 4, z: 4 };
  it("uses Z-fastest logical coordinates", () => {
    const p = makePartition(t, new URLSearchParams());
    expect(p.values.get("1,2,3")).toEqual({ data: 1, model: 2, seq: 3 });
  });
  it("restores a custom mesh and active axis", () => {
    const p = makePartition(
      t,
      new URLSearchParams(
        "partition_mode=split-axes&mesh_axes=data:8,model:8&mapping=X:data,Y:model&active_axis=model",
      ),
    );
    expect(p.active).toBe("model");
    expect(p.values.get("1,2,3")).toEqual({ data: 3, model: 3 });
  });
  it.each([
    "grid-of-rings",
    "ring-of-rings",
    "ring-of-rings-of-rings",
    "grid-of-grids-of-rings",
  ])("creates a bijective %s partition", (mode) => {
    const axes =
      mode.endsWith("of-rings-of-rings") || mode === "grid-of-grids-of-rings"
        ? "model:4,stage:4,data:4"
        : "model:4,data:16";
    const p = makePartition(
      { x: 8, y: 8, z: 1 },
      new URLSearchParams(
        `partition_mode=${mode}&stack_axes=${axes}&active_axis=model`,
      ),
    );
    expect(p.mode).toBe(mode);
    expect(p.values.size).toBe(64);
    expect(
      new Set([...p.values.values()].map((x) => JSON.stringify(x))).size,
    ).toBe(64);
  });
  it("rejects malformed and non-factorable configurations", () => {
    for (const q of [
      "mesh_axes=a:0",
      "mesh_axes=a:NaN",
      "mesh_axes=a:65",
      "partition_mode=grid-of-rings&stack_axes=a:7,b:9",
    ])
      expect(makePartition(t, new URLSearchParams(q)).axes).toEqual({
        data: 4,
        model: 4,
        seq: 4,
      });
  });
  it("resets stacked partitions on 3D as the original does", () => {
    expect(
      makePartition(
        t as Topology,
        new URLSearchParams("partition_mode=grid-of-rings&stack_axes=a:4,b:16"),
      ).mode,
    ).toBe("split-axes");
  });
});

describe("configuration sharing", () => {
  it("round-trips topology, partition and visual overrides independently of local colors", () => {
    const state = readInitialState(
      "?platform=viperlite_pod&topo=8x8&layout=xy&theme=pastel&hide=host,pcie&outlines=0&partition_mode=grid-of-rings&stack_axes=model:4,data:16&active_axis=model",
    );
    state.colors.node = "#123456";
    const topology =
      families[state.familyIndex].topologies[state.topologyIndex];
    const partition = makePartition(topology, state.params);
    const restored = readInitialState(stateParams(state, partition).toString());
    expect(restored).toMatchObject({
      familyIndex: state.familyIndex,
      topologyIndex: state.topologyIndex,
      layout: state.layout,
      colors: state.colors,
      visibility: state.visibility,
      outlines: false,
    });
    expect(makePartition(topology, restored.params)).toEqual(partition);
  });
  it.each(["a:8,a:8", "__proto__:64", "a:64:extra", "a:63"])(
    "reports invalid editor input %s",
    (axes) => {
      expect(
        makePartition(
          { x: 4, y: 4, z: 4 },
          new URLSearchParams({ mesh_axes: axes }),
        ).error,
      ).toBeDefined();
    },
  );
});
