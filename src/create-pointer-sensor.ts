import { onCleanup, onMount } from "solid-js";

import {
  DraggableInfo,
  SensorActivator,
  useDragDropContext,
} from "./drag-drop-context";

const createPointerSensor = (id: string | number = "pointer-sensor"): void => {
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
  ] = useDragDropContext()!;
  const activationDelay = 250; // milliseconds
  const activationDistance = 10; // pixels

  onMount(() => {
    addSensor({ id, activators: { pointerdown: attach } });
  });

  onCleanup(() => {
    removeSensor(id);
  });

  const isActiveSensor = () => state.active.sensorId === id;

  const initialCoordinates = { x: 0, y: 0 };

  let activationDelayTimeoutId: number | null = null;
  let activationDraggableInfo: DraggableInfo | null = null;

  const attach: SensorActivator<"pointerdown"> = (event, draggableInfo) => {
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);

    activationDraggableInfo = draggableInfo;
    initialCoordinates.x = event.clientX;
    initialCoordinates.y = event.clientY;

    activationDelayTimeoutId = window.setTimeout(onActivate, activationDelay);
  };

  const detach = (): void => {
    if (activationDelayTimeoutId) {
      clearTimeout(activationDelayTimeoutId);
      activationDelayTimeoutId = null;
    }

    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("selectionchange", clearSelection);

    activationDraggableInfo = null;
  };

  const onActivate = (): void => {
    if (!anySensorActive()) {
      sensorStart(id);
      dragStart(initialCoordinates, activationDraggableInfo!);

      clearSelection();
      document.addEventListener("selectionchange", clearSelection);
    } else if (!isActiveSensor()) {
      detach();
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    const coordinates = { x: event.clientX, y: event.clientY };

    const transform = {
      x: coordinates.x - initialCoordinates.x,
      y: coordinates.y - initialCoordinates.y,
    };

    if (!anySensorActive()) {
      if (Math.sqrt(transform.x ** 2 + transform.y ** 2) > activationDistance) {
        onActivate();
      }
    }

    if (isActiveSensor()) {
      event.preventDefault();
      dragMove(coordinates);
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    detach();
    if (isActiveSensor()) {
      event.preventDefault();
      sensorEnd();
      dragEnd();
    }
  };

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
  };
};

export { createPointerSensor };
