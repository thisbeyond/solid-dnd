import { Portal } from "solid-js/web";
import { Component, JSX, Show } from "solid-js";

import { useDragDropContext } from "./drag-drop-context";
import { transformStyle } from "./style";
import { elementLayout } from "./layout";

interface DragOverlayProps {
  class?: string;
  style?: JSX.CSSProperties;
  activeDraggableClass?: string;
}

const DragOverlay: Component<DragOverlayProps> = (props) => {
  const [
    state,
    { activeDraggable, onDragStart, onDragEnd, setOverlay, clearOverlay },
  ] = useDragDropContext()!;

  let node: HTMLDivElement | undefined;

  onDragStart(({ draggable }) => {
    setOverlay({
      node: draggable.node,
      layout: draggable.layout,
    });

    queueMicrotask(() => {
      if (node) {
        const layout = elementLayout(node);
        const delta = {
          x: (draggable.layout.width - layout.width) / 2,
          y: (draggable.layout.height - layout.height) / 2,
        };
        layout.x += delta.x;
        layout.y += delta.y;
        setOverlay({ node, layout });
      }
    });
  });

  onDragEnd(() => clearOverlay());

  const style = (): JSX.CSSProperties => {
    const overlay = state.active.overlay;
    if (!overlay) return {};

    return {
      position: "fixed",
      transition: "transform 0s",
      top: `${overlay.layout.top}px`,
      left: `${overlay.layout.left}px`,
      ...transformStyle(overlay.transform),
      ...props.style,
    };
  };

  return (
    <Portal mount={document.body}>
      <Show when={activeDraggable()}>
        <div ref={node} class={props.class} style={style()}>
          {typeof props.children === "function"
            ? props.children(activeDraggable())
            : props.children}
        </div>
      </Show>
    </Portal>
  );
};

export { DragOverlay };
