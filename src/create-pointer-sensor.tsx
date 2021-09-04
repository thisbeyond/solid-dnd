import { onCleanup, onMount } from "solid-js";

import { useDragDropContext } from "./drag-drop-context";

export const createPointerSensor = ({ id } = { id: "pointer-sensor" }) => {
  const [
    state,
    {
      addSensor,
      removeSensor,
      sensorStart,
      sensorEnd,
      dragStart,
      dragMove,
      dragEnd,
      anySensorActive,
    },
  ] = useDragDropContext();

  const activationDelay = 250; // milliseconds
  const activationDistance = 10; // pixels

  onMount(() => {
    addSensor({ id, activators: { pointerdown: attach } });
  });

  onCleanup(() => {
    removeSensor({ id });
  });

  const isActiveSensor = () => state.active.sensor === id;

  const initialCoordinates = { x: 0, y: 0 };

  let activationDelayTimeoutId = null;
  let activationDraggableId = null;

  const attach = ({ event, draggableId }) => {
    event.preventDefault();
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);

    activationDraggableId = draggableId;
    initialCoordinates.x = event.clientX;
    initialCoordinates.y = event.clientY;

    activationDelayTimeoutId = setTimeout(onActivate, activationDelay);
  };

  const detach = () => {
    if (activationDelayTimeoutId) {
      clearTimeout(activationDelayTimeoutId);
      activationDelayTimeoutId = null;
    }

    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  };

  const onActivate = () => {
    if (!anySensorActive()) {
      sensorStart(id);
      dragStart({ draggableId: activationDraggableId });
    } else {
      detach();
    }
  };

  const onPointerMove = (event) => {
    const transform = {
      x: event.clientX - initialCoordinates.x,
      y: event.clientY - initialCoordinates.y,
    };

    if (!anySensorActive()) {
      if (Math.sqrt(transform.x ** 2 + transform.y ** 2) > activationDistance) {
        onActivate();
      }
    }

    if (isActiveSensor()) {
      event.preventDefault();
      dragMove({ transform });
    }
  };

  const onPointerUp = (event) => {
    detach();
    if (isActiveSensor()) {
      event.preventDefault();
      dragEnd();
      sensorEnd();
    }
  };
};
