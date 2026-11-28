import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampWallPosition,
  classifySwipeDelta,
  computeTileDepthStyle,
  computeWallStageTransform,
  getActiveTileIndex,
  getTileGridCoords,
  getWallRows,
  stepWallPosition,
} from './showcase-wall';

test('getWallRows and clampWallPosition handle partial final rows cleanly', () => {
  assert.equal(getWallRows(10), 3);
  assert.equal(getWallRows(0), 0);

  // Row 2 has only 2 items (indices 8 and 9 -> cols 0 and 1)
  assert.deepEqual(clampWallPosition(3, 2, 10), { col: 1, row: 2 });
  assert.deepEqual(clampWallPosition(-2, -1, 10), { col: 0, row: 0 });
  assert.deepEqual(clampWallPosition(1, 5, 10), { col: 1, row: 2 });
  assert.deepEqual(clampWallPosition(2, 1, 0), { col: 0, row: 0 });
});

test('stepWallPosition moves cleanly across columns and rows', () => {
  let pos = { col: 0, row: 0 };
  pos = stepWallPosition(pos, 1, 0, 10);
  assert.deepEqual(pos, { col: 1, row: 0 });
  pos = stepWallPosition(pos, 0, 1, 10);
  assert.deepEqual(pos, { col: 1, row: 1 });
  assert.equal(getActiveTileIndex(pos), 5);
});

test('getTileGridCoords places tiles on 244x304 spatial grid around origin', () => {
  assert.deepEqual(getTileGridCoords(0), { col: 0, row: 0, left: -110, top: -140 });
  assert.deepEqual(getTileGridCoords(5), { col: 1, row: 1, left: 134, top: 164 });
});

test('computeTileDepthStyle pops focused tile forward and fades distant tiles', () => {
  const active = { col: 1, row: 0 };
  const focused = computeTileDepthStyle(1, active);
  assert.equal(focused.isFocused, true);
  assert.equal(focused.z, 110);
  assert.equal(focused.scale, 1.05);
  assert.equal(focused.opacity, 1);

  const neighbor = computeTileDepthStyle(2, active);
  assert.equal(neighbor.isFocused, false);
  assert.equal(neighbor.z, -40);
  assert.equal(neighbor.rotateY, -10);
  assert.equal(neighbor.opacity, 0.8);

  const mid = computeTileDepthStyle(7, active);
  assert.equal(Number(mid.opacity.toFixed(2)), 0.4);

  const far = computeTileDepthStyle(11, active);
  assert.equal(far.opacity, 0.3);
});

test('computeWallStageTransform and classifySwipeDelta produce expected 3D vectors', () => {
  assert.equal(
    computeWallStageTransform({ col: 2, row: 1 }),
    'translate3d(-488px, -304px, 0)',
  );
  assert.equal(
    computeWallStageTransform({ col: 1, row: 0 }, { dc: 1, dr: 0 }),
    'translate3d(-244px, 0px, 0) rotateX(0deg) rotateY(16deg)',
  );
  assert.equal(classifySwipeDelta(10, -20), null);
  assert.deepEqual(classifySwipeDelta(-80, 10), { dc: 1, dr: 0 });
  assert.deepEqual(classifySwipeDelta(12, 95), { dc: 0, dr: -1 });
});
