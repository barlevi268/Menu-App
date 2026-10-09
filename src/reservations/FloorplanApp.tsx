import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, cn } from "@heroui/react";
import { ImagePlus, MapPin, Plus, Save, Trash2, X } from "lucide-react";
import GridItem, { CARET_BTN } from "./GridItem";
import {
  centeredGridPlacement,
  clamp,
  findNearestFree,
  isRectInGrid,
  makeLayoutId,
  rectsOverlap,
} from "./gridLayout";
import type { GridRect } from "./gridLayout";

/* ------------------------------------------------------------------ */
/* Grid configuration (matches the table map grid)                     */
/* ------------------------------------------------------------------ */
// Long/short axis of the grid; orientation decides which maps to cols vs rows.
const LONG_AXIS = 96;
const SHORT_AXIS = 64;
const DEFAULT_SIZE = 16; // a fresh area block (cells)
const MIN_SIZE = 4;
const INDICATOR_SIZE = DEFAULT_SIZE / 2;

const FLOORPLAN_KEY = "reservation-floorplan:layout";
const AREAS_KEY = "reservation-by-table:areas";

// stable colour palette assigned per area
const PALETTE = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#f43f5e",
  "#14b8a6",
  "#6366f1",
  "#f97316",
];

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type Orientation = "horizontal" | "vertical";
type Area = { id: string; name: string };

type FpItem = GridRect & {
  id: string;
  areaId: string;
};

