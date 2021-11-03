# Changelog

## [0.3.2] - 2021-11-03

### Fixed

- Cleanup dangling references to removed items. When draggables, droppables or
  sensors removed, clean up dangling references to them in the state (such as
  'active' or 'previous' values). This helps prevent potential infinite recursion
  (such as in onDragEnd) where an item (like a draggable) oscillates between
  having a valid 'previous' value reference and undefined.

## [0.3.1] - 2021-09-05

### Changed

- As part of the fix for detecting collisions on drag start, `recomputeLayouts`
  no longer automatically calls `detectCollisions` when layouts have changed.
  Instead, it returns a boolean indicating whether a layout change detected
  - enabling the caller to call `detectCollisions` if desired.

### Fixed

- Fix case where a drag with no movement results in an incorrect drop. This was
  due to collisions not being detected on drag start if layouts had not changed
  (the common case). Collisions now always detected by `dragStart`.

## [0.3.0] - 2021-09-04

### Added

- Add `sensorStart` and `sensorEnd` to support sensors explicitly indicating
  whether they are active or not. Note that only one sensor can be considered
  active at a time.

### Changed

- Activate sensor in `createPointerSensor` if the pointer has moved more than 10
  pixels. This is irrespective of whether the delay condition has been met. It
  addresses the issue where a dragged item appears to jump to its new location
  after a delay if the pointer moved quickly at the outset of the drag.

- Make managing sensor active state explicit. Returning a truthy value from a
  sensor activator will no longer cause that sensor to be automatically marked
  as the active sensor. In addition, other activators will continue to be called
  until a sensor explicitly indicates it is active by calling `sensorStart`.
  Similarly, an active sensor must now call `sensorEnd` when it is no longer
  active (typically when a drag completes). This makes it clearer that a sensor
  is responsible for managing its activation state (and how to do so),
  especially in cases of delayed activation.

## [0.2.0] - 2021-07-12

Update to work with Solid 1.0 and streamline the interface with new directives.

### Added

- Update `createDraggable`, `createDroppable` and `createSortable` to provide
  a custom directive. These can be used with the Solid `use:___` syntactic sugar
  for common usage setup - no need to pass refs and props around:

```js
const MyComponent = (props) => {
  const draggable = createDraggable({ id: props.id });
  return <div use:draggable>Drag me!</div>;
};
```

If finer control needed, the underlying primitives are accessible by property
lookup on the directive::

```js
const MyComponent = (props) => {
  const draggable = createDraggable({ id: props.id });
  return (
    <div ref={draggable.ref}>
      <div {...draggable.dragActivators}>Drag Handle</div>
      Drag me!
    </div>
  );
};
```

- Automatically detect and register usage of `DragOverlay`. Add to
  `DragDropContext` state a `usingDragOverlay` property that can be checked.
- Return a new function `displace` as part of the `DragDropContext` that can be
  used to set the transform for a droppable or draggable. See usage in
  `createSortable` for example.

### Changed

- Update to work with Solid 1.0! This is a breaking change that requires
  updating peer dependency of Solid to 1.0 or greater.
- Refactor `isActiveDraggable` and `isActiveDroppable` to appear as resolved
  properties rather than functions to call (this is more consistent with the
  rest of interface). E.g. `draggable.isActiveDraggable()`
  -> `draggable.isActivateDraggable`.
- Refactor sensor interface to use event type rather than handler name. For
  example, make `createPointerSensor` use `pointerdown` rather than
  `onPointerDown` for activation. As part of this, add a `asHandlers` option to
  `draggableActivators` to control whether to return object with `on___` form or
  not (default is `false`).
- Rename occurrences of `translate` to `transform`, which feels a more
  appropriate name. E.g. `translateStyle` should now be `transformStyle` and the
  `translate` property returned from `create___` calls should be called
  `transform`.
- Assume valid `transform` value is always present. In particular,
  `transformStyle` no longer checks for a `null` transform value.
- Improve vertical sort algorithm to better handle arbitrary gaps (such as those
  created by the CSS gap property on flexbox). As part of this, remove the now
  redundant `outerHeight` and `outerWidth` properties from the layout data
  returned by `elementLayout`.
- Update `README.md` to reflect simpler directive interface for draggables and
  droppables.

### Removed

- Remove support for explicitly managing droppable `disabled` state. The current
  implementation feels limiting and potentially confusing. For example, it
  prevents detecting when a draggable is over a disabled droppable and styling
  it appropriately. Note that a similar effect to `disabled` can be achieved by
  determining drop suitability in `onDragEnd`.

## [0.1.2] - 2021-07-03

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

<!-- prettier-ignore -->
[Unreleased]: https://github.com/thisbeyond/solid-dnd/compare/0.3.2...HEAD
[0.3.2]: https://github.com/thisbeyond/solid-dnd/compare/0.3.1...0.3.2
[0.3.1]: https://github.com/thisbeyond/solid-dnd/compare/0.3.0...0.3.1
[0.3.0]: https://github.com/thisbeyond/solid-dnd/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/thisbeyond/solid-dnd/compare/0.1.2...0.2.0
[0.1.2]: https://github.com/thisbeyond/solid-dnd/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/thisbeyond/solid-dnd/releases/tag/0.1.1
