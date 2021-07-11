import { createRenderEffect, createSignal, onCleanup, onMount } from "solid-js";

import { useDragDropContext } from "./drag-drop-context";
import { elementLayout, noopTransform, transformsAreEqual } from "./layout";
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
        const resolvedTransform = transform();
        if (
          !transformsAreEqual({
            transform1: resolvedTransform,
            transform2: noopTransform(),
          })
        ) {
          const style = transformStyle({ transform: transform() });
          element.style.setProperty("transform", style.transform);
        } else {
          element.style.removeProperty("transform");
        }
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
