import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@heroui/react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Shared draggable / resizable grid item                              */
/* ------------------------------------------------------------------ */
export type Geom = { col: number; row: number; w: number; h: number };
type ResizeAxis = "w" | "h";
type DragAxis = "x" | "y";
type ResizeMeta = { axis: ResizeAxis; dragAxis: DragAxis };

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

export const CARET_BTN =
  "z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-600 shadow ring-1 ring-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:opacity-50 disabled:hover:bg-white";

type MoveInteraction = {
  type: "move";
  startX: number;
  startY: number;
  cellW: number;
  cellH: number;
  origCol: number;
  origRow: number;
  w: number;
  h: number;
};
type ResizeInteraction = {
  type: "resize";
  axis: ResizeAxis;
  dragAxis: DragAxis;
  step: number;
  startX: number;
  startY: number;
  cellW: number;
  cellH: number;
  col: number;
  row: number;
  w: number;
  h: number;
};
type Interaction = MoveInteraction | ResizeInteraction;

type Props = {
  geom: Geom;
  cols: number;
  rows: number;
  minSize: number;
  selected: boolean;
  /** visual bounds used for floating controls; defaults to geom */
  controlsGeom?: Geom;
  /** z-index class when idle vs active (selected / interacting) */
  zIdle: string;
  zActive: string;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  /** true if the geometry is a legal placement (collision-free, in bounds) */
  validate: (g: Geom) => boolean;
  onMove: (col: number, row: number) => void;
  onResize: (w: number, h: number, col: number, row: number) => void;
  onSelect: () => void;
  /** which axes can be resized (default both) */
  resizable?: "both" | "x" | "y";
  /** keep a small visual inset around the body (default true) */
  padded?: boolean;
  /** maps screen-positioned controls to the geometry axis they resize */
  resizeControlAxes?: { horizontal: ResizeAxis; vertical: ResizeAxis };
  /** adjusts geometry after a resize, e.g. to keep rotated visual bounds anchored */
  adjustResize?: (next: Geom, base: Geom, meta: ResizeMeta) => Geom;
  /** the visual body of the item; fills the cell footprint */
  renderBody: (state: {
    invalid: boolean;
    selected: boolean;
    geom: Geom;
  }) => React.ReactNode;
  /** page-specific action buttons, shown floating above when selected */
  toolbar?: React.ReactNode;
};

