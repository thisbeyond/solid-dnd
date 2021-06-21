import { createDraggable } from "./create-draggable";
import { createDroppable } from "./create-droppable";
import { combineRefs } from "./combine-refs";
import { useSortableContext } from "./sortable-context";
import { useDragDropContext } from "./drag-drop-context";

export const createSortable = (options) => {
  const [dndState, { anyDraggableActive }] = useDragDropContext();
  const [sortableState] = useSortableContext();
  const draggable = createDraggable(options);
  const droppable = createDroppable(options);
  const ref = combineRefs(draggable.ref, droppable.ref);

  const initialIndex = () => sortableState.initialIds.indexOf(options.id);
  const currentIndex = () => sortableState.sortedIds.indexOf(options.id);
  const layoutById = ({ id }) => dndState.droppables[id]?.layout;

  const translate = () => {
    if (
      !anyDraggableActive() ||
      !anyDraggableActive() ||
      currentIndex() === initialIndex()
    ) {
      return null;
    }

    const delta = { x: 0, y: 0 };
    const activeDraggableId = dndState.active.draggable;
    const activeDraggableLayout = layoutById({ id: activeDraggableId });
    const activeDraggableInitialIndex =
      sortableState.initialIds.indexOf(activeDraggableId);

    if (draggable.isActiveDraggable()) {
      const activeDroppableId = dndState.active.droppable;
      const activeDroppableLayout = layoutById({ id: activeDroppableId });
      const activeDroppableInitialIndex =
        sortableState.initialIds.indexOf(activeDroppableId);
      delta.y =
        activeDroppableInitialIndex > activeDraggableInitialIndex
          ? activeDroppableLayout.y +
            activeDroppableLayout.height -
            (activeDraggableLayout.y + activeDraggableLayout.height)
          : activeDroppableLayout.y - activeDraggableLayout.y;
    } else {
      const gap = 12;
      if (activeDraggableInitialIndex > initialIndex()) {
        delta.y += activeDraggableLayout.height + gap;
      } else {
        delta.y -= activeDraggableLayout.height + gap;
      }
    }

    return delta;
  };

  return {
    ...draggable,
    ...droppable,
    ref,
    get translate() {
      return translate();
    },
  };
};
