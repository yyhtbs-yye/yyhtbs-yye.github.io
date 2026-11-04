import { DEFAULT_SCENE, validateScene, parseScene, solve, embedURL, iframeCode } from './model.js';
import { fixedView } from './view.js';

const $ = (id) => document.getElementById(id);
const embedded = document.documentElement.dataset.embed === 'true';
let scene = validateScene(DEFAULT_SCENE);
const canvas = $('ray-diagram');
const ctx = canvas.getContext('2d');
const fmt = (v) => Number.isFinite(v) ? Number(v.toFixed(2)).toString() : '∞';

function diagram(result) {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!ctx || !width || !height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue('--ink').trim(), muted = css.getPropertyValue('--muted').trim();
  const blue = css.getPropertyValue('--blue').trim(), orange = css.getPropertyValue('--orange').trim();
  const d = scene.object.distance, f = scene.lens.focalLength, h = scene.object.height;
  const di = result.distance, ih = result.magnification * h;
  const { min, max, extent, x, y } = fixedView(width, height);
  const line = (a, b, c, e, color, dash = [], weight = 1.8) => {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.setLineDash(dash);
    ctx.moveTo(x(a), y(b)); ctx.lineTo(x(c), y(e)); ctx.stroke(); ctx.setLineDash([]);
  };
  const label = (text, a, b, color = muted) => {
    ctx.fillStyle = color; ctx.font = '12px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(text, x(a), y(b));
  };
  const arrow = (a, top, color, dashed = false) => {
    line(a, 0, a, top, color, dashed ? [4, 3] : [], 2.5);
    const px = x(a), py = y(top), sign = top > 0 ? 1 : -1;
    ctx.beginPath(); ctx.fillStyle = color; ctx.moveTo(px, py);
    ctx.lineTo(px - 4.5, py + sign * 9); ctx.lineTo(px + 4.5, py + sign * 9); ctx.closePath(); ctx.fill();
  };
  line(min, 0, max, 0, muted, [], 1);
  [-f, f].forEach((v) => { line(v, -0.6, v, 0.6, muted, [], 1); label('F', v, -3.5); });
  // Clip ray segments to the canvas so near-focal images never produce huge draw calls.
  const end = Math.min(max, Math.max(f, f * (1 + extent / h)));
  line(-d, h, 0, h, blue); line(0, h, end, h * (1 - end / f), blue);
  const centerEnd = Math.min(max, extent * d / h);
  line(-d, h, 0, 0, blue); line(0, 0, centerEnd, -h * centerEnd / d, blue);
  if (result.kind === 'virtual') {
    const back = Math.max(min, di, -extent * d / h, f * (1 - extent / h));
    line(0, h, back, h * (1 - back / f), blue, [4, 5], 1.2);
    line(0, 0, back, -h * back / d, blue, [4, 5], 1.2);
  }
  arrow(-d, h, ink); label('物体', -d, h + 3, ink);
  const visible = Number.isFinite(di) && di > min + 2 && di < max - 2 && Math.abs(ih) < extent - 2;
  // Canvas clips the image at its actual coordinates, including partly visible images.
  if (Number.isFinite(di)) { arrow(di, ih, orange, di < 0); label(di > 0 ? '实像' : '虚像', di, ih + (ih > 0 ? 5 : -5), orange); }
  const lx = x(0), top = height / 2 - 90, bottom = height / 2 + 90;
  ctx.beginPath(); ctx.moveTo(lx, top);
  ctx.bezierCurveTo(lx + 17, top + 20, lx + 17, bottom - 20, lx, bottom);
  ctx.bezierCurveTo(lx - 17, bottom - 20, lx - 17, top + 20, lx, top);
  ctx.fillStyle = blue; ctx.globalAlpha = 0.1; ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = blue; ctx.lineWidth = 2; ctx.stroke();
  $('view-note').textContent = [d >= -min ? '物体超出视野' : '', result.kind !== 'infinite' && !visible ? '像超出视野' : ''].filter(Boolean).join(' · ') || '固定坐标 · 透镜中心 (0, 0)';
  canvas.setAttribute('aria-label', `物距 ${fmt(d)} cm，焦距 ${fmt(f)} cm；${$('image-description').textContent}，像距 ${fmt(di)} cm，放大率 ${fmt(result.magnification)}${visible ? '' : '，像不在当前视野内'}`);
}

function render() {
  const r = solve(scene);
  $('object-value').textContent = `${fmt(scene.object.distance)} cm`;
  $('focus-value').textContent = `${fmt(scene.lens.focalLength)} cm`;
  $('numeric-equation').textContent = r.kind === 'infinite' ? `1 / ${fmt(scene.lens.focalLength)} = 1 / ${fmt(scene.object.distance)} + 0` : `1 / ${fmt(scene.lens.focalLength)} = 1 / ${fmt(scene.object.distance)} + 1 / (${fmt(r.distance)})`;
  $('image-description').textContent = { real: '出射光相交，形成倒立实像', virtual: '反向延长线相交，形成正立虚像', infinite: '物体位于焦点，出射光平行' }[r.kind];
  $('image-distance').textContent = `${fmt(r.distance)} cm`;
  $('magnification').textContent = r.kind === 'infinite' ? '—' : fmt(r.magnification);
  diagram(r);
  if (!embedded) {
    const url = embedURL(location.href, scene);
    $('share-url').value = url; $('iframe-code').value = iframeCode(url);
    $('scene-json').value = JSON.stringify(scene, null, 2);
  }
}

function configure() {
  for (const [id, config, value] of [
    ['object-distance', scene.controls.objectDistance, scene.object.distance],
    ['focal-length', scene.controls.focalLength, scene.lens.focalLength],
  ]) {
    const input = $(id);
    for (const name of ['min', 'max', 'step']) input[name] = config[name];
    input.value = value;
  }
  render();
}

const encoded = new URLSearchParams(location.search).get('scene');
if (encoded !== null) {
  try { scene = parseScene(encoded); }
  catch (error) { $('load-error').hidden = false; $('load-error').textContent = `场景链接无效，已载入默认实验：${error.message}`; }
}
configure();
$('object-distance').addEventListener('input', (event) => { scene.object.distance = Number(event.target.value); render(); });
$('focal-length').addEventListener('input', (event) => { scene.lens.focalLength = Number(event.target.value); render(); });
$('apply-json').addEventListener('click', () => {
  try { scene = parseScene($('scene-json').value); configure(); $('config-status').textContent = '已应用，嵌入链接已更新。'; }
  catch (error) { $('config-status').textContent = `未应用：${error.message}`; }
});
$('reset-scene').addEventListener('click', () => { scene = validateScene(DEFAULT_SCENE); configure(); $('config-status').textContent = '已恢复默认实验。'; });
for (const [button, field] of [['copy-url', 'share-url'], ['copy-code', 'iframe-code']]) {
  $(button).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($(field).value); $('share-status').textContent = '已复制。'; }
    catch { $(field).focus(); $(field).select(); $('share-status').textContent = '请按 Ctrl/Cmd + C 复制已选中的内容。'; }
  });
}
new ResizeObserver(() => diagram(solve(scene))).observe(canvas);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => diagram(solve(scene)));
