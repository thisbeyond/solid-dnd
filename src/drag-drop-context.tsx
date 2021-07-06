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
  translateLayout,
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
  });

  const addDraggable = ({ id, node, layout, data }) =>
    setState("draggables", id, {
      id,
      node,
      layout,
      data,
      translate: { x: 0, y: 0 },
    });

  const removeDraggable = ({ id }) => setState("draggables", id, undefined);

  const activeDraggable = () =>
    state.active.draggable && state.draggables[state.active.draggable];

  const previousDraggable = () =>
    state.previous.draggable && state.draggables[state.previous.draggable];

  const anyDraggableActive = () => state.active.draggable != null;

  const addDroppable = ({ id, disabled, node, layout, data }) =>
    setState("droppables", id, {
      id,
      get disabled() {
        return typeof disabled === "function" ? disabled() : disabled;
      },
      node,
      layout,
      data,
      translate: { x: 0, y: 0 },
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
        for (const { sensor, activator } of eventMap[key]) {
          if (activator({ event, draggableId })) {
            setState("active", "sensor", sensor.id);
            break;
          }
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

    if (anyLayoutChanged) {
      detectCollisions();
    }
  };

  const detectCollisions = () => {
    const draggable = activeDraggable();
    if (draggable) {
      const draggableLayout = translateLayout({
        layout: draggable.layout,
        translate: draggable.translate,
      });

      const layouts = [];
      const droppableIds = [];
      for (const droppable of Object.values(state.droppables)) {
        if (droppable.disabled) continue;
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

  const dragStart = ({ draggableId }) => {
    batch(() => {
      setState("draggables", draggableId, "translate", { x: 0, y: 0 });
      setState("active", "draggable", draggableId);
    });
    recomputeLayouts();
  };

  const dragMove = ({ translate }) => {
    const draggableId = state.active.draggable;
    if (draggableId) {
      setState("draggables", draggableId, "translate", { ...translate });
      detectCollisions();
    }
  };

  const dragEnd = () => {
    batch(() => {
      setState("previous", "draggable", state.active.draggable);
      setState("previous", "droppable", state.active.droppable);
      if (state.active.draggable) {
        setState("draggables", state.active.draggable, "translate", {
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
        draggable.translate;
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
    addDraggable,
    removeDraggable,
    addDroppable,
    removeDroppable,
    addSensor,
    removeSensor,
    recomputeLayouts,
    detectCollisions,
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
