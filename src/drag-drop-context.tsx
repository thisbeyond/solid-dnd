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

type Id = string | number;

type SensorActivator<K extends keyof HTMLElementEventMap> = (
  event: HTMLElementEventMap[K],
  draggableInfo: DraggableInfo
) => void;

type Draggable = {
  id: Id;
  node: HTMLElement;
  layout: Layout;
  data: Record<string, any>;
  offset: Transform;
  transform: Transform;
  transformed: Layout;
  transition: boolean;
};

type DraggableInfo = Pick<Draggable, "id" | "node" | "layout" | "data">;
type GetDraggableInfo = () => DraggableInfo;

type OverlayInfo = Pick<DraggableInfo, "node" | "layout">;

type Droppable = {
  id: Id;
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
  id: Id;
  activators: { [K in keyof HTMLElementEventMap]?: SensorActivator<K> };
  coordinates: {
    origin: Coordinates;
    current: Coordinates;
    delta: Coordinates;
  };
}

type Transformer = (
  transform: Transform,
  context: { type: "draggables" | "droppables"; id: Id }
) => Transform;

type ActiveDraggableOffsetTransformer = Transformer & {
  draggableId?: Id;
};

type Coordinates = Transform;

interface DragDropState {
  droppables: Record<Id, Droppable>;
  sensors: Record<Id, Sensor>;
  active: {
    draggableId: Id | null;
    draggable: Draggable | null;
    overlay: Draggable | null;
    droppableId: Id | null;
    droppable: Droppable | null;
    sensorId: Id | null;
    sensor: Sensor | null;
  };
}

