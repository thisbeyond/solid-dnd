import { Portal } from "solid-js/web";
import { JSX, ParentComponent, Show } from "solid-js";

import { useDragDropContext } from "./drag-drop-context";
import { layoutStyle, transformStyle } from "./style";

interface DragOverlayProps {
  class?: string;
  style?: JSX.CSSProperties;
}

const DragOverlay: ParentComponent<DragOverlayProps> = (props) => {
  const [state, { setUsingDragOverlay }] = useDragDropContext()!;

  setUsingDragOverlay(true);

  const style = (): JSX.CSSProperties => {
    const draggable = state.active.draggable!;
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
      <Show when={state.active.draggable}>
        <div class={props.class} style={style()}>
          {props.children}
        </div>
      </Show>
    </Portal>
  );
};

export { DragOverlay };
