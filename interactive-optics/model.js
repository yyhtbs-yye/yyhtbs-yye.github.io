// A deliberately small, versioned scene format. Values are data, never executable code.
export const DEFAULT_SCENE = {
  version: 1,
  model: 'thin-lens',
  units: 'cm',
  lens: { focalLength: 10 },
  object: { distance: 40, height: 6 },
  controls: {
    objectDistance: { min: 5, max: 80, step: 1 },
    focalLength: { min: 5, max: 30, step: 1 },
  },
};

export function validateScene(value) {
  if (!value || value.version !== 1 || value.model !== 'thin-lens' || value.units !== 'cm') {
    throw new Error('需要 version: 1、model: "thin-lens"、units: "cm"。');
  }
  const number = (v, name, min, max) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
      throw new Error(`${name} 必须是 ${min} 到 ${max} 之间的数字。`);
    }
    return v;
  };
  const control = (v, name) => {
    const min = number(v?.min, `${name}.min`, 1, 200);
    const max = number(v?.max, `${name}.max`, 1, 200);
    const step = number(v?.step, `${name}.step`, 0.1, 20);
    if (min >= max || step > max - min) throw new Error(`${name} 的范围或步长无效。`);
    return { min, max, step };
  };
  const objectDistance = control(value.controls?.objectDistance, 'controls.objectDistance');
  const focalLength = control(value.controls?.focalLength, 'controls.focalLength');
  const distance = number(value.object?.distance, 'object.distance', objectDistance.min, objectDistance.max);
  const focal = number(value.lens?.focalLength, 'lens.focalLength', focalLength.min, focalLength.max);
  for (const [v, c] of [[distance, objectDistance], [focal, focalLength]]) {
    if (Math.abs((v - c.min) / c.step - Math.round((v - c.min) / c.step)) > 1e-7) {
      throw new Error('初始参数必须符合相应滑块的 step。');
    }
  }
  return {
    version: 1, model: 'thin-lens', units: 'cm',
    lens: { focalLength: focal },
    object: { distance, height: number(value.object?.height, 'object.height', 0.1, 30) },
    controls: { objectDistance, focalLength },
  };
}

export function solve(scene) {
  const d = scene.object.distance, f = scene.lens.focalLength;
  if (Math.abs(d - f) < 1e-9) return { distance: Infinity, magnification: Infinity, kind: 'infinite' };
  const distance = f * d / (d - f);
  return { distance, magnification: -distance / d, kind: distance > 0 ? 'real' : 'virtual' };
}

export function parseScene(text) {
  if (text.length > 12000) throw new Error('场景 JSON 过长（最多 12,000 字符）。');
  return validateScene(JSON.parse(text));
}

export function embedURL(base, scene) {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set('embed', '1');
  url.searchParams.set('scene', JSON.stringify(validateScene(scene)));
  return url.href;
}

export function iframeCode(url) {
  const escaped = url.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  return `<iframe src="${escaped}" title="薄透镜交互实验" width="100%" height="720" style="border:0;border-radius:16px" loading="lazy"></iframe>`;
}
