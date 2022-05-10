import { useDragDropContext } from "./drag-drop-context";
import { moveArrayItem } from "./move-array-item";
import {
  Component,
  createContext,
  createEffect,
  untrack,
  useContext,
} from "solid-js";
import { createStore, Store } from "solid-js/store";

interface SortableContextState {
  initialIds: Array<string | number>;
  sortedIds: Array<string | number>;
}
interface SortableContextProps {
  ids: Array<string | number>;
}

type SortableContext = [Store<SortableContextState>, {}];

const Context = createContext<SortableContext>();
const SortableProvider: Component<SortableContextProps> = (props) => {
  const [dndState] = useDragDropContext()!;

  const [state, setState] = createStore<SortableContextState>({
    initialIds: [],
    sortedIds: [],
  });

  const isValidIndex = (index: number): boolean => {
    return index >= 0 && index < state.initialIds.length;
  };

  createEffect(() => {
    setState("initialIds", [...props.ids]);
    setState("sortedIds", [...props.ids]);
  });

  createEffect(() => {
    if (dndState.active.draggableId && dndState.active.droppableId) {
      untrack(() => {
        const fromIndex = state.sortedIds.indexOf(dndState.active.draggableId!);
        const toIndex = state.initialIds.indexOf(dndState.active.droppableId!);

        if (!isValidIndex(fromIndex) || !isValidIndex(toIndex)) {
          setState("sortedIds", [...props.ids]);
        } else if (fromIndex !== toIndex) {
          const resorted = moveArrayItem(state.sortedIds, fromIndex, toIndex);
          setState("sortedIds", resorted);
        }
      });
    } else {
      setState("sortedIds", [...props.ids]);
    }
  });

  const actions = {};
  const context: SortableContext = [state, actions];

  return <Context.Provider value={context}>{props.children}</Context.Provider>;
};
const useSortableContext = (): SortableContext | null => {
  return useContext(Context) || null;
};

export { Context, SortableProvider, useSortableContext };
