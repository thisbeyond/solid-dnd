import { onCleanup, onMount } from "solid-js";

import { useDragDropContext } from "./drag-drop-context";

export const createPointerSensor = ({ id } = { id: "pointer-sensor" }) => {
  const [state, { addSensor, removeSensor, dragStart, dragMove, dragEnd }] =
    useDragDropContext();

  onMount(() => {
    addSensor({ id, activators: { onPointerDown: onActivate } });
  });

  onCleanup(() => {
    removeSensor({ id });
  });

  const isActiveSensor = () => state.active.sensor === id;

  const initialCoordinates = { x: 0, y: 0 };

  let activationDelayTimeoutId = null;

  const onActivate = ({ event, draggableId }) => {
    event.preventDefault();
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);

    initialCoordinates.x = event.clientX;
    initialCoordinates.y = event.clientY;

    activationDelayTimeoutId = setTimeout(dragStart, 250, { draggableId });

    return true;
  };

  const onPointerMove = (event) => {
    if (isActiveSensor()) {
      event.preventDefault();
      dragMove({
        translate: {
          x: event.clientX - initialCoordinates.x,
          y: event.clientY - initialCoordinates.y,
        },
      });
    }
  };

  const onPointerUp = (event) => {
    if (activationDelayTimeoutId) {
      clearTimeout(activationDelayTimeoutId);
      activationDelayTimeoutId = null;
    }

    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);

    if (isActiveSensor()) {
      event.preventDefault();
      dragEnd();
    }
  };
};
