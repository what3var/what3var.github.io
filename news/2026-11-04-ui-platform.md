---
title: ui gets a new look - and its own platform layer
tag: UI
---
fire's windows no longer go through SDL. A new platform layer in C talks to X11, Wayland, Win32, Cocoa and the browser's canvas directly, the VM now draws through the same C library as a native program, and the `ui` package uses it for a softer, more modern style with rounded corners, shadows and acrylic menus.

![A small ui program, built natively and drawn through the new X11 backend: the File menu and its submenu float on acrylic with a soft shadow](news/ui-style.png)

- **Our own platform layer.** Windows, input, IME, clipboard, drag & drop, joysticks and audio come from small backends per system: X11 and Wayland on Linux (chosen at run time, without Wayland headers at build time), Win32 with DirectComposition on Windows, Cocoa through the Objective-C runtime from plain C on macOS, and a `<canvas>` on the web. Only what the system always has is linked; everything else is loaded when it is needed. SDL is no longer required.
- **One implementation for VM and native.** The VM used to have its own C# twin of the graphics package. Now it calls the C libraries of `graphics` and `windows`, like a native program - so both draw the same pixels by construction. spark's live and design views use them, too.
- **A new style.** Controls have rounded corners (`theme.radius`), finer borders and a focus ring in the accent colour; menus and drop-down lists float with a fine, low-contrast shadow on **acrylic** - what lies behind them, blurred and tinted. `UI.Effects.Glass` and `UI.Effects.Transparency` switch the effects off, globally or per root, and follow the system's settings ("reduce transparency"). A window can ask the desktop for a backdrop: `ui.WindowBackdrop = Backdrop.Mica`. `ui.docking` got the same treatment.
- **Faster where it counts.** `Window.PresentArea` presents only what changed (Win32, Wayland, X11, the browser). Accelerated framebuffers draw shapes, text, blits, shadows, blur and materials on the GPU through Vulkan, loaded at run time; the software renderer stays the reference and still runs on an ESP32.
![The Docking sample in the new style, with the Run button's drop-down open](news/ui-docking.png)

- **Tooltips** for every element (`button.ToolTip = "Saves everything"`), and the drawing helpers are there for your own programs: `FillRoundRect`, `DrawShadow`, `Blur`, `DrawMaterial`.

The design notes are in [UI platform](docs/topics/ui-platform.html), the style and effects in [UI](docs/topics/ui.html).
