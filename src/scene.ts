import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  coordKey,
  coordLabel,
  countChips,
  options,
  topologyEdges,
} from "./model";
import type {
  Category,
  Colors,
  Coordinates,
  Family,
  Layout,
  Selection,
  Topology,
  Visibility,
} from "./model";
import { curveControl, nodePosition } from "./geometry";
import { rainbow, type Partition } from "./partition";

interface PickMesh extends THREE.Mesh {
  userData: {
    category: Category;
    selections: Selection[];
    ends?: number[];
    outline?: boolean;
  };
}
interface SceneState {
  family: Family;
  topology: Topology;
  layout: Layout;
  colors: Colors;
  visibility: Visibility;
  outlines: boolean;
  partition: Partition;
}
const up = new THREE.Vector3(0, 1, 0);
const shaderVertex = `varying vec3 normalDirection; varying vec3 viewDirection;
void main() {
 mat4 instanceTransform=mat4(1.0);
 #ifdef USE_INSTANCING
 instanceTransform=instanceMatrix;
 #endif
 vec4 viewPosition=modelViewMatrix*instanceTransform*vec4(position,1.0);
 normalDirection=normalize(normalMatrix*mat3(instanceTransform)*normal);
 viewDirection=-viewPosition.xyz;
 gl_Position=projectionMatrix*viewPosition;
}`;
const shaderFragment = `uniform vec3 color; uniform float opacity; varying vec3 normalDirection; varying vec3 viewDirection;
void main(){float rim=pow(1.0-abs(dot(normalize(normalDirection),normalize(viewDirection))),1.5);gl_FragColor=vec4(mix(color,vec3(0.0),rim*1.5),opacity);}`;

