import {
  Component,
  For,
  JSX,
  mergeProps,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";

import { useDragDropContext } from "./drag-drop-context";
import { Layout, Transform } from "./layout";
import { layoutStyle, transformStyle } from "./style";

interface HighlighterProps {
  id: string | number;
  layout: Layout;
  transform: Transform;
  active?: boolean;
  color?: string;
  style?: JSX.CSSProperties;
}

const Highlighter: Component<HighlighterProps> = (props) => {
  props = mergeProps({ color: "red", active: false }, props);
  return (
    <div
      style={{
        position: "fixed",
        "pointer-events": "none",
        ...layoutStyle(props.layout),
        ...(props.transform ? transformStyle(props.transform) : {}),
        outline: "1px dashed",
        "outline-width": props.active ? "4px" : "1px",
        "outline-color": props.color,
        display: "flex",
        color: props.color,
        "align-items": "flex-end",
        "justify-content": "flex-end",
        ...props.style,
      }}
    >
      {props.id}
    </div>
  );
};

const DragDropDebugger = () => {
  const [state, { activeDraggable, recomputeLayouts }] = useDragDropContext()!;

  let ticking = false;

  const update = () => {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        recomputeLayouts();
        ticking = false;
      });

      ticking = true;
    }
  };

  onMount(() => {
    document.addEventListener("scroll", update);
  });

  onCleanup(() => {
    document.removeEventListener("scroll", update);
  });

  return (
    <Portal mount={document.body}>
      <For each={Object.values(state.droppables)}>
        {(droppable) =>
          droppable ? (
            <Highlighter
              id={droppable.id}
              layout={droppable.layout}
              active={droppable.id === state.active.droppableId}
            />
          ) : null
        }
      </For>
      <Show when={activeDraggable()}>
        {(draggable) => (
          <Highlighter
            id={draggable.id}
            layout={draggable.layout}
            transform={draggable.transform}
            active={true}
            color="blue"
            style={{
              "align-items": "flex-start",
              "justify-content": "flex-start",
            }}
          />
        )}
      </Show>
      <Show when={state.active.overlay}>
        {(overlay) => (
          <Highlighter
            id={"overlay"}
            layout={overlay.layout}
            transform={overlay.transform}
            active={true}
            color="lime"
            style={{
              "align-items": "flex-start",
              "justify-content": "flex-start",
            }}
          />
        )}
      </Show>
    </Portal>
  );
};

export { DragDropDebugger };
