import { Layout, Transform } from "./layout";
import { JSX } from "solid-js/jsx-runtime";

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

export { layoutStyle, transformStyle };
