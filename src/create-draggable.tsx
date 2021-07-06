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
  const translate = () => state.draggables[id]?.translate;

  const draggable = Object.defineProperties(
    (node) => {
      setNode(node);
      createRenderEffect(() => {
        const { transform } = transformStyle({ translate: translate() });
        node.style.setProperty("transform", transform);
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

  return draggable;
};