/** Owns GPU resources and listeners; React only sends state updates. */
export class TopologyScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  readonly controls: OrbitControls;
  private group = new THREE.Group();
  private highlight = new THREE.Group();
  private meshes: PickMesh[] = [];
  private materials = new Map<string, THREE.Material>();
  private chips: THREE.InstancedMesh | null = null;
  private coords: Coordinates[] = [];
  private labels: THREE.Mesh[] = [];
  private state: SceneState | null = null;
  private selected: Selection | null = null;
  private frame = 0;
  private distance = 0;
  private down = { x: 0, y: 0 };
  private disposed = false;
  private observer: ResizeObserver;
  constructor(
    private container: HTMLElement,
    private onSelect: (s: Selection | null) => void,
    private onStop: () => void,
    private onError: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive TPU topology. Drag to rotate, scroll to zoom, right-drag to pan, click to select.",
    );
    this.renderer.domElement.setAttribute("role", "img");
    container.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.autoRotateSpeed = 1.5;
    this.controls.addEventListener("start", this.stopRotation);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    this.scene.add(light);
    const fill = new THREE.DirectionalLight(0x4444ff, 0.3);
    fill.position.set(-10, 0, -10);
    this.scene.add(fill);
    this.scene.add(this.group, this.highlight);
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.pointerUp);
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(container);
    this.resize();
    this.animate();
  }
  private stopRotation = () => {
    this.controls.autoRotate = false;
    this.onStop();
  };
  private contextLost = (event: Event) => {
    event.preventDefault();
    this.onError();
  };
  private pointerDown = (event: PointerEvent) => {
    this.down = { x: event.clientX, y: event.clientY };
  };
  private pointerUp = (event: PointerEvent) => {
    if (
      event.button !== 0 ||
      Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > 4
    )
      return;
    const rect = this.container.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const hit = ray.intersectObjects(
      this.meshes.filter((m) => m.visible),
      false,
    )[0];
    let selection: Selection | null = null;
    if (hit) {
      const mesh = hit.object as PickMesh;
      const index =
        hit.instanceId ??
        mesh.userData.ends?.findIndex((end) => (hit.faceIndex ?? 0) < end) ??
        0;
      selection = mesh.userData.selections[index] || null;
    }
    this.selected = selection;
    this.refreshHighlight();
    this.onSelect(selection);
  };
  private resize = () => {
    const { width, height } = this.container.getBoundingClientRect();
    this.camera.aspect = width / Math.max(1, height);
    // Preserve the horizontal field of view on narrow screens without resetting orbit/zoom.
    this.camera.fov = THREE.MathUtils.radToDeg(
      2 *
        Math.atan(
          Math.tan(THREE.MathUtils.degToRad(45 / 2)) /
            Math.min(1, this.camera.aspect),
        ),
    );
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
  private animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    this.controls.update();
    for (const label of this.labels) {
      const world = label.getWorldPosition(new THREE.Vector3());
      label.rotation.set(
        0,
        Math.atan2(
          this.camera.position.x - world.x,
          this.camera.position.z - world.z,
        ),
        0,
      );
    }
    this.renderer.render(this.scene, this.camera);
  };
  setAutoRotate(value: boolean) {
    this.controls.autoRotate = value;
  }
  private disposeGroup(group: THREE.Group) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material)
        (Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        ).forEach((m) => materials.add(m));
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => {
      if ("map" in m && m.map instanceof THREE.Texture) m.map.dispose();
      m.dispose();
    });
    group.clear();
  }
  private colorFor(category: Category, colors: Colors) {
    return category === "node-base"
      ? colors.nodeBase
      : colors[options.find((o) => o.category === category)!.key];
  }
  private material(category: Category, curved = false) {
    const key = `${category}:${curved}`;
    const existing = this.materials.get(key);
    if (existing) return existing;
    const color = this.colorFor(category, this.state!.colors);
    let material: THREE.Material;
    if (["node", "node-base", "host"].includes(category))
      material = new THREE.MeshLambertMaterial({
        color: category === "host" ? color : 0xffffff,
      });
    else if (
      category === "wrap-copper" ||
      (curved && category.startsWith("ici-"))
    )
      material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: category === "wrap-copper" ? 0.4 : 0.8,
        side: THREE.DoubleSide,
      });
    else
      material = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(color) },
          opacity: { value: 0.8 },
        },
        vertexShader: shaderVertex,
        fragmentShader: shaderFragment,
        transparent: true,
        side: THREE.DoubleSide,
      });
    this.materials.set(key, material);
    return material;
  }
  private addInstances(
    category: Category,
    geometry: THREE.BufferGeometry,
    transforms: THREE.Matrix4[],
    selections: Selection[],
  ) {
    if (!transforms.length) {
      geometry.dispose();
      return null;
    }
    const mesh = new THREE.InstancedMesh(
      geometry,
      this.material(category),
      transforms.length,
    );
    transforms.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.userData = { category, selections };
    this.group.add(mesh);
    this.meshes.push(mesh as unknown as PickMesh);
    return mesh;
  }
  updateTopology(state: SceneState) {
    this.disposeGroup(this.group);
    this.disposeGroup(this.highlight);
    this.materials.clear();
    this.meshes = [];
    this.labels = [];
    this.coords = [];
    this.selected = null;
    this.state = state;
    const { family, topology: t, layout, partition } = state;
    this.group.position.set(
      layout === "grid" ? 1 - t.x : 0,
      layout === "grid" ? 1 - t.y : 0,
      layout === "grid" ? 1 - t.z : 0,
    );
    this.highlight.position.copy(this.group.position);
    const bases: THREE.Matrix4[] = [];
    const cores: THREE.Matrix4[] = [];
    const nodeSelections: Selection[] = [];
    const hosts = new Map<
      string,
      { position: THREE.Vector3; nodes: Coordinates[] }
    >();
    for (let x = 0; x < t.x; x++)
      for (let y = 0; y < t.y; y++)
        for (let z = 0; z < t.z; z++) {
          const c = { x, y, z };
          this.coords.push(c);
          const p = nodePosition(c, t, layout);
          bases.push(new THREE.Matrix4().makeTranslation(p));
          cores.push(
            new THREE.Matrix4().makeTranslation(
              p.clone().add(new THREE.Vector3(0, 0.2, 0)),
            ),
          );
          nodeSelections.push({
            type: "node",
            label: `TPU ${coordLabel(c)}`,
            category: "node",
            coords: c,
            logicalCoords: partition.values.get(coordKey(c)),
          });
          const groupKey = coordKey({
            x: Math.floor(x / family.hostSize.x),
            y: Math.floor(y / family.hostSize.y),
            z: Math.floor(z / family.hostSize.z),
          });
          if (!hosts.has(groupKey))
            hosts.set(groupKey, { position: new THREE.Vector3(), nodes: [] });
          const host = hosts.get(groupKey)!;
          host.position.add(p);
          host.nodes.push(c);
        }
    this.addInstances(
      "node-base",
      new THREE.BoxGeometry(0.8, 0.2, 0.8),
      bases,
      nodeSelections,
    );
    this.chips = this.addInstances(
      "node",
      new THREE.BoxGeometry(0.6, 0.2, 0.6),
      cores,
      nodeSelections,
    );
    const links = new Map<
      Category,
      { transforms: THREE.Matrix4[]; selections: Selection[] }
    >();
    const curves = new Map<
      Category,
      {
        geometries: THREE.BufferGeometry[];
        selections: Selection[];
        ends: number[];
      }
    >();
    const addStraight = (
      category: Category,
      from: THREE.Vector3,
      to: THREE.Vector3,
      radius: number,
      selection: Selection,
    ) => {
      if (!links.has(category))
        links.set(category, { transforms: [], selections: [] });
      const item = links.get(category)!;
      item.transforms.push(
        new THREE.Matrix4().compose(
          from.clone().lerp(to, 0.5),
          new THREE.Quaternion().setFromUnitVectors(
            up,
            to.clone().sub(from).normalize(),
          ),
          new THREE.Vector3(radius, from.distanceTo(to), radius),
        ),
      );
      item.selections.push(selection);
    };
    const hostTransforms: THREE.Matrix4[] = [];
    const hostSelections: Selection[] = [];
    for (const [key, host] of hosts) {
      host.position.divideScalar(host.nodes.length);
      hostTransforms.push(new THREE.Matrix4().makeTranslation(host.position));
      hostSelections.push({
        type: "host",
        category: "host",
        label: `Host Machine (Group ${key})`,
      });
      for (const c of host.nodes)
        addStraight(
          "pcie",
          host.position,
          nodePosition(c, t, layout).add(new THREE.Vector3(0, -0.1, 0)),
          0.04,
          {
            type: "link",
            category: "pcie",
            label: `PCIe Host-TPU ${coordLabel(c)}`,
            isPCIe: true,
          },
        );
    }
    this.addInstances(
      "host",
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      hostTransforms,
      hostSelections,
    );
    for (const edge of topologyEdges(family, t)) {
      const start = nodePosition(edge.from, t, layout),
        end = nodePosition(edge.to, t, layout);
      if (layout === "grid") {
        start.y += 0.2;
        end.y += 0.2;
      }
      const selection: Selection = {
        type: "link",
        category: edge.category,
        label: `${edge.optical && !edge.wrap ? "OCS" : "ICI"}-${edge.axis.toUpperCase()}${edge.wrap ? " Wrap" : ""} ${coordLabel(edge.from)}-${coordLabel(edge.to)}`,
        connectedNodes: [edge.from, edge.to],
        isOCS: edge.optical,
        isWrap: edge.wrap,
      };
      const control = curveControl(edge, start, end, t, layout);
      if (control) {
        if (!curves.has(edge.category))
          curves.set(edge.category, {
            geometries: [],
            selections: [],
            ends: [],
          });
        const item = curves.get(edge.category)!;
        const geometry = new THREE.TubeGeometry(
          new THREE.QuadraticBezierCurve3(start, control, end),
          edge.wrap ? 24 : 16,
          edge.wrap ? (edge.optical ? 0.05 : 0.1) : 0.08,
          4,
          false,
        );
        item.geometries.push(geometry);
        item.selections.push(selection);
        item.ends.push((item.ends.at(-1) || 0) + geometry.index!.count / 3);
      } else
        addStraight(
          edge.category,
          start,
          end,
          edge.optical ? 0.02 : 0.04,
          selection,
        );
    }
    for (const [category, item] of links)
      this.addInstances(
        category,
        new THREE.CylinderGeometry(1, 1, 1, 8),
        item.transforms,
        item.selections,
      );
    for (const [category, item] of curves) {
      const geometry = mergeGeometries(item.geometries)!;
      item.geometries.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(geometry, this.material(category, true));
      mesh.userData = {
        category,
        selections: item.selections,
        ends: item.ends,
      };
      this.group.add(mesh);
      this.meshes.push(mesh as PickMesh);
    }
    this.addOutlines();
    this.addPartitionLabels();
    this.updateColors(state.colors);
    this.updateVisibility(state.visibility);
    this.setOutlines(state.outlines);
    const distance = Math.max(t.x, t.y, t.z) * 3;
    if (this.distance === 0)
      this.camera.position.set(distance, distance * 0.8, distance);
    else this.camera.position.multiplyScalar(distance / this.distance);
    this.distance = distance;
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.setAutoRotate(true);
    this.container.dataset.chips = String(countChips(t));
    this.container.dataset.links = String(topologyEdges(family, t).length);
    this.container.dataset.ready = "true";
  }
  private addOutlines() {
    for (const mesh of this.meshes) {
      if (!["node", "node-base", "host"].includes(mesh.userData.category))
        continue;
      const instance = mesh as unknown as THREE.InstancedMesh;
      const edges = new THREE.EdgesGeometry(mesh.geometry);
      const positions: number[] = [];
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < instance.count; i++) {
        instance.getMatrixAt(i, matrix);
        for (let j = 0; j < edges.attributes.position.count; j++) {
          const p = new THREE.Vector3()
            .fromBufferAttribute(edges.attributes.position, j)
            .applyMatrix4(matrix);
          positions.push(p.x, p.y, p.z);
        }
      }
      edges.dispose();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      const lines = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({ color: 0x000000 }),
      );
      lines.userData = { category: mesh.userData.category, outline: true };
      lines.renderOrder = 999;
      this.group.add(lines);
    }
  }
  private addPartitionLabels() {
    const { partition, topology, layout } = this.state!;
    const active = partition.active;
    if (!active) return;
    const textures = new Map<number, THREE.CanvasTexture>();
    for (const c of this.coords) {
      const value = partition.values.get(coordKey(c))?.[active];
      if (value === undefined) continue;
      let texture = textures.get(value);
      if (!texture) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle =
          rainbow[Math.round((value / (partition.axes[active] - 1 || 1)) * 7)];
        ctx.font = "bold 90px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(value), 64, 64);
        texture = new THREE.CanvasTexture(canvas);
        textures.set(value, texture);
      }
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 0.35),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          depthTest: false,
        }),
      );
      label.position
        .copy(nodePosition(c, topology, layout))
        .add(new THREE.Vector3(0, 0.55, 0));
      label.renderOrder = 999;
      this.labels.push(label);
      this.group.add(label);
    }
  }
  setOutlines(value: boolean) {
    if (!this.state) return;
    this.state.outlines = value;
    for (const child of this.group.children)
      if (child.userData.outline)
        child.visible =
          value && this.state.visibility[child.userData.category as Category];
  }
  updateVisibility(visibility: Visibility) {
    if (!this.state) return;
    this.state.visibility = visibility;
    for (const child of this.group.children) {
      const category = child.userData.category as Category | undefined;
      if (category)
        child.visible =
          visibility[category] &&
          (!child.userData.outline || this.state.outlines);
    }
    this.refreshHighlight();
  }
  updateColors(colors: Colors) {
    if (!this.state) return;
    this.state.colors = colors;
    this.scene.background = new THREE.Color(colors.background);
    for (const [key, material] of this.materials) {
      const category = key.split(":")[0] as Category;
      const color = this.colorFor(category, colors);
      if (material instanceof THREE.ShaderMaterial)
        material.uniforms.color.value.set(color);
      else if (
        "color" in material &&
        material.color instanceof THREE.Color &&
        category !== "node" &&
        category !== "node-base"
      )
        material.color.set(color);
    }
    for (const mesh of this.meshes)
      if (mesh.userData.category === "node-base") {
        const instance = mesh as unknown as THREE.InstancedMesh;
        for (let i = 0; i < instance.count; i++)
          instance.setColorAt(i, new THREE.Color(colors.nodeBase));
        instance.instanceColor!.needsUpdate = true;
      }
    this.refreshHighlight();
  }
  private refreshHighlight() {
    if (!this.state || !this.chips) return;
    this.disposeGroup(this.highlight);
    const { colors, partition, visibility } = this.state;
    const selected = this.selected;
    const neighbors = selected?.connectedNodes?.map(coordKey) || [];
    this.coords.forEach((c, i) => {
      let color = new THREE.Color(colors.node);
      if (partition.active) {
        const value = partition.values.get(coordKey(c))?.[partition.active];
        if (value !== undefined)
          color.setHSL(
            (value / (partition.axes[partition.active] - 1 || 1)) * 0.85,
            1,
            0.55,
          );
      }
      if (
        (selected?.coords && coordKey(c) === coordKey(selected.coords)) ||
        neighbors.includes(coordKey(c))
      )
        color.set(colors.nodeHighlight);
      this.chips!.setColorAt(i, color);
    });
    this.chips.instanceColor!.needsUpdate = true;
    if (!selected || selected.type === "node" || !visibility[selected.category])
      return;
    for (const mesh of this.meshes) {
      const index = mesh.userData.selections.indexOf(selected);
      if (index < 0) continue;
      let geometry = mesh.geometry.clone();
      const overlay = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color:
            selected.type === "host"
              ? colors.hostHighlight
              : colors.linkHighlight,
          transparent: true,
          opacity: 0.9,
        }),
      );
      if (mesh instanceof THREE.InstancedMesh) {
        const matrix = new THREE.Matrix4();
        mesh.getMatrixAt(index, matrix);
        overlay.applyMatrix4(matrix);
      } else if (mesh.userData.ends) {
        const start = index === 0 ? 0 : mesh.userData.ends[index - 1] * 3;
        geometry.setDrawRange(start, mesh.userData.ends[index] * 3 - start);
      }
      this.highlight.add(overlay);
      break;
    }
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.removeEventListener("start", this.stopRotation);
    this.controls.dispose();
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this.pointerDown,
    );
    this.renderer.domElement.removeEventListener("pointerup", this.pointerUp);
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.disposeGroup(this.group);
    this.disposeGroup(this.highlight);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
