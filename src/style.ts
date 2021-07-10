export const layoutStyle = ({ layout }) => {
  return {
    top: `${layout.y}px`,
    left: `${layout.x}px`,
    width: `${layout.width}px`,
    height: `${layout.height}px`,
  };
};

export const transformStyle = ({ translate }) => {
  return { transform: `translate3d(${translate.x}px, ${translate.y}px, 0)` };
};
