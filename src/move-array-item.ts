const moveArrayItem = <T>(
  array: T[],
  fromIndex: number,
  toIndex: number
): T[] => {
  const newArray = array.slice();
  newArray.splice(toIndex, 0, ...newArray.splice(fromIndex, 1));
  return newArray;
};

export { moveArrayItem };
