import { Component, For, JSX, mergeProps, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";

import { Id, useDragDropContext } from "./drag-drop-context";
import { Layout, Transform } from "./layout";
import { layoutStyle, transformStyle } from "./style";

interface HighlighterProps {
  id: Id;
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
  const [state, { recomputeLayouts }] = useDragDropContext()!;

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
              transform={droppable.transform}
              active={droppable.id === state.active.droppable}
            />
          ) : null
        }
      </For>
      <For each={Object.values(state.draggables)}>
        {(draggable) =>
          draggable ? (
            <Highlighter
              id={draggable.id}
              layout={draggable.layout}
              transform={draggable.transform}
              active={draggable.id === state.active.draggable}
              color="blue"
              style={{
                "align-items": "flex-start",
                "justify-content": "flex-start",
                ...transformStyle(draggable.transform),
              }}
            />
          ) : null
        }
      </For>
    </Portal>
  );
};

export { DragDropDebugger };
