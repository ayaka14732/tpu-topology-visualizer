import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useLanguage } from "./i18n";
import { options, schemes } from "./model";
import type { Category, ColorKey, Colors, Visibility } from "./model";
interface Props {
  colors: Colors;
  schemeId: string;
  visibility: Visibility;
  outlines: boolean;
  onScheme: (id: string) => void;
  onColor: (key: ColorKey, value: string) => void;
  onToggle: (key: Category) => void;
  onOutlines: (value: boolean) => void;
  onReset: () => void;
}
function ColorRow({
  label,
  color,
  defaultColor,
  checked,
  onToggle,
  onChange,
}: {
  label: string;
  color: string;
  defaultColor: string;
  checked?: boolean;
  onToggle?: () => void;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(color);
  useEffect(() => setDraft(color), [color]);
  const commit = () => {
    const value = draft.startsWith("#") ? draft : `#${draft}`;
    if (/^#[\da-f]{6}$/i.test(value)) onChange(value.toLowerCase());
    else setDraft(color);
  };
  return (
    <div className="flex items-center justify-between rounded border border-gray-800 bg-[#111] px-3 py-2 transition-colors hover:border-gray-700">
      {onToggle ? (
        <label className="flex flex-1 cursor-pointer items-center text-[0.85rem] text-gray-300 hover:text-white">
          <input
            type="checkbox"
            className="mr-3 cursor-pointer accent-indigo-500"
            checked={checked}
            onChange={onToggle}
          />
          {label}
        </label>
      ) : (
        <span className="text-[0.85rem] text-gray-300">{label}</span>
      )}
      <div className="flex items-center gap-1.5">
        {color.toLowerCase() !== defaultColor.toLowerCase() && (
          <button
            className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-white"
            title={t(`Reset ${label} to default`)}
            onClick={() => onChange(defaultColor)}
          >
            <RotateCcw size={12} />
          </button>
        )}
        <input
          aria-label={t(`${label} hex color`)}
          className="w-20 rounded border border-gray-700 bg-[#222] px-2 py-1 font-mono text-xs text-gray-300 outline-none focus:border-indigo-500"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
        />
        <div className="relative h-8 w-8 shrink-0">
          <input
            aria-label={t(`${label} color swatch`)}
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={color}
            onChange={(e) => onChange(e.target.value)}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded border-2 border-gray-600"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}
export function ColorSettings(p: Props) {
  const { t } = useLanguage();
  const defaults = schemes.find((s) => s.id === p.schemeId)!.colors;
  const sorted = [options[8], options[9], ...options.slice(0, 8), options[10]];
  return (
    <div className="color-settings">
      <div className="mb-4">
        <label htmlFor="color-scheme" className="field-label">
          {t("Color Scheme")}
        </label>
        <select
          id="color-scheme"
          className="select"
          value={p.schemeId}
          onChange={(e) => p.onScheme(e.target.value)}
        >
          {schemes.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.name)}
            </option>
          ))}
        </select>
      </div>
      <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          className="h-4 w-4 accent-indigo-500"
          checked={p.outlines}
          onChange={(e) => p.onOutlines(e.target.checked)}
        />
        {t("Schematic Outlines")}
      </label>
      {sorted.map((o) => (
        <ColorRow
          key={o.key}
          label={t(o.colorLabel)}
          color={p.colors[o.key]}
          defaultColor={defaults[o.key]}
          checked={p.visibility[o.category]}
          onToggle={() => p.onToggle(o.category)}
          onChange={(v) => p.onColor(o.key, v)}
        />
      ))}
      <div className="mt-2 border-t border-gray-700 pt-2">
        <ColorRow
          label={t("Background")}
          color={p.colors.background}
          defaultColor={defaults.background}
          onChange={(v) => p.onColor("background", v)}
        />
      </div>
      <div className="mt-3 border-t border-gray-700 pt-3">
        <button
          onClick={p.onReset}
          className="flex w-full items-center justify-center gap-2 rounded border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
        >
          <RotateCcw size={14} />
          {t("Reset to Scheme Default")}
        </button>
      </div>
    </div>
  );
}
