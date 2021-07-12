import { createComputed } from "solid-js";

import { createDraggable } from "./create-draggable";
import { createDroppable } from "./create-droppable";
import { combineRefs } from "./combine-refs";
import { useSortableContext } from "./sortable-context";
import { useDragDropContext } from "./drag-drop-context";
import { noopTransform } from "./layout";

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

  const transform = () => {
    const delta = noopTransform();
    const resolvedInitialIndex = initialIndex();
    const resolvedCurrentIndex = currentIndex();

    if (
      !anyDraggableActive() ||
      resolvedCurrentIndex === resolvedInitialIndex
    ) {
      return delta;
    }

    const draggableId = dndState.active.draggable;
    const draggableInitialIndex = sortableState.initialIds.indexOf(draggableId);
    const draggableLayout = layoutById({ id: draggableId });

    if (draggable.isActiveDraggable) {
      const droppableId = dndState.active.droppable;
      const droppableLayout = layoutById({ id: droppableId });
      if (resolvedCurrentIndex > resolvedInitialIndex) {
        delta.y = droppableLayout.bottom - draggableLayout.bottom;
      } else {
        delta.y = droppableLayout.top - draggableLayout.top;
      }
    } else {
      if (resolvedCurrentIndex > resolvedInitialIndex) {
        const leadingId = sortableState.initialIds[draggableInitialIndex - 1];
        const leadingLayout = layoutById({ id: leadingId });
        const leadingGap = draggableLayout.top - leadingLayout.bottom;
        delta.y += draggableLayout.height + leadingGap;
      } else {
        const trailingId = sortableState.initialIds[draggableInitialIndex + 1];
        const trailingLayout = layoutById({ id: trailingId });
        const trailingGap = trailingLayout.top - draggableLayout.bottom;
        delta.y -= draggableLayout.height + trailingGap;
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
          displace({ type: "droppables", id, transform: transform() });
        }
      });
    },
    {
      ref: {
        enumerable: true,
        value: setNode,
      },
      transform: {
        enumerable: true,
        get: transform,
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
