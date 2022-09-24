import { Portal } from "solid-js/web";
import { JSX, ParentComponent, Show } from "solid-js";

import { Draggable, useDragDropContext } from "./drag-drop-context";
import { transformStyle } from "./style";
import { elementLayout } from "./layout";

interface DragOverlayProps {
  children: JSX.Element | Element | ((activeDraggable: Draggable | null) => (JSX.Element | Element));
  class?: string;
  style?: JSX.CSSProperties;
}

const DragOverlay: ParentComponent<DragOverlayProps> = (props) => {
  const [state, { onDragStart, onDragEnd, setOverlay, clearOverlay }] =
    useDragDropContext()!;

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

  onDragEnd(() => queueMicrotask(clearOverlay));

  const style = (): JSX.CSSProperties => {
    const overlay = state.active.overlay;
    const draggable = state.active.draggable;
    if (!overlay || !draggable) return {};

    return {
      position: "fixed",
      transition: "transform 0s",
      top: `${overlay.layout.top}px`,
      left: `${overlay.layout.left}px`,
      "min-width": `${draggable.layout.width}px`,
      "min-height": `${draggable.layout.height}px`,
      ...transformStyle(overlay.transform),
      ...props.style,
    };
  };

  return (
    <Portal mount={document.body}>
      <Show when={state.active.draggable}>
        <div ref={node} class={props.class} style={style()}>
          {typeof props.children === "function"
            ? props.children(state.active.draggable)
            : props.children}
        </div>
      </Show>
    </Portal>
  );
};

export { DragOverlay };

