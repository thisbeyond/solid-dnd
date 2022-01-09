import { useDragDropContext } from "./drag-drop-context";
import { layoutStyle, transformStyle } from "./style";
import { Portal } from "solid-js/web";
import { Component, JSX, Show } from "solid-js";

interface DragOverlayProps {
  class?: string;
  style?: JSX.CSSProperties;
}

const DragOverlay: Component<DragOverlayProps> = (props) => {
  const [, { anyDraggableActive, activeDraggable, setUsingDragOverlay }] =
    useDragDropContext()!;

  setUsingDragOverlay(true);

  const style = (): JSX.CSSProperties => {
    const draggable = activeDraggable()!;
    return {
      position: "fixed",
      transition: "transform 0s",
      ...layoutStyle(draggable.layout),
      ...transformStyle(draggable.transform),
      ...props.style,
    };
  };

  return (
    <Portal mount={document.body}>
      <Show when={anyDraggableActive()}>
        <div class={props.class} style={style()}>
          {props.children}
        </div>
      </Show>
    </Portal>
  );
};

export { DragOverlay };
