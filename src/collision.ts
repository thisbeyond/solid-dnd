import { Draggable, Droppable } from "./drag-drop-context";
import {
  distanceBetweenPoints,
  intersectionRatioOfLayouts,
  layoutCenter,
  transformLayout,
} from "./layout";

const closestCenter = (
  draggable: Draggable,
  droppables: Droppable[],
  context: { activeDroppableId: string | number | null }
) => {
  const draggableLayout = transformLayout(
    draggable.layout,
    draggable.transform
  );

  const point1 = layoutCenter(draggableLayout);
  const collision = { distance: Infinity, droppable: null as Droppable | null };

  for (const droppable of droppables) {
    const distance = distanceBetweenPoints(
      point1,
      layoutCenter(droppable.layout)
    );

    if (distance < collision.distance) {
      collision.distance = distance;
      collision.droppable = droppable;
    } else if (
      distance === collision.distance &&
      droppable.id === context.activeDroppableId
    ) {
      collision.droppable = droppable;
    }
  }

  return collision.droppable;
};

const mostIntersecting = (
  draggable: Draggable,
  droppables: Droppable[],
  context: { activeDroppableId: string | number | null }
) => {
  const draggableLayout = transformLayout(
    draggable.layout,
    draggable.transform
  );

  const collision = { ratio: 0, droppable: null as Droppable | null };

  for (const droppable of droppables) {
    const ratio = intersectionRatioOfLayouts(draggableLayout, droppable.layout);

    if (ratio > collision.ratio) {
      collision.ratio = ratio;
      collision.droppable = droppable;
    } else if (
      ratio === collision.ratio &&
      droppable.id === context.activeDroppableId
    ) {
      collision.droppable = droppable;
    }
  }

  return collision.droppable;
};

export { closestCenter, mostIntersecting };
