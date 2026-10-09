export type GridRect = { col: number; row: number; w: number; h: number };
export type GridSize = { cols: number; rows: number };
export type GridPlacement = GridRect & { x: number; y: number };

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const makeLayoutId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;

export const rectsOverlap = (a: GridRect, b: GridRect) =>
  a.col < b.col + b.w &&
  a.col + a.w > b.col &&
  a.row < b.row + b.h &&
  a.row + a.h > b.row;

export const isRectInGrid = (rect: GridRect, grid: GridSize) =>
  rect.col >= 0 &&
  rect.row >= 0 &&
  rect.col + rect.w <= grid.cols &&
  rect.row + rect.h <= grid.rows;

export const rotatedBounds = (
  { col, row, w, h }: GridRect,
  rotation = 0
): GridRect => {
  const normalized = ((rotation % 360) + 360) % 360;
  if (normalized === 0) return { col, row, w, h };

  const radians = (normalized * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const boundsW = w * cos + h * sin;
  const boundsH = w * sin + h * cos;
  const centerCol = col + w / 2;
  const centerRow = row + h / 2;

  return {
    col: centerCol - boundsW / 2,
    row: centerRow - boundsH / 2,
    w: boundsW,
    h: boundsH,
  };
};

export const centeredGridPlacement = ({
  clientX,
  clientY,
  rect,
  grid,
  w,
  h,
}: {
  clientX: number;
  clientY: number;
  rect: DOMRect;
  grid: GridSize;
  w: number;
  h: number;
}): GridPlacement => {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const col = clamp(
    Math.round((x / rect.width) * grid.cols - w / 2),
    0,
    grid.cols - w
  );
  const row = clamp(
    Math.round((y / rect.height) * grid.rows - h / 2),
    0,
    grid.rows - h
  );

  return { col, row, w, h, x, y };
};

export const findNearestFree = <T extends GridRect>(
  candidate: T,
  grid: GridSize,
  isFree: (candidate: T) => boolean
): { col: number; row: number } | null => {
  for (let radius = 0; radius < Math.max(grid.cols, grid.rows); radius++) {
    let best: { col: number; row: number } | null = null;
    let bestDist = Infinity;

    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;

        const col = clamp(candidate.col + dc, 0, grid.cols - candidate.w);
        const row = clamp(candidate.row + dr, 0, grid.rows - candidate.h);
        if (!isFree({ ...candidate, col, row })) continue;

        const dist = (col - candidate.col) ** 2 + (row - candidate.row) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = { col, row };
        }
      }
    }

    if (best) return best;
  }

  return null;
};
