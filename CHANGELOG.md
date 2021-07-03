# Changelog

## [Unreleased]

Simplify releasing.

### Added

- Use [release-it](https://github.com/release-it/release-it) to simplify
performing a release.
- Add keywords to `package.json` for easier discoverability of package.
- Add default publish configuration to `package.json`.

## [0.1.1] - 2021-06-22

Initial release supporting plain drag and drop as well as an early preset for
sortable lists.

### Added

- Add `createDraggable` to easily integrate drag behaviour into components, with
the component maintaining control over how it looks and behaves.
- Add `createDroppable` to register and manage droppable areas. 
- Support conditionally enabling and disabling droppables via a `disabled`
option on `createDroppable`.
- Support dragging representations of a draggable through the use of a
`DragOverlay` (which can be removed from the normal document flow).
- Support using sensors to detect and manage drag starts.
- Add `createPointerSensor` as the default sensor, and wrap for convenience in a
`<DragDropSensors/>` component.
- Support customising collision detection algorithms and provide two initial
ones for common usage (`mostIntersectingLayout` and `closestLayoutCenter`).
- Add sortable list primitives (`SortableContext` and `createSortable`) for drag
and drop vertical list reordering.
- Support using multiple (or nested) `DragDropContext` for containers isolated
from each other.
  
[Unreleased]: https://github.com/thisbeyond/solid-dnd/compare/0.1.1...HEAD
[0.1.1]: https://github.com/thisbeyond/solid-dnd/releases/tag/0.1.1