import { createSignal, onCleanup, onMount } from "solid-js";

import { useDragDropContext } from "./drag-drop-context";
import { elementLayout } from "./layout";

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

  return {
    ref: setNode,
    isActiveDraggable,
    get dragActivators() {
      return draggableActivators({ draggableId: id });
    },
    get translate() {
      return translate();
    },
  };
};
