import { Draggable, Droppable } from "./drag-drop-context";
import {
  distanceBetweenPoints,
  intersectionRatioOfLayouts,
  transformLayout,
} from "./layout";

type CollisionDetector = (
  draggable: Draggable,
  droppables: Droppable[],
  context: { activeDroppableId: string | number | null }
) => Droppable | null;

const closestCenter: CollisionDetector = (draggable, droppables, context) => {
  const draggableLayout = transformLayout(
    draggable.layout,
    draggable.transform
  );

  const point1 = draggableLayout.center;
  const collision = { distance: Infinity, droppable: null as Droppable | null };

  for (const droppable of droppables) {
    const distance = distanceBetweenPoints(point1, droppable.layout.center);

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

const closestCorners: CollisionDetector = (draggable, droppables, context) => {
  const draggableLayout = transformLayout(
    draggable.layout,
    draggable.transform
  );

  const draggableCorners = draggableLayout.corners;
  const collision = { distance: Infinity, droppable: null as Droppable | null };

  for (const droppable of droppables) {
    const droppableCorners = droppable.layout.corners;
    const distance =
      distanceBetweenPoints(
        droppableCorners.topLeft,
        draggableCorners.topLeft
      ) +
      distanceBetweenPoints(
        droppableCorners.topRight,
        draggableCorners.topRight
      ) +
      distanceBetweenPoints(
        droppableCorners.bottomRight,
        draggableCorners.bottomRight
      ) +
      distanceBetweenPoints(
        droppableCorners.bottomLeft,
        draggableCorners.bottomLeft
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

const mostIntersecting: CollisionDetector = (
  draggable,
  droppables,
  context
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
      ratio > 0 &&
      ratio === collision.ratio &&
      droppable.id === context.activeDroppableId
    ) {
      collision.droppable = droppable;
    }
  }

  return collision.droppable;
};

export { closestCenter, closestCorners, mostIntersecting };
export type { CollisionDetector };
