import {
  createEffect,
  createRenderEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

import { useDragDropContext } from "./drag-drop-context";
import { elementLayout, noopTransform, transformsAreEqual } from "./layout";
import { transformStyle } from "./style";

export const createDraggable = ({ id, data }) => {
  const [state, { addDraggable, removeDraggable, draggableActivators }] =
    useDragDropContext();
  const [node, setNode] = createSignal(null);

  onMount(() =>
    addDraggable({
      id,
      node: node(),
      layout: elementLayout({ element: node() }),
      data,
    })
  );
  onCleanup(() => removeDraggable({ id }));

  const isActiveDraggable = () => state.active.draggable === id;
  const transform = () => {
    const resolvedTransform = state.draggables[id]?.transform;
    return resolvedTransform === undefined
      ? noopTransform()
      : resolvedTransform;
  };

  const draggable = Object.defineProperties(
    (element) => {
      createEffect(() => {
        const resolvedNode = node();
        const activators = draggableActivators({ draggableId: id });
        for (const key in activators) {
          resolvedNode.addEventListener(key, activators[key]);
        }

        onCleanup(() => {
          for (const key in activators) {
            resolvedNode.removeEventListener(key, activators[key]);
          }
        });
      });

      setNode(element);

      createRenderEffect(() => {
        if (!state.usingDragOverlay) {
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
        }
      });
    },
    {
      ref: {
        enumerable: true,
        value: setNode,
      },
      isActiveDraggable: {
        enumerable: true,
        get: isActiveDraggable,
      },
      dragActivators: {
        enumerable: true,
        get: () => {
          return draggableActivators({ draggableId: id, asHandlers: true });
        },
      },
      transform: {
        enumerable: true,
        get: transform,
      },
    }
  );

  return draggable;
};
