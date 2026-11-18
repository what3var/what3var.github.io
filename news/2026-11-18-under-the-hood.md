---
title: Under the hood - and a plan to leave .NET
tag: Inside
---
Less visible, but worth a note:

- **Threads without waiting.** In native programs, a thread inside a long call of a package no longer holds up the main program, and global buffers are shared memory with a protected lifetime. Packages that are safe for it say `threadSafe` in their manifest (`time`, `hash`, `compression` already do).
- **A faster VM.** The interpreter runs its instructions in one loop instead of a call per instruction; `StringBuilder` writes into a growing buffer, bool arrays are packed to a byte per element.
- **The tests are files.** Over a thousand cases - "native == VM", diagnostics, types, syntax - now live in `tests/cases` with their expected output, and `tests/run-cases.sh` checks them with plain `forge run`. The bytecode has its own file format (`.fbc`) instead of a .NET serializer.
- **The plan: forge and the VM in C.** The compiler and the VM are to move from .NET to C11, as libraries that a fire program can also import - fire as a scripting language inside fire. The hard rule: native programs get neither bigger nor slower. After that only spark is left on .NET, until it is written in fire, too. Nothing of it is built yet; the groundwork above is the first step.
- **Windows.** `Window.ClickThrough`, `Frameless`, `TopMost`, `ShowInTaskbar` and `SetIcon` on Win32, X11, Wayland and macOS; in `.fxml` the root of a window is the field `UIRoot` now, with `UIRoot.*` attributes on the `<Window>`.
