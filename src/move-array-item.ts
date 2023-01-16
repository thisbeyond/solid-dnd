const moveArrayItem = <T>(
  array: T[],
  fromIndex: number,
  toIndex: number
): T[] => {
  const newArray = [...array];
  [newArray[fromIndex], newArray[toIndex]] = [newArray[toIndex], newArray[fromIndex]];
  return newArray;
};

export { moveArrayItem };