type AreaPicker = { col: number; row: number; x: number; y: number };

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function FloorplanApp() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<FpItem[]>([]);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [background, setBackground] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<AreaPicker | null>(null);
  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(
    null
  );
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // grid dimensions follow the orientation
  const COLS = orientation === "horizontal" ? LONG_AXIS : SHORT_AXIS;
  const ROWS = orientation === "horizontal" ? SHORT_AXIS : LONG_AXIS;

  /* ---- load areas + saved floorplan ---- */
  useEffect(() => {
    try {
      const rawAreas = window.localStorage.getItem(AREAS_KEY);
      if (rawAreas) {
        const parsed = JSON.parse(rawAreas) as Area[];
        if (Array.isArray(parsed))
          setAreas(parsed.map((a) => ({ id: a.id, name: a.name })));
      }
      const rawFp = window.localStorage.getItem(FLOORPLAN_KEY);
      if (rawFp) {
        const fp = JSON.parse(rawFp) as {
          background: string | null;
          items: FpItem[];
          orientation?: Orientation;
        };
        setBackground(fp.background ?? null);
        if (fp.orientation) setOrientation(fp.orientation);
        if (Array.isArray(fp.items)) setItems(fp.items);
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const areaById = useMemo(() => {
    const m = new Map<string, { area: Area; color: string }>();
    areas.forEach((a, i) => m.set(a.id, { area: a, color: PALETTE[i % PALETTE.length] }));
    return m;
  }, [areas]);

  const availableAreas = useMemo(
    () => areas.filter((a) => !items.some((it) => it.areaId === a.id)),
    [areas, items]
  );

  /* ---- collision ---- */
  const isAreaFree = useCallback(
    (col: number, row: number, w: number, h: number, excludeId?: string) => {
      const rect = { col, row, w, h };
      if (!isRectInGrid(rect, { cols: COLS, rows: ROWS })) return false;
      return !items.some(
        (it) => it.id !== excludeId && rectsOverlap(rect, it)
      );
    },
    [items, COLS, ROWS]
  );

  /* ---- switch orientation, clamping items into the new grid ---- */
  const changeOrientation = (o: Orientation) => {
    if (o === orientation) return;
    const nc = o === "horizontal" ? LONG_AXIS : SHORT_AXIS;
    const nr = o === "horizontal" ? SHORT_AXIS : LONG_AXIS;
    setItems((prev) =>
      prev.map((it) => {
        const w = Math.min(it.w, nc);
        const h = Math.min(it.h, nr);
        return {
          ...it,
          w,
          h,
          col: clamp(it.col, 0, nc - w),
          row: clamp(it.row, 0, nr - h),
        };
      })
    );
    setOrientation(o);
    setSelectedId(null);
    setPicker(null);
    setHoverCell(null);
  };

  /* ---- click empty canvas → deselect, or open the area picker ---- */
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (selectedId) {
      setSelectedId(null);
      setHoverCell(null);
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    const placement = centeredGridPlacement({
      clientX: e.clientX,
      clientY: e.clientY,
      rect,
      grid: { cols: COLS, rows: ROWS },
      w: DEFAULT_SIZE,
      h: DEFAULT_SIZE,
    });
    setHoverCell(null);
    setPicker({
      col: placement.col,
      row: placement.row,
      x: placement.x,
      y: placement.y,
    });
  };

  const handleCanvasHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || picker || selectedId) {
      setHoverCell(null);
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    const { col, row } = centeredGridPlacement({
      clientX: e.clientX,
      clientY: e.clientY,
      rect,
      grid: { cols: COLS, rows: ROWS },
      w: INDICATOR_SIZE,
      h: INDICATOR_SIZE,
    });
    setHoverCell(
      isAreaFree(col, row, INDICATOR_SIZE, INDICATOR_SIZE) ? { col, row } : null
    );
  };

  const addBlock = (areaId: string) => {
    if (!picker) return;
    let { col, row } = picker;
    if (!isAreaFree(col, row, DEFAULT_SIZE, DEFAULT_SIZE)) {
      const spot = findNearestFree(
        { col, row, w: DEFAULT_SIZE, h: DEFAULT_SIZE },
        { cols: COLS, rows: ROWS },
        (candidate) =>
          isAreaFree(candidate.col, candidate.row, candidate.w, candidate.h)
      );
      if (!spot) {
        setPicker(null);
        return;
      }
      col = spot.col;
      row = spot.row;
    }
    const item: FpItem = {
      id: makeLayoutId("fp"),
      areaId,
      col,
      row,
      w: DEFAULT_SIZE,
      h: DEFAULT_SIZE,
    };
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
    setPicker(null);
  };

  const updateItem = (id: string, patch: Partial<FpItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const deleteBlock = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId(null);
  };

  /* ---- background image ---- */
  const handleBackground = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBackground(String(reader.result));
    reader.readAsDataURL(file);
  };

  /* ---- save ---- */
  const save = () => {
    try {
      window.localStorage.setItem(
        FLOORPLAN_KEY,
        JSON.stringify({ background, items, orientation })
      );
      setStatusMsg("Floorplan saved");
    } catch {
      setStatusMsg("Save failed — background image may be too large");
    }
    window.setTimeout(() => setStatusMsg(null), 3000);
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Floorplan Layout</h1>
            <p className="text-sm text-slate-500">
              Click the canvas to place an area, drag to position, resize with the
              carets. Add a background photo to trace your restaurant.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* orientation toggle */}
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              {(["horizontal", "vertical"] as Orientation[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => changeOrientation(o)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium capitalize transition-colors",
                    orientation === o
                      ? "bg-sky-500 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
            {statusMsg && (
              <span
                className={cn(
                  "text-sm font-medium",
                  statusMsg.startsWith("Save failed")
                    ? "text-rose-600"
                    : "text-emerald-600"
                )}
              >
                {statusMsg}
              </span>
            )}
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <ImagePlus size={16} />
                {background ? "Replace background" : "Add background"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleBackground(e.target.files?.[0])}
              />
            </label>
            {background && (
              <Button
                variant="light"
                color="danger"
                onPress={() => setBackground(null)}
              >
                Remove
              </Button>
            )}
            <Button color="primary" startContent={<Save size={18} />} onPress={save}>
              Save floorplan
            </Button>
          </div>
        </div>

        {/* canvas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasHover}
            onMouseLeave={() => setHoverCell(null)}
            className={cn(
              "relative mx-auto w-full select-none overflow-visible rounded-xl bg-slate-100",
              hoverCell && "cursor-pointer"
            )}
            style={{
              aspectRatio: orientation === "horizontal" ? "3 / 2" : "2 / 3",
              // keep a portrait canvas from getting unwieldy tall
              maxWidth: orientation === "vertical" ? "460px" : undefined,
            }}
          >
            {/* background photo */}
            {background && (
              <img
                src={background}
                alt="floorplan background"
                className="pointer-events-none absolute inset-0 z-0 h-full w-full rounded-xl object-cover"
              />
            )}
            {/* grid overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-[1] rounded-xl"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(100,116,139,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.10) 1px, transparent 1px)",
                backgroundSize: `${100 / COLS}% ${100 / ROWS}%`,
              }}
            />

            {/* hover indicator */}
            {hoverCell && (
              <div
                className="pointer-events-none absolute z-[2] flex items-center justify-center rounded-lg border-2 border-dashed border-sky-400 bg-sky-400/10 text-sky-500"
                style={{
                  left: `${(hoverCell.col / COLS) * 100}%`,
                  top: `${(hoverCell.row / ROWS) * 100}%`,
                  width: `${(INDICATOR_SIZE / COLS) * 100}%`,
                  height: `${(INDICATOR_SIZE / ROWS) * 100}%`,
                }}
              >
                <Plus size={16} />
              </div>
            )}

            {items.map((item) => {
              const meta = areaById.get(item.areaId);
              const color = meta?.color ?? "#64748b";
              const name = meta?.area.name ?? "Unknown area";
              return (
                <GridItem
                  key={item.id}
                  geom={item}
                  cols={COLS}
                  rows={ROWS}
                  minSize={MIN_SIZE}
                  selected={selectedId === item.id}
                  zIdle="z-10"
                  zActive="z-30"
                  canvasRef={canvasRef}
                  validate={(g) => isAreaFree(g.col, g.row, g.w, g.h, item.id)}
                  onMove={(col, row) => updateItem(item.id, { col, row })}
                  onResize={(w, h) => updateItem(item.id, { w, h })}
                  onSelect={() => setSelectedId(item.id)}
                  toolbar={
                    <button
                      type="button"
                      className={CARET_BTN}
                      title="Delete"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBlock(item.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  }
                  renderBody={({ invalid, selected }) => (
                    <div
                      className={cn(
                        "flex h-full w-full items-center justify-center rounded-lg border-2 text-center transition-colors",
                        selected && !invalid && "ring-2 ring-sky-400 ring-offset-1"
                      )}
                      style={
                        invalid
                          ? {
                              borderColor: "#f43f5e",
                              backgroundColor: "rgba(244,63,94,0.25)",
                            }
                          : { borderColor: color, backgroundColor: `${color}26` }
                      }
                    >
                      <span
                        className="pointer-events-none truncate px-2 text-sm font-semibold"
                        style={{ color: invalid ? "#e11d48" : "#1e293b" }}
                      >
                        {name}
                      </span>
                    </div>
                  )}
                />
              );
            })}

            {/* area picker */}
            {picker && (
              <AreaPickerPopover
                picker={picker}
                areas={availableAreas}
                colorFor={(id) => areaById.get(id)?.color ?? PALETTE[0]}
                hasAreas={areas.length > 0}
                onPick={addBlock}
                onCancel={() => setPicker(null)}
              />
            )}

            {items.length === 0 && !picker && (
              <div className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-center text-slate-400">
                <MapPin size={28} className="mb-1" />
                <p className="text-sm font-medium">
                  Click to place an area on the floorplan
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Area picker popover                                                 */
/* ------------------------------------------------------------------ */
function AreaPickerPopover({
  picker,
  areas,
  colorFor,
  hasAreas,
  onPick,
  onCancel,
}: {
  picker: AreaPicker;
  areas: Area[];
  colorFor: (id: string) => string;
  hasAreas: boolean;
  onPick: (areaId: string) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="absolute z-[240] w-56"
      style={{ left: picker.x, top: picker.y, transform: "translate(-50%, 8px)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Select an area
          </span>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            onClick={onCancel}
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
        {!hasAreas ? (
          <p className="px-2 py-3 text-xs text-slate-500">
            No areas yet. Create areas in the Table Map first, then save.
          </p>
        ) : areas.length === 0 ? (
          <p className="px-2 py-3 text-xs text-slate-500">
            All areas have been placed.
          </p>
        ) : (
          <div className="max-h-56 overflow-auto">
            {areas.map((a) => (
              <button
                key={a.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => onPick(a.id)}
              >
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: colorFor(a.id) }}
                />
                <span className="truncate font-medium">{a.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
