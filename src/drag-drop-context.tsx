import {
  layoutsAreEqual,
  mostIntersectingLayout,
  elementLayout,
  transformLayout,
  noopTransform,
  Layout,
  Transform,
} from "./layout";
import {
  batch,
  Component,
  createContext,
  createEffect,
  mergeProps,
  PropsWithChildren,
  untrack,
  useContext,
} from "solid-js";
import { createStore, Store } from "solid-js/store";

type SensorActivator<K extends keyof HTMLElementEventMap> = (
  event: HTMLElementEventMap[K],
  draggableId: string | number
) => void;
type Draggable = {
  id: string | number;
  node: HTMLElement;
  layout: Layout;
  data: Record<string, any>;
  transform: Transform;
  _pendingCleanup?: boolean;
};
type Droppable = {
  id: string | number;
  node: HTMLElement;
  layout: Layout;
  data: Record<string, any>;
  transform: Transform;
  _pendingCleanup?: boolean;
};
type DragEvent = {
  draggable: Draggable;
  droppable?: Droppable | null;
};
type RecomputeFilter = "all" | "draggable" | "droppable";

interface Sensor {
  id: string | number;
  activators: { [K in keyof HTMLElementEventMap]?: SensorActivator<K> };
}
interface DragDropState {
  draggables: Record<string | number, Draggable | undefined | null>;
  droppables: Record<string | number, Droppable | undefined | null>;
  sensors: Record<string | number, Sensor | undefined | null>;
  active: {
    draggable: string | number | null;
    droppable: string | number | null;
    sensor: string | number | null;
  };
  previous: {
    draggable: string | number | null;
    droppable: string | number | null;
  };
  usingDragOverlay: boolean;
}
interface DragDropActions {
  setUsingDragOverlay(value?: boolean): void;
  addDraggable(draggable: Omit<Draggable, "transform">): void;
  addDroppable(droppable: Omit<Droppable, "transform">): void;
  removeDraggable(id: string | number): void;
  removeDroppable(id: string | number): void;
  addSensor(sensor: Sensor): void;
  removeSensor(id: string | number): void;
  sensorStart(id: string | number): void;
  sensorEnd(): void;
  recomputeLayouts(filter?: RecomputeFilter): boolean;
  detectCollisions(): void;
  displace(
    type: "draggables" | "droppables",
    id: string | number,
    transform: Transform
  ): void;
  activeDraggable(): Draggable | null;
  activeDroppable(): Droppable | null;
  activeSensor(): Sensor | null;
  draggableActivators(
    draggableId: string | number,
    asHandlers?: boolean
  ): Listeners;
  anyDraggableActive(): boolean;
  anyDroppableActive(): boolean;
  anySensorActive(): boolean;
  dragStart(draggableId: string | number): void;
  dragMove(transform: Transform): void;
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
  collisionDetectionAlgorithm?(
    layout: Layout,
    layouts: Layout[]
  ): Layout | null;
}

type DragDropContext = [Store<DragDropState>, DragDropActions];
type Listeners = Record<
  string,
  (event: HTMLElementEventMap[keyof HTMLElementEventMap]) => void
>;
type DragEventHandler = (event: DragEvent) => void;

const Context = createContext<DragDropContext>();

