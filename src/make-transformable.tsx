import { noopTransform, Transform, transformLayout } from "./layout";
import {
  DraggableOrDroppable,
  DragDropState,
  Transformer,
} from "./drag-drop-context";

const makeTransformable = (
  type: "draggables" | "droppables",
  item: Omit<
    DraggableOrDroppable,
    "transformers" | "transform" | "transformed"
  >,
  state: DragDropState
) => {
  Object.defineProperties(item, {
    transformers: {
      enumerable: true,
      configurable: true,
      writable: true,
      value: {},
    },
    transform: {
      enumerable: true,
      configurable: true,
      get: () => {
        const transformers = Object.values(state[type][item.id].transformers);
        transformers.sort((a, b) => a.order - b.order);

        return transformers.reduce(
          (transform: Transform, transformer: Transformer) => {
            return transformer.callback(transform);
          },
          noopTransform()
        );
      },
    },
    transformed: {
      enumerable: true,
      configurable: true,
      get: () => {
        return transformLayout(
          state[type][item.id].layout,
          state[type][item.id].transform
        );
      },
    },
  });
};

export { makeTransformable };
