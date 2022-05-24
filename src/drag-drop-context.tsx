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
import { createStore, SetStoreFunction, Store } from "solid-js/store";

import { CollisionDetector, mostIntersecting } from "./collision";
import {
  layoutsAreEqual,
  elementLayout,
  noopTransform,
  Layout,
  Transform,
  transformLayout,
} from "./layout";

type SensorActivator<K extends keyof HTMLElementEventMap> = (
  event: HTMLElementEventMap[K],
  draggableInfo: DraggableInfo
) => void;

type Draggable = {
  id: string | number;
  node: HTMLElement;
  layout: Layout;
  data: Record<string, any>;
  transform: Transform;
  transformed: Layout;
  transition: boolean;
};

type DraggableInfo = Pick<Draggable, "id" | "node" | "layout" | "data">;
type GetDraggableInfo = () => DraggableInfo;

type OverlayInfo = Pick<DraggableInfo, "node" | "layout">;

type Droppable = {
  id: string | number;
  node: HTMLElement;
  layout: Layout;
  data: Record<string, any>;
  transform: Transform;
  transformed: Layout;
  transition: boolean;
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

type Transformer = (
  transform: Transform,
  context: { type: "draggables" | "droppables"; id: string | number }
) => Transform;

type ActiveDraggableOffsetTransformer = Transformer & {
  draggableId?: string | number;
};

type Coordinates = Transform;

interface DragDropState {
  coordinates: {
    origin: Coordinates | null;
    current: Coordinates | null;
    delta: Coordinates;
  };
  droppables: Record<string | number, Droppable>;
  sensors: Record<string | number, Sensor>;
  active: {
    draggableId: string | number | null;
    draggable: Draggable | null;
    overlay: Draggable | null;
    droppableId: string | number | null;
    droppable: Droppable | null;
    sensorId: string | number | null;
    sensor: Sensor | null;
  };
}

interface Snapshots {
  draggables: Record<string | number, Draggable>;
  droppables: Record<string | number, Droppable>;
}
interface DragDropActions {
  setDraggable(draggableInfo: DraggableInfo): void;
  clearDraggable(): void;
  setOverlay(overlayInfo: OverlayInfo): void;
  clearOverlay(): void;
  addDroppable(
    droppable: Omit<Droppable, "transform" | "transformed" | "transition">
  ): void;
  removeDroppable(id: string | number): void;
  addSensor(sensor: Sensor): void;
  removeSensor(id: string | number): void;
  sensorStart(id: string | number): void;
  sensorEnd(): void;
  recomputeLayouts(filter?: RecomputeFilter): boolean;
  detectCollisions(): void;
  displaceDroppable(id: string | number, transform: Transform): void;
  activeDraggable(): Draggable | null;
  activeDroppable(): Droppable | null;
  activeSensor(): Sensor | null;
  draggableActivators(
    getDraggableInfo: GetDraggableInfo,
    asHandlers?: boolean
  ): Listeners;
  anyDraggableActive(): boolean;
  anyDroppableActive(): boolean;
  anySensorActive(): boolean;
  dragStart(coordinates: Coordinates, draggableInfo: DraggableInfo): void;
  dragMove(coordinates: Coordinates): void;
  dragEnd(): void;
  onDragStart(handler: DragEventHandler): void;
  onDragMove(handler: DragEventHandler): void;
  onDragOver(handler: DragEventHandler): void;
  onDragEnd(handler: DragEventHandler): void;
  setState: SetStoreFunction<DragDropState>;
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

const snapshotItem = (item: Draggable | Droppable | null | undefined) => {
  return item
    ? {
        ...item,
        transform: { ...item.transform },
        layout: new Layout(item.layout.rect),
        get transformed(): Layout {
          return transformLayout(this.layout, this.transform);
        },
        set transformed(_) {},
      }
    : null;
};

const Context = createContext<DragDropContext>();

const DragDropProvider: Component<DragDropContextProps> = (passedProps) => {
  const props: Pick<Required<DragDropContextProps>, "collisionDetector"> &
    Omit<PropsWithChildren<DragDropContextProps>, "collisionDetector"> =
    mergeProps({ collisionDetector: mostIntersecting }, passedProps);

  const snapshots: Snapshots = {
    draggables: {},
    droppables: {},
  };

  const [state, setState] = createStore<DragDropState>({
    coordinates: {
      origin: null,
      current: null,
      get delta() {
        let transform = noopTransform();
        const origin = state.coordinates.origin as Coordinates;
        const current = state.coordinates.current as Coordinates;
        if (origin && current) {
          transform = {
            x: current.x - origin.x,
            y: current.y - origin.y,
          };
        }
        return transform;
      },
    },
    droppables: {},
    sensors: {},
    active: {
      draggable: null,
      get draggableId(): string | number | null {
        return state.active.draggable?.id || null;
      },

      overlay: null,

      droppableId: null,
      get droppable(): Droppable | null {
        return state.active.droppableId !== null
          ? untrack(() => state.droppables)[state.active.droppableId]
          : null;
      },

      sensorId: null,
      get sensor(): Sensor | null {
        return state.active.sensorId !== null
          ? untrack(() => state.sensors)[state.active.sensorId]
          : null;
      },
    },
  });

  const setDraggable = (draggableInfo: DraggableInfo) => {
    setState("active", "draggable", {
      ...draggableInfo,
      get transform() {
        return state.active.overlay ? noopTransform() : state.coordinates.delta;
      },
      set transform(_) {},
      get transformed() {
        return transformLayout(this.layout, this.transform);
      },
      set transformed(_) {},
    });
  };

  const clearDraggable = () => {
    setState("active", "draggable", null);
  };

  const activeDraggable = () => state.active.draggable;

  const anyDraggableActive = () => state.active.draggableId !== null;

  const setOverlay: DragDropActions["setOverlay"] = (overlayInfo) => {
    setState("active", "overlay", {
      ...overlayInfo,
      get id() {
        return state.active.draggable?.id;
      },
      get data() {
        return state.active.draggable?.data;
      },
      get transform() {
        return state.coordinates.delta;
      },
      set transform(_) {},
      get transformed() {
        return transformLayout(this.layout, this.transform);
      },
      set transformed(_) {},
    });
  };

  const clearOverlay = () => {
    setState("active", "overlay", null);
  };

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
      get transformed() {
        return transformLayout(this.layout, this.transform);
      },
      set transformed(_) {},
      transition: false,
      _pendingCleanup: false,
    });
  };

  const removeDroppable = (id: string | number): void => {
    const droppable = untrack(() => state.droppables[id]);
    if (!droppable) {
      console.warn(`Cannot remove droppable ${id}: it does not exist.`);
    }

    snapshots.droppables[id] = snapshotItem(
      droppable as Droppable
    ) as Droppable;

    setState("droppables", id, "_pendingCleanup", true);
    queueMicrotask(() => cleanupDroppable(id));
  };

  const cleanupDroppable = (id: string | number) => {
    delete snapshots.droppables[id];

    batch(() => {
      if (state.droppables[id]?._pendingCleanup) {
        setState("droppables", id, undefined!);
        if (state.active.droppableId === id) {
          setState("active", "droppableId", null);
        }
      }
    });
  };

  const activeDroppable = () => state.active.droppable;

  const anyDroppableActive = () => state.active.droppableId !== null;

  const addSensor = ({ id, activators }: Sensor): void => {
    setState("sensors", id, { id, activators });
  };

  const removeSensor = (id: string | number): void => {
    batch(() => {
      setState("sensors", id, undefined!);
      if (state.active.sensorId === id) {
        setState("active", "sensorId", null);
      }
    });
  };

  const sensorStart = (id: string | number): void =>
    setState("active", "sensorId", id);

  const sensorEnd = (): void => setState("active", "sensorId", null);

  const activeSensor = () => state.active.sensor;

  const anySensorActive = () => state.active.sensorId !== null;

  const draggableActivators = (
    getDraggableInfo: GetDraggableInfo,
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
          activator(event, getDraggableInfo());
        }
      };
    }
    return listeners;
  };

  const recomputeLayouts = (filter: RecomputeFilter = "all"): boolean => {
    let anyLayoutChanged = false;
    console.log("recompute layouts");
    untrack(() => {
      batch(() => {
        if (filter === "all" || filter === "draggable") {
          const draggable = activeDraggable();
          if (draggable) {
            const currentLayout = draggable.layout;
            const layout = elementLayout(draggable.node);
            if (!layoutsAreEqual(currentLayout, layout)) {
              setState("active", "draggable", "layout", layout);
              // const delta = layoutsDelta(layout, draggable.transformed);
              // const start = transformStyle(delta);
              // const end = transformStyle({ x: 0, y: 0 });
              // const animation = draggable.node.animate([start, end], {
              //   duration: 150,
              // });
              anyLayoutChanged = true;
            }
          }
        }

        if (filter === "all" || filter === "droppable") {
          for (const droppable of Object.values(state.droppables)) {
            if (droppable && !droppable._pendingCleanup) {
              const currentLayout = droppable.layout;
              const layout = elementLayout(droppable.node);
              if (!layoutsAreEqual(currentLayout, layout)) {
                setState("droppables", droppable.id, "layout", layout);
                anyLayoutChanged = true;
              }
            }
          }
        }
      });
    });

    return anyLayoutChanged;
  };

  const detectCollisions = (): void => {
    untrack(() => {
      const draggable = state.active.overlay?? state.active.draggable;
      if (draggable) {
        const droppable = props.collisionDetector(
          draggable,
          Object.values(state.droppables),
          {
            activeDroppableId: state.active.droppableId,
          }
        );

        const droppableId: string | number | null = droppable
          ? droppable.id
          : null;

        if (state.active.droppableId !== droppableId) {
          setState("active", "droppableId", droppableId);
        }
      }
    });
  };

  const displaceDroppable = (id: string | number, transform: Transform) => {
    untrack(() => {
      if (state.droppables[id]) {
        setState("droppables", id, "transform", transform);
      }
    });
  };

  const dragStart = (
    coordinates: Coordinates,
    draggableInfo: DraggableInfo
  ): void => {
    batch(() => {
      setState("coordinates", "origin", { ...coordinates });
      setState("coordinates", "current", { ...coordinates });
      setDraggable(draggableInfo);
      recomputeLayouts();
      detectCollisions();
    });
  };

  const dragMove = (coordinates: Coordinates): void => {
    setState("coordinates", "current", { ...coordinates });
    if (state.active.draggable) {
      detectCollisions();
    }
  };

  const dragEnd = (): void => {
    queueMicrotask(() =>
      // TODO: wait for all animation on active draggable node to finish?
      setState("active", ["draggable", "droppableId"], null)
    );
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
        Object.values(draggable.transform);
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
      const sensor = activeSensor();
      if (!sensor) {
        untrack(() => {
          const draggable = activeDraggable();
          const droppable = activeDroppable();
          if (draggable) {
            handler({ draggable, droppable });
          }
        });
      }
    });
  };

  onDragEnd(() => recomputeLayouts());

  props.onDragStart && onDragStart(props.onDragStart);
  props.onDragMove && onDragMove(props.onDragMove);
  props.onDragOver && onDragOver(props.onDragOver);
  props.onDragEnd && onDragEnd(props.onDragEnd);

  const actions = {
    setDraggable,
    clearDraggable,
    setOverlay,
    clearOverlay,
    addDroppable,
    removeDroppable,
    addSensor,
    removeSensor,
    sensorStart,
    sensorEnd,
    recomputeLayouts,
    detectCollisions,
    displaceDroppable,
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
    setState,
  };

  const context: DragDropContext = [state, actions];

  return <Context.Provider value={context}>{props.children}</Context.Provider>;
};

const useDragDropContext = (): DragDropContext | null => {
  return useContext(Context) || null;
};

export { Context, DragDropProvider, useDragDropContext };
export type {
  Listeners,
  DragEventHandler,
  DragEvent,
  Draggable,
  Droppable,
  DraggableInfo,
  GetDraggableInfo,
  SensorActivator,
};