const DragDropProvider: Component<DragDropContextProps> = (passedProps) => {
  const props: Pick<
    Required<DragDropContextProps>,
    "collisionDetectionAlgorithm"
  > &
    Omit<
      PropsWithChildren<DragDropContextProps>,
      "collisionDetectionAlgorithm"
    > = mergeProps(
    { collisionDetectionAlgorithm: mostIntersectingLayout },
    passedProps
  );
  const [state, setState] = createStore<DragDropState>({
    draggables: {},
    droppables: {},
    sensors: {},
    active: {
      draggable: null,
      droppable: null,
      sensor: null,
    },
    previous: {
      draggable: null,
      droppable: null,
    },
    usingDragOverlay: false,
  });
  const setUsingDragOverlay = (boolean: boolean = true): void => {
    setState("usingDragOverlay", boolean);
  };
  const addDraggable = ({
    id,
    node,
    layout,
    data,
  }: Omit<Draggable, "transform">): void => {
    setState("draggables", id, {
      id,
      node,
      layout,
      data,
      transform: noopTransform(),
      _pendingCleanup: false,
    });
  };
  const removeDraggable = (id: string | number): void => {
    setState("draggables", id, "_pendingCleanup", true);
    queueMicrotask(() => cleanupDraggable(id));
  };
  const cleanupDraggable = (id: string | number) => {
    batch(() => {
      if (state.draggables[id]?._pendingCleanup) {
        setState("draggables", id, undefined);
        if (state.active.draggable === id) {
          setState("active", "draggable", null);
        }
        if (state.previous.draggable === id) {
          setState("previous", "draggable", null);
        }
      }
    });
  };
  const activeDraggable = (): Draggable | null => {
    if (state.active.draggable) {
      return state.draggables[state.active.draggable] || null;
    }
    return null;
  };
  const previousDraggable = (): Draggable | null => {
    if (state.previous.draggable) {
      return state.draggables[state.previous.draggable] || null;
    }
    return null;
  };
  const anyDraggableActive = (): boolean => state.active.draggable !== null;
  const addDroppable = ({
    id,
    node,
    layout,
    data,
  }: Omit<Droppable, "transform">): void => {
    setState("droppables", id, {
      id,
      node,
      layout,
      data,
      transform: noopTransform(),
      _pendingCleanup: false,
    });
  };
  const removeDroppable = (id: string | number): void => {
    setState("droppables", id, "_pendingCleanup", true);
    queueMicrotask(() => cleanupDroppable(id));
  };
  const cleanupDroppable = (id: string | number) => {
    batch(() => {
      if (state.droppables[id]?._pendingCleanup) {
        setState("droppables", id, undefined);
        if (state.active.droppable === id) {
          setState("active", "droppable", null);
        }
        if (state.previous.droppable === id) {
          setState("previous", "droppable", null);
        }
      }
    });
  };
  const activeDroppable = (): Droppable | null => {
    if (state.active.droppable) {
      return state.droppables[state.active.droppable] || null;
    }
    return null;
  };
  const previousDroppable = (): Droppable | null => {
    if (state.previous.droppable) {
      return state.droppables[state.previous.droppable] || null;
    }
    return null;
  };
  const anyDroppableActive = (): boolean => state.active.droppable !== null;
  const addSensor = ({ id, activators }: Sensor): void => {
    setState("sensors", id, { id, activators });
  };
  const removeSensor = (id: string | number): void => {
    batch(() => {
      setState("sensors", id, undefined);
      if (state.active.sensor === id) {
        setState("active", "sensor", null);
      }
    });
  };
  const sensorStart = (id: string | number): void =>
    setState("active", "sensor", id);
  const sensorEnd = (): void => setState("active", "sensor", null);
  const activeSensor = (): Sensor | null => {
    if (state.active.sensor) {
      return state.sensors[state.active.sensor] || null;
    }
    return null;
  };
  const anySensorActive = (): boolean => state.active.sensor !== null;
  const draggableActivators = (
    draggableId: string | number,
    asHandlers?: boolean
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
          if (anySensorActive()) {
            break;
          }
          activator(event, draggableId);
        }
      };
    }
    return listeners;
  };
  const recomputeLayouts = (filter: RecomputeFilter = "all"): boolean => {
    let anyLayoutChanged = false;
    batch(() => {
      if (filter === "all" || filter === "draggable") {
        for (const draggable of Object.values(state.draggables)) {
          if (draggable) {
            const currentLayout = draggable.layout;
            const layout = elementLayout(draggable.node);
            if (!layoutsAreEqual(currentLayout, layout)) {
              setState("draggables", draggable.id, (value) => {
                return value ? { ...value, layout } : value;
              });
              anyLayoutChanged = true;
            }
          }
        }
      }

      if (filter === "all" || filter === "droppable") {
        for (const droppable of Object.values(state.droppables)) {
          if (droppable) {
            const currentLayout = droppable.layout;
            const layout = elementLayout(droppable.node);
            if (!layoutsAreEqual(currentLayout, layout)) {
              setState("droppables", droppable.id, (value) => {
                return value ? { ...value, layout } : value;
              });
              anyLayoutChanged = true;
            }
          }
        }
      }
    });

    return anyLayoutChanged;
  };
  const detectCollisions = (): void => {
    const draggable = activeDraggable();
    if (draggable) {
      const draggableLayout = transformLayout(
        draggable.layout,
        draggable.transform
      );

      const layouts = [];
      const droppableIds = [];
      for (const droppable of Object.values(state.droppables)) {
        if (droppable) {
          droppableIds.push(droppable.id);
          layouts.push(droppable.layout);
        }
      }

      const layout = props.collisionDetectionAlgorithm(
        draggableLayout,
        layouts
      );

      let droppableId: string | number | null = null;
      if (layout) {
        droppableId = droppableIds[layouts.indexOf(layout)];
      }
      if (state.active.droppable !== droppableId) {
        batch(() => {
          setState("previous", "droppable", state.active.droppable);
          setState("active", "droppable", droppableId);
        });
      }
    }
  };
  const displace = (
    type: "draggables" | "droppables",
    id: string | number,
    transform: Transform
  ): void => {
    untrack(() => {
      if (state[type][id]) {
        setState(type, id, (value) => {
          return value ? { ...value, transform: { ...transform } } : value;
        });
      }
    });
  };
  const dragStart = (draggableId: string | number): void => {
    batch(() => {
      setState("draggables", draggableId, (value) => {
        return value ? { ...value, transform: noopTransform() } : value;
      });
      setState("active", "draggable", draggableId);
    });
    recomputeLayouts();
    detectCollisions();
  };
  const dragMove = (transform: Transform): void => {
    const draggableId = state.active.draggable;
    if (draggableId) {
      setState("draggables", draggableId, (value) => {
        return value ? { ...value, transform: { ...transform } } : value;
      });
      detectCollisions();
    }
  };
  const dragEnd = (): void => {
    batch(() => {
      setState("previous", "draggable", state.active.draggable);
      setState("previous", "droppable", state.active.droppable);
      if (state.active.draggable) {
        setState("draggables", state.active.draggable, (value) => {
          return value ? { ...value, transform: noopTransform() } : value;
        });
      }
      setState("active", ["draggable", "droppable"], null);
    });
  };
  const onDragStart = (handler: DragEventHandler): void => {
    createEffect(() => {
      const draggable = activeDraggable();
      if (draggable) {
        untrack(() => handler({ draggable }));
      }
    });
  };
  const onDragMove = (handler: DragEventHandler): void => {
    createEffect(() => {
      const draggable = activeDraggable();
      if (draggable) {
        draggable.transform;
        untrack(() => handler({ draggable }));
      }
    });
  };
  const onDragOver = (handler: DragEventHandler): void => {
    createEffect(() => {
      const draggable = activeDraggable();
      const droppable = activeDroppable();
      if (draggable) {
        untrack(() => handler({ draggable, droppable }));
      }
    });
  };
  const onDragEnd = (handler: DragEventHandler): void => {
    createEffect(() => {
      const currentDraggable = activeDraggable();
      const draggable = previousDraggable();
      const droppable = previousDroppable();
      if (draggable && !currentDraggable) {
        untrack(() => handler({ draggable, droppable }));
      }
    });
  };

  props.onDragStart && onDragStart(props.onDragStart);
  props.onDragMove && onDragMove(props.onDragMove);
  props.onDragOver && onDragOver(props.onDragOver);
  props.onDragEnd && onDragEnd(props.onDragEnd);

  const actions = {
    setUsingDragOverlay,
    addDraggable,
    removeDraggable,
    addDroppable,
    removeDroppable,
    addSensor,
    removeSensor,
    sensorStart,
    sensorEnd,
    recomputeLayouts,
    detectCollisions,
    displace,
    activeDraggable,
    activeDroppable,
    activeSensor,
    draggableActivators,
    anyDraggableActive,
    anyDroppableActive,
    anySensorActive,
    dragStart,
    dragMove,
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
export type { Listeners, DragEventHandler };
