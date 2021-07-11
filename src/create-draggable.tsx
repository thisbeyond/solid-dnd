import {
  createEffect,
  createRenderEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

import { useDragDropContext } from "./drag-drop-context";
import { elementLayout } from "./layout";
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
  const translate = () => {
    const resolvedTranslate = state.draggables[id]?.translate;
    return resolvedTranslate === undefined ? { x: 0, y: 0 } : resolvedTranslate;
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
          const { transform } = transformStyle({ translate: translate() });
          element.style.setProperty("transform", transform);
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
      translate: {
        enumerable: true,
        get: translate,
      },
    }
  );

  return draggable;
};
