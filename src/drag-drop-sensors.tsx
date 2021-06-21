import { createPointerSensor } from "./create-pointer-sensor";

export const DragDropSensors = (props) => {
  createPointerSensor();
  return <>{props.children}</>;
};
