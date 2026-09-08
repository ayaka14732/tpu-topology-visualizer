import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RotateCw,
  TriangleAlert,
  Wrench,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  closestTopology,
  countChips,
  families,
  layouts,
  options,
  readInitialState,
  schemes,
} from "./model";
import type { Category, ColorKey, Layout, Selection } from "./model";
import { useLanguage, LanguagePicker } from "./i18n";
import { VersionSelect } from "./VersionSelect";
import { ColorSettings } from "./ColorSettings";
import { TopologyScene } from "./scene";
import { makePartition, rainbow } from "./partition";
function Stat({ label, value }: { label: string; value: string | number }) {
  const { t } = useLanguage();
  return (
    <div className="mb-1.5 flex items-end justify-between">
      <span className="text-[0.75rem] tracking-wide text-gray-400">
        {t(label)}
      </span>
      <span className="text-right font-mono text-[0.9rem] text-gray-100">
        {typeof value === "string" ? t(value) : value}
      </span>
    </div>
  );
}
export default function App() {
  const { t, language } = useLanguage();
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [initial] = useState(() => readInitialState());
  const [familyIndex, setFamily] = useState(initial.familyIndex),
    [topologyIndex, setTopology] = useState(initial.topologyIndex),
    [layout, setLayout] = useState<Layout>(initial.layout);
  const [colors, setColors] = useState(initial.colors),
    [schemeId, setScheme] = useState(initial.schemeId),
    [visibility, setVisibility] = useState(initial.visibility);
  const [outlines, setOutlines] = useState(true),
    [settings, setSettings] = useState(false),
    [specs, setSpecs] = useState(true),
    [rotating, setRotating] = useState(true),
    [selection, setSelection] = useState<Selection | null>(null);
  const [gpu, setGpu] = useState<"ready" | "missing" | "retry">(() => {
    try {
      return document.createElement("canvas").getContext("webgl2")
        ? "ready"
        : "missing";
    } catch {
      return "missing";
    }
  });
  const container = useRef<HTMLDivElement>(null),
    scene = useRef<TopologyScene | null>(null);
  const family = families[familyIndex],
    topology = family.topologies[topologyIndex];
  const [partitionParams, setPartitionParams] = useState(initial.params);
  const partition = useMemo(
    () => makePartition(topology, partitionParams),
    [topology, partitionParams],
  );
  useEffect(() => {
    window.history.replaceState({}, "", window.location.pathname);
  }, []);
  useEffect(() => {
    if (!container.current || gpu === "missing") return;
    let instance: TopologyScene;
    try {
      instance = new TopologyScene(
        container.current,
        setSelection,
        () => setRotating(false),
        () => setGpu("missing"),
      );
      scene.current = instance;
    } catch {
      setGpu("missing");
      return;
    }
    return () => {
      instance.dispose();
      scene.current = null;
    };
  }, [gpu]);
  useEffect(() => {
    if (!scene.current) return;
    scene.current.updateTopology({
      family,
      topology,
      layout,
      colors,
      visibility,
      outlines,
      partition,
    });
    setSelection(null);
    setRotating(true);
  }, [family, topology, layout, partition, gpu]);
  useEffect(() => scene.current?.updateColors(colors), [colors]);
  useEffect(() => scene.current?.updateVisibility(visibility), [visibility]);
  useEffect(() => scene.current?.setOutlines(outlines), [outlines]);
  useEffect(() => scene.current?.setAutoRotate(rotating), [rotating, gpu]);
  useEffect(() => {
    container.current
      ?.querySelector("canvas")
      ?.setAttribute("aria-label", t("Scene instructions"));
  }, [language, gpu]);
  const save = (id: string, value: typeof colors) => {
    try {
      localStorage.setItem(
        "tpu-viz-colors",
        JSON.stringify({ version: 3, schemeId: id, colors: value }),
      );
    } catch {
      /* The scene remains usable when storage is unavailable. */
    }
  };
  const changeColor = (key: ColorKey, value: string) => {
    const next = { ...colors, [key]: value };
    setColors(next);
    save(schemeId, next);
  };
  const changeScheme = (id: string) => {
    const next = { ...schemes.find((s) => s.id === id)!.colors };
    setScheme(id);
    setColors(next);
    save(id, next);
  };
  const toggle = (key: Category) =>
    setVisibility((v) => ({ ...v, [key]: !v[key] }));
  const changeTopology = (index: number, nextFamily = family) => {
    setPartitionParams(new URLSearchParams());
    setTopology(index);
    if (!layouts(nextFamily.topologies[index]).some(([l]) => l === layout))
      setLayout("grid");
  };
  if (gpu === "missing")
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#111] p-6 text-white">
        <div className="max-w-md space-y-6 text-center">
          <LanguagePicker />
          <div className="mb-4 flex justify-center">
            <TriangleAlert size={64} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">
            {t("Hardware Acceleration Missing")}
          </h1>
          <p className="text-gray-300">
            {t(
              "This app requires a GPU or hardware accelerator to function correctly. It looks like your device doesn't have one enabled or available.",
            )}
          </p>
          <p className="text-sm text-gray-500">
            {t(
              "Without GPU support, nothing may load or performance might be largely degraded.",
            )}
          </p>
          <button
            className="mt-8 rounded-lg border border-white/10 bg-[#1e1e23] px-6 py-2 text-sm font-medium transition-colors hover:bg-[#2a2a30]"
            onClick={() => setGpu("retry")}
          >
            {t("[Try Anyway]")}
          </button>
        </div>
      </main>
    );
  return (
    <main
      className={`visualizer relative h-dvh w-screen bg-[#111] ${mobileExpanded ? "controls-expanded" : "controls-collapsed"}`}
    >
      <div
        ref={container}
        className="scene-viewport absolute inset-0"
        data-testid="topology-scene"
      />
      <div id="ui-layer" className="contents">
        <aside
          aria-label={t("Topology controls")}
          className="panel pointer-events-auto absolute top-5 left-5 z-10 max-h-[90vh] w-[380px] overflow-y-auto rounded-lg border border-white/10 bg-[#1e1e23]/95 p-5 shadow-2xl backdrop-blur-sm"
        >
          <button
            className="mobile-panel-toggle"
            aria-expanded={mobileExpanded}
            aria-controls="panel-content"
            onClick={() => setMobileExpanded((value) => !value)}
          >
            <SlidersHorizontal size={20} />
            <span className="mobile-panel-summary">
              <strong>{t("Controls")}</strong>
              <span>
                {family.name} · {topology.label}
              </span>
            </span>
            {mobileExpanded ? <X size={20} /> : <ChevronUp size={20} />}
          </button>
          <div id="panel-content" className="panel-content">
            <div className="mb-2 flex items-start justify-between">
              <h1 className="text-xl font-semibold text-white">
                {settings ? t("Color Settings") : t("TPU Topology Visualizer")}
              </h1>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              {settings
                ? t("Click on a color swatch to customize.")
                : t("Visualize the TPU version and topology layout.")}
            </p>
            <nav className="controls-menu" aria-label={t("Controls")}>
              <LanguagePicker />
              <div className="menu-row">
                <span>{t("Color Settings")}</span>
                <button
                  type="button"
                  aria-pressed={settings}
                  onClick={() => setSettings(!settings)}
                >
                  {settings ? <ArrowLeft size={16} /> : <Wrench size={16} />}
                  <span>
                    {settings ? t("Back to Main") : t("Color Settings")}
                  </span>
                </button>
              </div>
              <div className="menu-row">
                <span>{t("Auto-Rotate")}</span>
                <button
                  type="button"
                  aria-pressed={rotating}
                  onClick={() => setRotating(!rotating)}
                  title={
                    rotating ? t("Stop Auto-Rotate") : t("Start Auto-Rotate")
                  }
                >
                  <RotateCw size={16} />
                  <span>
                    {rotating ? t("Stop Rotation") : t("Start Auto-Rotate")}
                  </span>
                </button>
              </div>
            </nav>
            {settings ? (
              <ColorSettings
                colors={colors}
                schemeId={schemeId}
                visibility={visibility}
                outlines={outlines}
                onScheme={changeScheme}
                onColor={changeColor}
                onToggle={toggle}
                onOutlines={setOutlines}
                onReset={() => changeScheme(schemeId)}
              />
            ) : (
              <>
                <div className="mb-4">
                  <label className="field-label" htmlFor="family">
                    {t("TPU version")}
                  </label>
                  <VersionSelect
                    value={familyIndex}
                    onChange={(index) => {
                      changeTopology(
                        closestTopology(topology, families[index]),
                        families[index],
                      );
                      setFamily(index);
                    }}
                  />
                  <label className="field-label" htmlFor="topology">
                    {t("Topology")}
                  </label>
                  <select
                    id="topology"
                    className="select"
                    value={topologyIndex}
                    onChange={(e) => changeTopology(Number(e.target.value))}
                  >
                    {family.topologies.map((t, i) => (
                      <option key={t.label} value={i}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4 border-t border-gray-700 pt-4">
                  <div className="field-label mb-2">{t("Layout")}</div>
                  <div className="layout-options space-y-1.5">
                    {layouts(topology).map(([value, label]) => (
                      <label
                        key={value}
                        className="group flex cursor-pointer items-center gap-2"
                      >
                        <input
                          type="radio"
                          name="layoutMode"
                          value={value}
                          checked={layout === value}
                          onChange={() => setLayout(value)}
                          className="h-3.5 w-3.5 accent-indigo-500"
                        />
                        <span className="text-sm text-gray-300 transition-colors group-hover:text-white">
                          {t(label)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-4 border-t border-gray-700 pt-4">
                  <div className="field-label mb-3">
                    {t("Visualization options")}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2">
                    {options.map((o) => (
                      <label
                        key={o.category}
                        className="group mb-2 flex cursor-pointer items-center text-[0.85rem] text-gray-300 hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={visibility[o.category]}
                          onChange={() => toggle(o.category)}
                          className="mr-2.5 cursor-pointer accent-indigo-500"
                        />
                        <span
                          className="mr-2.5 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: colors[o.key] }}
                        />
                        <span>{t(o.label)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-6 border-t border-gray-700 pt-4">
                  <div className="field-label mb-3">
                    {t("Selection Details")}
                  </div>
                  {!selection ? (
                    <div className="py-2 text-center text-sm text-gray-600 italic">
                      {t("Select an element...")}
                    </div>
                  ) : (
                    <div
                      className="rounded border border-gray-800 bg-[#111] p-3"
                      data-testid="selection"
                    >
                      <div className="mb-2 border-b border-gray-800 pb-2 font-bold text-white">
                        {t(selection.label)}
                      </div>
                      {selection.type === "node" && (
                        <>
                          <Stat
                            label="Coordinates"
                            value={`[${selection.coords!.x}, ${selection.coords!.y}, ${selection.coords!.z}]`}
                          />
                          {selection.logicalCoords && (
                            <Stat
                              label="Logical"
                              value={Object.entries(selection.logicalCoords)
                                .map(([a, v]) => `${a}: ${v}`)
                                .join(", ")}
                            />
                          )}
                          <Stat label="Chip Type" value={family.name} />
                        </>
                      )}
                      {selection.type === "host" && (
                        <Stat
                          label="Connected TPUs"
                          value={countChips(family.hostSize)}
                        />
                      )}{" "}
                      {selection.type === "link" && (
                        <>
                          <Stat
                            label="Link Type"
                            value={
                              selection.isOCS
                                ? "OCS (Optical)"
                                : selection.isPCIe
                                  ? "PCIe"
                                  : "ICI Copper"
                            }
                          />
                          <Stat
                            label="Wrap Link"
                            value={selection.isWrap ? "Yes" : "No"}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-6 border-t border-gray-700 pt-4">
                  <button
                    onClick={() => setSpecs(!specs)}
                    aria-expanded={specs}
                    className="group flex w-full cursor-pointer items-center justify-between"
                  >
                    <span className="text-[0.75rem] text-gray-500 transition-colors group-hover:text-gray-300">
                      {t("System Specs")}
                    </span>
                    {specs ? (
                      <ChevronUp
                        size={14}
                        className="text-gray-500 group-hover:text-gray-300"
                      />
                    ) : (
                      <ChevronDown
                        size={14}
                        className="text-gray-500 group-hover:text-gray-300"
                      />
                    )}
                  </button>
                  {specs && (
                    <div className="system-stats pt-3">
                      <Stat label="Total Chips" value={countChips(topology)} />
                      <Stat
                        label="Total Hosts"
                        value={Math.ceil(
                          countChips(topology) / countChips(family.hostSize),
                        )}
                      />
                      <Stat
                        label="Topology"
                        value={`${topology.x} × ${topology.y} × ${topology.z}`}
                      />
                      <Stat label="Topology Type" value={topology.type} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {partition.active && (
        <div className="partition-legend pointer-events-auto absolute right-4 bottom-4 min-w-[140px] rounded-lg border border-gray-700 bg-black/80 p-3 backdrop-blur-sm">
          <div className="mb-2 text-xs tracking-wide text-gray-400">
            {t(`${partition.active} axis`)}
          </div>
          <div className="flex items-stretch gap-2">
            <div
              className="w-4 rounded"
              style={{
                background: `linear-gradient(to top, ${rainbow.join(",")})`,
                height: Math.min(partition.axes[partition.active] * 16, 120),
                minHeight: 60,
              }}
            />
            <div className="flex flex-col justify-between font-mono text-xs text-gray-300">
              <span>{partition.axes[partition.active] - 1}</span>
              {partition.axes[partition.active] > 2 && (
                <span className="text-gray-500">
                  {Math.floor((partition.axes[partition.active] - 1) / 2)}
                </span>
              )}
              <span>0</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-gray-500">
            {t(`${partition.axes[partition.active]} values`)}
          </div>
        </div>
      )}
    </main>
  );
}
