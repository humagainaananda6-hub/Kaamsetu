export interface WallPosition {
  col: number;
  row: number;
}

export interface TileTransform {
  x: number;
  y: number;
  z: number;
  rotateX: number;
  rotateY: number;
  scale: number;
  opacity: number;
  isFocused: boolean;
}

export const WALL_COLUMNS = 4;
export const TILE_WIDTH_STEP = 244;
export const TILE_HEIGHT_STEP = 304;
export const TILE_ORIGIN_OFFSET_X = -110;
export const TILE_ORIGIN_OFFSET_Y = -140;

export function getWallRows(totalItems: number, columns = WALL_COLUMNS): number {
  if (totalItems <= 0 || columns <= 0) return 0;
  return Math.ceil(totalItems / columns);
}

export function clampWallPosition(
  col: number,
  row: number,
  totalItems: number,
  columns = WALL_COLUMNS,
): WallPosition {
  if (totalItems <= 0) {
    return { col: 0, row: 0 };
  }
  const rows = getWallRows(totalItems, columns);
  const clampedRow = Math.max(0, Math.min(rows - 1, Math.trunc(row)));
  const itemsInRow = Math.max(1, Math.min(columns, totalItems - clampedRow * columns));
  const clampedCol = Math.max(0, Math.min(itemsInRow - 1, Math.trunc(col)));
  return { col: clampedCol, row: clampedRow };
}

export function stepWallPosition(
  current: WallPosition,
  deltaCol: number,
  deltaRow: number,
  totalItems: number,
  columns = WALL_COLUMNS,
): WallPosition {
  return clampWallPosition(current.col + deltaCol, current.row + deltaRow, totalItems, columns);
}

export function getActiveTileIndex(pos: WallPosition, columns = WALL_COLUMNS): number {
  return pos.row * columns + pos.col;
}

export function getTileGridCoords(
  index: number,
  columns = WALL_COLUMNS,
): { left: number; top: number; col: number; row: number } {
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    col,
    row,
    left: col * TILE_WIDTH_STEP + TILE_ORIGIN_OFFSET_X,
    top: row * TILE_HEIGHT_STEP + TILE_ORIGIN_OFFSET_Y,
  };
}

export function computeWallStageTransform(
  pos: WallPosition,
  tiltDelta?: { dc: number; dr: number },
): string {
  const base = `translate3d(${-pos.col * TILE_WIDTH_STEP}px, ${-pos.row * TILE_HEIGHT_STEP}px, 0)`;
  if (!tiltDelta || (tiltDelta.dc === 0 && tiltDelta.dr === 0)) {
    return base;
  }
  return `${base} rotateX(${tiltDelta.dr * -16}deg) rotateY(${tiltDelta.dc * 16}deg)`;
}

export function computeTileDepthStyle(
  index: number,
  activePos: WallPosition,
  columns = WALL_COLUMNS,
): TileTransform {
  const col = index % columns;
  const row = Math.floor(index / columns);
  const dc = col - activePos.col;
  const dr = row - activePos.row;
  const dist = Math.abs(dc) + Math.abs(dr);
  const isFocused = dist === 0;

  return {
    x: 0,
    y: 0,
    z: isFocused ? 110 : -dist * 40,
    rotateY: isFocused ? 0 : dc * -10,
    rotateX: isFocused ? 0 : dr * 8,
    scale: isFocused ? 1.05 : 1,
    opacity: isFocused ? 1 : Math.max(0.3, 1 - dist * 0.2),
    isFocused,
  };
}

export function classifySwipeDelta(
  dx: number,
  dy: number,
  threshold = 45,
): { dc: number; dr: number } | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) {
    return null;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return { dc: dx < 0 ? 1 : -1, dr: 0 };
  }
  return { dc: 0, dr: dy < 0 ? 1 : -1 };
}
