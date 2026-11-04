import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixedView } from '../interactive-optics/view.js';

test('lens remains centered and absolute coordinate scale stays fixed on resize', () => {
  for (const [width, height] of [[600, 265], [300, 235], [900, 265]]) {
    const view = fixedView(width, height);
    assert.equal(view.x(0), width / 2);
    assert.equal(view.y(0), height / 2);
    assert.equal(view.x(40) - view.x(0), 120);
    assert.equal(view.y(0) - view.y(6), 18);
    assert.equal(view.x(view.min), 0);
    assert.equal(view.x(view.max), width);
  }
  // A distant object is clipped in a narrow viewport, never scaled into view.
  assert.ok(fixedView(300, 235).x(-80) < 0);
});
