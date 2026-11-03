---
title: Circuits in C
tag: Circuits
---
The circuit simulator now runs on a kernel written in C. It was the last standard package with natives in C++ - now every standard package is plain C99, and a program that uses any of them builds with a C compiler alone, TinyCC included.

- **The same simulation.** The kernel does every computation in the same order as before. The circuit tests print exactly the same numbers as with the C++ kernel, also unrounded, down to the number of Newton iterations.
- **Just as fast.** An RC ladder, a transistor amplifier with diodes and a counter of flip-flops run as fast as before, in the virtual machine and in native programs.
- **Everything else stays.** Circuits that run in their own thread, sound devices, scopes, FFT, formulas and chips work as they did.

Also new: the project template *Native Library (C)*, next to *Native Library (C++)*. It starts a library whose natives are C (`"language": "c"`). C++ stays open for your own packages - fire just doesn't need it any more for its own. See [Circuits](docs/topics/circuits.html) and [Natives of a package](docs/topics/package-natives.html) in the docs.
