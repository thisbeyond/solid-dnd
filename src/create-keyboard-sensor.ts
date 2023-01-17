import { onCleanup, onMount, untrack } from "solid-js";

import {
  Coordinates,
  Id,
  SensorActivator,
  useDragDropContext,
} from "./drag-drop-context";
import { Transform } from "./layout";

const activateKeys = [
  " ",
  "Enter",
] as const

type ActivateKeys = typeof activateKeys[number]

const sensorKeys = [
  ...activateKeys,
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
] as const;

type SensorKey = typeof sensorKeys[number];

const createKeyboardSensor = (id: Id = "keyboard-sensor"): void => {
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
  const speed = 5 // pixels per keypress

  onMount(() => {
    addSensor({
      id,
      activators: { keydown: attach },
    });
  });

  onCleanup(() => {
    removeSensor(id);
  });

  const isActiveSensor = () => state.active.sensorId === id;

  const initialCoordinates: Coordinates = { x: 0, y: 0 };

  let activationDelayTimeoutId: number | null = null;
  let activationDraggableId: Id | null = null;

  const attach: SensorActivator<"keydown"> = (event, draggableId) => {
    if (activateKeys.includes(event.key as ActivateKeys)) {
      event.preventDefault();
      event.stopPropagation();
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      document.addEventListener("keydown", onKeyDown);
      activationDraggableId = draggableId;
      initialCoordinates.x = rect.x + rect.width / 2;
      initialCoordinates.y = rect.y + rect.height / 2;

      activationDelayTimeoutId = window.setTimeout(onActivate, activationDelay);
    }
  };

  const detach = (): void => {
    if (activationDelayTimeoutId) {
      clearTimeout(activationDelayTimeoutId);
      activationDelayTimeoutId = null;
    }

    document.removeEventListener("keydown", onKeyDown);
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

  const onKeyDown = (event: KeyboardEvent): void => {
    if (sensorKeys.includes(event.key as SensorKey)) {
      const sensor = untrack(() => state.active.sensor);
      if (sensor) {
        const coordinates: Coordinates = { ...sensor.coordinates.current };
        const prevCoordinates: Coordinates = { ...coordinates };
        switch (event.key as SensorKey) {
          case "Escape":
            sensorMove(initialCoordinates);
          case " ":
          case "Enter":
          case "Escape":
            detach();
            if (isActiveSensor()) {
              event.preventDefault();
              dragEnd();
              sensorEnd();
            }
            break;
          case "ArrowLeft":
            coordinates.x -= speed;
            break;
          case "ArrowRight":
            coordinates.x += speed;
            break;
          case "ArrowUp":
            coordinates.y -= speed;
            break;
          case "ArrowDown":
            coordinates.y += speed;
            break;
        }

        if (
          prevCoordinates.x !== coordinates.x ||
          prevCoordinates.y !== coordinates.y
        ) {
          event.preventDefault();
          if (!state.active.sensor) {
            const transform: Transform = {
              x: coordinates.x - initialCoordinates.x,
              y: coordinates.y - initialCoordinates.y,
            };

            if (
              Math.sqrt(transform.x ** 2 + transform.y ** 2) >
              activationDistance
            ) {
              onActivate();
            }
          }

          if (isActiveSensor()) {
            sensorMove(coordinates);
          }
        }
      }
    }
  };

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
  };
};

export { createKeyboardSensor };
