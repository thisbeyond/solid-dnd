interface Point {
  x: number;
  y: number;
}

interface Transform {
  x: number;
  y: number;
}

class Layout {
  x;
  y;
  width;
  height;

  constructor(rect: { x: number; y: number; width: number; height: number }) {
    this.x = Math.floor(rect.x);
    this.y = Math.floor(rect.y);
    this.width = Math.floor(rect.width);
    this.height = Math.floor(rect.height);
  }

  get rect() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  get left() {
    return this.x;
  }

  get top() {
    return this.y;
  }

  get right() {
    return this.x + this.width;
  }

  get bottom() {
    return this.y + this.height;
  }

  get center(): Point {
    return {
      x: this.x + this.width * 0.5,
      y: this.y + this.height * 0.5,
    };
  }

  get corners(): {
    topLeft: Point;
    topRight: Point;
    bottomRight: Point;
    bottomLeft: Point;
  } {
    return {
      topLeft: { x: this.left, y: this.top },
      topRight: { x: this.right, y: this.top },
      bottomRight: { x: this.left, y: this.bottom },
      bottomLeft: { x: this.right, y: this.bottom },
    };
  }
}

const elementLayout = (element: HTMLElement): Layout => {
  let layout = new Layout(element.getBoundingClientRect());

  const { transform } = getComputedStyle(element);
  if (transform) {
    layout = stripTransformFromLayout(layout, transform);
  }

  return layout;
};

const stripTransformFromLayout = (
  layout: Layout,
  transform: string
): Layout => {
  let translateX, translateY;

  if (transform.startsWith("matrix3d(")) {
    const matrix = transform.slice(9, -1).split(/, /);
    translateX = +matrix[12];
    translateY = +matrix[13];
  } else if (transform.startsWith("matrix(")) {
    const matrix = transform.slice(7, -1).split(/, /);
    translateX = +matrix[4];
    translateY = +matrix[5];
  } else {
    translateX = 0;
    translateY = 0;
  }

  return new Layout({
    ...layout,
    x: layout.x - translateX,
    y: layout.y - translateY,
  });
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
  return new Layout({
    ...layout,
    x: layout.x + transform.x,
    y: layout.y + transform.y,
  });
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
  Layout,
  elementLayout,
  noopTransform,
  transformsAreEqual,
  transformLayout,
  stripTransformFromLayout,
  distanceBetweenPoints,
  intersectionRatioOfLayouts,
  layoutsAreEqual,
  layoutContainsPoint,
};
export type { Point, Transform };
