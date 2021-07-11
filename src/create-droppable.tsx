import { createRenderEffect, createSignal, onCleanup, onMount } from "solid-js";

import { useDragDropContext } from "./drag-drop-context";
import { elementLayout } from "./layout";
import { transformStyle } from "./style";

export const createDroppable = ({ id, data }) => {
  const [state, { addDroppable, removeDroppable }] = useDragDropContext();
  const [node, setNode] = createSignal(null);

  onMount(() =>
    addDroppable({
      id,
      node: node(),
      layout: elementLayout({ element: node() }),
      data,
    })
  );
  onCleanup(() => removeDroppable({ id }));

  const isActiveDroppable = () => state.active.droppable === id;
  const translate = () => {
    const resolvedTranslate = state.droppables[id]?.translate;
    return resolvedTranslate === undefined ? { x: 0, y: 0 } : resolvedTranslate;
  };

  const droppable = Object.defineProperties(
    (element) => {
      setNode(element);

      createRenderEffect(() => {
        const { transform } = transformStyle({ translate: translate() });
        element.style.setProperty("transform", transform);
      });
    },
    {
      ref: {
        enumerable: true,
        value: setNode,
      },
      isActiveDroppable: {
        enumerable: true,
        get: isActiveDroppable,
      },
    }
  );

  return droppable;
};
