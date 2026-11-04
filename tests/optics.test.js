import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SCENE, validateScene, parseScene, solve, embedURL, iframeCode } from '../interactive-optics/model.js';

test('thin lens covers real, virtual, and focal-point cases', () => {
  const scene = validateScene(DEFAULT_SCENE);
  let r = solve(scene);
  assert.equal(r.kind, 'real'); assert.ok(Math.abs(r.distance - 40 / 3) < 1e-10);
  assert.ok(Math.abs(r.magnification + 1 / 3) < 1e-10);
  scene.object.distance = 5; r = solve(scene);
  assert.deepEqual(r, { distance: -10, magnification: 2, kind: 'virtual' });
  scene.object.distance = 10;
  assert.deepEqual(solve(scene), { distance: Infinity, magnification: Infinity, kind: 'infinite' });
});

test('shared URL round trips a custom JSON scene and strips unrelated URL state', () => {
  const scene = validateScene(DEFAULT_SCENE);
  scene.controls.objectDistance = { min: 2, max: 90, step: 0.5 };
  scene.object.distance = 15.5;
  const url = new URL(embedURL('https://example.com/interactive-optics/?old=1#other', scene));
  assert.equal(url.searchParams.get('embed'), '1'); assert.equal(url.searchParams.get('old'), null);
  assert.equal(url.hash, '');
  assert.deepEqual(parseScene(url.searchParams.get('scene')), scene);
  const code = iframeCode(url.href);
  assert.match(code, /<iframe /); assert.match(code, /&amp;scene=/);
  assert.ok(!code.includes('srcdoc='));
});

test('invalid scenes cannot replace the validated model', () => {
  for (const change of [
    s => { s.model = 'arbitrary-script'; },
    s => { s.lens.focalLength = 0; },
    s => { s.object.distance = Infinity; },
    s => { s.object.height = -1; },
    s => { s.controls.objectDistance.step = 0; },
    s => { s.controls.objectDistance.min = 100; },
    s => { s.object.distance = 40.5; },
  ]) {
    const scene = structuredClone(DEFAULT_SCENE); change(scene);
    assert.throws(() => validateScene(scene));
  }
  assert.throws(() => parseScene('x'.repeat(12001)), /12,000/);
  assert.throws(() => parseScene('{broken'));
  const extra = { ...DEFAULT_SCENE, onload: 'alert(1)' };
  assert.equal('onload' in validateScene(extra), false);
});
