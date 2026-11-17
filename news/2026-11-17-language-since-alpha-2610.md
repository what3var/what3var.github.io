---
title: A month of language work - and how fast fire is
tag: Language
---
Since alpha-2610 the language has become stricter where it used to guess: declarations hold what they say, enums are types of their own, arrays take any element type, classes have fixed fields, and what goes wrong at run time is a catchable exception - in the VM and natively alike. Threads got safer, strings much faster. And for the first time we measured fire against C, Rust, Go and others: the native build is close to C in places, behind in others, and its programs are tiny.

#### Declarations keep their promise

- **`defined`** says a value is never `undefined`: `defined int count`, also for strings, enums and objects. The compiler derives it for your own fields and parameters, and a debug build now derives exactly like a release build - the same checks and messages while you develop. `[InferDefined]` derives a class even when the program uses reflection or JSON, and checks what comes from outside. See [defined: never undefined](docs/language/02-types.html#defined-never-undefined).
- **Enums are types of their own.** `Color c` takes a value of `Color` or `undefined`, anything else is an `ArgumentException`. An enum value in an `int` is its number: after `int n = Color.Blue`, `n` is `2`. See [Enums](docs/language/10-enums-and-namespaces.html#declarations-with-an-enum-are-checked).
- **A `string` declaration holds a text.** Whatever goes in becomes its `ToString()`, and every value has `ToString()` now - numbers, bools, enums, arrays, every object (`<object Name>` unless the class says otherwise). See [string holds a text](docs/language/02-types.html#string-holds-a-text).

```fire
enum Color { Red, Green, Blue }
class Point {
    int x = 1
    string ToString() { return $"Point {x}" }
}
int n = Color.Blue          // TC001 warns - and n holds the number
print(n)                    // 2
string k = Color.Blue
print(k is of string)       // True: k holds the text "Blue"
string s = new Point()
print(s.Length)             // 7: ToString() ran, s is "Point 1"
any five = 5
try { Color c = five } catch (ArgumentException e) { print(e.message) }
// Variable 'c' is a Color, not Int.
```

```fire
#import "reflection"
[InferDefined]
class Counter {
    int count = 0
    undefined Add(defined int n) { this.count = this.count + n }
}
var c = new Counter()
c.Add(2)
try { Reflect.Set(c, "count", undefined) } catch (ArgumentException e) { print(e.message) }
// Field 'count' (derived as never undefined: nothing in the program stores undefined in it) is an int and never undefined.
print(c.count)              // 2 - the same with forge run -m debug
```

#### Arrays, records and classes

- **Arrays of every type**: `Dog pets[]`, `IShape shapes[]`, `string names[]`, `Color cs[]`, lambdas. An array of a derived class goes where one of its base class is declared and keeps its own element type. `new Dog[n]` is a Dog array from the start, and a method that returns `Cat[]` checks what it returns. See [Typed arrays](docs/language/07-arrays-and-lists.html#typed-arrays).
- **Records** (`record Pos { ... }`) are objects that do not change after their construction. Two records with the same content are equal, so a record can be the key of a dictionary. `r with { .x = 5 }` makes a changed copy. See [Records](docs/language/08-classes.html#records).
- **Classes have fixed fields**, also through `any`: writing a field the class does not declare is the `MissingMemberException`, in the VM and natively. A name is static or for instances, never both - methods, fields and properties (`E4076`), and a field or property is declared once (`E4077`). See [Classes](docs/language/08-classes.html#fields-constructors-methods) and the [error codes](docs/tools/errors.html).

```fire
class Animal { }
class Dog : Animal { }
class Cat : Animal { }
any d = new Dog[2]                  // a Dog array from the start
Animal all[] = d                    // fine: every Dog is an Animal
try { all[0] = new Cat() } catch (ArgumentException e) { print(e.message) }
// An element of an array of Dog must be a Dog (or undefined), not Cat.
try { Cat cats[] = d } catch (ArgumentException e) { print(e.message) }
// An array of Dog cannot be stored where an array of Cat is declared.

record Pos {
    int x
    int y
    construct(int x, int y) { this.x = x; this.y = y }
}
var names = new Dictionary<Pos, string>()
names[new Pos(1, 2)] = "start"
print(names[new Pos(1, 2)])         // start - the same content
```

#### Static fields, `replace`, and a warning for temporaries

- **Static fields are set in the order they need each other**, not in the order they are written. The compiler follows what an initial value reads, also through the static methods, properties and constructors it calls. A cycle is an error that names it (`E4078`: `A.x -> B.y -> (through B.Get()) A.x`). See [Fields, constructors, methods](docs/language/08-classes.html#fields-constructors-methods).
- **`replace this.f = value`** destroys the old value of a field after the new one is stored - when the object owns it. A plain assignment never destroys anything: fire would have to know that nothing else refers to the old value, and destroying is never implicit. See [`replace`](docs/language/13-ownership.html#replace).
- **The type checker warns (`TC031`)** when a temporary or a value passed with `take` goes into a constructor or method that only keeps a reference to it - it would die with the call, and the field would refer to a destroyed object.

```fire
class Grid {
    static int width = Config.tile * 4      // reads Config.tile - which is set first
}
class Config {
    static int tile = 16
}
print(Grid.width)                           // 64

class Cache {
    int data[]
    construct() { this.data = [1, 2, 3] }
    undefined Reset() { replace this.data = [0] }   // the old array is destroyed
}
var c = new Cache()
c.Reset()
print(c.data.length)                        // 1
```

#### Conversions are fixed at compile time

`x!`, `x:` and `x:!` take their type and unit from the context. The type checker now knows the result, and where the context is known the compiler fixes the conversion instead of deciding at run time. A declaration, a typed parameter or a return value is a context too. See [The target unit of an operation](docs/language/05-units.html#the-target-unit-of-an-operation-advanced).

```fire
class Road {
    static float:km Length(float:km len) { return len }
}
float b = 2km
int a = 500m
var c = b + a:!             // b decides: a float in km
print(c)                    // 2.5km
float:km d = a:!            // the declaration decides
print(d)                    // 0.5km
print(Road.Length(a:!))     // the parameter decides: 0.5km
int i = 2.6!                // like 2.6!int
print(i)                    // 3
```

`#intwidth 16` makes `int` 16 bits wide, as on the 8086 (`32767 + 1` is `-32768`), see [The width of the whole program](docs/language/02-types.html#the-width-of-the-whole-program). `#endwait 5s` sets how long the end of the program waits for threads that are still running (60 seconds by default), see [The end of the program](docs/language/15-threads-and-actors.html#the-end-of-the-program).

#### Ownership, and errors you can catch

- `take x` hands an object over. `this.item = try take i` takes it only when the running call owns it, and returns whether it did.
- A `List`, `Dictionary` or `HashSet` destroys an element it owns when the element falls out: `Remove`, `Clear`, or overwriting it. See [Containers and ownership](docs/language/07-arrays-and-lists.html#containers-and-ownership-owns).
- `F(copy x)` and `F(flat x)` give the call its own copy, in every form of call and natively too. See [Copying](docs/language/13-ownership.html#copying-flat-and-copy).
- **Run-time errors are exceptions you can catch**, with the same class and text in the VM and in a native program. That includes breaking the ownership rules (a `TakeTo` cycle, `Take...` of a destroyed object), a value of the wrong kind through `any` (an index that is no int, a member of something that is no object), calling something that is not a lambda, and an exception in a constructor called through reflection. See [Errors of the runtime](docs/language/14-exceptions.html#errors-of-the-runtime).
- An exception thrown in a callback of a native function (an event handler during `win.Tick()`) is thrown at the call of the native, so the `try` around it catches it. See [Exceptions in callbacks](docs/language/14-exceptions.html#exceptions-in-callbacks).

```fire
class Node {
    string n
    construct(string n) { this.n = n }
    destruct() { print("~" + this.n) }
}
class Box {
    Node item
    construct(Node i) {
        if (this.item = try take i) { print("the box owns " + i.n) }
        else { print("the box refers to " + i.n) }
    }
}
var mine = new Node("mine")
var a = new Box(new Node("fresh"))  // the box owns fresh
var b = new Box(mine)               // the box refers to mine - it stays ours
var list = new List<Node>()
list.Add(new Node("first"))
list[0] = new Node("second")        // ~first - the list owned it
try { mine.TakeTo(mine) } catch (ArgumentException e) { print(e.message) }
// TakeTo: cycle detected - the target object is already owned (directly or transitively) by this object.
print("end")                        // end, then ~mine ~fresh ~second
```

```fire
#import "reflection"
class Plugin {
    construct() { throw new ArgumentException("no config") }
}
any notALambda = 5
try { notALambda(1) } catch (ArgumentException e) { print(e.message) }
// Call of a value of type Int which is not a lambda.
any list = [1, 2]
try { print(list["x"]) } catch (ArgumentException e) { print(e.message) }
// An index must be an int, not String.
try { any p = Reflect.New("Plugin", []) } catch (ArgumentException e) { print(e.message) }
// no config
```

#### Threads

- In a native build, when a thread is busy in a long native function of a package (a compression, a render), the main program does not wait for it, as long as the thread passed only numbers, strings, buffers or number arrays of its own. See [natives of packages](docs/packages/natives.html).
- A string or lambda that a thread reads from the globals belongs to the thread. If the main program replaces it meanwhile, the thread keeps working with its own copy.
- **Global byte and word buffers are shared memory**: every thread reads and writes their elements directly, with no section and no job. Their memory is never freed while a thread is still accessing it. Once a buffer is destroyed, every thread gets the `DestroyedException` on its next access. See [Global buffers](docs/language/15-threads-and-actors.html#global-buffers-shared-memory).
- `Sleep`, `Receive` with a limit and `await` of the main program come back on time, also while the tasks of the pool are busy computing.
- A number array sent through a channel with `Send(take a)` is handed over as it is - receiving 2 million floats takes microseconds, as for a byte buffer.
- Arrays and objects of the globals are just as safe: if the main program deletes one while a thread reads it, the thread's next access is the `DestroyedException`, never freed memory. See [Global variables](docs/language/15-threads-and-actors.html#global-variables).

```fire
#import "time"
byte frame[] = new byte[4]
var ready = 0
fire {
    frame[0] = 10                   // shared memory: no section, no job
    frame[1] = 20
    sync global { ready = 1 }       // publishes what was written before
}
while (ready < 1) { Sleep(1ms) }
print(frame[0] + frame[1])          // 30
```

#### Faster

`StringBuilder` keeps its text in one growing character buffer and writes numbers into it directly, digit by digit ([Strings](docs/language/06-strings.html#joining)). Native programs take small objects from a pool of their own, lists grow by half instead of doubling, and buffers only take memory where they are written. The VM stores `bool` arrays as one byte per element, and new arrays take memory only on first use. Its interpreter loop is tighter too.

Also new since alpha-2610: channels between threads, `await [ ... ]` for several calls at once, fire threads as light tasks on a pool of system threads, conditional access `a?.b` / `a??.b`, and expression trees (`lambda expression<T>`). The type checker has new warnings and errors `TC018` to `TC034` ([error codes](docs/tools/errors.html)). The whole [language reference](docs/language/index.html) is up to date.

#### How fast is fire?

We wrote six small single-threaded programs in fire, C, Rust, Go, Java, C#, JavaScript, Python, Ruby and PHP:

- **fib**: recursive fib(40)
- **sieve**: primes below 20,000,000, three times, in a `bool` array
- **mandelbrot**: 1600x1600 pixels, at most 200 iterations
- **objects**: 5,000,000 small objects into a list, then summed
- **hashmap**: 2,000,000 int keys into a dictionary, then read back
- **strings**: 5,000,000 numbers appended to a string builder (33.9 million characters)

fire was built natively with [forge](docs/tools/forge.html) in both modes. **RELEASE** is the default and keeps the run-time checks (array bounds, declarations, ownership). **PERFORMANCE** skips them. Times are in seconds:

| Language | fib | sieve | mandelbrot | objects | hashmap | strings |
|---|---|---|---|---|---|---|
| C | 0.198 | 0.357 | 0.341 | 0.297 | 0.332 | 0.296 |
| Rust | 0.456 | 0.392 | 0.349 | 0.275 | 0.355 | 0.166 |
| **fire native PERFORMANCE** | **0.184** | **1.039** | **0.348** | **1.025** | **0.983** | **0.275** |
| **fire native RELEASE** | **0.190** | **1.256** | **0.346** | **1.304** | **1.286** | **0.274** |
| Go | 0.654 | 0.343 | 0.361 | 0.878 | 0.578 | 0.668 |
| Java | 0.628 | 0.463 | 0.422 | 0.352 | 0.550 | 0.173 |
| C# | 0.629 | 0.385 | 0.392 | 0.628 | 0.296 | 0.212 |
| JavaScript | 1.361 | 0.506 | 0.398 | 1.057 | 0.611 | 1.230 |
| Python | 13.866 | 8.191 | 10.681 | 3.450 | 0.607 | 0.665 |
| Ruby | 10.816 | 11.874 | 16.043 | 2.578 | 1.341 | 0.863 |
| PHP | 8.270 | 6.623 | 4.095 | 4.491 | 0.194 | 0.391 |

Peak memory (MB):

| Language | fib | sieve | mandelbrot | objects | hashmap | strings |
|---|---|---|---|---|---|---|
| C | 1.6 | 20.6 | 1.6 | 192.0 | 105.3 | 34.0 |
| Rust | 2.2 | 21.0 | 2.2 | 192.6 | 104.2 | 34.4 |
| **fire native PERFORMANCE** | **1.4** | **20.6** | **1.4** | **384.6** | **125.8** | **131.1** |
| **fire native RELEASE** | **1.4** | **20.6** | **1.4** | **407.9** | **125.8** | **131.1** |
| Go | 1.8 | 21.1 | 1.8 | 188.9 | 96.9 | 103.0 |
| Java | 39.0 | 59.4 | 39.8 | 281.4 | 317.8 | 119.7 |
| C# | 27.4 | 47.0 | 28.0 | 286.6 | 144.3 | 160.6 |
| JavaScript | 47.7 | 68.1 | 49.9 | 423.2 | 161.8 | 503.6 |
| Python | 10.7 | 48.7 | 10.8 | 585.0 | 216.3 | 310.9 |
| Ruby | 18.9 | 324.0 | 19.1 | 283.8 | 94.7 | 54.3 |
| PHP | 31.0 | 641.4 | 31.2 | 571.2 | 110.8 | 94.4 |

Where fire is plain computation, it is as fast as C: fib and mandelbrot compile to C functions on C numbers. It falls behind where its runtime does the work:

- **sieve**: 2.9x slower than C
- **objects**: 3.5x slower than C, using 385 MB where C needs 192 MB (Java 281, C# 287)
- **hashmap**: 3.0x slower than C

Strings are as fast as C and faster than Go and JavaScript, but slower than Rust, Java and C#. They take 131 MB - less than C# (161 MB), more than Go (103 MB) and much more than C, partly because fire's characters are 16 bits wide. The run-time checks of RELEASE cost nothing on fib, mandelbrot and strings, and 21-31 % on sieve, objects and hashmap.

**Since our first measurement on November 15**, native strings went from 2.2 s and 729 MB to 0.27 s and 131 MB, thanks to the new `StringBuilder`. Native objects went from 1.25 s and 514 MB to 1.03 s and 385 MB (RELEASE: from 1.95 s to 1.30 s). The VM got 36-95 % faster, but it is still far slower than the native build. It is the place to develop and debug; for speed, build natively.

#### Small programs

Size is where native fire shines. A hello world is a stripped ELF that needs nothing but libc, and starts in about a millisecond:

| Language | Hello world | Needs |
|---|---|---|
| C (gcc -O2 -s) | 14.5 KB | libc |
| **fire native PERFORMANCE** | **22.7 KB** | **libc** |
| **fire native RELEASE** | **22.7 KB** | **libc** |
| Rust (rustc -O, stripped) | 343 KB | libc |
| Go | 2.2 MB | - |

Java, C#, JavaScript, Python, Ruby and PHP need their runtime installed.

**How we measured.** All runs used one cloud VM (4 vCPUs, Intel Xeon at 2.1 GHz, Linux), shared with other work, and measured in one quiet window on November 17 (somewhat slower overall than earlier windows). Each number is the median of 3 runs, with the peak memory taken as the max RSS of the process. Every program printed the same checksum in every language. The C programs were built with gcc 13.3 `-O2` (the hashmap is a small open-addressing table, since C has none), as was the C that forge generates. The other toolchains were Rust 1.97 (`rustc -O`), Go 1.24.7, OpenJDK 21.0.12, .NET 10.0.14 (Release build), Node.js 22.23.4, Python 3.13.18, Ruby 3.3.6 and PHP 8.3.6 (CLI, without opcache), each with default settings. fire was at commit bcbb58c9. The hot loops use `defined int` - without it, fib and mandelbrot run just as fast, because the compiler derives it. Treat differences under about 15 % as noise.
