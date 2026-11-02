// Everything content-related lives here, so the structure of the site
// can be changed without touching the templates.

export const site = {
  name: "fire",
  tagline: "A scripting and programming language with its very own character.",
  repo: "what3var/fire",
  repoUrl: "https://github.com/what3var/fire",
  url: "", // set to the final domain once known, e.g. "https://fire-lang.dev"
  author: "David Müller",
  license: "MIT",
};

export const nav = [
  { label: "Features", href: "index.html#features" },
  { label: "Screenshots", href: "index.html#screenshots" },
  { label: "Docs", href: "docs/index.html" },
  { label: "Download", href: "download.html" },
];

// The four parts of the toolchain, shown as the "family" strip on the landing page.
export const toolchain = [
  { name: "fire", role: "the language", text: "C#-like syntax with its own ideas: units, ownership, actors, probes." },
  { name: "forge", role: "the compiler", text: "Bytecode for the VM, or C++ for native binaries on your own toolchain." },
  { name: "spark", role: "the IDE", text: "A small VS-style editor with debugger, designer and device panel." },
  { name: "ember", role: "the package manager", text: "Source-only packages, built all at once. No precompiled blobs." },
];

export const features = [
  { icon: "units", title: "Numbers with units", text: "5mm + 2cm is 25mm. Units are part of the value - converted, checked and printed." },
  { icon: "own", title: "Ownership, not GC", text: "Every object has an owner. Lifetimes are explicit, deletes are deterministic." },
  { icon: "threads", title: "Threads without races", text: "No shared memory: threads work on copies (taking / sync) or talk to actors." },
  { icon: "native", title: "Native everywhere", text: "Translated to C++ for Windows, Linux, macOS, ESP32 and FreeRTOS." },
  { icon: "embed", title: "Embeddable in .NET", text: "Host scripts in your own C# application; the VM runs them in-process." },
  { icon: "devices", title: "Made for devices", text: "Serial, USB and simulated devices are first-class - it started as a device control suite." },
];

// Rotating hero on the landing page. {word} in a title gets the flame gradient.
// A slide shows either `code` (a file name + source) or `shot` (an image from the repo).
// The code is taken from the docs, so it is known to run.
export const heroInterval = 8000; // ms per slide

export const heroSlides = [
  {
    title: "Making things {cross}.",
    text: "A scripting and programming language with its very own character. Compiles to native, embeds in C#, and comes with its own IDE. Cross-platform, of course.",
    file: "counter.fire",
    code: `#import "time"

class Counter {
    int value
    construct() { this.value = 10 }
}

var counter = new Counter()
fire taking counter {          // a copy, in a new thread
    counter.value = counter.value + 5
    sync counter               // write it back
}
Sleep(200ms)
print("main: " + counter.value)   // main: 15
print(10m / 2s)                   // 5m/s`,
  },
  {
    title: "Ease of {access}.",
    text: "Render a 3D scene, talk to devices or the internet, or host your own unicorn wiki. Whatever you're up to, you're free to focus on your ideas — as long as they're standards-compliant.",
    file: "spark — scene3d",
    shot: "screenshots/6.png",
  },
  {
    title: "Blurring {boundaries}.",
    text: "Control hardware, simulate circuits and embed them in your code as objects of their own. Your FIR filter is cool? So is my RC network. 🙂",
    // from the sample src/fire.Project/Samples/Circuits/AudioFuzz (main.fire)
    file: "AudioFuzz — main.fire",
    focus: [5, 15], // lines shown at full strength: the loop that plays the notes
    code: `var notes = [196, 247, 294, 392, 294, 247, 196]   // Hz
var fuzz = new Fuzz()             // Fuzz.biscuit is a class

// Player.Arpeggio(output, notes, rate, circuit)
foreach (f in notes) {
    var tone = Audio.Sound.Tone(f, 250, Audio.Wave.Sine,
                                90, rate)
    if (circuit == undefined) {
        output.Play(tone)
    } else {
        var samples = circuit.ProcessAudio(tone, circuit.Input,
                          circuit.Out, undefined, 0.7V)
        output.Play(new Audio.Sound(tone.Rate, 1, samples))
    }
}`,
    // the circuit next to the code: drawn from the .biscuit until there is a
    // screenshot; replace with { file: "Fuzz.biscuit", shot: "screenshots/fuzz.png" }
    inset: { file: "Fuzz.biscuit", biscuit: "src/fire.Project/Samples/Circuits/AudioFuzz/Fuzz.biscuit" },
  },
  {
    title: "Defining {owners}.",
    text: "When it comes to object lifetime, we take you back to the roots — but we won't leave you out in the cold. At least not alone: in fire, every object has an owner, and it can move on, just like its lifetime does. Destroy an object, and its children go with it.",
    // from docs/language/13-ownership.md ("A reference does not keep anything alive"), comments shortened
    file: "holder.fire",
    code: `class Item {
    string n
    construct(string n) { this.n = n }
}
class Holder {
    Item held
    undefined Keep(Item i) {
        this.held = i
        try i.TakeTo(this)   // keep it, if handed over
    }
}
var h = new Holder()
{
    var temp = new Item("kept")
    h.Keep(take temp)          // hand temp over
}
print(h.held.n)                // kept: h owns it now`,
  },
];

export const screenshots = [
  { file: "screenshots/1.png", title: "Welcome", text: "spark greets you with recent solutions and a quick start." },
  { file: "screenshots/2.png", title: "Samples", text: "Runnable samples for the language and the libraries." },
  { file: "screenshots/3.png", title: "FXML designer", text: "Design windows and dialogs visually in .fxml markup." },
  { file: "screenshots/4.png", title: "Markdown editor", text: "Write and preview documentation right next to the code." },
  { file: "screenshots/5.png", title: "Raster editor", text: "Edit bitmaps and sprites without leaving the IDE." },
  { file: "screenshots/6.png", title: "scene3d package", text: "3D scenes from an ember package." },
];

// Documentation sections. Files are paths inside the fire repository;
// "glob" takes every .md in a folder (sorted by name).
export const docSections = [
  {
    id: "start",
    title: "Getting started",
    files: ["src/fire.Editor/Help/First Steps.md", "src/fire.Editor/Help/Embedding.md"],
  },
  {
    id: "language",
    title: "Language reference",
    glob: "docs/language",
    slugs: { README: "index" },
    titles: { README: "Overview" },
  },
  {
    id: "topics",
    title: "Libraries & tools",
    glob: "docs",
    // internal design notes / not (yet) English - left out of the site for now
    exclude: ["BYTECODE.md", "DESIGN_LAMBDA_REFLECTION_PROBE.md", "THREADING_DESIGN.md", "NAMING.md", "SPEC.md"],
  },
];
