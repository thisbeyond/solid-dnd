type RefSetter<V> = (value: V) => void;

const combineRefs = <V>(
  setRefA: RefSetter<V>,
  setRefB: RefSetter<V>
): RefSetter<V> => {
  return (ref) => {
    setRefA(ref);
    setRefB(ref);
  };
};

export { combineRefs };
export type { RefSetter };
