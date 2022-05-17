import { Portal } from "solid-js/web";
import {
  Component,
  createEffect,
  createSignal,
  JSX,
  onCleanup,
  Show,
} from "solid-js";

import { Draggable, useDragDropContext } from "./drag-drop-context";
import { layoutStyle, transformStyle } from "./style";
import { layoutsDelta } from "./layout";

interface DragOverlayProps {
  class?: string;
  style?: JSX.CSSProperties;
  activeDraggableClass?: string;
}

type Id = string | number | null;

const DEFER_TRANSFORM_PERIOD = 15;
const TRANSITION_PERIOD = 150;

const DragOverlay: Component<DragOverlayProps> = (props) => {
  const [
    state,
    { setUsingDragOverlay, onDragStart, onDragEnd, anyDraggableActive },
  ] = useDragDropContext()!;

  setUsingDragOverlay(true);

  const [referenceDraggableId, setReferenceDraggableId] =
    createSignal<Id>(null);

  const [referenceSnapshot, setReferenceSnapshot] =
    createSignal<Draggable | null>(null);

  onDragStart(({ draggable }) => {
    setReferenceDraggableId<Id>(draggable.id);
  });

  onDragEnd(({ draggable }) => {
    setReferenceSnapshot(draggable);

    setTimeout(setReferenceSnapshot, DEFER_TRANSFORM_PERIOD, null);

    setTimeout(() => {
      if (props.activeDraggableClass) {
        state.draggables[draggable.id]?.node.classList.remove(
          props.activeDraggableClass
        );
      }
      setReferenceDraggableId(null);
    }, TRANSITION_PERIOD);
  });

  createEffect(() => {
    const node = referenceDraggable()?.node;

    if (props.activeDraggableClass) {
      node?.classList.add(props.activeDraggableClass);
    }

    onCleanup(() => {
      if (props.activeDraggableClass) {
        node?.classList.remove(props.activeDraggableClass);
      }
    });
  });

  const referenceDraggable = () => {
    const id = referenceDraggableId();
    return id !== null ? state.draggables[id] || null : null;
  };

  const isTransitioning = () => {
    if (anyDraggableActive()) return false;
    if (referenceSnapshot() !== null) return false;
    return true;
  };

  const style = (): JSX.CSSProperties => {
    const draggable = referenceDraggable();
    const draggableSnapshot = referenceSnapshot();
    if (!draggable) return {};

    let transform = draggable.transform;
    if (draggableSnapshot !== null) {
      const delta = layoutsDelta(draggable.layout, draggableSnapshot.layout);
      transform = {
        x: draggableSnapshot.transform.x + delta.x,
        y: draggableSnapshot.transform.y + delta.y,
      };
    }

    return {
      position: "fixed",
      transition: isTransitioning()
        ? `transform ${TRANSITION_PERIOD}ms`
        : "transform 0s",
      ...layoutStyle(draggable.layout),
      ...transformStyle(transform),
      ...props.style,
    };
  };

  return (
    <Portal mount={document.body}>
      <Show when={referenceDraggable()}>
        <div class={props.class} style={style()}>
          {props.children}
        </div>
      </Show>
    </Portal>
  );
};

export { DragOverlay };
