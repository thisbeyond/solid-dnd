import { createContext, createEffect, untrack, useContext } from "solid-js";
import { createStore } from "solid-js/store";

import { useDragDropContext } from "./drag-drop-context";
import { moveArrayItem } from "./move-array-item";

export const Context = createContext();

export const SortableContext = (props) => {
  const [dndState] = useDragDropContext();

  const [state, setState] = createStore({
    initialIds: [],
    sortedIds: [],
  });

  const isValidIndex = ({ index }) => {
    return index >= 0 && index < state.initialIds.length;
  };

  createEffect(() => {
    setState("initialIds", [...props.ids]);
    setState("sortedIds", [...props.ids]);
  });

  createEffect(() => {
    if (dndState.active.draggable && dndState.active.droppable) {
      untrack(() => {
        const fromIndex = state.sortedIds.indexOf(dndState.active.draggable);
        const toIndex = state.sortedIds.indexOf(dndState.active.droppable);
        if (
          fromIndex !== toIndex &&
          isValidIndex({ index: fromIndex }) &&
          isValidIndex({ index: toIndex })
        ) {
          const resorted = moveArrayItem({
            array: state.sortedIds,
            fromIndex,
            toIndex,
          });
          setState("sortedIds", resorted);
        }
      });
    } else {
      setState("sortedIds", [...props.ids]);
    }
  });

  const actions = {};
  const context = [state, actions];

  return <Context.Provider value={context}>{props.children}</Context.Provider>;
};

export const useSortableContext = () => {
  return useContext(Context);
};
