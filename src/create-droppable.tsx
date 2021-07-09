import { createSignal, onCleanup, onMount } from "solid-js";

import { useDragDropContext } from "./drag-drop-context";
import { elementLayout } from "./layout";

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

  const droppable = Object.defineProperties(
    (element) => {
      setNode(element);
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
