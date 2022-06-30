import { ParentComponent } from "solid-js";

import { createPointerSensor } from "./create-pointer-sensor";

const DragDropSensors: ParentComponent = (props) => {
  createPointerSensor();
  return <>{props.children}</>;
};

export { DragDropSensors };
