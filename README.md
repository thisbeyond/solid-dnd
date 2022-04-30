<p align="center">
  <a href="https://solid-dnd.com">
    <img
      alt="Solid DnD - A lightweight drag and drop toolkit for Solid."
      src="./resources/solid-dnd-website-preview.png">
  </a>
</p>

- **Built for [Solid](https://solidjs.com/):** leverages fine-grained reactivity primitives for
  coordination.
- **Flexible:** built to support a wide range of cases, from plain drag and drop
  to sortable lists, multiple containers and beyond.
- **Extendable:** build your own sensors, collision detection algorithms and
  presets like sortable lists out of the primitives.
- **Zero dependencies:** Just pair with Solid and good to go.
- **Performant:** No component re-rendering, coupled with CSS transforms and
  transitions for silky smooth performance.

![solid drag and drop preview](./resources/solid-dnd-preview-small.gif?raw=true)

## How do I get started? 🧭

Install it:

```bash
npm install @thisbeyond/solid-dnd
```

Use it:

```jsx
import {
  DragDropProvider,
  DragDropSensors,
  useDragDropContext,
  createDraggable,
  createDroppable,
} from "@thisbeyond/solid-dnd";

const Draggable = (props) => {
  const draggable = createDraggable(props.id);
  return <div use:draggable>draggable</div>;
};

const Droppable = (props) => {
  const droppable = createDroppable(props.id);
  return <div use:droppable>droppable</div>;
};

const Sandbox = () => {
  const [, { onDragEnd }] = useDragDropContext();

  onDragEnd(({draggable, droppable}) => {
    if (droppable) {
      // Handle the drop. Note that solid-dnd doesn't move a draggable into a
      // droppable on drop. It leaves it up to you how you want to handle the
      // drop.
    }
  });

  return (
    <div>
      <Draggable id="draggable-1" />
      <Droppable id="droppable-1" />
    </div>
  );
};

const App = () => {
  return (
    <DragDropProvider>
      <DragDropSensors>
        <Sandbox />
      </DragDropSensors>
    </DragDropProvider>
  );
};

export default App;
```

See more examples at https://solid-dnd.com

## What's implemented? ✔️

- [x] Use `createDraggable` with your elements to easily integrate drag
      behaviour. Maintain full control over how your element looks and behaves.
- [x] Manage droppable areas with `createDroppable`. Conditionally enable and
      disable droppable areas based on the current context.
- [x] Use `DragOverlay` when you want to drag a representation of your element
      that is removed from the normal flow.
- [x] Support for different sensors to detect and manage dragging (pointer
      sensor provided by default).
- [x] Layout collision detection algorithms (`mostIntersecting`,
      `closestCorners` and `closestCenter`) for common usage. You can also add
      your own.
- [x] Sortable list primitives for drag and drop list reordering (currently only
      vertical sorting supported).
- [x] Use multiple (or nested) `DragDropProvider` for containers isolated from
      each other.

## Who made this? ✍

[Martin Pengelly-Phillips](https://twitter.com/thesociablenet)

## Why did you make it?

[Solid](https://solidjs.com) first caught my eye when I was looking for a way to
improve performance of a [React](https://reactjs.org) app I'd been working on. I
was feeling frustrated by the rules of hooks and the effort / complexity of
performance improvements - especially what felt like a lot of manual
book-keeping across renders. In the end, I changed my app behaviour to sidestep
the issues and carried on with React.

But I also found myself watching Solid's progress too, commenting a bit here and
there in the community. So, when I started a new side project I decided to jump
in and give Solid a go. Performance was great, but what kept me invested in
Solid was the clean lines of its primitives / API and the incredibly helpful
community. It felt quick to be productive, and I liked how there seemed to be a
focus on real world problems and getting it done (progress over perfection or
even a hacker spirit). Somehow it also felt closer to vanilla JS and that I was
working more with the language than against it.

However, there are always tradeoffs. In this case it was that Solid was not
particularly well known and there was not an ecosystem of libraries available to
solve common problems. This was a double-edged sword. On the one hand I liked
how writing solutions myself kept my app lean, and my solutions focused. On the
other, I was spending time building these solutions rather than my app.

One of the more challenging ones was adding drag and drop sorting of list items
to my app. I could have hacked in a third-party library, but I didn't want to
give up the granular reactivity of Solid to do so. I was also interested in the
challenge - how hard would it be with Solid? Inspired by
[dnd-kit](https://dndkit.com) (a modern approach to dnd in React), I built
something out for my app in around ~700 lines. I shared a gif of it with the
community and decided to try to extract it into a library for others. And so,
`solid-dnd` came to be :)
