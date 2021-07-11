export const layoutStyle = ({ layout }) => {
  return {
    top: `${layout.y}px`,
    left: `${layout.x}px`,
    width: `${layout.width}px`,
    height: `${layout.height}px`,
  };
};

export const transformStyle = ({ transform }) => {
  return { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` };
};
