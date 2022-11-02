import { onCleanup, onMount } from "solid-js";

import {
  Coordinates,
  Id,
  SensorActivator,
  useDragDropContext,
} from "./drag-drop-context";
import { Transform } from "./layout";

const createPointerSensor = (id: Id = "pointer-sensor"): void => {
  const [
    state,
    {
      addSensor,
      removeSensor,
      sensorStart,
      sensorMove,
      sensorEnd,
      dragStart,
      dragEnd,
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

  const initialCoordinates: Coordinates = { x: 0, y: 0 };

  let activationDelayTimeoutId: number | null = null;
  let activationDraggableId: Id | null = null;

  const attach: SensorActivator<"pointerdown"> = (event, draggableId) => {
    if (event.button !== 0) return;

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);

    activationDraggableId = draggableId;
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
  };

  const onActivate = (): void => {
    if (!state.active.sensor) {
      sensorStart(id, initialCoordinates);
      dragStart(activationDraggableId!);

      clearSelection();
      document.addEventListener("selectionchange", clearSelection);
    } else if (!isActiveSensor()) {
      detach();
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    const coordinates: Coordinates = { x: event.clientX, y: event.clientY };

    if (!state.active.sensor) {
      const transform: Transform = {
        x: coordinates.x - initialCoordinates.x,
        y: coordinates.y - initialCoordinates.y,
      };

      if (Math.sqrt(transform.x ** 2 + transform.y ** 2) > activationDistance) {
        onActivate();
      }
    }

    if (isActiveSensor()) {
      event.preventDefault();
      sensorMove(coordinates);
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    detach();
    if (isActiveSensor()) {
      event.preventDefault();
      dragEnd();
      sensorEnd();
    }
  };

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
  };
};

export { createPointerSensor };
