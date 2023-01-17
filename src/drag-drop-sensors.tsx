import { ParentComponent } from "solid-js";

import { createPointerSensor } from "./create-pointer-sensor";
import { createKeyboardSensor } from "./create-keyboard-sensor";

const DragDropSensors: ParentComponent = (props) => {
  createPointerSensor();
  createKeyboardSensor();
  return <>{props.children}</>;
};

export { DragDropSensors };
