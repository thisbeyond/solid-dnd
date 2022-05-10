import { Listeners, useDragDropContext } from "./drag-drop-context";
import {
  elementLayout,
  layoutsAreEqual,
  layoutsDelta,
  noopTransform,
  Transform,
  transformsAreEqual,
} from "./layout";
import { transformStyle } from "./style";
import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Setter,
  untrack,
} from "solid-js";

interface Draggable {
  (element: HTMLElement, accessor?: () => { skipTransform?: boolean }): void;
  ref: Setter<HTMLElement | null>;
  get isActiveDraggable(): boolean;
  get dragActivators(): Listeners;
  get transform(): Transform;
}

const DEFER_TRANSFORM_PERIOD = 15;

const createDraggable = (
  id: string | number,
  data: Record<string, any> = {}
): Draggable => {
  const [
    state,
    { addDraggable, removeDraggable, draggableActivators, onDragEnd },
  ] = useDragDropContext()!;
  const [node, setNode] = createSignal<HTMLElement | null>(null);

  onMount(() => {
    const resolvedNode = node();

    if (resolvedNode) {
      addDraggable({
        id,
        node: resolvedNode,
        layout: elementLayout(resolvedNode),
        data,
      });
    }
  });
  onCleanup(() => removeDraggable(id));

  const isActiveDraggable = () => state.active.draggableId === id;

  const [deferTransform, setDeferTransform] = createSignal(false);

  onDragEnd(({ draggable }) => {
    if (draggable?.id === id) {
      setDeferTransform(true);
      setTimeout(setDeferTransform, DEFER_TRANSFORM_PERIOD, false);
    }
  });

  const isTransitioning = () => {
    if (deferTransform()) {
      return false;
    }

    if (!state.usingDragOverlay && isActiveDraggable()) {
      return false;
    }

    return true;
  };

  const transform = () => {
    let transform = noopTransform();
    const current = state.draggables[id];
    if (current) {
      transform = current.transform;

      if (deferTransform()) {
        untrack(() => {
          const previous = state.previous.draggable;
          if (previous && previous.id === id) {
            transform = previous.transform;

            if (!layoutsAreEqual(previous.layout, current.layout)) {
              const delta = layoutsDelta(current.layout, previous.layout);

              transform = {
                x: transform.x + delta.x,
                y: transform.y + delta.y,
              };
            }
          }
        });
      }
    }

    return transform;
  };

  const draggable = Object.defineProperties(
    (element: HTMLElement, accessor?: () => { skipTransform?: boolean }) => {
      const config = accessor ? accessor() : {};

      createEffect(() => {
        const resolvedNode = node();
        const activators = draggableActivators(id);

        if (resolvedNode) {
          for (const key in activators) {
            resolvedNode.addEventListener(key, activators[key]);
          }
        }

        onCleanup(() => {
          if (resolvedNode) {
            for (const key in activators) {
              resolvedNode.removeEventListener(key, activators[key]);
            }
          }
        });
      });

      setNode(element);

      if (!config.skipTransform) {
        createEffect(() => {
          if (!state.usingDragOverlay) {
            const resolvedTransform = transform();

            if (!transformsAreEqual(resolvedTransform, noopTransform())) {
              const style = transformStyle(transform());
              element.style.setProperty("transform", style.transform);
            } else {
              element.style.removeProperty("transform");
            }
          }
        });
      }
    },
    {
      ref: {
        enumerable: true,
        value: setNode,
      },
      isActiveDraggable: {
        enumerable: true,
        get: isActiveDraggable,
      },
      isTransitioning: {
        enumerable: true,
        get: isTransitioning,
      },
      dragActivators: {
        enumerable: true,
        get: () => {
          return draggableActivators(id, true);
        },
      },
      transform: {
        enumerable: true,
        get: transform,
      },
    }
  ) as Draggable;

  return draggable;
};

export { createDraggable };
