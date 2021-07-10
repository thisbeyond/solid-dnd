import { Portal } from "solid-js/web";
import { Show } from "solid-js";

import { useDragDropContext } from "./drag-drop-context";
import { layoutStyle, transformStyle } from "./style";

export const DragOverlay = (props) => {
  const [, { anyDraggableActive, activeDraggable, setUsingDragOverlay }] =
    useDragDropContext();

  setUsingDragOverlay(true);

  const style = () => {
    const draggable = activeDraggable();
    return {
      position: "fixed",
      transition: "transform 0s",
      ...layoutStyle({ layout: draggable.layout }),
      ...transformStyle({ translate: draggable.translate }),
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
