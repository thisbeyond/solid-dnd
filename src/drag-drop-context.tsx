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

type Id = string | number;

type SensorActivator<K extends keyof HTMLElementEventMap> = (
  event: HTMLElementEventMap[K],
  draggableId: Id
) => void;
type Draggable = {
  id: Id;
  node: HTMLElement;
  layout: Layout;
  data: Record<string, any>;
  transform: Transform;
  transformed: Layout;
  _pendingCleanup?: boolean;
};
type Droppable = {
  id: Id;
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
  id: Id;
  activators: { [K in keyof HTMLElementEventMap]?: SensorActivator<K> };
}

type Transformer = (
  transform: Transform,
  context: { type: "draggables" | "droppables"; id: Id }
) => Transform;

type ActiveDraggableOffsetTransformer = Transformer & {
  draggableId?: Id;
};

interface DragDropState {
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
  previous: {
    draggableId: Id | null;
    draggable: Draggable | null;
    droppableId: Id | null;
    droppable: Droppable | null;
  };
  transformers: Transformer[];
  usingDragOverlay: boolean;
}
interface DragDropActions {
  setUsingDragOverlay(value?: boolean): void;
  addDraggable(draggable: Omit<Draggable, "transform" | "transformed">): void;
  addDroppable(droppable: Omit<Droppable, "transform" | "transformed">): void;
  removeDraggable(id: Id): void;
  removeDroppable(id: Id): void;
  addSensor(sensor: Sensor): void;
  removeSensor(id: Id): void;
  sensorStart(id: Id): void;
  sensorEnd(): void;
  recomputeLayouts(filter?: RecomputeFilter): boolean;
  detectCollisions(): void;
  displace(
    type: "draggables" | "droppables",
    id: Id,
    transform: Transform
  ): void;
  draggableActivators(draggableId: Id, asHandlers?: boolean): Listeners;
  dragStart(draggableId: Id): void;
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
    previous: {
      draggableId: null,
      get draggable(): Draggable | null {
        return state.previous.draggableId !== null
          ? state.draggables[state.previous.draggableId]
          : null;
      },
      droppableId: null,
      get droppable(): Droppable | null {
        return state.previous.droppableId !== null
          ? state.droppables[state.previous.droppableId]
          : null;
      },
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
      if (existingDraggable) {
        if (state.active.draggableId === id) {
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
        } else if (state.previous.draggableId === id) {
          queueMicrotask(() =>
            node.getAnimations().map((animation) => animation.cancel())
          );

          const layoutDelta = {
            x: existingDraggable.layout.x - layout.x,
            y: existingDraggable.layout.y - layout.y,
          };

          const transform = {
            x: existingDraggable.transform.x + layoutDelta.x,
            y: existingDraggable.transform.y + layoutDelta.y,
          };

          displace("draggables", id, transform);
        }
      }
    });

    if (state.active.draggable) {
      recomputeLayouts();
    }
  };
  const removeDraggable = (id: Id): void => {
    setState("draggables", id, "_pendingCleanup", true);
    queueMicrotask(() => cleanupDraggable(id));
  };
  const cleanupDraggable = (id: Id) => {
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

    if (state.active.draggable) {
      recomputeLayouts();
    }
  };
  const removeDroppable = (id: Id): void => {
    setState("droppables", id, "_pendingCleanup", true);
    queueMicrotask(() => cleanupDroppable(id));
  };
  const cleanupDroppable = (id: Id) => {
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

  const addSensor = ({ id, activators }: Sensor): void => {
    setState("sensors", id, { id, activators });
  };
  const removeSensor = (id: Id): void => {
    batch(() => {
      setState("sensors", id, undefined!);
      if (state.active.sensorId === id) {
        setState("active", "sensorId", null);
      }
    });
  };
  const sensorStart = (id: Id): void => setState("active", "sensorId", id);
  const sensorEnd = (): void => setState("active", "sensorId", null);

  const draggableActivators = (draggableId: Id, asHandlers?: boolean) => {
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
        batch(() => {
          setState("previous", "droppableId", state.active.droppableId);
          setState("active", "droppableId", droppableId);
        });
      }
    }
  };

  const applyTransformers = (
    transform: Transform,
    context: { type: "draggables" | "droppables"; id: Id }
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
    id: Id,
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
  const dragStart = (draggableId: Id): void => {
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
      const activeDraggable = state.active.draggableId;
      if (activeDraggable) {
        setState("transformers", (transformers) =>
          transformers.filter(
            (transformer) =>
              (transformer as ActiveDraggableOffsetTransformer).draggableId !==
              activeDraggable
          )
        );
        requestAnimationFrame(() =>
          displace("draggables", activeDraggable, noopTransform())
        );
      }
      setState("active", ["draggableId", "droppableId"], null);
    });
  };
  const onDragStart = (handler: DragEventHandler): void => {
    createEffect(() => {
      const draggable = state.active.draggable;
      if (draggable) {
        untrack(() => handler({ draggable }));
      }
    });
  };
  const onDragMove = (handler: DragEventHandler): void => {
    createEffect(() => {
      const draggable = state.active.draggable;
      if (draggable) {
        Object.values(draggable.transform);
        untrack(() => handler({ draggable }));
      }
    });
  };
  const onDragOver = (handler: DragEventHandler): void => {
    createEffect(() => {
      const draggable = state.active.draggable;
      const droppable = state.active.droppable;
      if (draggable) {
        untrack(() => handler({ draggable, droppable }));
      }
    });
  };
  const onDragEnd = (handler: DragEventHandler): void => {
    createEffect(() => {
      const currentDraggable = state.active.draggable;
      const draggable = state.previous.draggable;
      if (draggable && !currentDraggable) {
        untrack(() =>
          handler({ draggable, droppable: state.previous.droppable })
        );
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
    draggableActivators,
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
export type {
  Id,
  Listeners,
  DragEventHandler,
  DragEvent,
  Draggable,
  Droppable,
};
