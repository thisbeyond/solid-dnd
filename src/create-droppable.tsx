import { createRenderEffect, createSignal, onCleanup, onMount } from "solid-js";

import { useDragDropContext } from "./drag-drop-context";
import { elementLayout, noopTransform } from "./layout";
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
  const transform = () => {
    const resolvedTransform = state.droppables[id]?.transform;
    return resolvedTransform === undefined
      ? noopTransform()
      : resolvedTransform;
  };

  const droppable = Object.defineProperties(
    (element) => {
      setNode(element);

      createRenderEffect(() => {
        const style = transformStyle({ transform: transform() });
        element.style.setProperty("transform", style.transform);
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
