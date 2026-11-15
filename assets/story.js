/* Homepage scroll story (adapted from the LivinFloors home story).
   Scroll position drives which frame is shown: backgrounds crossfade, each frame's
   contents rise in on a stagger, and the rail tracks the current frame.
   Reduced motion or no JavaScript leaves the static stacked layout in place. */
(function () {
  "use strict";
  var story = document.querySelector(".gp-story");
  if (!story || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var stage = story.querySelector(".gp-stage");
  var header = document.querySelector(".site-header");
  var skip = story.querySelector(".gp-skip");
  var ticks = Array.prototype.slice.call(story.querySelectorAll(".gp-rail button"));
  var bgs = Array.prototype.slice.call(story.querySelectorAll(".gp-bg"));
  var frames = Array.prototype.slice.call(story.querySelectorAll(".gp-frame"));
  var cards = Array.prototype.slice.call(story.querySelectorAll(".gp-card"));
  var items = Array.prototype.slice.call(story.querySelectorAll("[data-frame][data-d]")).map(function (el) {
    return { el: el, frame: Number(el.dataset.frame), delay: Number(el.dataset.d) || 0, last: -1 };
  });
  var FRAMES = frames.length;
  var clamp = function (v) { return v <= 0 ? 0 : v >= 1 ? 1 : v; };
  var ease = function (t) { return 0.5 - Math.cos(Math.PI * t) / 2; };

  /* Scroll share -> frame coordinate, holding on each frame so it can be read. */
  var frameCoord = function (s) {
    var t = clamp(s) * (FRAMES - 1), i = Math.min(Math.floor(t), FRAMES - 2), h = 0.14;
    return i + ease(clamp((t - i - h) / (1 - 2 * h)));
  };
  var presence = function (coord, frame, delay) {
    var d = coord - frame, lag = d < 0 ? delay : 1 - delay;
    return clamp((0.6 - Math.abs(d) - lag * 0.2) / 0.25);
  };

  /* LivinFloors-style header: hidden over the opening frame, slides in from Business Challenges on. */
  var body = document.body;
  var autoHdr = !!header && body.classList.contains("home-redesign");
  var hdrIn = false;
  var setHdr = function (on) {
    if (on === hdrIn) return;
    hdrIn = on;
    body.classList.toggle("hdr-in", on);
  };
  if (autoHdr) {
    body.classList.add("hdr-auto");
    header.addEventListener("focusin", function () { setHdr(true); });
    /* The render loop pauses once the story is off screen, so check on scroll too. */
    var checkHdr = function () {
      if (header.contains(document.activeElement)) return;
      /* Show from the Business Challenges frame onward (about 12% into the story). */
      var r = story.getBoundingClientRect();
      var p = -r.top / Math.max(1, story.offsetHeight - stage.offsetHeight);
      setHdr(p > 0.12 || r.bottom < innerHeight - 40);
    };
    addEventListener("scroll", checkHdr, { passive: true });
    addEventListener("resize", checkHdr);
  }

  var hdr = 0;
  var measure = function () {
    hdr = header && !autoHdr ? header.offsetHeight : 0;
    story.style.setProperty("--hdr", hdr + "px");
  };
  var travel = function () { return Math.max(1, story.offsetHeight - stage.offsetHeight); };
  var frameTop = function (i) {
    return story.getBoundingClientRect().top + scrollY - hdr + (i / (FRAMES - 1)) * travel();
  };
  var goTo = function (i, smooth) {
    scrollTo({ top: frameTop(i), behavior: smooth ? "smooth" : "auto" });
  };

  var smoothed = -1, last = performance.now(), shown = -1, visible = true;

  var render = function (now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var p = clamp((hdr - story.getBoundingClientRect().top) / travel());
    smoothed = smoothed < 0 ? p : smoothed + (p - smoothed) * (1 - Math.exp(-dt * 6));
    if (Math.abs(p - smoothed) < 0.0002) smoothed = p;
    var coord = frameCoord(smoothed);

    bgs.forEach(function (bg, k) {
      var o = Math.round(clamp((0.75 - Math.abs(coord - k)) / 0.5) * 400) / 400;
      if (bg._o === o) return;
      bg._o = o;
      bg.style.opacity = o;
      bg.style.transform = "scale(" + (1.05 - 0.05 * o).toFixed(4) + ")";
    });
    cards.forEach(function (card) {
      var f = Number(card.dataset.frame);
      var o = Math.round(clamp((0.62 - Math.abs(coord - f)) / 0.22) * 400) / 400;
      if (card._o === o) return;
      card._o = o;
      card.style.opacity = o;
    });
    items.forEach(function (it) {
      var v = Math.round(presence(coord, it.frame, it.delay) * 500) / 500;
      if (v === it.last) return;
      it.last = v;
      var dir = coord < it.frame ? 1 : -1;
      it.el.style.opacity = String(v);
      it.el.style.transform = "translateY(" + ((1 - v) * 22 * dir).toFixed(1) + "px)";
    });

    var frame = Math.round(coord);
    if (frame !== shown) {
      shown = frame;
      ticks.forEach(function (b, i) {
        if (i === frame) b.setAttribute("aria-current", "step");
        else b.removeAttribute("aria-current");
      });
      frames.forEach(function (f, i) { f.classList.toggle("is-current", i === frame); });
      story.classList.toggle("on-blue", frame === FRAMES - 1);
    }
    skip.hidden = smoothed > 0.97;
  };
  var loop = function (now) { if (visible) render(now); requestAnimationFrame(loop); };

  ticks.forEach(function (b, i) { b.addEventListener("click", function () { goTo(i, true); }); });
  skip.addEventListener("click", function () {
    var end = story.getBoundingClientRect().top + scrollY + story.offsetHeight - hdr;
    scrollTo({ top: end, behavior: "smooth" });
  });

  /* In-page links to a frame (#capabilities, #approach, ...) scroll to that frame. */
  var ids = frames.map(function (f) { return f.id; });
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var i = ids.indexOf(a.getAttribute("href").slice(1));
    if (i < 0) return;
    e.preventDefault();
    goTo(i, true);
    history.replaceState(null, "", "#" + ids[i]);
  });

  /* Keyboard users: focusing a link inside a frame brings that frame on screen. */
  story.addEventListener("focusin", function (e) {
    var f = e.target.closest(".gp-frame");
    if (!f) return;
    var i = frames.indexOf(f);
    if (i !== shown) { goTo(i, false); smoothed = -1; }
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(story);
  }
  addEventListener("resize", measure);

  story.classList.add("is-animated");
  measure();
  skip.hidden = false;
  /* Arriving with #approach etc.: the browser's own fragment jump runs after this
     script, so jump to the frame again once the page has loaded. */
  var start = ids.indexOf(location.hash.slice(1));
  var jumpToStart = function () {
    if (start > 0) { goTo(start, false); smoothed = -1; }
  };
  jumpToStart();
  if (start > 0) {
    if (document.readyState === "complete") requestAnimationFrame(jumpToStart);
    else addEventListener("load", function () { requestAnimationFrame(jumpToStart); }, { once: true });
  }
  render(performance.now());
  requestAnimationFrame(loop);
})();
