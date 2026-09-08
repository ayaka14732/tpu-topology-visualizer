import { Vector3 } from "three";
import type { Axis, Coordinates, Edge, Layout, Topology } from "./model";

export function layoutDimensions(t: Coordinates, layout: Layout) {
  const [a, b, c] = (
    layout === "grid"
      ? "xyz"
      : layout.length === 1
        ? layout === "y"
          ? "yxz"
          : layout === "z"
            ? "zxy"
            : "xyz"
        : layout + (["x", "y", "z"].find((a) => !layout.includes(a)) || "z")
  ).split("") as Axis[];
  return {
    a,
    b,
    c,
    tube: t[a],
    ring: layout.length === 1 ? 1 : t[b],
    radial: layout.length === 1 ? t[b] : t[c],
  };
}
export function radii(t: Coordinates, layout: Layout) {
  const { tube, ring } = layoutDimensions(t, layout);
  const minor = (tube * 6) / (2 * Math.PI);
  return {
    minor,
    major: Math.max((ring * 6) / (2 * Math.PI), minor * 3) + minor * 1.5,
  };
}
export function nodePosition(
  c: Coordinates,
  t: Topology,
  layout: Layout,
): Vector3 {
  if (layout === "grid") return new Vector3(c.x * 2, c.y * 2, c.z * 2);
  const d = layoutDimensions(t, layout);
  if (layout.length === 1 || d.tube <= 1 || d.ring <= 1) {
    const n = d.tube <= 1 ? d.ring : d.tube;
    const index = d.tube <= 1 ? c[d.b] : c[d.a];
    const angle = (index / n) * 2 * Math.PI;
    const radial = layout.length === 1 ? c[d.b] : c[d.c];
    const radius = (n * 6) / (2 * Math.PI);
    return new Vector3(
      radius * Math.cos(angle),
      (radial - (d.radial - 1) / 2) * 6,
      radius * Math.sin(angle),
    );
  }
  const { minor, major } = radii(t, layout);
  const ringAngle = (c[d.b] / d.ring) * 2 * Math.PI;
  const tubeAngle =
    (c[d.a] / d.tube) * 2 * Math.PI +
    (t.type === "twisted_torus" ? ringAngle * 0.5 : 0);
  const radius = minor + (c[d.c] - (d.radial - 1) / 2) * 3;
  return new Vector3(
    (major + radius * Math.cos(tubeAngle)) * Math.cos(ringAngle),
    radius * Math.sin(tubeAngle),
    (major + radius * Math.cos(tubeAngle)) * Math.sin(ringAngle),
  );
}
export function curveControl(
  edge: Edge,
  start: Vector3,
  end: Vector3,
  t: Topology,
  layout: Layout,
): Vector3 | null {
  const middle = start.clone().lerp(end, 0.5);
  if (edge.wrap) {
    const length = start.distanceTo(end);
    if (t.z === 1) middle.z += length * 0.5;
    else {
      const direction = middle
        .clone()
        .sub(new Vector3(t.x - 1, t.y - 1, t.z - 1));
      if (direction.lengthSq() > 0.001)
        middle.addScaledVector(
          direction.normalize(),
          length * (edge.optical ? 0.35 : 0.5),
        );
      else middle.y += length * 0.5;
    }
    return middle;
  }
  if (layout === "grid") return null;
  const d = layoutDimensions(t, layout);
  if (edge.axis !== d.a && (layout.length === 1 || edge.axis !== d.b))
    return null;
  const center = new Vector3();
  if (layout.length === 1 || d.tube <= 1 || d.ring <= 1)
    center.y =
      ((layout.length === 1 ? edge.from[d.b] : edge.from[d.c]) -
        (d.radial - 1) / 2) *
      6;
  else if (edge.axis === d.a) {
    const theta = (edge.from[d.b] / d.ring) * 2 * Math.PI;
    const { major } = radii(t, layout);
    center.set(major * Math.cos(theta), 0, major * Math.sin(theta));
  }
  const radius = (start.distanceTo(center) + end.distanceTo(center)) / 2;
  const direction = middle.clone().sub(center);
  if (direction.lengthSq() < 0.0001)
    return middle.add(
      start
        .clone()
        .sub(center)
        .cross(end.clone().sub(center))
        .normalize()
        .multiplyScalar(radius * 0.5),
    );
  return center
    .addScaledVector(direction.normalize(), radius)
    .multiplyScalar(2)
    .sub(middle);
}
