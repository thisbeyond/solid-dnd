import { createSignal, onCleanup, onMount } from "solid-js";

import { useDragDropContext } from "./drag-drop-context";
import { elementLayout } from "./layout";

export const createDroppable = ({ id, disabled, data }) => {
  const [state, { addDroppable, removeDroppable }] = useDragDropContext();
  const [node, setNode] = createSignal(null);

  onMount(() =>
    addDroppable({
      id,
      disabled,
      node: node(),
      layout: elementLayout({ element: node() }),
      data,
    })
  );
  onCleanup(() => removeDroppable({ id }));

  const isActiveDroppable = () => state.active.droppable === id;

  return {
    ref: setNode,
    isActiveDroppable,
  };
};
