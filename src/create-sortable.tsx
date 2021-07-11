import { createDraggable } from "./create-draggable";
import { createDroppable } from "./create-droppable";
import { combineRefs } from "./combine-refs";
import { useSortableContext } from "./sortable-context";
import { useDragDropContext } from "./drag-drop-context";
import { createComputed } from "solid-js";

export const createSortable = (options) => {
  const { id } = options;
  const [dndState, { anyDraggableActive, displace }] = useDragDropContext();
  const [sortableState] = useSortableContext();
  const draggable = createDraggable(options);
  const droppable = createDroppable(options);
  const setNode = combineRefs(draggable.ref, droppable.ref);

  const initialIndex = () => sortableState.initialIds.indexOf(id);
  const currentIndex = () => sortableState.sortedIds.indexOf(id);
  const layoutById = ({ id }) => dndState.droppables[id]?.layout;

  const translate = () => {
    const delta = { x: 0, y: 0 };

    if (!anyDraggableActive() || currentIndex() === initialIndex()) {
      return delta;
    }

    const activeDraggableId = dndState.active.draggable;
    const activeDraggableLayout = layoutById({ id: activeDraggableId });
    const activeDraggableInitialIndex =
      sortableState.initialIds.indexOf(activeDraggableId);

    if (draggable.isActiveDraggable) {
      const activeDroppableId = dndState.active.droppable;
      const activeDroppableLayout = layoutById({ id: activeDroppableId });
      const activeDroppableInitialIndex =
        sortableState.initialIds.indexOf(activeDroppableId);
      delta.y =
        activeDroppableInitialIndex > activeDraggableInitialIndex
          ? activeDroppableLayout.y +
            activeDroppableLayout.outerHeight -
            (activeDraggableLayout.y + activeDraggableLayout.outerHeight)
          : activeDroppableLayout.y - activeDraggableLayout.y;
    } else {
      if (activeDraggableInitialIndex > initialIndex()) {
        delta.y += activeDraggableLayout.outerHeight;
      } else {
        delta.y -= activeDraggableLayout.outerHeight;
      }
    }

    return delta;
  };

  const sortable = Object.defineProperties(
    (element) => {
      draggable(element);
      droppable(element);

      createComputed(() => {
        if (dndState.usingDragOverlay || dndState.active.draggable !== id) {
          displace({ type: "droppables", id, translate: translate() });
        }
      });
    },
    {
      ref: {
        enumerable: true,
        value: setNode,
      },
      translate: {
        enumerable: true,
        get: translate,
      },
      isActiveDraggable: {
        enumerable: true,
        get: () => draggable.isActiveDraggable,
      },
      dragActivators: {
        enumerable: true,
        get: () => draggable.dragActivators,
      },
      isActiveDroppable: {
        enumerable: true,
        get: () => droppable.isActiveDroppable,
      },
    }
  );

  return sortable;
};
