import familyData from "./data/families.json";
import original from "./data/default.json";
import pastel from "./data/pastel.json";
import google from "./data/google.json";
import greyscale from "./data/greyscale.json";

export type Axis = "x" | "y" | "z";
export type Coordinates = Record<Axis, number>;
export type Topology = Coordinates & {
  label: string;
  type: "mesh" | "cylinder" | "torus" | "twisted_torus";
};
export interface Family {
  id: string;
  name: string;
  hostSize: Coordinates;
  topologies: Topology[];
}
export type Colors = typeof google;
export type ColorKey = keyof Colors;
export type Category =
  | "node"
  | "node-base"
  | "host"
  | "pcie"
  | "ici-x"
  | "ici-y"
  | "ici-z"
  | "ici-ocs"
  | "wrap-copper"
  | "wrap-ocs-x"
  | "wrap-ocs-y"
  | "wrap-ocs-z";
export type Visibility = Record<Category, boolean>;
export type Layout = "grid" | "xy" | "yx" | "yz" | "zy" | "zx" | "xz" | Axis;
export const families = familyData as Family[];
export const schemes = [
  { id: "default", name: "Original", colors: original },
  { id: "pastel", name: "Pastel", colors: pastel },
  { id: "google", name: "Google", colors: google },
  { id: "greyscale", name: "Greyscale", colors: greyscale },
];
export const options: {
  category: Category;
  key: ColorKey;
  label: string;
  colorLabel: string;
}[] = [
  {
    category: "ici-x",
    key: "linkX",
    label: "ICI X (Cu)",
    colorLabel: "ICI X (Copper)",
  },
  {
    category: "ici-y",
    key: "linkY",
    label: "ICI Y (Cu)",
    colorLabel: "ICI Y (Copper)",
  },
  {
    category: "ici-z",
    key: "linkZ",
    label: "ICI Z (Cu)",
    colorLabel: "ICI Z (Copper)",
  },
  {
    category: "wrap-copper",
    key: "linkWrap",
    label: "ICI Wrap (Cu)",
    colorLabel: "Wrap (Copper)",
  },
  {
    category: "ici-ocs",
    key: "linkOcsInter",
    label: "ICI (OCS)",
    colorLabel: "ICI (OCS)",
  },
  {
    category: "wrap-ocs-x",
    key: "linkOcsX",
    label: "Wrap X (OCS)",
    colorLabel: "Wrap X (OCS)",
  },
  {
    category: "wrap-ocs-y",
    key: "linkOcsY",
    label: "Wrap Y (OCS)",
    colorLabel: "Wrap Y (OCS)",
  },
  {
    category: "wrap-ocs-z",
    key: "linkOcsZ",
    label: "Wrap Z (OCS)",
    colorLabel: "Wrap Z (OCS)",
  },
  { category: "node", key: "node", label: "TPU", colorLabel: "TPUs" },
  { category: "host", key: "host", label: "Hosts", colorLabel: "Hosts" },
  { category: "pcie", key: "linkPCIe", label: "PCIe", colorLabel: "PCIe" },
];
export const defaultVisibility = Object.fromEntries([
  ...options.map((o) => [o.category, true]),
  ["node-base", true],
]) as Visibility;
export const countChips = (t: Coordinates) => t.x * t.y * t.z;
export const coordKey = (c: Coordinates) => `${c.x},${c.y},${c.z}`;
export const coordLabel = (c: Coordinates) => `[${coordKey(c)}]`;
export function layouts(t: Topology): [Layout, string][] {
  const torus = t.type === "torus" || t.type === "twisted_torus";
  const axes: Axis[] = (["x", "y", "z"] as Axis[]).filter(
    (a) => t[a] > 1 && (torus || (a === "y" && t.type === "cylinder")),
  );
  const pairs =
    axes.length === 3
      ? ["xy", "yz", "zx"]
      : axes.length === 2
        ? [axes.join(""), [...axes].reverse().join("")]
        : axes;
  return [
    ["grid", "Cartesian Grid"],
    ...pairs.map(
      (p) =>
        [
          p as Layout,
          `${p.length === 1 ? "Cylinder" : "Torus"} (Wrap ${p.toUpperCase().split("").join("-")})`,
        ] as [Layout, string],
    ),
  ];
}
export function closestTopology(t: Topology, family: Family) {
  return family.topologies.reduce((best, candidate, i) => {
    const score = (v: Topology) =>
      Math.abs(countChips(v) - countChips(t)) * 1000 +
      Math.abs(v.x - t.x) +
      Math.abs(v.y - t.y) +
      Math.abs(v.z - t.z);
    return score(candidate) < score(family.topologies[best]) ? i : best;
  }, 0);
}
export interface Selection {
  type: "node" | "host" | "link";
  label: string;
  category: Category;
  coords?: Coordinates;
  connectedNodes?: Coordinates[];
  isOCS?: boolean;
  isPCIe?: boolean;
  isWrap?: boolean;
  logicalCoords?: Record<string, number>;
}
export interface Edge {
  from: Coordinates;
  to: Coordinates;
  axis: Axis;
  category: Category;
  wrap: boolean;
  optical: boolean;
}
export function topologyEdges(f: Family, t: Topology): Edge[] {
  const result: Edge[] = [];
  const optical = ["pufferfish", "viperfish", "ghostfish"].includes(f.id);
  const torus = t.type === "torus" || t.type === "twisted_torus";
  for (let x = 0; x < t.x; x++)
    for (let y = 0; y < t.y; y++)
      for (let z = 0; z < t.z; z++)
        for (const axis of ["x", "y", "z"] as Axis[]) {
          const from = { x, y, z };
          const to = { x, y, z };
          const wrap = from[axis] === t[axis] - 1;
          if (
            t[axis] === 1 ||
            (wrap && !torus && !(t.type === "cylinder" && axis === "y"))
          )
            continue;
          to[axis] = (from[axis] + 1) % t[axis];
          if (wrap && t.type === "twisted_torus" && axis !== "z")
            to.z = (z + Math.floor(t.z / 2)) % t.z;
          const isOCS =
            optical &&
            (wrap ? t.x >= 4 && t.y >= 4 && t.z >= 4 : to[axis] % 4 === 0);
          result.push({
            from,
            to,
            axis,
            wrap,
            optical: isOCS,
            category: wrap
              ? isOCS
                ? `wrap-ocs-${axis}`
                : "wrap-copper"
              : isOCS
                ? "ici-ocs"
                : `ici-${axis}`,
          });
        }
  return result;
}
export function readInitialState(search = window.location.search) {
  const params = new URLSearchParams(search);
  const requestedFamily = families.findIndex(
    (f) => f.id === params.get("platform"),
  );
  const familyIndex = requestedFamily < 0 ? 2 : requestedFamily;
  const family = families[familyIndex];
  const topologyIndex = params.has("topo")
    ? Math.max(
        0,
        family.topologies.findIndex((t) => t.label === params.get("topo")),
      )
    : Math.min(6, family.topologies.length - 1);
  const topology = family.topologies[topologyIndex];
  const layout =
    layouts(topology).find(([l]) => l === params.get("layout"))?.[0] || "grid";
  let schemeId = "google",
    colors: Colors = { ...google };
  try {
    const saved = JSON.parse(localStorage.getItem("tpu-viz-colors") || "null");
    if (saved?.version === 3) {
      schemeId = schemes.find((s) => s.id === saved.schemeId)?.id || "google";
      colors = { ...schemes.find((s) => s.id === schemeId)!.colors };
      for (const key of Object.keys(colors) as ColorKey[])
        if (/^#[\da-f]{6}$/i.test(saved.colors?.[key]))
          colors[key] = saved.colors[key];
    }
  } catch {
    /* Storage can be unavailable in private contexts. */
  }
  const theme = schemes.find((s) => s.id === params.get("theme"));
  if (theme) {
    schemeId = theme.id;
    colors = { ...theme.colors };
  }
  const visibility = { ...defaultVisibility };
  for (const key of params.get("hide")?.split(",") || [])
    if (Object.hasOwn(visibility, key)) visibility[key as Category] = false;
  return {
    familyIndex,
    topologyIndex,
    layout,
    schemeId,
    colors,
    visibility,
    params,
  };
}
