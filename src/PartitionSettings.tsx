import { useState } from "react";
import { useLanguage } from "./i18n";
import { countChips, type Topology } from "./model";
import { makePartition, type Partition } from "./partition";

export function PartitionSettings({
  topology,
  partition,
  onChange,
}: {
  topology: Topology;
  partition: Partition;
  onChange: (params: URLSearchParams) => void;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(partition.mode);
  const [axes, setAxes] = useState(
    Object.entries(partition.axes)
      .map(([name, size]) => `${name}:${size}`)
      .join(","),
  );
  const params = new URLSearchParams({
    partition_mode: mode,
    [mode === "split-axes" ? "mesh_axes" : "stack_axes"]: axes,
  });
  const candidate = makePartition(topology, params);
  const [active, setActive] = useState(partition.active || "");
  const validActive = Object.hasOwn(candidate.axes, active) ? active : "";
  return (
    <details className="mb-4 border-t border-gray-700 pt-4">
      <summary className="cursor-pointer text-sm text-gray-300">
        {t("Logical partition")}
      </summary>
      <form
        className="mt-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (candidate.error) return;
          if (validActive) params.set("active_axis", validActive);
          onChange(params);
        }}
      >
        <label className="field-label" htmlFor="partition-mode">
          {t("Partition mode")}
        </label>
        <select
          id="partition-mode"
          className="select"
          value={mode}
          onChange={(event) => setMode(event.target.value)}
        >
          {[
            "split-axes",
            "grid-of-rings",
            "ring-of-rings",
            "ring-of-rings-of-rings",
            "grid-of-grids-of-rings",
          ].map((value) => (
            <option
              key={value}
              disabled={topology.z > 1 && value !== "split-axes"}
            >
              {value}
            </option>
          ))}
        </select>
        <label className="field-label" htmlFor="partition-axes">
          {t("Logical axes")}
        </label>
        <input
          id="partition-axes"
          className="select"
          value={axes}
          onChange={(event) => setAxes(event.target.value)}
          aria-invalid={!!candidate.error}
          aria-describedby="partition-help"
        />
        <p id="partition-help" className="text-xs text-gray-400">
          {t(
            "Use name:size pairs, separated by commas. Their product must equal the chip count.",
          )}{" "}
          ({countChips(topology)})
        </p>
        {candidate.error && (
          <p role="alert" className="text-xs text-red-500">
            {t(
              "Invalid partition: check axis names, sizes and whether the rings fit this topology.",
            )}
          </p>
        )}
        <label className="field-label" htmlFor="partition-active">
          {t("Color by axis")}
        </label>
        <select
          id="partition-active"
          className="select"
          value={validActive}
          onChange={(event) => setActive(event.target.value)}
        >
          <option value="">{t("None")}</option>
          {Object.keys(candidate.axes).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            className="select disabled:opacity-40"
            disabled={!!candidate.error}
            type="submit"
          >
            {t("Apply")}
          </button>
          <button
            className="select"
            type="button"
            onClick={() => {
              const defaults = makePartition(topology, new URLSearchParams());
              setMode(defaults.mode);
              setAxes(
                Object.entries(defaults.axes)
                  .map(([name, size]) => `${name}:${size}`)
                  .join(","),
              );
              setActive("");
              onChange(new URLSearchParams());
            }}
          >
            {t("Reset partition")}
          </button>
        </div>
      </form>
    </details>
  );
}
