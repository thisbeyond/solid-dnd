import {
  batch,
  createContext,
  createEffect,
  mergeProps,
  ParentComponent,
  ParentProps,
  untrack,
  useContext,
} from "solid-js";
import { createStore, Store } from "solid-js/store";

import { CollisionDetector, mostIntersecting } from "./collision";
import { layoutsAreEqual, elementLayout, Layout, Transform } from "./layout";
import { makeTransformable } from "./make-transformable";

type Id = string | number;

interface Coordinates {
  x: number;
  y: number;
}

type SensorActivator<K extends keyof HTMLElementEventMap> = (
  event: HTMLElementEventMap[K],
  draggableId: Id
) => void;

interface Sensor {
  id: Id;
  activators: { [K in keyof HTMLElementEventMap]?: SensorActivator<K> };
  coordinates: {
    origin: Coordinates;
    current: Coordinates;
    get delta(): Coordinates;
  };
}

type TransformerCallback = (transform: Transform) => Transform;

interface Transformer {
  id: Id;
  order: number;
  callback: TransformerCallback;
}

export interface DraggableOrDroppable {
  id: Id;
  node: HTMLElement;
  layout: Layout;
  data: Record<string, any>;
  transformers: Record<Id, Transformer>;
  get transform(): Transform;
  get transformed(): Layout;
  _pendingCleanup?: boolean;
}

type Draggable = DraggableOrDroppable;

type Droppable = DraggableOrDroppable;

type DragEvent = {
  draggable: Draggable;
  droppable?: Droppable | null;
};

type RecomputeFilter = "all" | "draggable" | "droppable";

export interface DragDropState {
  draggables: Record<Id, Draggable>;
  droppables: Record<Id, Droppable>;
  sensors: Record<Id, Sensor>;
  active: {
    draggableId: Id | null;
    draggable: Draggable | null;
    droppableId: Id | null;
    droppable: Droppable | null;
    sensorId: Id | null;
    sensor: Sensor | null;
  };
  usingDragOverlay: boolean;
}

interface DragDropActions {
  setUsingDragOverlay(value?: boolean): void;
  addTransformer(
    type: "draggables" | "droppables",
    id: Id,
    transformer: Transformer
  ): void;
  removeTransformer(
    type: "draggables" | "droppables",
    id: Id,
    transformerId: Id
  ): void;
  addDraggable(
    draggable: Omit<Draggable, "transform" | "transformed" | "transformers">
  ): void;
  removeDraggable(id: Id): void;
  addDroppable(
    droppable: Omit<Droppable, "transform" | "transformed" | "transformers">
  ): void;
  removeDroppable(id: Id): void;
  addSensor(sensor: Omit<Sensor, "coordinates">): void;
  removeSensor(id: Id): void;
  recomputeLayouts(filter?: RecomputeFilter): boolean;
  detectCollisions(): void;
  draggableActivators(draggableId: Id, asHandlers?: boolean): Listeners;
  sensorStart(id: Id, coordinates: Coordinates): void;
  sensorMove(coordinates: Coordinates): void;
  sensorEnd(): void;
  dragStart(draggableId: Id): void;
  dragEnd(): void;
  onDragStart(handler: DragEventHandler): void;
  onDragMove(handler: DragEventHandler): void;
  onDragOver(handler: DragEventHandler): void;
  onDragEnd(handler: DragEventHandler): void;
}

interface DragDropContextProps {
  onDragStart?: DragEventHandler;
  onDragMove?: DragEventHandler;
  onDragOver?: DragEventHandler;
  onDragEnd?: DragEventHandler;
  collisionDetector?: CollisionDetector;
}

type DragDropContext = [Store<DragDropState>, DragDropActions];

type Listeners = Record<
  string,
  (event: HTMLElementEventMap[keyof HTMLElementEventMap]) => void
>;

type DragEventHandler = (event: DragEvent) => void;

const Context = createContext<DragDropContext>();

