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

  onMount(() => {
    addSensor({ id, activators: { pointerdown: attach } });
  });

  onCleanup(() => {
    removeSensor({ id });
  });

  const isActiveSensor = () => state.active.sensor === id;

  const initialCoordinates = { x: 0, y: 0 };

  let activationDelayTimeoutId = null;

  const attach = ({ event, draggableId }) => {
    event.preventDefault();
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);

    initialCoordinates.x = event.clientX;
    initialCoordinates.y = event.clientY;

    activationDelayTimeoutId = setTimeout(onActivate, 250, { draggableId });
  };

  const detach = () => {
    if (activationDelayTimeoutId) {
      clearTimeout(activationDelayTimeoutId);
      activationDelayTimeoutId = null;
    }

    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  };

  const onActivate = ({ draggableId }) => {
    if (!anySensorActive()) {
      sensorStart(id);
      dragStart({ draggableId });
    } else {
      detach();
    }
  };

  const onPointerMove = (event) => {
    if (isActiveSensor()) {
      event.preventDefault();
      dragMove({
        transform: {
          x: event.clientX - initialCoordinates.x,
          y: event.clientY - initialCoordinates.y,
        },
      });
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
