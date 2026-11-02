---
title: Notes, todo lists and canvases in spark
tag: spark
---
Projects get notes that live next to the code: a todo list in the Todo window, and a canvas for the overview of a project - text, containers, drawings and lines on one surface. Both are plain Markdown in the folder `notes/`, so they go into Git with everything else.

- **Todo lists** for projects and solutions: four states - open, in progress, blocked, done - shown as small boxes, changed with a click. spark writes back only the line that changed, so `notes/todo.md` stays yours to edit by hand.
- **Canvases** (`.xmd`): containers at fixed places with their own text, sketches, and lines between containers that follow them when they move. A container can also show another document - tick off the todo list right on the overview.
- **Editing on the surface**: select, move and size on a raster, double click to edit text in place (the cursor lands on the line you clicked), draw rects, ellipses, arrows, free strokes and texts, choose colours and fillings, connect containers. Everything is one undo step.
- **Four views** for every Markdown document: Surface (the new default), Split, Code and View.

*Project → Overview* opens the canvas of a project, *Project → Todo List* its todo list. The format is described in [NOTES.md](https://github.com/what3var/fire/blob/master/docs/NOTES.md).
