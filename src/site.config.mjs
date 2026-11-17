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
  bugUrl: "https://github.com/what3var/fire/issues/new",
};

export const nav = [
  { label: "Explore", href: "explore.html" },
  { label: "News", href: "news.html" },
  { label: "Docs", href: "docs/index.html" },
  { label: "Download", href: "download.html" },
];

// how many news entries the home page shows (all of them are on news.html)
export const newsOnHome = 5;

// The four parts of the toolchain, shown as the "family" strip on the landing page.
export const toolchain = [
  { name: "fire", role: "the language", text: "C#-like syntax with its own ideas: units, ownership, actors, probes." },
  { name: "forge", role: "the compiler", text: "Bytecode for the VM, or C for native binaries. It drives gcc, clang, MSVC, Open Watcom and ESP-IDF, so you don't have to." },
  { name: "spark", role: "the IDE", text: "A small VS-style editor with debugger, designer and device panel. Install, open, F5." },
  { name: "ember", role: "the package manager", text: "Source-only packages, built all at once. No precompiled blobs." },
];

export const features = [
  { icon: "units", title: "Numbers with units", text: "5mm + 2cm is 25mm. Units are part of the value - converted, checked and printed." },
  { icon: "own", title: "Ownership, not GC", text: "Every object has an owner. Lifetimes are explicit, deletes are deterministic." },
  { icon: "threads", title: "Threads without races", text: "No shared memory: threads work on copies (taking / sync) or talk to actors." },
  { icon: "embed", title: "Embeddable in .NET", text: "Host scripts in your own C# application; the VM runs them in-process." },
  { icon: "devices", title: "Made for devices", text: "Serial, USB and simulated devices are first-class - it started as a device control suite." },
  { icon: "box", title: "Packages that build themselves", text: "ember ships source, never binaries: every package is built for your target, together with your program." },
];

// The pitch on the home page, right below the hero: what stands between you and your idea, and what fire does about it.
export const pitch = {
  eyebrow: "Why fire",
  title: "Your ideas deserve better than {setup}.",
  text: "Who feels creative after spending most of the day getting around walls we built ourselves? A few of them, and what fire does about them:",
};

export const whyFire = [
  {
    icon: "native",
    problem: "“Cross-platform”, they said.",
    title: "One language, all the way down",
    text: "Elsewhere the UI is a second framework, the IDE is bring-your-own, and a 200 MHz board with 64 MB of RAM is a blog post you read. fire brings its own UI and its own IDE, and the same code runs on Windows 11 and in DOS.",
  },
  {
    icon: "chip",
    problem: "The fifth toolchain.",
    title: "One compiler driver for every chip",
    text: "A new architecture, a new compiler, a new slightly crooked C99. forge translates fire to plain C and drives gcc, clang, MSVC, Open Watcom or ESP-IDF for you.",
  },
  {
    icon: "spark",
    problem: "Maker heaven, setup hell.",
    title: "An IDE that is ready when you are",
    text: "Great libraries for every sensor out there — once your editor is set up, because the bundled one can't even keep up with Notepad. spark comes with debugger, designer and device panel. Install, open, F5.",
  },
  {
    icon: "own",
    problem: "Waiting for the collector.",
    title: "No GC, no surprises",
    text: "Every object has an owner instead of a garbage collector: small, fast and deterministic, from a 486 to an ESP32.",
  },
];

// the platforms strip on the home page; `star` refers to the footnote below it
export const platforms = [
  { name: "Windows 3.x – 11" },
  { name: "Linux" },
  { name: "macOS", star: true },
  { name: "DOS" },
  { name: "Browser" },
  { name: "ESP32", star: true },
];
export const platformFootnote = "* Not tested in the wild yet.";

export const honest = {
  title: "Let's be honest.",
  text: "fire grew in about two months. It runs well — steadier than most RAD tools of the early 2000s ever did. Security just hasn't been the focus yet: the first fuzzer runs are still to come, and when they find holes, you'll read about them here.",
};

// "Build what you want" on the explore page: what a program can be, and the imports that get you there
export const buildWhat = [
  { icon: "desktop", title: "Desktop", text: "Windows and dialogs in code or in .fxml markup, designed visually in spark.", imports: ["ui", "dialogs", "ui.docking"] },
  { icon: "terminal", title: "Console", text: "Tools and scripts that start in an instant, with colours, cursor and single keys in the terminal.", imports: ["io", "process", "console"] },
  { icon: "globe", title: "Web", text: "An HTTP server with a Blazor-inspired page framework: your FXML views as web pages, their events over a WebSocket.", imports: ["http", "http.pages", "data"] },
  { icon: "devices", title: "Devices", text: "GPIO, I²C, SPI, USB and serial ports — and an ESP32* on Wi-Fi.", imports: ["gpio", "i2c", "wifi"] },
  { icon: "cube", title: "Games & 3D", text: "Scenes, terrain, effects and physics — from the GPU down to a 16-bit software renderer.", imports: ["scene3d", "scene3d.physics"] },
  { icon: "floppy", title: "Retro", text: "DOS and Windows 3.x, for retro fans who like beautiful code.", imports: ["dos", "machine", "windows"] },
];

// "One codebase, many targets" on the explore page; `how` says where it was seen running
export const targets = [
  { name: "Windows 10 / 11", how: "native and VM", tested: "real machines" },
  { name: "Windows 3.x", how: "native (Open Watcom)", tested: "Wine" },
  { name: "Linux", how: "native and VM", tested: "real machines" },
  { name: "macOS", how: "native and VM", tested: "*" },
  { name: "DOS (8086 and 386)", how: "native (Open Watcom, DOS/32A)", tested: "DOSBox-X" },
  { name: "Bare metal (BIOS)", how: "native, boots from a floppy image", tested: "QEMU" },
  { name: "Browser", how: "native (Emscripten)", tested: "Node and a browser" },
  { name: "ESP32", how: "native (ESP-IDF)", tested: "*" },
];

// Rotating hero on the landing page. {word} in a title gets the flame gradient.
// A slide shows either `code` (a file name + source) or `shot` (an image from the repo).
// The code is taken from the docs, so it is known to run.
export const heroInterval = 8000; // ms per slide

export const heroSlides = [
  {
    title: "Ideas are {yours}.",
    text: "AI keeps getting better at well-defined tasks. Ideas, creativity and dreams are still yours. fire clears away the walls in between: one language and one IDE, from Windows 3.x to an ESP32.",
    file: "terminal",
    lang: "bash",
    // these commands were run with forge as they are
    code: `# one source, many targets
forge run   hello.fire            # the VM, right away
forge build hello.fire            # native, for this machine
forge build -t win16 hello.fire   # Windows 3.x
forge build -t dos16 hello.fire   # DOS, real mode
forge build -t esp32 hello.fire   # an ESP-IDF component`,
  },
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
  { file: "screenshots/5.png", title: "Pixel editor", text: "Edit bitmaps and sprites without leaving the IDE." },
  { file: "screenshots/6.png", title: "scene3d package", text: "A 3D scene running next to its code." },
  { file: "screenshots/7.png", title: "Circuit editor", text: "Draw a schematic, simulate it live and use it from fire as a class." },
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
