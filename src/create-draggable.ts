import { Listeners, useDragDropContext } from "./drag-drop-context";
import {
  elementLayout,
  noopTransform,
  Transform,
  transformsAreEqual,
} from "./layout";
import { transformStyle } from "./style";
import {
  createEffect,
  createRenderEffect,
  createSignal,
  onCleanup,
  onMount,
  Setter,
} from "solid-js";

interface Draggable {
  (element: HTMLElement): void;
  ref: Setter<HTMLElement | null>;
  get isActiveDraggable(): boolean;
  get dragActivators(): Listeners;
  get transform(): Transform;
}

const createDraggable = (
  id: string | number,
  data: Record<string, any> = {}
): Draggable => {
  const [state, { addDraggable, removeDraggable, draggableActivators }] =
    useDragDropContext()!;
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

  const isActiveDraggable = () => state.active.draggable === id;
  const transform = () => {
    return state.draggables[id]?.transform || noopTransform();
  };

  const draggable = Object.defineProperties(
    (element: HTMLElement) => {
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
      createRenderEffect(() => {
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
