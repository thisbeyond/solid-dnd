import {
  layoutsAreEqual,
  elementLayout,
  noopTransform,
  Layout,
  Transform,
  transformLayout,
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
import { CollisionDetector, mostIntersecting } from "./collision";

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
  transformed: Layout;
  _pendingCleanup?: boolean;
};
type Droppable = {
  id: string | number;
  node: HTMLElement;
  layout: Layout;
  data: Record<string, any>;
  transform: Transform;
  transformed: Layout;
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

interface DragDropState {
  draggables: Record<string | number, Draggable>;
  droppables: Record<string | number, Droppable>;
  sensors: Record<string | number, Sensor>;
  active: {
    draggableId: string | number | null;
    droppableId: string | number | null;
    sensorId: string | number | null;
  };
  previous: {
    draggableId: string | number | null;
    droppableId: string | number | null;
  };
  transformers: Transformer[];
  usingDragOverlay: boolean;
}
interface DragDropActions {
  setUsingDragOverlay(value?: boolean): void;
  addDraggable(draggable: Omit<Draggable, "transform" | "transformed">): void;
  addDroppable(droppable: Omit<Droppable, "transform" | "transformed">): void;
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
  collisionDetector?: CollisionDetector;
}

type DragDropContext = [Store<DragDropState>, DragDropActions];
type Listeners = Record<
  string,
  (event: HTMLElementEventMap[keyof HTMLElementEventMap]) => void
>;
type DragEventHandler = (event: DragEvent) => void;

const Context = createContext<DragDropContext>();

const DragDropProvider: Component<DragDropContextProps> = (passedProps) => {
  const props: Pick<Required<DragDropContextProps>, "collisionDetector"> &
    Omit<PropsWithChildren<DragDropContextProps>, "collisionDetector"> =
    mergeProps({ collisionDetector: mostIntersecting }, passedProps);
  const [state, setState] = createStore<DragDropState>({
    draggables: {},
    droppables: {},
    sensors: {},
    active: {
      draggableId: null,
      droppableId: null,
      sensorId: null,
    },
    previous: {
      draggableId: null,
      droppableId: null,
    },
    transformers: [],
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
    const existingDraggable = state.draggables[id]
      ? {
          transform: {
            ...(state.draggables[id]!.transform.base ??
              state.draggables[id]!.transform),
          },
          layout: { ...state.draggables[id]!.layout },
        }
      : undefined;

    batch(() => {
      setState("draggables", id, {
        id,
        node,
        layout,
        data,
        transform: noopTransform(),
        get transformed() {
          return transformLayout(this.layout, this.transform);
        },
        set transformed(_) {},
        _pendingCleanup: false,
      });
      if (existingDraggable && state.active.draggableId === id) {
        const layoutDelta = {
          x: existingDraggable.layout.x - layout.x,
          y: existingDraggable.layout.y - layout.y,
        };

        const transformer: ActiveDraggableOffsetTransformer = (
          transform,
          { type, id: itemId }
        ) => {
          if (type === "draggables" && itemId === id) {
            return {
              x: transform.x + layoutDelta.x,
              y: transform.y + layoutDelta.y,
            };
          }
          return transform;
        };
        transformer.draggableId = id;

        setState("transformers", (transformers) => [
          transformer,
          ...transformers,
        ]);

        displace("draggables", id, existingDraggable.transform);
      }
    });

    if (anyDraggableActive()) {
      recomputeLayouts();
    }
  };
  const removeDraggable = (id: string | number): void => {
    setState("draggables", id, "_pendingCleanup", true);
    queueMicrotask(() => cleanupDraggable(id));
  };
  const cleanupDraggable = (id: string | number) => {
    batch(() => {
      if (state.draggables[id]?._pendingCleanup) {
        setState("transformers", (transformers) =>
          transformers.filter(
            (transformer) =>
              (transformer as ActiveDraggableOffsetTransformer).draggableId !==
              id
          )
        );
        setState("draggables", id, undefined!);
        if (state.active.draggableId === id) {
          setState("active", "draggableId", null);
        }
        if (state.previous.draggableId === id) {
          setState("previous", "draggableId", null);
        }
      }
    });
  };

  const activeDraggable = (): Draggable | null => {
    if (state.active.draggableId) {
      return untrack(() => state.draggables)[state.active.draggableId] || null;
    }
    return null;
  };
  const previousDraggable = (): Draggable | null => {
    if (state.previous.draggableId) {
      return (
        untrack(() => state.draggables)[state.previous.draggableId] || null
      );
    }
    return null;
  };
  const anyDraggableActive = (): boolean => state.active.draggableId !== null;
  const addDroppable = ({
    id,
    node,
    layout,
    data,
  }: Omit<Droppable, "transform">): void => {
    const existingDroppable =
      state.droppables[id] !== undefined
        ? {
            transform: {
              ...(state.droppables[id]!.transform.base ??
                state.droppables[id]!.transform),
            },
          }
        : undefined;

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
      _pendingCleanup: false,
    });
    if (existingDroppable) {
      displace("droppables", id, existingDroppable.transform);
    }

    if (anyDraggableActive()) {
      recomputeLayouts();
    }
  };
  const removeDroppable = (id: string | number): void => {
    setState("droppables", id, "_pendingCleanup", true);
    queueMicrotask(() => cleanupDroppable(id));
  };
  const cleanupDroppable = (id: string | number) => {
    batch(() => {
      if (state.droppables[id]?._pendingCleanup) {
        setState("droppables", id, undefined!);
        if (state.active.droppableId === id) {
          setState("active", "droppableId", null);
        }
        if (state.previous.droppableId === id) {
          setState("previous", "droppableId", null);
        }
      }
    });
  };
  const activeDroppable = (): Droppable | null => {
    if (state.active.droppableId) {
      return untrack(() => state.droppables)[state.active.droppableId] || null;
    }
    return null;
  };
  const previousDroppable = (): Droppable | null => {
    if (state.previous.droppableId) {
      return (
        untrack(() => state.droppables)[state.previous.droppableId] || null
      );
    }
    return null;
  };
  const anyDroppableActive = (): boolean => state.active.droppableId !== null;
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
  const activeSensor = (): Sensor | null => {
    if (state.active.sensorId) {
      return untrack(() => state.sensors)[state.active.sensorId] || null;
    }
    return null;
  };
  const anySensorActive = (): boolean => state.active.sensorId !== null;
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
              setState("draggables", draggable.id, "layout", layout);
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
              setState("droppables", droppable.id, "layout", layout);
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
        batch(() => {
          setState("previous", "droppableId", state.active.droppableId);
          setState("active", "droppableId", droppableId);
        });
      }
    }
  };

  const applyTransformers = (
    transform: Transform,
    context: { type: "draggables" | "droppables"; id: string | number }
  ) => {
    return {
      ...state.transformers.reduce<Transform>(
        (transform: Transform, transformer) => {
          return transformer(transform, context);
        },
        { ...transform }
      ),
      base: { x: transform.x, y: transform.y },
    };
  };

  const displace = (
    type: "draggables" | "droppables",
    id: string | number,
    transform: Transform
  ): void => {
    untrack(() => {
      if (state[type][id]) {
        setState(
          type,
          id,
          "transform",
          applyTransformers(transform, { type, id })
        );
      }
    });
  };
  const dragStart = (draggableId: string | number): void => {
    batch(() => {
      displace("draggables", draggableId, noopTransform());
      setState("active", "draggableId", draggableId);
    });
    recomputeLayouts();
    detectCollisions();
  };
  const dragMove = (transform: Transform): void => {
    const draggableId = state.active.draggableId;
    if (draggableId) {
      displace("draggables", draggableId, transform);
      detectCollisions();
    }
  };
  const dragEnd = (): void => {
    batch(() => {
      setState("previous", "draggableId", state.active.draggableId);
      setState("previous", "droppableId", state.active.droppableId);
      if (state.active.draggableId) {
        setState("transformers", (transformers) =>
          transformers.filter(
            (transformer) =>
              (transformer as ActiveDraggableOffsetTransformer).draggableId !==
              state.active.draggableId
          )
        );
        displace("draggables", state.active.draggableId, noopTransform());
      }
      setState("active", ["draggableId", "droppableId"], null);
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
export type { Listeners, DragEventHandler, DragEvent, Draggable, Droppable };
