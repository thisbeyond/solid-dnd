export const moveArrayItem = ({ array, fromIndex, toIndex }) => {
  const newArray = array.slice();
  newArray.splice(toIndex, 0, ...newArray.splice(fromIndex, 1));
  return newArray;
};
