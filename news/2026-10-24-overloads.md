---
title: Overloading by parameter type
tag: Language
---
Methods can now be overloaded by the types of their parameters. The closest overload wins: derived class before base class, before interface, before generic, before anything. Explicit type arguments like `M<T>(x)` work too.

The overload is chosen at compile time where the types are known, and return values are checked against their declared types.
