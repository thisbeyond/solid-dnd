import { createEffect } from "solid-js";

import { createDraggable } from "./create-draggable";
import { createDroppable } from "./create-droppable";
import { RefSetter, combineRefs } from "./combine-refs";
import { useSortableContext } from "./sortable-context";
import { Listeners, useDragDropContext } from "./drag-drop-context";
import { Layout, noopTransform, Transform, transformsAreEqual } from "./layout";
import { transformStyle } from "./style";

interface Sortable {
  (element: HTMLElement): void;
  ref: RefSetter<HTMLElement | null>;
  get transform(): Transform;
  get dragActivators(): Listeners;
  get isActiveDraggable(): boolean;
  get isActiveDroppable(): boolean;
}

const createSortable = (
  id: string | number,
  data: Record<string, any> = {}
): Sortable => {
  const [dndState, { anyDraggableActive, displace }] = useDragDropContext()!;
  const [sortableState] = useSortableContext()!;
  const draggable = createDraggable(id, data);
  const droppable = createDroppable(id, data);
  const setNode = combineRefs(draggable.ref, droppable.ref);

  const initialIndex = (): number => sortableState.initialIds.indexOf(id);
  const currentIndex = (): number => sortableState.sortedIds.indexOf(id);
  const layoutById = (id: string | number): Layout | null =>
    dndState.droppables[id]?.layout || null;

  const sortedTransform = (): Transform => {
    const delta = noopTransform();
    const resolvedInitialIndex = initialIndex();
    const resolvedCurrentIndex = currentIndex();

    if (
      !anyDraggableActive() ||
      resolvedCurrentIndex === resolvedInitialIndex
    ) {
      return delta;
    }

    const draggableId = dndState.active.draggable!;
    const draggableInitialIndex = sortableState.initialIds.indexOf(draggableId);
    const draggableLayout = layoutById(draggableId)!;

    if (draggable.isActiveDraggable) {
      const droppableId = dndState.active.droppable!;
      const droppableLayout = layoutById(droppableId)!;
      if (resolvedCurrentIndex > resolvedInitialIndex) {
        delta.y = droppableLayout.bottom - draggableLayout.bottom;
      } else {
        delta.y = droppableLayout.top - draggableLayout.top;
      }
    } else {
      if (resolvedCurrentIndex > resolvedInitialIndex) {
        const leadingId = sortableState.initialIds[draggableInitialIndex - 1];
        const leadingLayout = layoutById(leadingId)!;
        const leadingGap = draggableLayout.top - leadingLayout.bottom;
        delta.y += draggableLayout.height + leadingGap;
      } else {
        const trailingId = sortableState.initialIds[draggableInitialIndex + 1];
        const trailingLayout = layoutById(trailingId)!;
        const trailingGap = trailingLayout.top - draggableLayout.bottom;
        delta.y -= draggableLayout.height + trailingGap;
      }
    }

    return delta;
  };

  createEffect(() => {
    displace("droppables", id, sortedTransform());
  });

  const transform = (): Transform => {
    return (
      (id === dndState.active.draggable && !dndState.usingDragOverlay
        ? dndState.draggables[id]?.transform
        : dndState.droppables[id]?.transform) || noopTransform()
    );
  };

  const sortable = Object.defineProperties(
    (element: HTMLElement) => {
      draggable(element, () => ({ skipTransform: true }));
      droppable(element, () => ({ skipTransform: true }));

      createEffect(() => {
        const resolvedTransform = transform();
        if (!transformsAreEqual(resolvedTransform, noopTransform())) {
          const style = transformStyle(transform());
          element.style.setProperty("transform", style.transform);
        } else {
          element.style.removeProperty("transform");
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
  ) as unknown as Sortable;

  return sortable;
};

export { createSortable };
