import { useDragDropContext } from "./drag-drop-context";
import { onCleanup, onMount } from "solid-js";

interface PointerAttachParams {
  event: PointerEvent;
  draggableId: string;
}

const createPointerSensor = (id: string = "pointer-sensor"): void => {
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

  const isActiveSensor = () => state.active.sensor === id;

  const initialCoordinates = { x: 0, y: 0 };

  let activationDelayTimeoutId: number | null = null;
  let activationDraggableId: string | null = null;

  const attach = ({ event, draggableId }: PointerAttachParams): void => {
    event.preventDefault();
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
  };

  const onActivate = (): void => {
    if (!anySensorActive()) {
      sensorStart(id);
      dragStart(activationDraggableId!);
    } else if (!isActiveSensor()) {
      detach();
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
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
      dragMove(transform);
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
};

export { createPointerSensor };
