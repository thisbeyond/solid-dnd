export const elementLayout = ({ element }) => {
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

export const translateLayout = ({ layout, translate }) => {
  return {
    ...layout,
    x: layout.x + translate.x,
    y: layout.y + translate.y,
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

export const layoutCenter = ({ layout }) => {
  return {
    x: layout.x + layout.width * 0.5,
    y: layout.y + layout.height * 0.5,
  };
};

export const distanceBetweenPoints = ({ point1, point2 }) => {
  return Math.sqrt(
    Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
  );
};

export const closestLayoutCenter = ({ layout, layouts }) => {
  const point1 = layoutCenter({ layout });
  const distances = layouts.map((layout) =>
    distanceBetweenPoints({ point1, point2: layoutCenter({ layout }) })
  );
  if (distances.length === 0) {
    return null;
  }
  const minDistance = Math.min(...distances);
  return layouts[distances.indexOf(minDistance)];
};

export const intersectionRatioOfLayouts = ({ layout1, layout2 }) => {
  const top = Math.max(layout1.top, layout2.top);
  const left = Math.max(layout1.left, layout2.left);
  const right = Math.min(layout1.right, layout2.right);
  const bottom = Math.min(layout1.bottom, layout2.bottom);

  const width = right - left;
  const height = bottom - top;

  if (left < right && top < bottom) {
    const layout1Area = layout1.width * layout1.height;
    const layout2Area = layout2.width * layout2.height;
    const intersectionArea = width * height;
    return intersectionArea / (layout1Area + layout2Area - intersectionArea);
  }

  return 0;
};

export const mostIntersectingLayout = ({ layout, layouts }) => {
  const intersectionRatios = layouts.map((layout2) =>
    intersectionRatioOfLayouts({ layout1: layout, layout2 })
  );
  if (intersectionRatios.length === 0) {
    return null;
  }
  const maxRatio = Math.max(...intersectionRatios);
  return maxRatio > 0 ? layouts[intersectionRatios.indexOf(maxRatio)] : null;
};

export const layoutsAreEqual = ({ layout1, layout2 }) => {
  return (
    layout1.x === layout2.x &&
    layout1.y === layout2.y &&
    layout1.width === layout2.width &&
    layout1.height === layout2.height
  );
};

export const layoutContainsPoint = ({ layout, point }) => {
  return !(
    point.x < layout.left ||
    point.x > layout.right ||
    point.y > layout.bottom ||
    point.y < layout.top
  );
};
