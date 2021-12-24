interface Point {
  x: number;
  y: number;
}
interface Transform {
  x: number;
  y: number;
}
interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
  get top(): number;
  get left(): number;
  get right(): number;
  get bottom(): number;
}

const elementLayout = (element: HTMLElement): Layout => {
  const { x, y, width, height } = element.getBoundingClientRect();

  return {
    x,
    y,
    width,
    height,
    get left() {
      return this.x;
    },
    get top() {
      return this.y;
    },
    get right() {
      return this.x + this.width;
    },
    get bottom() {
      return this.y + this.height;
    },
  };
};
const noopTransform = (): Transform => ({ x: 0, y: 0 });
const transformsAreEqual = (
  firstTransform: Transform,
  secondTransform: Transform
): boolean => {
  return (
    firstTransform.x === secondTransform.x &&
    firstTransform.y === secondTransform.y
  );
};
const transformLayout = (layout: Layout, transform: Transform): Layout => {
  return {
    ...layout,
    x: layout.x + transform.x,
    y: layout.y + transform.y,
    get left() {
      return this.x;
    },
    get top() {
      return this.y;
    },
    get right() {
      return this.x + this.width;
    },
    get bottom() {
      return this.y + this.height;
    },
  };
};
const layoutCenter = (layout: Layout): Point => {
  return {
    x: layout.x + layout.width * 0.5,
    y: layout.y + layout.height * 0.5,
  };
};
const distanceBetweenPoints = (
  firstPoint: Point,
  secondPoint: Point
): number => {
  return Math.sqrt(
    Math.pow(firstPoint.x - secondPoint.x, 2) +
      Math.pow(firstPoint.y - secondPoint.y, 2)
  );
};
const closestLayoutCenter = (
  referenceLayout: Layout,
  layouts: Layout[]
): Layout | null => {
  const point1 = layoutCenter(referenceLayout);
  const distances = layouts.map((layout) =>
    distanceBetweenPoints(point1, layoutCenter(layout))
  );
  if (distances.length === 0) {
    return null;
  }
  const minDistance = Math.min(...distances);
  return layouts[distances.indexOf(minDistance)];
};
const intersectionRatioOfLayouts = (
  firstLayout: Layout,
  secondLayout: Layout
): number => {
  const top = Math.max(firstLayout.top, secondLayout.top);
  const left = Math.max(firstLayout.left, secondLayout.left);
  const right = Math.min(firstLayout.right, secondLayout.right);
  const bottom = Math.min(firstLayout.bottom, secondLayout.bottom);

  const width = right - left;
  const height = bottom - top;

  if (left < right && top < bottom) {
    const layout1Area = firstLayout.width * firstLayout.height;
    const layout2Area = secondLayout.width * secondLayout.height;
    const intersectionArea = width * height;
    return intersectionArea / (layout1Area + layout2Area - intersectionArea);
  }

  return 0;
};
const mostIntersectingLayout = (
  referenceLayout: Layout,
  layouts: Layout[]
): Layout | null => {
  const intersectionRatios = layouts.map((layout) =>
    intersectionRatioOfLayouts(referenceLayout, layout)
  );
  if (intersectionRatios.length === 0) {
    return null;
  }
  const maxRatio = Math.max(...intersectionRatios);
  return maxRatio > 0 ? layouts[intersectionRatios.indexOf(maxRatio)] : null;
};
const layoutsAreEqual = (
  firstLayout: Layout,
  secondLayout: Layout
): boolean => {
  return (
    firstLayout.x === secondLayout.x &&
    firstLayout.y === secondLayout.y &&
    firstLayout.width === secondLayout.width &&
    firstLayout.height === secondLayout.height
  );
};
const layoutContainsPoint = (layout: Layout, point: Point): boolean => {
  return !(
    point.x < layout.left ||
    point.x > layout.right ||
    point.y > layout.bottom ||
    point.y < layout.top
  );
};

export {
  elementLayout,
  noopTransform,
  transformsAreEqual,
  transformLayout,
  layoutCenter,
  distanceBetweenPoints,
  closestLayoutCenter,
  intersectionRatioOfLayouts,
  mostIntersectingLayout,
  layoutsAreEqual,
  layoutContainsPoint,
};
export type { Layout, Transform };