const DragDropProvider: ParentComponent<DragDropContextProps> = (
  passedProps
) => {
  const props: Pick<Required<DragDropContextProps>, "collisionDetector"> &
    Omit<ParentProps<DragDropContextProps>, "collisionDetector"> = mergeProps(
    { collisionDetector: mostIntersecting },
    passedProps
  );

  const [state, setState] = createStore<DragDropState>({
    draggables: {},
    droppables: {},
    sensors: {},
    active: {
      draggableId: null,
      get draggable(): Draggable | null {
        return state.active.draggableId !== null
          ? state.draggables[state.active.draggableId]
          : null;
      },
      droppableId: null,
      get droppable(): Droppable | null {
        return state.active.droppableId !== null
          ? state.droppables[state.active.droppableId]
          : null;
      },
      sensorId: null,
      get sensor(): Sensor | null {
        return state.active.sensorId !== null
          ? state.sensors[state.active.sensorId]
          : null;
      },
    },
    usingDragOverlay: false,
  });

  const setUsingDragOverlay: DragDropActions["setUsingDragOverlay"] = (
    boolean = true
  ) => {
    setState("usingDragOverlay", boolean);
  };

  const addTransformer: DragDropActions["addTransformer"] = (
    type,
    id,
    transformer
  ) => setState(type, id, "transformers", transformer.id, transformer);

  const removeTransformer: DragDropActions["removeTransformer"] = (
    type,
    id,
    transformerId
  ) => setState(type, id, "transformers", transformerId, undefined!);

  const addDraggable: DragDropActions["addDraggable"] = ({
    id,
    node,
    layout,
    data,
  }) => {
    const existingDraggable = state.draggables[id];

    const draggable = {
      id,
      node,
      layout,
      data,
      _pendingCleanup: false,
    };
    let transformer: Transformer | undefined;

    if (!existingDraggable) {
      makeTransformable("draggables", draggable, state);
    } else if (state.active.draggableId === id) {
      const layoutDelta = {
        x: existingDraggable.layout.x - layout.x,
        y: existingDraggable.layout.y - layout.y,
      };

      const transformerId = "addDraggable-existing-offset";
      const existingTransformer = existingDraggable.transformers[transformerId];
      const transformOffset = existingTransformer
        ? existingTransformer.callback(layoutDelta)
        : layoutDelta;

      transformer = {
        id: transformerId,
        order: 100,
        callback: (transform) => {
          return {
            x: transform.x + transformOffset.x,
            y: transform.y + transformOffset.y,
          };
        },
      };

      onDragEnd(() => removeTransformer("draggables", id, transformerId));
    }

    batch(() => {
      setState("draggables", id, draggable);
      if (transformer) {
        addTransformer("draggables", id, transformer);
      }
    });

    if (state.active.draggable) {
      recomputeLayouts();
    }
  };

  const removeDraggable: DragDropActions["removeDraggable"] = (id) => {
    setState("draggables", id, "_pendingCleanup", true);
    queueMicrotask(() => cleanupDraggable(id));
  };

  const cleanupDraggable = (id: Id) => {
    if (state.draggables[id]?._pendingCleanup) {
      const cleanupActive = state.active.draggableId === id;
      batch(() => {
        if (cleanupActive) {
          setState("active", "draggableId", null);
        }
        setState("draggables", id, undefined!);
      });
    }
  };

  const addDroppable: DragDropActions["addDroppable"] = ({
    id,
    node,
    layout,
    data,
  }) => {
    const existingDroppable = state.droppables[id];

    const droppable = {
      id,
      node,
      layout,
      data,
      _pendingCleanup: false,
    };

    if (!existingDroppable) {
      makeTransformable("droppables", droppable, state);
    }

    setState("droppables", id, droppable);

    if (state.active.draggable) {
      recomputeLayouts();
    }
  };

  const removeDroppable: DragDropActions["removeDroppable"] = (id) => {
    setState("droppables", id, "_pendingCleanup", true);
    queueMicrotask(() => cleanupDroppable(id));
  };

  const cleanupDroppable = (id: Id) => {
    if (state.droppables[id]?._pendingCleanup) {
      const cleanupActive = state.active.droppableId === id;
      batch(() => {
        if (cleanupActive) {
          setState("active", "droppableId", null);
        }
        setState("droppables", id, undefined!);
      });
    }
  };

  const addSensor: DragDropActions["addSensor"] = ({ id, activators }) => {
    setState("sensors", id, {
      id,
      activators,
      coordinates: {
        origin: { x: 0, y: 0 },
        current: { x: 0, y: 0 },
        get delta() {
          return {
            x:
              state.sensors[id].coordinates.current.x -
              state.sensors[id].coordinates.origin.x,
            y:
              state.sensors[id].coordinates.current.y -
              state.sensors[id].coordinates.origin.y,
          };
        },
      },
    });
  };

  const removeSensor: DragDropActions["removeSensor"] = (id) => {
    const cleanupActive = state.active.sensorId === id;
    batch(() => {
      if (cleanupActive) {
        setState("active", "sensorId", null);
      }
      setState("sensors", id, undefined!);
    });
  };

  const sensorStart: DragDropActions["sensorStart"] = (id, coordinates) => {
    batch(() => {
      setState("sensors", id, "coordinates", {
        origin: { ...coordinates },
        current: { ...coordinates },
      });
      setState("active", "sensorId", id);
    });
  };

  const sensorMove: DragDropActions["sensorMove"] = (coordinates) => {
    const sensorId = state.active.sensorId;
    if (!sensorId) {
      console.warn("Cannot move sensor when no sensor active.");
      return;
    }

    setState("sensors", sensorId, "coordinates", "current", {
      ...coordinates,
    });
  };

  const sensorEnd: DragDropActions["sensorEnd"] = () =>
    setState("active", "sensorId", null);

  const draggableActivators: DragDropActions["draggableActivators"] = (
    draggableId,
    asHandlers
  ) => {
    const eventMap: Record<
      string,
      Array<{
        sensor: Sensor;
        activator: SensorActivator<keyof HTMLElementEventMap>;
      }>
    > = {};

    for (const sensor of Object.values(state.sensors)) {
      if (sensor) {
        for (const [type, activator] of Object.entries(sensor.activators)) {
          eventMap[type] ??= [];
          eventMap[type].push({
            sensor,
            activator: activator as SensorActivator<keyof HTMLElementEventMap>,
          });
        }
      }
    }

    const listeners: Listeners = {};
    for (const key in eventMap) {
      let handlerKey = key;
      if (asHandlers) {
        handlerKey = `on${key}`;
      }
      listeners[handlerKey] = (event) => {
        for (const { activator } of eventMap[key]) {
          if (state.active.sensor) {
            break;
          }
          activator(event, draggableId);
        }
      };
    }

    return listeners;
  };

  const recomputeLayouts: DragDropActions["recomputeLayouts"] = (
    filter = "all"
  ) => {
    let anyLayoutChanged = false;

    const draggables =
      filter === "all" || filter === "draggable"
        ? Object.values(state.draggables)
        : [];

    const droppables =
      filter === "all" || filter === "droppable"
        ? Object.values(state.droppables)
        : [];

    batch(() => {
      for (const draggable of draggables) {
        if (draggable) {
          const currentLayout = draggable.layout;
          const layout = elementLayout(draggable.node);
          if (!layoutsAreEqual(currentLayout, layout)) {
            setState("draggables", draggable.id, "layout", layout);
            anyLayoutChanged = true;
          }
        }
      }

      for (const droppable of droppables) {
        if (droppable) {
          const currentLayout = droppable.layout;
          const layout = elementLayout(droppable.node);
          if (!layoutsAreEqual(currentLayout, layout)) {
            setState("droppables", droppable.id, "layout", layout);
            anyLayoutChanged = true;
          }
        }
      }
    });

    return anyLayoutChanged;
  };

  const detectCollisions: DragDropActions["detectCollisions"] = () => {
    const draggable = state.active.draggable;
    if (draggable) {
      const droppable = props.collisionDetector(
        draggable,
        Object.values(state.droppables),
        {
          activeDroppableId: state.active.droppableId,
        }
      );

      const droppableId: Id | null = droppable ? droppable.id : null;

      if (state.active.droppableId !== droppableId) {
        setState("active", "droppableId", droppableId);
      }
    }
  };

  const dragStart: DragDropActions["dragStart"] = (draggableId) => {
    const transformer: Transformer = {
      id: "sensorMove",
      order: 0,
      callback: (transform) => {
        if (state.active.sensor) {
          return {
            x: transform.x + state.active.sensor.coordinates.delta.x,
            y: transform.y + state.active.sensor.coordinates.delta.y,
          };
        }
        return transform;
      },
    };

    batch(() => {
      setState("active", "draggableId", draggableId);
      addTransformer("draggables", draggableId, transformer);
    });
  };

  const dragEnd: DragDropActions["dragEnd"] = () => {
    const draggableId = untrack(() => state.active.draggableId);
    batch(() => {
      if (draggableId !== null) {
        removeTransformer("draggables", draggableId, "sensorMove");
      }
      setState("active", ["draggableId", "droppableId"], null);
    });
  };

  const onDragStart: DragDropActions["onDragStart"] = (handler) => {
    createEffect(() => {
      const draggable = state.active.draggable;
      if (draggable) {
        untrack(() => handler({ draggable }));
      }
    });
  };

  const onDragMove: DragDropActions["onDragMove"] = (handler) => {
    createEffect(() => {
      const draggable = state.active.draggable;
      if (draggable) {
        Object.values(draggable.transform);
        untrack(() => handler({ draggable }));
      }
    });
  };

  const onDragOver: DragDropActions["onDragMove"] = (handler) => {
    createEffect(() => {
      const draggable = state.active.draggable;
      const droppable = state.active.droppable;
      if (draggable) {
        untrack(() => handler({ draggable, droppable }));
      }
    });
  };

  const onDragEnd: DragDropActions["onDragEnd"] = (handler) => {
    createEffect(
      ({ previousDraggable, previousDroppable }) => {
        const draggable = state.active.draggable;
        const droppable = draggable ? state.active.droppable : null;

        if (!draggable && previousDraggable) {
          untrack(() =>
            handler({
              draggable: previousDraggable,
              droppable: previousDroppable,
            })
          );
        }
        return { previousDraggable: draggable, previousDroppable: droppable };
      },
      { previousDraggable: null, previousDroppable: null }
    );
  };

  onDragStart(() => {
    recomputeLayouts();
    detectCollisions();
  });
  onDragMove(() => detectCollisions());
  onDragEnd(() => recomputeLayouts());

  props.onDragStart && onDragStart(props.onDragStart);
  props.onDragMove && onDragMove(props.onDragMove);
  props.onDragOver && onDragOver(props.onDragOver);
  props.onDragEnd && onDragEnd(props.onDragEnd);

  const actions = {
    setUsingDragOverlay,
    addTransformer,
    removeTransformer,
    addDraggable,
    removeDraggable,
    addDroppable,
    removeDroppable,
    addSensor,
    removeSensor,
    recomputeLayouts,
    detectCollisions,
    draggableActivators,
    sensorStart,
    sensorMove,
    sensorEnd,
    dragStart,
    dragEnd,
    onDragStart,
    onDragMove,
    onDragOver,
    onDragEnd,
  };

  const context: DragDropContext = [state, actions];

  return <Context.Provider value={context}>{props.children}</Context.Provider>;
};

const useDragDropContext = (): DragDropContext | null => {
  return useContext(Context) || null;
};

export { Context, DragDropProvider, useDragDropContext };
export type {
  Id,
  Coordinates,
  Listeners,
  DragEventHandler,
  DragEvent,
  Draggable,
  Droppable,
  SensorActivator,
  Transformer,
};