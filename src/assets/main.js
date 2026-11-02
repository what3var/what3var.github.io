// fire website — small progressive enhancements. The site works without it.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.body.dataset.root || "";
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  // theme toggle
  $("[data-theme-toggle]")?.addEventListener("click", () => {
    const el = document.documentElement;
    const dark = el.dataset.theme ? el.dataset.theme === "dark" : !matchMedia("(prefers-color-scheme: light)").matches;
    el.dataset.theme = dark ? "light" : "dark";
    store.set("theme", el.dataset.theme);
  });

  // mobile menus
  const menuBtn = $("[data-menu]");
  menuBtn?.addEventListener("click", () => {
    const open = $("#mainnav").classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  $("[data-docnav]")?.addEventListener("click", () => $(".docnav").classList.toggle("open"));

  // copy buttons on code blocks
  $$(".code .copy").forEach((btn) => btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.parentElement.querySelector("pre").innerText);
      btn.textContent = "Copied"; btn.classList.add("done");
      setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1500);
    } catch { /* clipboard blocked */ }
  }));

  // table of contents: highlight the section in view
  const tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        tocLinks.forEach((a) => a.classList.remove("active"));
        byId.get(e.target.id)?.classList.add("active");
      });
    }, { rootMargin: "-70px 0px -70% 0px" });
    byId.forEach((_, id) => { const h = document.getElementById(id); if (h) io.observe(h); });
  }

  // screenshot lightbox
  const lb = $("#lightbox");
  if (lb) {
    const shots = $$(".shot");
    let i = 0;
    const show = (n) => {
      i = (n + shots.length) % shots.length;
      const img = $("img", shots[i]);
      $("img", lb).src = img.src; $("img", lb).alt = img.alt;
      $("figcaption", lb).innerHTML = $("figcaption", shots[i]).innerHTML;
    };
    $$("[data-lightbox]").forEach((b) => b.addEventListener("click", () => { show(+b.dataset.lightbox); lb.showModal(); }));
    $("[data-lb-close]", lb).addEventListener("click", () => lb.close());
    $("[data-lb-prev]", lb).addEventListener("click", () => show(i - 1));
    $("[data-lb-next]", lb).addEventListener("click", () => show(i + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(i - 1);
      if (e.key === "ArrowRight") show(i + 1);
    });
  }

  // ---------------------------------------------------------------- rotating hero
  // Every slide is in the HTML; this only switches them. The change is covered by a
  // grid of pixels in the logo's colours that appear and vanish in random order.
  const hero = $("[data-hero]");
  if (hero) {
    const groups = $$("[data-slides]", hero).map((el) => ({ el, slides: $$(":scope > .slide", el), canvas: $(":scope > .pixels", el) }));
    const dots = $$("[data-goto]", hero);
    const pauseBtn = $("[data-pause]", hero);
    const count = groups[0].slides.length;
    const interval = +hero.dataset.interval || 8000;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const PALETTE = ["#4a1270", "#6a0d91", "#7a10b8", "#8a1080", "#c41ac4", "#ff4070", "#d03a60", "#f06830", "#f8a820", "#f8e050"];
    const CELL = 18;
    let current = 0, elapsed = 0, last = 0, busy = false;
    let userPaused = false, hover = false, focus = false;

    $("[data-slide-ctrl]", hero).hidden = false;

    // the part of the group that changes: the slide itself, or the window inside it
    const box = (slide) => $(".window", slide) || slide;

    function setActive(group, i) {
      group.slides.forEach((s, n) => {
        const on = n === i;
        s.classList.toggle("is-active", on);
        s.toggleAttribute("inert", !on);
        if (on) s.removeAttribute("aria-hidden"); else s.setAttribute("aria-hidden", "true");
      });
    }

    function pixelSwap(group, from, to, delay) {
      return new Promise((resolve) => {
        const { el, canvas } = group;
        const host = el.getBoundingClientRect();
        // cover the union of the outgoing and the incoming content
        group.slides[to].style.visibility = "hidden";
        group.slides[to].classList.add("is-active");
        const a = box(group.slides[from]).getBoundingClientRect();
        const b = box(group.slides[to]).getBoundingClientRect();
        group.slides[to].classList.remove("is-active");
        group.slides[to].style.visibility = "";
        const area = {
          x: Math.min(a.left, b.left) - host.left, y: Math.min(a.top, b.top) - host.top,
          w: Math.max(a.right, b.right) - Math.min(a.left, b.left), h: Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top),
        };
        const dpr = window.devicePixelRatio || 1;
        const cw = canvas.clientWidth, ch = canvas.clientHeight;
        canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const off = 6; // the canvas sticks out 6px on every side
        const cols = Math.ceil(area.w / CELL), rows = Math.ceil(area.h / CELL);
        const cells = [];
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          cells.push({
            x: off + area.x + x * CELL, y: off + area.y + y * CELL,
            on: Math.random(), off: Math.random(),
            c: PALETTE[(Math.random() * PALETTE.length) | 0],
          });
        }
        // every pixel flashes in a flame colour when it flips, then shows the background:
        // a glowing edge burns over the old content and away from the new one
        const css = getComputedStyle(document.documentElement);
        const bg = (group.el.dataset.slides === "visual" ? css.getPropertyValue("--code-bg") : css.getPropertyValue("--bg")).trim();
        const IN = 460, HOLD = 60, OUT = 520, FLASH = 150;
        let start = 0, swapped = false;
        const frame = (now) => {
          if (!start) start = now;
          const t = now - start;
          ctx.clearRect(0, 0, cw, ch);
          if (!swapped && t >= IN) { setActive(group, to); swapped = true; }
          for (const c of cells) {
            const tOn = c.on * (IN - FLASH);
            const tOff = IN + HOLD + c.off * (OUT - FLASH) + FLASH;
            if (t < tOn || t >= tOff) continue;
            const flash = t - tOn < FLASH || tOff - t < FLASH;
            ctx.fillStyle = flash ? c.c : bg;
            ctx.fillRect(c.x, c.y, flash ? CELL - 2 : CELL, flash ? CELL - 2 : CELL);
          }
          if (t < IN + HOLD + OUT) requestAnimationFrame(frame);
          else { ctx.clearRect(0, 0, cw, ch); resolve(); }
        };
        setTimeout(() => requestAnimationFrame(frame), delay);
      });
    }

    async function go(to) {
      if (busy || to === current) return;
      busy = true;
      const from = current;
      current = to;
      elapsed = 0;
      dots.forEach((d, n) => { d.toggleAttribute("aria-current", n === to); d.style.removeProperty("--p"); });
      if (reduced.matches) groups.forEach((g) => setActive(g, to));
      else await Promise.all(groups.map((g, n) => pixelSwap(g, from, to, n * 140)));
      busy = false;
    }

    const paused = () => userPaused || hover || focus || document.hidden || reduced.matches;
    const tick = (now) => {
      const dt = last ? now - last : 0;
      last = now;
      if (!busy && !paused()) {
        elapsed += dt;
        dots[current].style.setProperty("--p", `${Math.min(100, (elapsed / interval) * 100)}%`);
        if (elapsed >= interval) go((current + 1) % count);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    dots.forEach((d) => d.addEventListener("click", () => go(+d.dataset.goto)));
    pauseBtn.addEventListener("click", () => {
      userPaused = !userPaused;
      pauseBtn.setAttribute("aria-pressed", userPaused);
      pauseBtn.setAttribute("aria-label", userPaused ? "Play the slides" : "Pause the slides");
    });
    const grid = $(".hero-grid", hero);
    grid.addEventListener("mouseenter", () => { hover = true; });
    grid.addEventListener("mouseleave", () => { hover = false; });
    grid.addEventListener("focusin", () => { focus = true; });
    grid.addEventListener("focusout", (e) => { if (!grid.contains(e.relatedTarget)) focus = false; });
  }

  // docs search over a static JSON index (built at deploy time)
  const dlg = $("#search");
  const input = $("[data-search-input]");
  const list = $("[data-search-results]");
  let index = null;
  let sel = 0;
  const load = async () => {
    if (index) return index;
    try { index = await (await fetch(root + "assets/search-index.json")).json(); } catch { index = []; }
    return index;
  };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const render = async () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { list.innerHTML = ""; return; }
    const hits = [];
    for (const p of await load()) {
      if (p.t.toLowerCase().includes(q)) hits.push({ score: 0, title: p.t, sub: p.s, url: p.u });
      for (const h of p.h) {
        if (h.toLowerCase().includes(q)) {
          const id = h.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
          hits.push({ score: 1, title: h, sub: `${p.s} › ${p.t}`, url: `${p.u}#${id}` });
        }
      }
    }
    hits.sort((a, b) => a.score - b.score);
    sel = 0;
    list.innerHTML = hits.length
      ? hits.slice(0, 30).map((h, n) => `<li><a href="${root}${h.url}"${n === 0 ? ' class="sel"' : ""}>${esc(h.title)}<small>${esc(h.sub)}</small></a></li>`).join("")
      : `<li class="empty">Nothing found for “${esc(q)}”.</li>`;
  };
  const open = () => { dlg.showModal(); input.select(); load(); };
  $$("[data-search-open]").forEach((b) => b.addEventListener("click", open));
  input?.addEventListener("input", render);
  input?.addEventListener("keydown", (e) => {
    const links = $$("a", list);
    if (!links.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      links[sel].classList.remove("sel");
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      links[sel].classList.add("sel"); links[sel].scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter") { e.preventDefault(); location.href = links[sel].href; }
  });
  dlg?.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  document.addEventListener("keydown", (e) => {
    const typing = /input|textarea|select/i.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key === "k")) { e.preventDefault(); open(); }
  });
})();