export default function GridItem({
  geom,
  cols,
  rows,
  minSize,
  selected,
  controlsGeom,
  zIdle,
  zActive,
  canvasRef,
  resizable = "both",
  padded = true,
  resizeControlAxes = { horizontal: "w", vertical: "h" },
  adjustResize,
  validate,
  onMove,
  onResize,
  onSelect,
  renderBody,
  toolbar,
}: Props) {
  const [ghost, setGhost] = useState<{ geom: Geom; invalid: boolean } | null>(
    null
  );

  // everything the global pointer handlers need, read from refs so the
  // handlers can stay stable for the lifetime of a drag.
  const propsRef = useRef({
    geom,
    cols,
    rows,
    minSize,
    validate,
    onMove,
    onResize,
    onSelect,
    adjustResize,
  });
  propsRef.current = {
    geom,
    cols,
    rows,
    minSize,
    validate,
    onMove,
    onResize,
    onSelect,
    adjustResize,
  };
  const interRef = useRef<Interaction | null>(null);
  const movedRef = useRef(false);
  const prevCursorRef = useRef<string | null>(null);

  const render = ghost?.geom ?? geom;
  const invalid = ghost?.invalid ?? false;
  const controls = controlsGeom ?? render;
  const horizontalResizeAxis = resizeControlAxes.horizontal;
  const verticalResizeAxis = resizeControlAxes.vertical;

  const canResizeAxis = (axis: ResizeAxis) =>
    axis === "w" ? resizable !== "y" : resizable !== "x";

  const resizeGeom = (
    axis: "w" | "h",
    i: ResizeInteraction
  ) =>
    axis === "w"
      ? { col: i.col, row: i.row, w: i.w, h: i.h }
      : { col: i.col, row: i.row, w: i.w, h: i.h };

  const adjustedResizeGeom = (
    axis: ResizeAxis,
    size: number,
    i: ResizeInteraction
  ) => {
    const base = resizeGeom(axis, i);
    const next =
      axis === "w"
        ? { ...base, w: size }
        : { ...base, h: size };
    return propsRef.current.adjustResize?.(next, base, {
      axis,
      dragAxis: i.dragAxis,
    }) ?? next;
  };

  /** largest valid geometry between base and target when growing (push to wall) */
  const maxValidResizeGeom = (
    axis: ResizeAxis,
    target: number,
    baseSize: number,
    i: ResizeInteraction
  ) => {
    const { validate: v } = propsRef.current;
    if (target <= baseSize) {
      for (let s = target; s <= baseSize; s++) {
        const cand = adjustedResizeGeom(axis, s, i);
        if (v(cand)) return cand;
      }
      return resizeGeom(axis, i);
    }
    for (let s = target; s > baseSize; s--) {
      const cand = adjustedResizeGeom(axis, s, i);
      if (v(cand)) return cand;
    }
    return resizeGeom(axis, i);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const i = interRef.current;
    if (!i) return;
    const p = propsRef.current;
    const movedX = Math.abs(e.clientX - i.startX);
    const movedY = Math.abs(e.clientY - i.startY);
    if (movedX > 4 || movedY > 4) movedRef.current = true;

    if (i.type === "move") {
      const dCol = Math.round((e.clientX - i.startX) / i.cellW);
      const dRow = Math.round((e.clientY - i.startY) / i.cellH);
      const col = clamp(i.origCol + dCol, 0, p.cols - i.w);
      const row = clamp(i.origRow + dRow, 0, p.rows - i.h);
      const g = { col, row, w: i.w, h: i.h };
      setGhost({ geom: g, invalid: !p.validate(g) });
    } else if (i.axis === "w") {
      const delta =
        i.dragAxis === "x"
          ? Math.round((e.clientX - i.startX) / i.cellW)
          : Math.round((e.clientY - i.startY) / i.cellH);
      const target = clamp(i.w + delta, p.minSize, p.cols - i.col);
      const geom = maxValidResizeGeom("w", target, i.w, i);
      setGhost({ geom, invalid: false });
    } else {
      const delta =
        i.dragAxis === "x"
          ? Math.round((e.clientX - i.startX) / i.cellW)
          : Math.round((e.clientY - i.startY) / i.cellH);
      const target = clamp(i.h + delta, p.minSize, p.rows - i.row);
      const geom = maxValidResizeGeom("h", target, i.h, i);
      setGhost({ geom, invalid: false });
    }
  }, []);

  const stepResize = (i: ResizeInteraction) => {
    const p = propsRef.current;
    const g = p.geom;
    if (i.axis === "w") {
      const w = clamp(g.w + i.step, p.minSize, p.cols - g.col);
      const next = p.adjustResize?.({ ...g, w }, g, {
        axis: i.axis,
        dragAxis: i.dragAxis,
      }) ?? { ...g, w };
      if (!p.validate(next)) return;
      if (next.w !== g.w || next.col !== g.col || next.row !== g.row) {
        p.onResize(next.w, next.h, next.col, next.row);
      }
    } else {
      const h = clamp(g.h + i.step, p.minSize, p.rows - g.row);
      const next = p.adjustResize?.({ ...g, h }, g, {
        axis: i.axis,
        dragAxis: i.dragAxis,
      }) ?? { ...g, h };
      if (!p.validate(next)) return;
      if (next.h !== g.h || next.col !== g.col || next.row !== g.row) {
        p.onResize(next.w, next.h, next.col, next.row);
      }
    }
  };

  const handlePointerUp = useCallback(() => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    if (prevCursorRef.current !== null) {
      document.body.style.cursor = prevCursorRef.current;
      prevCursorRef.current = null;
    }
    const i = interRef.current;
    interRef.current = null;
    const p = propsRef.current;
    setGhost((prev) => {
      if (!i) return null;
      if (i.type === "move") {
        if (!movedRef.current) {
          p.onSelect();
          return null;
        }
        if (prev && !prev.invalid) p.onMove(prev.geom.col, prev.geom.row);
        return null;
      }
      // resize
      if (!movedRef.current) {
        stepResize(i);
        return null;
      }
      if (prev) p.onResize(prev.geom.w, prev.geom.h, prev.geom.col, prev.geom.row);
      return null;
    });
  }, [handlePointerMove]);

  useEffect(
    () => () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (prevCursorRef.current !== null) {
        document.body.style.cursor = prevCursorRef.current;
        prevCursorRef.current = null;
      }
    },
    [handlePointerMove, handlePointerUp]
  );

  const beginInteraction = (inter: Interaction) => {
    interRef.current = inter;
    movedRef.current = false;
    prevCursorRef.current = document.body.style.cursor;
    document.body.style.cursor =
      inter.type === "move"
        ? "grabbing"
        : inter.dragAxis === "x"
        ? "ew-resize"
        : "ns-resize";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const startMove = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const rect = canvasRef.current!.getBoundingClientRect();
    beginInteraction({
      type: "move",
      startX: e.clientX,
      startY: e.clientY,
      cellW: rect.width / cols,
      cellH: rect.height / rows,
      origCol: geom.col,
      origRow: geom.row,
      w: geom.w,
      h: geom.h,
    });
  };

  const startResize =
    (axis: ResizeAxis, step: number, dragAxis: DragAxis) =>
    (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const rect = canvasRef.current!.getBoundingClientRect();
    beginInteraction({
      type: "resize",
      axis,
      dragAxis,
      step,
      startX: e.clientX,
      startY: e.clientY,
      cellW: rect.width / cols,
      cellH: rect.height / rows,
      col: geom.col,
      row: geom.row,
      w: geom.w,
      h: geom.h,
    });
  };

  const style: React.CSSProperties = {
    left: `${(render.col / cols) * 100}%`,
    top: `${(render.row / rows) * 100}%`,
    width: `${(render.w / cols) * 100}%`,
    height: `${(render.h / rows) * 100}%`,
  };

  const controlsStyle: React.CSSProperties = {
    left: `${((controls.col - render.col) / render.w) * 100}%`,
    top: `${((controls.row - render.row) / render.h) * 100}%`,
    width: `${(controls.w / render.w) * 100}%`,
    height: `${(controls.h / render.h) * 100}%`,
  };

  return (
    <div
      className={cn(
        "absolute touch-none",
        padded && "p-1",
        ghost ? "cursor-grabbing" : "cursor-grab",
        !ghost && "transition-[left,top] duration-75",
        // while interacting, float above every layer so the item (and its
        // invalid state) stays visible; otherwise sit in its own tier
        ghost ? "z-[220]" : selected ? "z-[200]" : zIdle
      )}
      style={style}
      onPointerDown={startMove}
    >
      <div className="relative h-full w-full">
        {renderBody({ invalid, selected, geom: render })}

        {selected && !ghost && (
          <div
            className="pointer-events-none absolute z-[210]"
            style={controlsStyle}
          >
            {toolbar && (
              <div className="pointer-events-auto absolute bottom-full left-1/2 z-[211] mb-2 flex -translate-x-1/2 gap-1">
                {toolbar}
              </div>
            )}
            {/* horizontal carets — just outside the right edge */}
            {canResizeAxis(horizontalResizeAxis) && (
              <div className="pointer-events-auto absolute left-full top-1/2 z-[211] ml-2 flex -translate-y-1/2 flex-col gap-1">
                <button
                  type="button"
                  className={cn(CARET_BTN, "cursor-ew-resize")}
                  title="Widen (drag to resize)"
                  onPointerDown={startResize(horizontalResizeAxis, 1, "x")}
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  className={cn(CARET_BTN, "cursor-ew-resize")}
                  title="Narrow (drag to resize)"
                  disabled={geom[horizontalResizeAxis] <= minSize}
                  onPointerDown={
                    geom[horizontalResizeAxis] <= minSize
                      ? undefined
                      : startResize(horizontalResizeAxis, -1, "x")
                  }
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            )}
            {/* vertical carets — just outside the bottom edge */}
            {canResizeAxis(verticalResizeAxis) && (
              <div className="pointer-events-auto absolute top-full left-1/2 z-[211] mt-2 flex -translate-x-1/2 gap-1">
                <button
                  type="button"
                  className={cn(CARET_BTN, "cursor-ns-resize")}
                  title="Lengthen (drag to resize)"
                  onPointerDown={startResize(verticalResizeAxis, 1, "y")}
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  className={cn(CARET_BTN, "cursor-ns-resize")}
                  title="Shorten (drag to resize)"
                  disabled={geom[verticalResizeAxis] <= minSize}
                  onPointerDown={
                    geom[verticalResizeAxis] <= minSize
                      ? undefined
                      : startResize(verticalResizeAxis, -1, "y")
                  }
                >
                  <ChevronUp size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
