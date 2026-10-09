import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  useDisclosure,
  cn,
} from "@heroui/react";
import {
  Copy,
  ImagePlus,
  Minus,
  Plus,
  RotateCw,
  Save,
  Settings,
  Square,
  Circle as CircleIcon,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { Input, Textarea } from "../ui/heroui";
import GridItem, { CARET_BTN } from "./GridItem";
import {
  centeredGridPlacement,
  findNearestFree,
  isRectInGrid,
  makeLayoutId,
  rectsOverlap,
} from "./gridLayout";
import type { GridRect } from "./gridLayout";

/* ------------------------------------------------------------------ */
/* Grid configuration                                                  */
/* ------------------------------------------------------------------ */
// Canvas is locked to a 3:2 aspect ratio. A high-resolution grid keeps
// square cells: COLS / ROWS must equal 3 / 2.
const COLS = 96;
const ROWS = 64;
const DEFAULT_SIZE = 8; // a fresh table occupies an 8x8 block of the fine grid
const MIN_SIZE = 2; // smallest a table may be shrunk to (per axis)
const INDICATOR_SIZE = DEFAULT_SIZE / 2; // hover preview footprint (cells)
const OBJECT_STRIPE = 3; // constant arm thickness (cells) for L / C objects
const STORAGE_KEY = "reservation-by-table:areas";
const LEGACY_KEY = "reservation-by-table:layout"; // single-map layout (pre-areas)

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type Kind = "table" | "object";
// Tables only use square/circle; objects add the decorative L and C shapes.
type Shape =
  | "square"
  | "circle"
  | "l-shape"
  | "c-shape"
  | "image"
  | "label"
  | "separator";

type DayRate = { price: number; downpayment: number };

type TableItem = GridRect & {
  id: string;
  kind: Kind;
  shape: Shape;
  rotation: number; // baked orientation, in 90-degree steps
  name: string;
  capacity: number;
  rates: DayRate[]; // length 7, indexed by DAYS
  picture: string | null;
  imageAspectRatio?: number;
  description: string;
};

// An Area is one named map with its own set of items.
type Area = {
  id: string;
  name: string;
  items: TableItem[];
};

type ShapePicker = {
  col: number;
  row: number;
  x: number; // px within canvas, for popover placement
  y: number;
};

type CollisionCandidate = GridRect & {
  kind: Kind;
  shape: Shape;
  rotation?: number;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const emptyRates = (): DayRate[] =>
  DAYS.map(() => ({ price: 0, downpayment: 0 }));

const collisionRectFor = (item: CollisionCandidate): GridRect =>
  ({ col: item.col, row: item.row, w: item.w, h: item.h });

const anchorAspectResize =
  (rotation: number, aspectRatio: number) =>
  (next: GridRect, _base: GridRect, meta: { axis: "w" | "h" }) => {
    const normalized = ((rotation % 360) + 360) % 360;
    const displayAspect =
      normalized === 90 || normalized === 270 ? 1 / aspectRatio : aspectRatio;
    const locked =
      meta.axis === "w"
        ? { ...next, h: Math.max(MIN_SIZE, next.w / displayAspect) }
        : { ...next, w: Math.max(MIN_SIZE, next.h * displayAspect) };

    return locked;
  };

const rotatedFootprint = (item: GridRect): GridRect => ({
  w: item.h,
  h: item.w,
  col: item.col + item.w / 2 - item.h / 2,
  row: item.row + item.h / 2 - item.w / 2,
});

// Stacking hierarchy: shapes (bottom) → labels (middle) → tables (top).
// Items on different layers may overlap (z-index decides what shows on top);
// only same-layer items collide.
type Layer = "shape" | "label" | "table";
const layerFor = (kind: Kind, shape: Shape): Layer =>
  kind === "table" ? "table" : shape === "label" ? "label" : "shape";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function TableMapApp() {
  const [areas, setAreas] = useState<Area[]>([
    { id: "area-default", name: "Area 1", items: [] },
  ]);
  const [activeAreaId, setActiveAreaId] = useState<string>("area-default");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [picker, setPicker] = useState<ShapePicker | null>(null);
  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(
    null
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imagePickerRef = useRef<ShapePicker | null>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (!picker) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && pickerRef.current?.contains(target)) return;
      setPicker(null);
      setHoverCell(null);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [picker]);

  // the active area's items are the working set; setTables writes back into it
  const activeAreaIdRef = useRef(activeAreaId);
  activeAreaIdRef.current = activeAreaId;

  const tables = useMemo(
    () => areas.find((a) => a.id === activeAreaId)?.items ?? [],
    [areas, activeAreaId]
  );

  const setTables = useCallback(
    (update: React.SetStateAction<TableItem[]>) => {
      setAreas((prev) =>
        prev.map((a) =>
          a.id === activeAreaIdRef.current
            ? {
                ...a,
                items:
                  typeof update === "function"
                    ? (update as (p: TableItem[]) => TableItem[])(a.items)
                    : update,
              }
            : a
        )
      );
    },
    []
  );

  /* ---- load from localStorage on mount ---- */
  useEffect(() => {
    const normalize = (items: TableItem[]) =>
      items.map((t) => ({
        ...t,
        kind: t.kind ?? "table",
        rotation: t.rotation ?? 0,
        imageAspectRatio:
          t.imageAspectRatio ?? (t.shape === "image" && t.w && t.h ? t.w / t.h : undefined),
      }));
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Area[];
        if (Array.isArray(parsed) && parsed.length) {
          const loaded = parsed.map((a) => ({ ...a, items: normalize(a.items ?? []) }));
          setAreas(loaded);
          setActiveAreaId(loaded[0].id);
          return;
        }
      }
      // migrate a pre-areas single layout into one area
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const items = JSON.parse(legacy) as TableItem[];
        if (Array.isArray(items)) {
          setAreas([{ id: "area-default", name: "Area 1", items: normalize(items) }]);
        }
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  /* ---- area management ---- */
  const switchArea = (id: string) => {
    if (id === activeAreaId) return;
    setActiveAreaId(id);
    setSelectedId(null);
    setEditingLabelId(null);
    setPicker(null);
    setHoverCell(null);
    onClose();
  };

  const addArea = () => {
    const id = makeLayoutId("tbl");
    setAreas((prev) => [...prev, { id, name: `Area ${prev.length + 1}`, items: [] }]);
    setActiveAreaId(id);
    setSelectedId(null);
    setPicker(null);
    setHoverCell(null);
  };

  const renameArea = (id: string, name: string) =>
    setAreas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, name: name || a.name } : a))
    );

  const deleteArea = (id: string) => {
    setAreas((prev) => {
      if (prev.length <= 1) return prev; // keep at least one area
      const next = prev.filter((a) => a.id !== id);
      if (id === activeAreaIdRef.current) setActiveAreaId(next[0].id);
      return next;
    });
    setSelectedId(null);
    onClose();
  };

  const editing = useMemo(
    () => tables.find((t) => t.id === selectedId) ?? null,
    [tables, selectedId]
  );

  /* ---- area availability ----
   * Items on different layers may overlap freely (z-index keeps tables above
   * labels above shapes, regardless of which was moved); only items on the
   * SAME layer collide. */
  const isAreaFree = useCallback(
    (candidate: CollisionCandidate, excludeId?: string, layer?: Layer) => {
      const candidateRect = collisionRectFor(candidate);
      if (!isRectInGrid(candidateRect, { cols: COLS, rows: ROWS })) {
        return false;
      }
      return !tables.some((t) => {
        if (t.id === excludeId) return false;
        if (layer && layerFor(t.kind, t.shape) !== layer) return false;
        if (candidate.shape === "separator" && t.shape === "separator") return false;
        return rectsOverlap(candidateRect, collisionRectFor(t));
      });
    },
    [tables]
  );

  /* ---- click empty canvas → deselect, or open the shape picker ---- */
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return; // only bare-canvas clicks
    // a click on empty space first releases any selected item; the picker
    // only appears when nothing is selected.
    if (selectedId) {
      setSelectedId(null);
      setEditingLabelId(null);
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

  /* ---- hover preview of where a new table would land ---- */
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
      isAreaFree({
        col,
        row,
        w: INDICATOR_SIZE,
        h: INDICATOR_SIZE,
        kind: "table",
        shape: "square",
        rotation: 0,
      })
        ? { col, row }
        : null
    );
  };

  const addItem = (kind: Kind, shape: Shape) => {
    if (!picker) return;
    if (kind === "object" && shape === "image") {
      imagePickerRef.current = picker;
      imageInputRef.current?.click();
      return;
    }
    const layer = layerFor(kind, shape);
    // a separator is a thin line: full default length, minimal thickness
    const w = DEFAULT_SIZE;
    const h = shape === "separator" ? MIN_SIZE : DEFAULT_SIZE;
    let { col, row } = picker;
    // nudge to a free spot if the clicked block is occupied
    if (
      !isAreaFree(
        { col, row, w, h, kind, shape, rotation: 0 },
        undefined,
        layer
      )
    ) {
      const spot = findNearestFree(
        { col, row, w, h, kind, shape, rotation: 0 },
        { cols: COLS, rows: ROWS },
        (candidate) => isAreaFree(candidate, undefined, layer)
      );
      if (!spot) {
        setPicker(null);
        return;
      }
      col = spot.col;
      row = spot.row;
    }
    const tableCount = tables.filter((t) => t.kind === "table").length;
    const objectCount = tables.filter((t) => t.kind === "object").length;
    const item: TableItem = {
      id: makeLayoutId("tbl"),
      kind,
      shape,
      col,
      row,
      w,
      h,
      rotation: 0,
      name:
        kind === "table"
          ? `Table ${tableCount + 1}`
          : shape === "label"
          ? "Label"
          : `Object ${objectCount + 1}`,
      capacity: 2,
      rates: emptyRates(),
      picture: null,
      imageAspectRatio: undefined,
      description: "",
    };
    setTables((prev) => [...prev, item]);
    setPicker(null);
  };

  const addImageObject = (
    source: string,
    aspectRatio: number,
    targetPicker: ShapePicker
  ) => {
    const kind: Kind = "object";
    const shape: Shape = "image";
    const layer = layerFor(kind, shape);
    const w = DEFAULT_SIZE;
    const h = Math.max(MIN_SIZE, w / aspectRatio);
    let { col, row } = targetPicker;

    if (!isAreaFree({ col, row, w, h, kind, shape, rotation: 0 }, undefined, layer)) {
      const spot = findNearestFree(
        { col, row, w, h, kind, shape, rotation: 0 },
        { cols: COLS, rows: ROWS },
        (candidate) => isAreaFree(candidate, undefined, layer)
      );
      if (!spot) {
        setPicker(null);
        imagePickerRef.current = null;
        return;
      }
      col = spot.col;
      row = spot.row;
    }

    const objectCount = tables.filter((t) => t.kind === "object").length;
    const item: TableItem = {
      id: makeLayoutId("tbl"),
      kind,
      shape,
      col,
      row,
      w,
      h,
      rotation: 0,
      name: `Image ${objectCount + 1}`,
      capacity: 2,
      rates: emptyRates(),
      picture: source,
      imageAspectRatio: aspectRatio,
      description: "",
    };
    setTables((prev) => [...prev, item]);
    setSelectedId(item.id);
    setPicker(null);
    imagePickerRef.current = null;
  };

  /* ---- resize via carets ---- */
  // geometry mutations (drag-move / resize are driven by GridItem)
  const moveItem = (id: string, col: number, row: number) =>
    updateTable(id, { col, row });
  const resizeItem = (id: string, w: number, h: number, col: number, row: number) =>
    updateTable(id, { w, h, col, row });

  /* ---- mutations ---- */
  const updateTable = (id: string, patch: Partial<TableItem>) =>
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const updateRate = (
    id: string,
    dayIndex: number,
    patch: Partial<DayRate>
  ) =>
    setTables((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              rates: t.rates.map((r, i) =>
                i === dayIndex ? { ...r, ...patch } : r
              ),
            }
          : t
      )
    );

  const deleteTable = (id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id));
    onClose();
    setSelectedId(null);
  };

  const openConfig = (id: string) => {
    setSelectedId(id);
    onOpen();
  };

  const duplicateTable = (id: string) => {
    const src = tables.find((t) => t.id === id);
    if (!src) return;
    const spot = findNearestFree(
      {
        col: src.col,
        row: src.row,
        w: src.w,
        h: src.h,
        kind: src.kind,
        shape: src.shape,
        rotation: src.rotation,
      },
      { cols: COLS, rows: ROWS },
      (candidate) =>
        isAreaFree(candidate, undefined, layerFor(src.kind, src.shape))
    );
    if (!spot) return; // no room left on the canvas
    const copy: TableItem = {
      ...src,
      id: makeLayoutId("tbl"),
      col: spot.col,
      row: spot.row,
      name: `Copy of ${src.name}`,
      rates: src.rates.map((r) => ({ ...r })),
    };
    setTables((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  };

  /* ---- rotate an object by baking the new orientation into its footprint */
  const rotateObject = (id: string) => {
    const src = tables.find((t) => t.id === id);
    if (!src) return;
    const rotation = (src.rotation + 90) % 360;
    const next =
      src.shape === "circle" ? { ...src, rotation } : { ...src, ...rotatedFootprint(src), rotation };
    if (
      !isAreaFree(
        {
          col: next.col,
          row: next.row,
          w: next.w,
          h: next.h,
          kind: src.kind,
          shape: src.shape,
          rotation,
        },
        src.id,
        layerFor(src.kind, src.shape)
      )
    ) {
      return;
    }
    updateTable(id, {
      col: next.col,
      row: next.row,
      w: next.w,
      h: next.h,
      rotation,
    });
  };

  const handlePicture = (id: string, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateTable(id, { picture: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const handleImageObjectFile = (file: File | undefined) => {
    if (!file || !imagePickerRef.current) return;
    const targetPicker = imagePickerRef.current;
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result);
      const img = new window.Image();
      img.onload = () => {
        const aspectRatio =
          img.naturalWidth > 0 && img.naturalHeight > 0
            ? img.naturalWidth / img.naturalHeight
            : 1;
        addImageObject(source, aspectRatio, targetPicker);
      };
      img.src = source;
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(areas));
    setSavedAt(Date.now());
    window.setTimeout(() => setSavedAt(null), 2500);
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleImageObjectFile(e.target.files?.[0]);
          e.currentTarget.value = "";
        }}
      />
      <div className="mx-auto max-w-5xl">
        {/* header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Reservation by Table
            </h1>
            <p className="text-sm text-slate-500">
              Click anywhere on the canvas to add a table. Drag to move, use the
              carets to resize, click a table to configure it.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-sm font-medium text-emerald-600">
                Layout saved
              </span>
            )}
            <Button
              color="primary"
              startContent={<Save size={18} />}
              onPress={save}
            >
              Save layout
            </Button>
          </div>
        </div>

        {/* areas tabs */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {areas.map((area) => {
            const active = area.id === activeAreaId;
            return (
              <div
                key={area.id}
                onClick={() => switchArea(area.id)}
                onDoubleClick={() => {
                  setRenamingId(area.id);
                }}
                className={cn(
                  "group flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                {renamingId === area.id ? (
                  <input
                    autoFocus
                    defaultValue={area.name}
                    className="w-24 bg-transparent text-sm font-medium outline-none"
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      renameArea(area.id, e.target.value.trim());
                      setRenamingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        renameArea(area.id, e.currentTarget.value.trim());
                        setRenamingId(null);
                      } else if (e.key === "Escape") {
                        setRenamingId(null);
                      }
                    }}
                  />
                ) : (
                  <span className="font-medium">{area.name}</span>
                )}
                {active && areas.length > 1 && renamingId !== area.id && (
                  <button
                    type="button"
                    title="Delete area"
                    className="flex h-4 w-4 items-center justify-center rounded-full text-sky-500 hover:bg-sky-100 hover:text-rose-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteArea(area.id);
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={addArea}
            className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
          >
            <Plus size={15} /> Add area
          </button>
        </div>

        {/* canvas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasHover}
            onMouseLeave={() => setHoverCell(null)}
            className={cn(
              "relative w-full select-none overflow-visible rounded-xl bg-slate-50/60",
              hoverCell && "cursor-pointer"
            )}
            style={{
              aspectRatio: "3 / 2",
              backgroundImage:
                "linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)",
              backgroundSize: `${100 / COLS}% ${100 / ROWS}%`,
            }}
          >
            {/* hover indicator on empty cells */}
            {hoverCell && (
              <div
                className="pointer-events-none absolute z-0 flex items-center justify-center rounded-lg border-2 border-dashed border-sky-400 bg-sky-400/10 text-sky-500"
                style={{
                  left: `${(hoverCell.col / COLS) * 100}%`,
                  top: `${(hoverCell.row / ROWS) * 100}%`,
                  width: `${(INDICATOR_SIZE / COLS) * 100}%`,
                  height: `${(INDICATOR_SIZE / ROWS) * 100}%`,
                }}
              >
                <Plus size={14} />
              </div>
            )}

            {tables.map((table) => {
              const isObject = table.kind === "object";
              const isLabel = table.shape === "label";
              const layer = layerFor(table.kind, table.shape);
              const zIdle =
                layer === "shape" ? "z-10" : layer === "label" ? "z-30" : "z-50";
              const zActive =
                layer === "shape" ? "z-20" : layer === "label" ? "z-40" : "z-[60]";
              const adjustResize =
                table.shape === "image"
                  ? anchorAspectResize(table.rotation, table.imageAspectRatio ?? 1)
                  : undefined;
              const normalizedRotation = ((table.rotation % 360) + 360) % 360;
              const separatorVertical =
                table.shape === "separator" &&
                (normalizedRotation === 90 || normalizedRotation === 270);
              return (
                <GridItem
                  key={table.id}
                  geom={table}
                  adjustResize={adjustResize}
                  cols={COLS}
                  rows={ROWS}
                  minSize={MIN_SIZE}
                  selected={selectedId === table.id}
                  padded={!isObject}
                  zIdle={zIdle}
                  zActive={zActive}
                  canvasRef={canvasRef}
                  resizable={
                    table.shape === "separator"
                      ? separatorVertical
                        ? "y"
                        : "x"
                      : "both"
                  }
                  validate={(g) =>
                    isAreaFree(
                      {
                        col: g.col,
                        row: g.row,
                        w: g.w,
                        h: g.h,
                        kind: table.kind,
                        shape: table.shape,
                        rotation: table.rotation,
                      },
                      table.id,
                      layer
                    )
                  }
                  onMove={(col, row) => moveItem(table.id, col, row)}
                  onResize={(w, h, col, row) => resizeItem(table.id, w, h, col, row)}
                  onSelect={() => setSelectedId(table.id)}
                  toolbar={
                    <>
                      {isObject ? (
                        <button
                          type="button"
                          className={CARET_BTN}
                          title="Delete"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTable(table.id);
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={CARET_BTN}
                          title="Configure"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            openConfig(table.id);
                          }}
                        >
                          <Settings size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={CARET_BTN}
                        title="Duplicate"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateTable(table.id);
                        }}
                      >
                        <Copy size={13} />
                      </button>
                      {isObject && !isLabel && (
                        <button
                          type="button"
                          className={CARET_BTN}
                          title="Rotate 90°"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            rotateObject(table.id);
                          }}
                        >
                          <RotateCw size={13} />
                        </button>
                      )}
                    </>
                  }
                  renderBody={({ invalid, selected, geom }) =>
                    isLabel ? (
                      <LabelBody
                        text={table.name}
                        invalid={invalid}
                        selected={selected}
                        editing={editingLabelId === table.id}
                        onStartEdit={() => {
                          setSelectedId(table.id);
                          setEditingLabelId(table.id);
                        }}
                        onChange={(v) => updateTable(table.id, { name: v })}
                        onEndEdit={() => setEditingLabelId(null)}
                      />
                    ) : table.shape === "image" ? (
                      <ImageObjectBody
                        src={table.picture}
                        alt={table.name}
                        w={geom.w}
                        h={geom.h}
                        rotation={table.rotation}
                        invalid={invalid}
                        selected={selected}
                      />
                    ) : isObject ? (
                      <ObjectShape
                        shape={table.shape}
                        w={geom.w}
                        h={geom.h}
                        rotation={table.rotation}
                        invalid={invalid}
                        selected={selected}
                      />
                    ) : (
                      <div
                        className={cn(
                          "flex h-full w-full items-center justify-center border-2 text-center transition-colors",
                          table.shape === "circle" ? "rounded-full" : "rounded-lg",
                          invalid
                            ? "border-rose-500 bg-rose-100"
                            : selected
                            ? "border-sky-500 bg-sky-50"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        <div className="pointer-events-none overflow-hidden px-1">
                          <p
                            className={cn(
                              "truncate text-xs font-semibold",
                              invalid ? "text-rose-600" : "text-slate-700"
                            )}
                          >
                            {table.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {table.capacity}p
                          </p>
                        </div>
                      </div>
                    )
                  }
                />
              );
            })}

            {/* shape picker popover */}
            {picker && (
              <ShapePickerPopover
                ref={pickerRef}
                picker={picker}
                onPick={addItem}
                onCancel={() => setPicker(null)}
              />
            )}

            {tables.length === 0 && !picker && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <Plus size={28} className="mb-1" />
                <p className="text-sm font-medium">Click to place your first table</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* configuration drawer */}
      <Drawer isOpen={isOpen} onClose={onClose} size="md">
        <DrawerContent>
          {() =>
            editing ? (
              <>
                <DrawerHeader className="flex flex-col gap-1">
                  <span className="text-lg font-semibold text-slate-800">
                    Configure table
                  </span>
                  <span className="text-xs font-normal text-slate-500">
                    {editing.shape === "square" ? "Square" : "Round"} table ·{" "}
                    {editing.w}×{editing.h} cells
                  </span>
                </DrawerHeader>
                <DrawerBody className="gap-5">
                  <Input
                    label="Table name"
                    value={editing.name}
                    onValueChange={(v) => updateTable(editing.id, { name: v })}
                  />
                  <Input
                    type="number"
                    label="Capacity (guests)"
                    min={1}
                    value={String(editing.capacity)}
                    onValueChange={(v) =>
                      updateTable(editing.id, {
                        capacity: Math.max(1, Number(v) || 0),
                      })
                    }
                  />

                  {/* reservation rates per weekday */}
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">
                      Reservation rate
                    </p>
                    <div className="space-y-2">
                      {DAYS.map((day, i) => (
                        <div
                          key={day}
                          className="grid grid-cols-[5.5rem_1fr_1fr] items-center gap-2"
                        >
                          <span className="text-xs font-medium text-slate-600">
                            {day}
                          </span>
                          <Input
                            type="number"
                            size="sm"
                            min={0}
                            label="Price"
                            value={String(editing.rates[i]?.price ?? 0)}
                            onValueChange={(v) =>
                              updateRate(editing.id, i, {
                                price: Math.max(0, Number(v) || 0),
                              })
                            }
                          />
                          <Input
                            type="number"
                            size="sm"
                            min={0}
                            label="Downpayment"
                            value={String(editing.rates[i]?.downpayment ?? 0)}
                            onValueChange={(v) =>
                              updateRate(editing.id, i, {
                                downpayment: Math.max(0, Number(v) || 0),
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* picture */}
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">
                      Table picture
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                        {editing.picture ? (
                          <img
                            src={editing.picture}
                            alt={editing.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImagePlus size={22} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer">
                          <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            <ImagePlus size={16} />
                            {editing.picture ? "Replace" : "Upload"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handlePicture(editing.id, e.target.files?.[0])
                            }
                          />
                        </label>
                        {editing.picture && (
                          <button
                            type="button"
                            className="text-left text-xs text-rose-500 hover:underline"
                            onClick={() =>
                              updateTable(editing.id, { picture: null })
                            }
                          >
                            Remove picture
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <Textarea
                    label="Description"
                    minRows={3}
                    value={editing.description}
                    onValueChange={(v) =>
                      updateTable(editing.id, { description: v })
                    }
                  />
                </DrawerBody>
                <DrawerFooter className="justify-between">
                  <Button
                    variant="flat"
                    color="danger"
                    startContent={<Trash2 size={16} />}
                    onPress={() => deleteTable(editing.id)}
                  >
                    Delete table
                  </Button>
                  <Button color="primary" onPress={onClose}>
                    Done
                  </Button>
                </DrawerFooter>
              </>
            ) : (
              <DrawerBody>No table selected.</DrawerBody>
            )
          }
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Label object — editable text                                         */
/* ------------------------------------------------------------------ */
function LabelBody({
  text,
  invalid,
  selected,
  editing,
  onStartEdit,
  onChange,
  onEndEdit,
}: {
  text: string;
  invalid: boolean;
  selected: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onChange: (v: string) => void;
  onEndEdit: () => void;
}) {
  // font scales with the box via container-query units
  const fontStyle: React.CSSProperties = { fontSize: "32cqmin" };
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-md border-2 border-dashed px-1 text-center",
        selected ? "border-sky-400 bg-sky-50/40" : "border-transparent"
      )}
      style={{ containerType: "size" }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onBlur={onEndEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
          className="w-full bg-transparent text-center font-semibold text-slate-800 outline-none"
          style={fontStyle}
        />
      ) : (
        <span
          className={cn(
            "pointer-events-none w-full truncate font-semibold",
            invalid ? "text-rose-600" : "text-slate-800"
          )}
          style={fontStyle}
        >
          {text || "Label"}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Object shape (decorative) — SVG with 50% fill + dotted border        */
/* ------------------------------------------------------------------ */
const STROKE_PROPS = {
  fill: "currentColor",
  fillOpacity: 1,
  stroke: "none",
  vectorEffect: "non-scaling-stroke" as const,
};

/** Corner points of an L / C shape in a W×H box with constant arm
 *  thickness t, oriented for the given rotation (0/90/180/270 CW). */
function lcPolygon(
  shape: Shape,
  W: number,
  H: number,
  t: number,
  rotation: number
): number[][] {
  if (shape === "l-shape") {
    switch (rotation) {
      case 90:
        return [[0, 0], [W, 0], [W, t], [t, t], [t, H], [0, H]];
      case 180:
        return [[0, 0], [W, 0], [W, H], [W - t, H], [W - t, t], [0, t]];
      case 270:
        return [[W, 0], [W, H], [0, H], [0, H - t], [W - t, H - t], [W - t, 0]];
      default:
        return [[0, 0], [t, 0], [t, H - t], [W, H - t], [W, H], [0, H]];
    }
  }
  // c-shape
  switch (rotation) {
    case 90:
      return [[0, 0], [W, 0], [W, H], [W - t, H], [W - t, t], [t, t], [t, H], [0, H]];
    case 180:
      return [[0, 0], [W, 0], [W, H], [0, H], [0, H - t], [W - t, H - t], [W - t, t], [0, t]];
    case 270:
      return [[0, 0], [0, H], [W, H], [W, 0], [W - t, 0], [W - t, H - t], [t, H - t], [t, 0]];
    default:
      return [[0, 0], [W, 0], [W, t], [t, t], [t, H - t], [W, H - t], [W, H], [0, H]];
  }
}

const polygonPath = (pts: number[][]) =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z";

function ImageObjectBody({
  src,
  alt,
  w,
  h,
  rotation,
  invalid,
  selected,
}: {
  src: string | null;
  alt: string;
  w: number;
  h: number;
  rotation: number;
  invalid: boolean;
  selected: boolean;
}) {
  const normalized = ((rotation % 360) + 360) % 360;
  const imageStyle: React.CSSProperties =
    normalized === 90 || normalized === 270
      ? {
          width: `${(h / w) * 100}%`,
          height: `${(w / h) * 100}%`,
          transform: `rotate(${normalized}deg)`,
        }
      : normalized
      ? { transform: `rotate(${normalized}deg)` }
      : {};

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-transparent",
        selected && "ring-2 ring-sky-400 ring-offset-1",
        invalid && "ring-2 ring-rose-500 ring-offset-1"
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="pointer-events-none h-full w-full object-contain"
          style={imageStyle}
        />
      ) : (
        <ImagePlus size={22} className="text-slate-400" />
      )}
    </div>
  );
}

/** Renders one object shape. For square/circle the box is stretched
 *  (viewBox 0..100, non-scaling). For L/C the viewBox matches the cell
 *  footprint so scaling is uniform and the arm thickness stays constant
 *  while only the lengths follow the box. */
function ObjectShape({
  shape,
  w,
  h,
  rotation,
  invalid,
  selected,
}: {
  shape: Shape;
  w: number;
  h: number;
  rotation: number;
  invalid: boolean;
  selected: boolean;
}) {
  const colorClass = invalid
    ? "text-rose-500"
    : selected
    ? "text-sky-500"
    : "text-slate-300";

  let inner: React.ReactNode;
  if (shape === "separator") {
    const normalized = ((rotation % 360) + 360) % 360;
    const vertical = normalized === 90 || normalized === 270;
    const dashDirection = vertical ? "to bottom" : "to right";
    inner = (
      <div className="flex h-full w-full items-center justify-center">
        <div
          className={cn("rounded-full", vertical ? "h-full w-1" : "h-1 w-full")}
          style={{
            backgroundImage:
              `repeating-linear-gradient(${dashDirection}, currentColor 0 14px, transparent 14px 20px)`,
          }}
        />
      </div>
    );
  } else if (shape === "l-shape" || shape === "c-shape") {
    const t = Math.min(OBJECT_STRIPE, w, h);
    inner = (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full overflow-visible">
        <path d={polygonPath(lcPolygon(shape, w, h, t, rotation))} {...STROKE_PROPS} />
      </svg>
    );
  } else {
    inner = (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {shape === "circle" ? (
          <ellipse cx="50" cy="50" rx="48" ry="48" {...STROKE_PROPS} />
        ) : (
          <rect x="2" y="2" width="96" height="96" rx="4" {...STROKE_PROPS} />
        )}
      </svg>
    );
  }

  return (
    <div
      className={cn("h-full w-full transition-colors", colorClass)}
    >
      {inner}
    </div>
  );
}

/** Small static glyph for the picker (square box, no stretch). */
function ObjectGlyph({ shape }: { shape: Shape }) {
  return (
    <svg viewBox="0 0 100 100" className="h-6 w-6 text-slate-500" aria-hidden>
      {shape === "l-shape" || shape === "c-shape" ? (
        <path d={polygonPath(lcPolygon(shape, 100, 100, 38, 0))} {...STROKE_PROPS} />
      ) : shape === "circle" ? (
        <ellipse cx="50" cy="50" rx="48" ry="48" {...STROKE_PROPS} />
      ) : (
        <rect x="2" y="2" width="96" height="96" rx="4" {...STROKE_PROPS} />
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Shape picker popover                                                */
/* ------------------------------------------------------------------ */
const ShapePickerPopover = React.forwardRef<
  HTMLDivElement,
  {
    picker: ShapePicker;
    onPick: (kind: Kind, shape: Shape) => void;
    onCancel: () => void;
  }
>(function ShapePickerPopover({ picker, onPick, onCancel }, ref) {
  const tileClass =
    "flex flex-col items-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50";
  const label = "text-[11px] font-medium";

  const objectShapes: { shape: Shape; label: string }[] = [
    { shape: "square", label: "Square" },
    { shape: "circle", label: "Circle" },
    { shape: "l-shape", label: "L Shape" },
    { shape: "c-shape", label: "C Shape" },
    { shape: "label", label: "Label" },
    { shape: "separator", label: "Separator" },
    { shape: "image", label: "Image" },
  ];

  return (
    <div
      ref={ref}
      className="absolute z-[240] w-60"
      style={{
        left: picker.x,
        top: picker.y,
        transform: "translate(-50%, 8px)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Tables
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
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={tileClass}
            onClick={() => onPick("table", "square")}
          >
            <Square size={22} />
            <span className={label}>Square</span>
          </button>
          <button
            type="button"
            className={tileClass}
            onClick={() => onPick("table", "circle")}
          >
            <CircleIcon size={22} />
            <span className={label}>Circle</span>
          </button>
        </div>

        <div className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Objects
        </div>
        <div className="grid grid-cols-4 gap-2">
          {objectShapes.map((o) => (
            <button
              key={o.shape}
              type="button"
              className={tileClass}
              title={o.label}
              onClick={() => onPick("object", o.shape)}
            >
              {o.shape === "label" ? (
                <Type size={22} className="text-slate-500" />
              ) : o.shape === "separator" ? (
                <Minus size={22} className="text-slate-500" strokeWidth={4} />
              ) : o.shape === "image" ? (
                <ImagePlus size={22} className="text-slate-500" />
              ) : (
                <ObjectGlyph shape={o.shape} />
              )}
              <span className="text-[10px] font-medium">
                {o.label.replace(" Shape", "")}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
