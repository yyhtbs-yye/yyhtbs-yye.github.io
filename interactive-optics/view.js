// World origin is the lens center. One cm always occupies three CSS pixels,
// regardless of scene parameters or container size. Resizing only reveals or
// clips more of the same scene; it never fits the scene to the image/object.
export function fixedView(width, height) {
  const pixelsPerCm = 3;
  return {
    x: (cm) => width / 2 + cm * pixelsPerCm,
    y: (cm) => height / 2 - cm * pixelsPerCm,
    min: -width / (2 * pixelsPerCm),
    max: width / (2 * pixelsPerCm),
    extent: height / (2 * pixelsPerCm),
  };
}
