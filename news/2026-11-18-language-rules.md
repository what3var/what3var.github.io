---
title: "Language: fewer surprises"
tag: Language
---
A batch of rules that make fire behave the way it reads - the same in the VM and natively, in Debug and Release.

- **A `string` holds a string.** Whatever goes into a `string` variable, field, parameter, return value or `List<string>` becomes its text (`x.ToString()`). Every value and every object has `ToString()` now; `string k = Color.Blue` is `"Blue"`, not the enum value in disguise.
- **`replace`.** Assigning to a field never destroys the old value silently. `replace this.f = v` says it explicitly: the old value goes if the object owns it, and stays if it is only a reference.
- **Static initializers in dependency order.** A static field that uses another one is initialized after it, whatever the order in the source; a cycle is a compile error.
- **Ownership errors can be caught.** What the ownership rules forbid and only the run time can see - taking over a destroyed object, a `TakeTo` cycle - is a catchable `DestroyedException` or `ArgumentException`, no longer the end of the program.
- **Classes have fixed fields**, also through `any`: writing a field that was never declared is a `MissingMemberException`.
- **`x!`, `x:`, `x:!` are typed at compile time**, and the context of a declaration counts: `int i = 2.6!` is 3.
- **A few new checks** of the type checker (TC029, TC031, TC033) catch an object sent into a channel without `copy` or `take`, a temporary that a constructor only keeps a reference to, and an index, a size or a pointer of the wrong type.

See the [language reference](docs/language/index.html) and [error codes](docs/tools/errors.html).
