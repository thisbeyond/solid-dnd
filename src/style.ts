import { JSX } from "solid-js/jsx-runtime";

import { Layout, noopTransform, Transform, transformsAreEqual } from "./layout";

const layoutStyle = (layout: Layout): JSX.CSSProperties => {
  return {
    top: `${layout.y}px`,
    left: `${layout.x}px`,
    width: `${layout.width}px`,
    height: `${layout.height}px`,
  };
};

const transformStyle = (transform: Transform): JSX.CSSProperties => {
  return { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` };
};

const maybeTransformStyle = (transform: Transform): JSX.CSSProperties => {
  return transformsAreEqual(transform, noopTransform())
    ? {}
    : transformStyle(transform);
};

export { layoutStyle, transformStyle, maybeTransformStyle };
