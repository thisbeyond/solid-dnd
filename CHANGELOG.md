# Changelog

## Unreleased

### Fixed

- Optimise production builds by stripping console messages and fix errors caused
  by mixed js and jsx output. As part of this, switch to
  [tsup](https://tsup.egoist.dev/) for building the library (which should be
  faster due to the use of [esbuild](https://esbuild.github.io/)).

  Thanks you [@thetarnav](https://github.com/thetarnav) for this improvement.


## [0.7.3] - 2022-11-02

### Fixed

- Only accept primary button (left-click) for activating drag with default
  pointer sensor. Fix an issue on some platforms where the contextmenu shows on
  right-click and intercepts the pointerup events that would cancel the drag,
  leading to a sticky unintended drag.

## [0.7.2] - 2022-10-07

### Fixed

- Typing error for `DragOverlay` children caused by use of `Element` instead of
  `JSX.Element`.

- Fix high severity vulnerability suggested by npm.

## [0.7.1] - 2022-09-11

### Added

- Emit more useful warnings when attempting to remove nonexistent items. Rather
  than fail with error (`Cannot read properties of undefined`), emit an
  appropriate console warning instead and then return.

### Fixed

- Ensure layouts recomputed before other effects on drag start. Without this,
  issues could occur where collisions were detected against stale positions and
  items moved incorrectly as a result. In addition, layouts might not have been
  recomputed correctly on drag end if adjustments were made by custom
  `onDragEnd` handlers. Now, core behaviour such as `recomputeLayouts` and
  `detectCollisions` is called explicitly as part of `dragStart` and `dragEnd`
  to ensure correct ordering.

- Don't apply redundant adjustment transformer when a drag overlay is used.

- Improve typings for `DragOverlay` to better describe function form.

## [0.7.0] - 2022-09-07

Refactor core to lean more into reactivity. Note there are multiple breaking
changes in this release - see below for details.

### Added

- Export `DragEvent` type for external use in order to avoid consumers having to
  redefine this type for custom handlers.

- Explicitly type `Id` (for `string | number` ids) and export for reuse.

- Add `rect` getter on `Layout` for ease of use. When duplicating a `Layout`,
  can now do `new Layout(existingLayout.rect)`.

- Support for custom transformers to refine `Draggable` and `Droppable`
  transform behaviour. Transformers are specified against an individual item and
  can be used for things like limiting drag movement to a particular axis:

  ```jsx
  const transformer = {
    id: "constrain-x-axis",
    order: 100,
    callback: (transform) => ({ ...transform, x: 0 }),
  };

  onDragStart(({ draggable }) => {
    addTransformer("draggables", draggable.id, transformer);
  });

  onDragEnd(({ draggable }) => {
    removeTransformer("draggables", draggable.id, transformer.id);
  });
  ```

- Support using function element form for `DragOverlay` children. This enables
  referencing the related `Draggable` directly without the need to track
  separately. For example:

  ```jsx
  <DragOverlay>
    {(draggable) => <div>Draggable {draggable.id}</div>}
  </DragOverlay>
  ```

### Changed

- **Breaking Change** Refactor core to lean more into reactivity.

  Notably, make transforms a reactive computation of an array of transformers
  rather than a pre-computed set state. For example, make active draggable
  transform react to current sensor position rather than have sensor set the
  draggable position directly.

  To support this reactivity, introduce a `sensorMove` function in place of the
  previous `dragMove` function, add functions (`addTransformer`,
  `removeTransformer`) to manage transformers on draggables and droppables, and
  remove the now redundant `displace` function.

  Transformers are keyed by id and orderable for ease of use and predictability,
  and can be accessed via the `transformers` property on draggables or
  droppables.

- **Breaking Change** Sensors should now pass their initial coordinates to
  `sensorStart` and updated coordinates to the new `sensorMove` function (which
  replaces the removed `dragMove` function). The included pointer sensor has
  been updated accordingly.

- **Breaking Change** Move 'read state' helpers directly into the state object.
  This makes a clearer separation between actions that typically modify state vs
  accessing the state for readonly purposes. It also feels more intuitive.

  As part of this, rename the existing state entries that refer to 'ids' to
  explicitly reflect this:

  * `state.active.draggable` -> `state.active.draggableId`
  * `state.active.droppable` -> `state.active.droppableId`
  * `state.active.sensor` -> `state.active.sensorId`
  * `state.previous.draggable` -> `state.active.draggableId`
  * `state.previous.droppable` -> `state.active.droppableId`

  Also, remove all redundant helpers in favour of directly using the state:

  * `activeDraggable()` -> `state.active.draggable`
  * `previousDraggable()` -> `state.previous.draggable`
  * `anyDraggableActive()` -> `state.active.draggable`
  * `activeDroppable()` -> `state.active.droppable`
  * `previousDroppable()` -> `state.previous.droppable`
  * `anyDroppableActive()` -> `state.active.droppable`
  * `activeSensor()` -> `state.active.sensor`

- **Breaking Change** Remove filter argument from `recomputeLayouts`. Instead,
  the core will determine which nodes to re-evaluate when called (and will also
  cache nodes to avoid redundant evaluation of layout when appropriate).

### Fixed

- **Breaking change** Make Solid JS 1.5 the minimum compatible version of Solid
  and update to support its breaking changes to typings, and the new `batch`
  behaviour.

- **Breaking Change** Use `DragOverlay` layout in collision detection.
  Previously the `Draggable` layout was used leading to unexpected behaviour
  collision behaviour (such as a larger overlay not triggering a `Droppable`
  even when over it). As part of this the `usingDragOverlay` property of dnd
  state is removed in faviour of tracking `state.active.overlay` data.

- Auto-center `DragOverlay` over its related `Draggable` on drag start for a
  better experience when the overlay is of differing size to the draggable.

- Avoid reacting to irrelevant droppable changes in `onDragEnd`.

- Minimise differences in layout calculations. Due to the way transforms are
  stripped from layouts, it is possible to end up with small differences in
  layout values. This is due to precision issues in JS. Attempt to minimise
  occurences by rounding to nearest whole number (pixel).

## [0.6.1] - 2022-05-02

### Fixed

- Ensure `onDragMove` is called for every move update (rather than just once).
  To do this, ensure that the relevant properties of the transform are accessed
  to set up the effect reactivity correctly. Before, only the top level
  transform object was accessed, but that is unchanging on move.

## [0.6.0] - 2022-05-01

### Added

- Support horizontal sorting in sortable transform algorithm. The new approach
  directly uses target droppable layout positions in order to calculate sorted
  transforms (which is more flexible and simpler).

  Note: Requires sorted items to be the same size to avoid odd visual behaviour
  as items are not currently scaled at all (though that may be implemented in
  future). This was also true of the previous algorithm.

## [0.5.0] - 2022-04-30

A significant update with multiple improvements and some breaking changes. Most
notably, provides better support for multi-sortable-list use cases.

### Added

- Seamlessly handle re-creation of draggables and droppables during active drag.

  In some use cases (such as a kanban board), an item may be moved from one
  container to another during an active drag. In turn this could cause related
  draggables and droppables to be removed and re-added. Previously this would
  just break (with the active draggable disappearing on its removal). Now, it is
  handled by deferring the cleanup of removed draggables and droppables with a
  queued microtask. If a draggable/droppable with matching `id` is added before
  the microtask is called, then it will not clean up and instead persist
  naturally with the new layout and node information.

  As part of this, the active draggable's transform is automatically adjusted by
  a temporary internal modifier to account for any difference between the
  previous node layout and the new node layout. This avoids jumping or
  misalignment during the drag that would otherwise be caused by the change in
  underlying node layout. In future this modifier interface may be exposed for
  other use cases.

  All layouts are also recomputed if any draggable is active when a new item is
  added.

- Add a basic debugger to help visualise draggable and droppable positions.
  Emphasise active items in debugger. To use, place `<DragDropDebugger>` within
  a `<DragDropProvider>` hierarchy.

  Note: droppable positions are rendered untransformed to better reflect
  underlying logic (as droppable transforms are not currently considered in the
  collision detectors).

- Add `transformed` helper property on items. Rather than calling
  `transformLayout(layout, transform)` explicitly, it is now possible to do
  `draggable.transformed` (or `droppable.transformed`) for the same computation.

- Add a closest corners collision detector (`closestCorners`) to provide a more
  natural collision match when droppables are nested.

- Add style helper (`maybeTransformStyle`) that only returns transform style
  when it will have an effect. This helps avoid affecting other styling (e.g.
  z-index) unintentionally. The directive form already uses this approach, and
  now manual setups can have this behaviour more easily too.

### Changed

- **Breaking Change** Refactor collision detection to be more context aware.

  Whilst it originally felt better to have collision detection abstracted into
  considering just layouts, in practice it limits smarter handling such as tie
  breaking on active droppable or types.

  Now, the active draggable and list of droppables is passed directly to the
  collision detection algorithm along with some additional useful context (such
  as the active droppable id). A new `CollisionDetector` type is also available
  for use when writing custom collision detectors.

  ```js
  type CollisionDetector = (
    draggable: Draggable,
    droppables: Droppable[],
    context: { activeDroppableId: Id | null }
  ) => Droppable | null;
  ```

- **Breaking Change** As part of the changes to the collision detection
  interface, update the existing algorithms and rename to drop "layout" from
  their names:

  * `closestLayoutCenter` -> `closestCenter`
  * `mostIntersectingLayout` -> `mostIntersecting`

- **Breaking Change** Rename `collisionDetectionAlgorithm` prop of
  `DragDropProvider` to the simpler `collisionDetector`.

- Compute and apply appropriate transform for sortables explicitly, rather than
  rely on delegation to underlying draggable/droppable transforms.

  A sortable can be transformed either as the active draggable transform (when
  no drag overlay is used) or as a droppable transform caused by the sorting of
  the list. Correctly compute the correct transform and ensure it is used both
  in directive form and as the returned transform for the sortable interface.

  As part of this, always store the computed sortable transform against the
  droppable entry regardless of whether directive used or not. This ensures
  consistency in the data (and helps debuggers visualise the information
  accurately).

- Include `transform` in returned `Droppable` interface for consistency.

- Simplify typings for state. Whilst technically correct, the presence of
  `undefined` in the typing for state like `droppables` makes it more awkward
  for consumers of that state. This is because they have to account for
  `undefined` value even though it will never actually be present (because
  setting state to `undefined` removes it from the state). So simplify the
  typing and override where necessary (such as when removing values).

- Use `createEffect` consistently throughout for a clearer mental model. There
  is currently no clear need for more immediate effects as provided by
  `createRenderEffect` and `createComputed`.

- Encapsulate layout inteface in a `Layout` class to avoid repeated definition
  of getter properties. As part of this, remove the standalone function for
  calculating layout center in favour of a computed property (`center`) on the
  layout itself.

### Fixed

- Strip translation transform when computing an element's layout. If a draggable
  is active when its layout is recomputed, its currently applied transform will
  be evaluated as part of its base layout (by `getBoundingClientRect`). This
  results in the transforms effectively stacking over time and the item being
  misplaced. To prevent this, strip any translation transform that is applied on
  the element.

- Reset sortable positions when indices are invalid. Prevent confusing behaviour
  caused by stale sort order when indices become invalid, but a drag is still
  active. This can happen when sorting across multiple containers for example.

- Ensure item accessors only re-evaluate when the active/previous id value
  changes. Previously, these accessors re-evaluated (when used in an effect)
  whenever the referenced item object itself had changes, leading to confusing
  behaviour. For example, `onDragEnd` firing again when adding new droppables.

- Built-in collision detection now tie-breaks on the active droppable to prevent
  potential flipping situations. When two droppables were equidistant candidates
  for collision, their naive ordering would decide which was returned as the
  match. Due to subsequent sorting, that ordering could change and the very next
  move would result in the alternative candidate matching, resulting in constant
  flipping. By tie-breaking on the active droppable this is avoided in the
  common case.

## [0.4.2] - 2022-02-06

### Fixed

- Update `rollup-plugin-solid` to 1.2.2 to address
  [Bundlephobia](bundlephobia.com) build error (caused by it tripping over the
  optinal chaining syntax `?.`). The plugin now targets a slightly older env in
  order to compile this syntax away.

## [0.4.1] - 2022-02-03

### Fixed

- Fix pointer sensor preventing default event behaviour on attachment. Instead,
  wait for activation of drag before intercepting relevant events. This avoids
  unexpected side effects, such as an `<input/>` not receiving focus on click.

  With this change, also listen for and clear any text selection that happens as
  a side effect during an active drag operation.

  Thanks to [@yonathan06](https://github.com/yonathan06) for reporting this
  behaviour.

## [0.4.0] - 2022-01-09

### Added

- [TypeScript](https://www.typescriptlang.org/) Typings! Thanks to
  [@areknawo](https://github.com/areknawo), Solid DnD is now fully typed.

### Changed

- **Breaking Change** As part of adding typings to Solid DnD, change most
  function signatures to use positional parameters over an options object. This
  simplifies the typing and makes it easier to use and understand the function
  parameters.

  For reference, the rules used when applying this change were:

  * Default to multiple positional params. For example, a call to
    `createDraggable({ id })` should now be `createDraggable(id)`.
  * Use an object when multiple params are related as a single entity (such as
    an 'event'). For example, an `onDragEnd(event)` handler can remain unchanged
    (accepting a single parameter).
  * Use an options object when there are a large number of parameters (>3).

- **Breaking Change** Rename `DragDropContext` to `DragDropProvider` and
  `SortableContext` to `SortableProvider` to match Solid convention and better
  reflect usage. Note that `useDragDropContext` and `useSortableContext` remain
  unchanged.

### Fixed

- Fix `eventMap[key] is undefined` error when attempting to drag a draggable
  that has been composed manually using the `draggable.dragActivators` property.
  This was due to naive key renaming in the `asHandlers` logic and so did not
  affect draggable usage as a directive.

## [0.3.3] - 2021-11-03

### Fixed

- Remove leftover debug log.

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
  Instead, it returns a boolean indicating whether a layout change detected and
  the caller can choose to call `detectCollisions` if desired.

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

- **Breaking Change** Update to work with Solid 1.0! Requires updating peer
  dependency of Solid to 1.0 or greater.
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
[unreleased]: https://github.com/thisbeyond/solid-dnd/compare/0.7.3...HEAD
[0.7.3]: https://github.com/thisbeyond/solid-dnd/compare/0.7.2...0.7.3
[0.7.2]: https://github.com/thisbeyond/solid-dnd/compare/0.7.1...0.7.2
[0.7.1]: https://github.com/thisbeyond/solid-dnd/compare/0.7.0...0.7.1
[0.7.0]: https://github.com/thisbeyond/solid-dnd/compare/0.6.1...0.7.0
[0.6.1]: https://github.com/thisbeyond/solid-dnd/compare/0.6.0...0.6.1
[0.6.0]: https://github.com/thisbeyond/solid-dnd/compare/0.5.0...0.6.0
[0.5.0]: https://github.com/thisbeyond/solid-dnd/compare/0.4.2...0.5.0
[0.4.2]: https://github.com/thisbeyond/solid-dnd/compare/0.4.1...0.4.2
[0.4.1]: https://github.com/thisbeyond/solid-dnd/compare/0.4.0...0.4.1
[0.4.0]: https://github.com/thisbeyond/solid-dnd/compare/0.3.3...0.4.0
[0.3.3]: https://github.com/thisbeyond/solid-dnd/compare/0.3.2...0.3.3
[0.3.2]: https://github.com/thisbeyond/solid-dnd/compare/0.3.1...0.3.2
[0.3.1]: https://github.com/thisbeyond/solid-dnd/compare/0.3.0...0.3.1
[0.3.0]: https://github.com/thisbeyond/solid-dnd/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/thisbeyond/solid-dnd/compare/0.1.2...0.2.0
[0.1.2]: https://github.com/thisbeyond/solid-dnd/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/thisbeyond/solid-dnd/releases/tag/0.1.1
