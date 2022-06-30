import { createEffect } from "solid-js";

import { createDraggable } from "./create-draggable";
import { createDroppable } from "./create-droppable";
import { RefSetter, combineRefs } from "./combine-refs";
import { useSortableContext } from "./sortable-context";
import { Id, Listeners, useDragDropContext } from "./drag-drop-context";
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

const createSortable = (id: Id, data: Record<string, any> = {}): Sortable => {
  const [dndState, { displace }] = useDragDropContext()!;
  const [sortableState] = useSortableContext()!;
  const draggable = createDraggable(id, data);
  const droppable = createDroppable(id, data);
  const setNode = combineRefs(draggable.ref, droppable.ref);

  const initialIndex = (): number => sortableState.initialIds.indexOf(id);
  const currentIndex = (): number => sortableState.sortedIds.indexOf(id);
  const layoutById = (id: Id): Layout | null =>
    dndState.droppables[id]?.layout || null;

  const sortedTransform = (): Transform => {
    const delta = noopTransform();
    const resolvedInitialIndex = initialIndex();
    const resolvedCurrentIndex = currentIndex();

    if (resolvedCurrentIndex !== resolvedInitialIndex) {
      const currentLayout = layoutById(id);
      const targetLayout = layoutById(
        sortableState.initialIds[resolvedCurrentIndex]
      );

      if (currentLayout && targetLayout) {
        delta.x = targetLayout.x - currentLayout.x;
        delta.y = targetLayout.y - currentLayout.y;
      }
    }

    return delta;
  };

  createEffect(() => {
    displace("droppables", id, sortedTransform());
  });

  const transform = (): Transform => {
    return (
      (id === dndState.active.draggableId && !dndState.usingDragOverlay
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
