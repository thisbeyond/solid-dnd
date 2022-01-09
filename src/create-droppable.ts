import { useDragDropContext } from "./drag-drop-context";
import {
  elementLayout,
  noopTransform,
  Transform,
  transformsAreEqual,
} from "./layout";
import { transformStyle } from "./style";
import {
  createRenderEffect,
  createSignal,
  onCleanup,
  onMount,
  Setter,
} from "solid-js";

interface Droppable {
  (element: HTMLElement): void;
  ref: Setter<HTMLElement | null>;
  get isActiveDroppable(): boolean;
}

const createDroppable = (
  id: string | number,
  data: Record<string, any> = {}
): Droppable => {
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

  const isActiveDroppable = () => state.active.droppable === id;
  const transform = (): Transform => {
    return state.droppables[id]?.transform || noopTransform();
  };
  const droppable = Object.defineProperties(
    (element: HTMLElement) => {
      setNode(element);

      createRenderEffect(() => {
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
      isActiveDroppable: {
        enumerable: true,
        get: isActiveDroppable,
      },
    }
  ) as Droppable;

  return droppable;
};

export { createDroppable };
