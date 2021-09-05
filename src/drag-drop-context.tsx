import {
  batch,
  createContext,
  createEffect,
  mergeProps,
  untrack,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";

import {
  layoutsAreEqual,
  mostIntersectingLayout,
  elementLayout,
  transformLayout,
  noopTransform,
} from "./layout";

export const Context = createContext();

export const DragDropContext = (props) => {
  props = mergeProps(
    { collisionDetectionAlgorithm: mostIntersectingLayout },
    props
  );

  const [state, setState] = createStore({
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

  const setUsingDragOverlay = (boolean = true) =>
    setState("usingDragOverlay", boolean);

  const addDraggable = ({ id, node, layout, data }) =>
    setState("draggables", id, {
      id,
      node,
      layout,
      data,
      transform: noopTransform(),
    });

  const removeDraggable = ({ id }) => setState("draggables", id, undefined);

  const activeDraggable = () =>
    state.active.draggable && state.draggables[state.active.draggable];

  const previousDraggable = () =>
    state.previous.draggable && state.draggables[state.previous.draggable];

  const anyDraggableActive = () => state.active.draggable != null;

  const addDroppable = ({ id, node, layout, data }) =>
    setState("droppables", id, {
      id,
      node,
      layout,
      data,
      transform: noopTransform(),
    });

  const removeDroppable = ({ id }) => setState("droppables", id, undefined);

  const activeDroppable = () =>
    state.active.droppable && state.droppables[state.active.droppable];

  const previousDroppable = () =>
    state.previous.droppable && state.droppables[state.previous.droppable];

  const anyDroppableActive = () => state.active.droppable != null;

  const addSensor = ({ id, activators }) =>
    setState("sensors", id, { id, activators });

  const removeSensor = ({ id }) => setState("sensors", id, undefined);

  const sensorStart = ({ id }) => setState("active", "sensor", id);

  const sensorEnd = () => setState("active", "sensor", null);

  const activeSensor = () =>
    state.active.sensor && state.sensors[state.active.sensor];

  const anySensorActive = () => state.active.sensor != null;

  const draggableActivators = (
    { draggableId, asHandlers } = { asHandlers: false }
  ) => {
    const eventMap = {};
    for (const sensor of Object.values(state.sensors)) {
      for (const [type, activator] of Object.entries(sensor.activators)) {
        eventMap[type] ??= [];
        eventMap[type].push({ sensor, activator });
      }
    }
    const listeners = {};
    for (let key in eventMap) {
      if (asHandlers) {
        key = `on${key}`;
      }
      listeners[key] = (event) => {
        for (const { activator } of eventMap[key]) {
          if (anySensorActive()) {
            break;
          }
          activator({ event, draggableId });
        }
      };
    }
    return listeners;
  };

  const recomputeLayouts = ({ filter } = { filter: "all" }) => {
    let anyLayoutChanged = false;
    batch(() => {
      if (filter === "all" || filter === "draggable") {
        for (const draggable of Object.values(state.draggables)) {
          const currentLayout = draggable.layout;
          const layout = elementLayout({ element: draggable.node });
          if (!layoutsAreEqual({ layout1: currentLayout, layout2: layout })) {
            setState("draggables", draggable.id, "layout", layout);
            anyLayoutChanged = true;
          }
        }
      }

      if (filter === "all" || filter === "droppable") {
        for (const droppable of Object.values(state.droppables)) {
          const currentLayout = droppable.layout;
          const layout = elementLayout({ element: droppable.node });
          if (!layoutsAreEqual({ layout1: currentLayout, layout2: layout })) {
            setState("droppables", droppable.id, "layout", layout);
            anyLayoutChanged = true;
          }
        }
      }
    });

    return anyLayoutChanged;
  };

  const detectCollisions = () => {
    const draggable = activeDraggable();
    if (draggable) {
      const draggableLayout = transformLayout({
        layout: draggable.layout,
        transform: draggable.transform,
      });

      const layouts = [];
      const droppableIds = [];
      for (const droppable of Object.values(state.droppables)) {
        droppableIds.push(droppable.id);
        layouts.push(droppable.layout);
      }

      const layout = props.collisionDetectionAlgorithm({
        layout: draggableLayout,
        layouts,
      });

      let droppableId = null;
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

  const displace = ({ type, id, transform }) => {
    untrack(() => {
      if (state[type][id]) {
        setState(type, id, "transform", { ...transform });
      }
    });
  };

  const dragStart = ({ draggableId }) => {
    batch(() => {
      setState("draggables", draggableId, "transform", noopTransform());
      setState("active", "draggable", draggableId);
    });
    recomputeLayouts();
    detectCollisions();
  };

  const dragMove = ({ transform }) => {
    const draggableId = state.active.draggable;
    if (draggableId) {
      setState("draggables", draggableId, "transform", { ...transform });
      detectCollisions();
    }
  };

  const dragEnd = () => {
    batch(() => {
      setState("previous", "draggable", state.active.draggable);
      setState("previous", "droppable", state.active.droppable);
      if (state.active.draggable) {
        setState("draggables", state.active.draggable, "transform", {
          x: 0,
          y: 0,
        });
      }
      setState("active", ["draggable", "droppable"], null);
    });
  };

  const onDragStart = (handler) => {
    createEffect(() => {
      const draggable = activeDraggable();
      if (draggable) {
        untrack(() => handler({ draggable }));
      }
    });
  };

  const onDragMove = (handler) => {
    createEffect(() => {
      const draggable = activeDraggable();
      if (draggable) {
        draggable.transform;
        untrack(() => handler({ draggable }));
      }
    });
  };

  const onDragOver = (handler) => {
    createEffect(() => {
      const draggable = activeDraggable();
      const droppable = activeDroppable();
      if (draggable) {
        untrack(() => handler({ draggable, droppable }));
      }
    });
  };

  const onDragEnd = (handler) => {
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

  const context = [state, actions];

  return <Context.Provider value={context}>{props.children}</Context.Provider>;
};

export const useDragDropContext = () => {
  return useContext(Context);
};
