import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { families } from "./model";
const query = "(max-width: 767px), (max-height: 500px) and (pointer: coarse)";
export function VersionSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [mobile, setMobile] = useState(() => matchMedia(query).matches);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const media = matchMedia(query);
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  if (!mobile)
    return (
      <select
        id="family"
        className="select mb-3"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {families.map((family, index) => (
          <option key={family.id} value={index}>
            {family.name}
          </option>
        ))}
      </select>
    );
  return (
    <>
      <button
        id="family"
        className="select mb-3 flex items-center justify-between"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        {families[value].name}
        <ChevronDown size={18} />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="version-dialog-title"
        className="version-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const r = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < r.left ||
              event.clientX > r.right ||
              event.clientY < r.top ||
              event.clientY > r.bottom
            )
              event.currentTarget.close();
          }
        }}
      >
        <div className="flex items-center justify-between">
          <h2 id="version-dialog-title" className="font-semibold">
            Choose TPU version
          </h2>
          <button
            type="button"
            aria-label="Close TPU version"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <div className="version-options">
          {families.map((family, index) => (
            <button
              type="button"
              key={family.id}
              aria-pressed={index === value}
              autoFocus={index === value}
              onClick={() => {
                onChange(index);
                dialog.current?.close();
              }}
            >
              <span>{family.name}</span>
              {index === value && <Check size={18} />}
            </button>
          ))}
        </div>
      </dialog>
    </>
  );
}