interface Snapshots {
  draggables: Record<Id, Draggable>;
  droppables: Record<Id, Droppable>;
}
interface DragDropActions {
  setDraggable(draggableInfo: DraggableInfo): void;
  clearDraggable(): void;
  setOverlay(overlayInfo: OverlayInfo): void;
  clearOverlay(): void;
  addDroppable(
    droppable: Omit<Droppable, "transform" | "transformed" | "transition">
  ): void;
  removeDroppable(id: Id): void;
  addSensor(sensor: Sensor): void;
  removeSensor(id: Id): void;
  recomputeLayouts(filter?: RecomputeFilter): boolean;
  detectCollisions(): void;
  displaceDroppable(id: Id, transform: Transform): void;
  draggableActivators(
    getDraggableInfo: GetDraggableInfo,
    asHandlers?: boolean
  ): Listeners;
  dragStart(
    sensorId: Id,
    coordinates: Coordinates,
    draggableInfo: DraggableInfo
  ): void;
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
    droppables: {},
    sensors: {},
    active: {
      draggable: null,
      get draggableId(): Id | null {
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

  const setDraggable: DragDropActions["setDraggable"] = (draggableInfo) => {
    setState("active", "draggable", {
      ...draggableInfo,
      offset: { x: 0, y: 0 },
      get transform() {
        if (state.active.sensor && !state.active.overlay) {
          const transform = { ...state.active.sensor.coordinates.delta };
          transform.x += this.offset.x;
          transform.y += this.offset.y;
          return transform;
        }
        return noopTransform();
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
        if (state.active.sensor) {
          return state.active.sensor.coordinates.delta;
        }
        return noopTransform();
      },
      set transform(_) {},
      get transformed() {
        return transformLayout(this.layout, this.transform);
      },
      set transformed(_) {},
    });
  };

  const clearOverlay: DragDropActions["clearOverlay"] = () => {
    setState("active", "overlay", null);
  };

  const addDroppable: DragDropActions["addDroppable"] = ({
    id,
    node,
    layout,
    data,
  }) => {
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

  const removeDroppable: DragDropActions["removeDroppable"] = (id) => {
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

  const cleanupDroppable = (id: Id) => {
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

  const addSensor: DragDropActions["addSensor"] = ({ id, activators }) => {
    setState("sensors", id, {
      id,
      activators,
      coordinates: {
        origin: { x: 0, y: 0 },
        current: { x: 0, y: 0 },
        get delta() {
          return {
            x: this.current.x - this.origin.x,
            y: this.current.y - this.origin.y,
          };
        },
      },
    });
  };

  const removeSensor: DragDropActions["removeSensor"] = (id) => {
    batch(() => {
      setState("sensors", id, undefined!);
      if (state.active.sensorId === id) {
        setState("active", "sensorId", null);
      }
    });
  };

  const draggableActivators: DragDropActions["draggableActivators"] = (
    getDraggableInfo,
    asHandlers?
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
          activator(event, getDraggableInfo());
        }
      };
    }
    return listeners;
  };

  const recomputeLayouts: DragDropActions["recomputeLayouts"] = (
    filter = "all"
  ) => {
    let anyLayoutChanged = false;
    console.log("recompute layouts");
    untrack(() => {
      batch(() => {
        // TODO: Handle overlay?
        if (filter === "all" || filter === "draggable") {
          const draggable = state.active.draggable;
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

  // setup effect to call this whenever sensor.transform changes and active.draggable?
  const detectCollisions: DragDropActions["detectCollisions"] = () => {
    untrack(() => {
      const draggable = state.active.overlay ?? state.active.draggable;
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
    });
  };

  const displaceDroppable: DragDropActions["displaceDroppable"] = (
    id,
    transform
  ) => {
    untrack(() => {
      if (state.droppables[id]) {
        setState("droppables", id, "transform", transform);
      }
    });
  };

  const dragStart: DragDropActions["dragStart"] = (
    sensorId,
    coordinates,
    draggableInfo
  ) => {
    batch(() => {
      setState("sensors", sensorId, "coordinates", {
        origin: { ...coordinates },
        current: { ...coordinates },
      });
      setState("active", "sensorId", sensorId);
      setDraggable(draggableInfo);
    });
  };

  const dragMove: DragDropActions["dragMove"] = (coordinates) => {
    const sensorId = state.active.sensorId;
    if (!sensorId) {
      console.warn("Cannot drag move when no drag started.");
      return;
    }

    setState("sensors", sensorId, "coordinates", "current", {
      ...coordinates,
    });
  };

  const dragEnd: DragDropActions["dragEnd"] = () => {
    // TODO: wait for all animation on active draggable node to finish?
    queueMicrotask(() => {
      const sensorId = state.active.sensorId!;
      batch(() => {
        setState("sensors", sensorId, "coordinates", {
          origin: { x: 0, y: 0 },
          current: { x: 0, y: 0 },
        });
        setState("active", ["draggable", "droppableId", "sensorId"], null);
      });
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
      if (draggable && state.active.sensor) {
        Object.values(state.active.sensor.coordinates.delta);
        untrack(() => handler({ draggable }));
      }
    });
  };

  const onDragOver: DragDropActions["onDragOver"] = (handler) => {
    createEffect(() => {
      const draggable = state.active.draggable;
      const droppable = state.active.droppable;
      if (draggable) {
        untrack(() => handler({ draggable, droppable }));
      }
    });
  };

  // TODO: How to call this?
  const onDragEnd: DragDropActions["onDragEnd"] = (handler) => {
    createEffect(() => {
      const sensor = state.active.sensor;
      if (!sensor) {
        untrack(() => {
          const draggable = state.active.draggable;
          const droppable = state.active.droppable;
          if (draggable) {
            handler({ draggable, droppable });
          }
        });
      }
    });
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
    setDraggable,
    clearDraggable,
    setOverlay,
    clearOverlay,
    addDroppable,
    removeDroppable,
    addSensor,
    removeSensor,
    recomputeLayouts,
    detectCollisions,
    displaceDroppable,
    draggableActivators,
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
  Id,
  Listeners,
  DragEventHandler,
  DragEvent,
  Draggable,
  Droppable,
  DraggableInfo,
  GetDraggableInfo,
  SensorActivator,
};
