import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Setter,
  untrack,
} from "solid-js";

import {
  GetDraggableInfo,
  Id,
  Listeners,
  useDragDropContext,
} from "./drag-drop-context";
import {
  elementLayout,
  layoutsDelta,
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
  const [state, { setState, draggableActivators }] = useDragDropContext()!;
  const [node, setNode] = createSignal<HTMLElement | null>(null);

  onMount(() => {
    if (isActiveDraggable()) {
      const draggable = state.active.draggable;
      const resolvedNode = node();
      if (draggable && resolvedNode) {
        const previousLayout = draggable.layout;
        const layout = elementLayout(resolvedNode);

        const draggableInfo = {
          node: resolvedNode,
          layout,
          data,
        };

        if (!state.active.overlay) {
          const delta = layoutsDelta(layout, previousLayout);
          draggableInfo.offset = {
            x: draggable.offset.x + delta.x,
            y: draggable.offset.y + delta.y,
          };
        }

        setState("active", "draggable", draggableInfo);
      }
    }
  });

  const getDraggableInfo: GetDraggableInfo = () => {
    const resolvedNode = untrack(() => node());
    if (!resolvedNode) throw new Error(`No node resolved for draggable ${id}`);

    return {
      id,
      node: resolvedNode,
      layout: elementLayout(resolvedNode),
      data,
    };
  };

  const isActiveDraggable = () => state.active.draggableId === id;

  const transform = () =>
    (isActiveDraggable() && state.active.draggable?.transform) ||
    noopTransform();

  const transition = () =>
    isActiveDraggable() && state.active.draggable?.transition;

  const draggable = Object.defineProperties(
    (element: HTMLElement, accessor?: () => { skipTransform?: boolean }) => {
      const config = accessor ? accessor() : {};

      createEffect(() => {
        const resolvedNode = node();
        const activators = draggableActivators(getDraggableInfo);

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
            element.style.setProperty("transform", style.transform);
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
        get: () => draggableActivators(getDraggableInfo, true),
      },
      transform: {
        enumerable: true,
        get: transform,
      },
      transition: {
        enumerable: true,
        get: transition,
      },
    }
  ) as Draggable;

  return draggable;
};

export { createDraggable };
