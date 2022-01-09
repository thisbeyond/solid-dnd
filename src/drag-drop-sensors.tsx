import { Component } from "solid-js";
import { createPointerSensor } from "./create-pointer-sensor";

const DragDropSensors: Component = (props) => {
  createPointerSensor();
  return <>{props.children}</>;
};

export { DragDropSensors };
