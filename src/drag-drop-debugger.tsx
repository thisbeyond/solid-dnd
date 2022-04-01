import { Component, For, JSX, mergeProps } from "solid-js";
import { Portal } from "solid-js/web";

import { useDragDropContext } from "./drag-drop-context";
import { Layout, Transform } from "./layout";
import { layoutStyle, transformStyle } from "./style";

interface HighlighterProps {
  layout: Layout;
  transform: Transform;
  color?: string;
  style?: JSX.CSSProperties;
}

const Highlighter: Component<HighlighterProps> = (props) => {
  props = mergeProps({ color: "red" }, props);
  return (
    <div
      style={{
        position: "fixed",
        "pointer-events": "none",
        ...layoutStyle(props.layout),
        ...transformStyle(props.transform),
        outline: "1px dashed",
        "outline-color": props.color,
        ...props.style,
      }}
    />
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
              layout={droppable.layout}
              transform={droppable.transform}
            />
          ) : null
        }
      </For>
      <For each={Object.values(state.draggables)}>
        {(draggable) =>
          draggable ? (
            <Highlighter
              layout={draggable.layout}
              transform={draggable.transform}
              color="blue"
            />
          ) : null
        }
      </For>
    </Portal>
  );
};

export { DragDropDebugger };
