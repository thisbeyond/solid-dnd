import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Setter,
} from "solid-js";

import { Id, useDragDropContext } from "./drag-drop-context";
import {
  elementLayout,
  noopTransform,
  Transform,
  transformsAreEqual,
} from "./layout";
import { transformStyle } from "./style";

interface Droppable {
  (element: HTMLElement, accessor?: () => { skipTransform?: boolean }): void;
  ref: Setter<HTMLElement | null>;
  get isActiveDroppable(): boolean;
  get transform(): Transform;
}

const createDroppable = (id: Id, data: Record<string, any> = {}): Droppable => {
  const [state, { addDroppable, removeDroppable }] = useDragDropContext()!;
  const [node, setNode] = createSignal<HTMLElement | null>(null);

  onMount(() => {
    const resolvedNode = node();

    if (resolvedNode) {
      addDroppable({
        id,
        node: resolvedNode,
        layout: elementLayout(resolvedNode),
        data,
      });
    }
  });
  onCleanup(() => removeDroppable(id));

  const isActiveDroppable = createMemo(() => state.active.droppableId === id);
  const transform = createMemo(() => {
    return state.droppables[id]?.transform || noopTransform();
  });
  const droppable = Object.defineProperties(
    (element: HTMLElement, accessor?: () => { skipTransform?: boolean }) => {
      const config = accessor ? accessor() : {};

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
      isActiveDroppable: {
        enumerable: true,
        get: isActiveDroppable,
      },
      transform: {
        enumerable: true,
        get: transform,
      },
    }
  ) as Droppable;

  return droppable;
};

export { createDroppable };
