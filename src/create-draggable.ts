import {
  createEffect,
  createSignal,
  createMemo,
  onCleanup,
  onMount,
  Setter,
} from "solid-js";

import { Id, Listeners, useDragDropContext } from "./drag-drop-context";
import {
  elementLayout,
  noopTransform,
  Transform,
  transformsAreEqual,
} from "./layout";
import { transformStyle } from "./style";

interface Draggable {
  (element: HTMLElement, accessor?: () => { skipTransform?: boolean }): void;
  ref: Setter<HTMLElement | null>;
  get isActiveDraggable(): boolean;
  get dragActivators(): Listeners;
  get transform(): Transform;
}

const createDraggable = (id: Id, data: Record<string, any> = {}): Draggable => {
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

  const isActiveDraggable = createMemo(() => state.active.draggableId === id);
  const transform = createMemo(() => {
    return state.draggables[id]?.transform || noopTransform();
  });

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
          const resolvedTransform = transform();

          if (!transformsAreEqual(resolvedTransform, noopTransform())) {
            const style = transformStyle(transform());
            element.style.setProperty("transform", style.transform ?? null);
          } else {
            element.style.removeProperty("transform");
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
      dragActivators: {
        enumerable: true,
        get: createMemo(() => draggableActivators(id, true)),
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
