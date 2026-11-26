// Injected into every page while recording the demo videos (see scripts/record-demo.ts).
// Plain JavaScript on purpose: it is sent to the browser as text, so it must not go
// through a compiler that would add helpers the page does not have.
// Adds a visible cursor (or touch indicator) and a caption bar.
(function () {
  var isMobile = Boolean(window.__demoMobile);

  function read(key) {
    try {
      return sessionStorage.getItem(key) || "";
    } catch {
      return "";
    }
  }
  function write(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* about:blank has no storage */
    }
  }

  function mount() {
    if (window.__demoMounted) return;
    window.__demoMounted = true;

    var size = isMobile ? 44 : 22;
    var dot = document.createElement("div");
    dot.id = "__demo_cursor";
    Object.assign(dot.style, {
      position: "fixed", left: "-100px", top: "-100px", width: size + "px", height: size + "px",
      marginLeft: -size / 2 + "px", marginTop: -size / 2 + "px", borderRadius: "50%",
      background: isMobile ? "rgba(120,120,120,0.38)" : "rgba(184,151,90,0.92)",
      border: "2px solid rgba(255,255,255,0.95)", zIndex: "2147483647", pointerEvents: "none",
      transition: "transform 120ms ease, opacity 200ms", boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
      opacity: isMobile ? "0" : "1",
    });

    var bar = document.createElement("div");
    bar.id = "__demo_caption";
    Object.assign(bar.style, {
      position: "fixed", left: "50%", transform: "translateX(-50%)", zIndex: "2147483646", pointerEvents: "none",
      maxWidth: isMobile ? "96vw" : "76vw", width: "max-content", textAlign: "center",
      background: "rgba(17,17,17,0.96)", color: "#fff", borderRadius: isMobile ? "14px" : "999px",
      padding: isMobile ? "8px 13px" : "13px 26px", boxShadow: "0 10px 34px rgba(0,0,0,0.38)",
      borderBottom: "2px solid #b8975a",
      font: "600 " + (isMobile ? "13.5" : "17") + 'px/1.35 "Inter Variable", -apple-system, "Helvetica Neue", Arial, sans-serif',
      opacity: "0", transition: "opacity 220ms ease",
    });
    // Phones: the caption sits over the header, the least useful part of the screen.
    // Desktop: at the bottom, or under the header when the action happens at the bottom.
    function place() {
      if (isMobile) {
        bar.style.top = "7px";
        return;
      }
      var top = read("__demo_caption_pos") === "top";
      bar.style.top = top ? "86px" : "auto";
      bar.style.bottom = top ? "auto" : "26px";
    }
    place();
    window.__demoCaptionAt = function (position) {
      write("__demo_caption_pos", position);
      place();
    };

    // The app shows its own confirmations ("Séance confirmée.") at the bottom of the screen:
    // lift them above the caption so both stay readable in the video.
    var style = document.createElement("style");
    style.textContent = isMobile ? "" : 'div[aria-live="polite"]{bottom:96px !important}';

    // React owns <html> and <body> and removes foreign nodes when it hydrates:
    // put the overlays back whenever they have been detached.
    function attach() {
      var host = document.body || document.documentElement;
      if (!bar.isConnected) host.appendChild(bar);
      if (!dot.isConnected) host.appendChild(dot);
      if (!style.isConnected) host.appendChild(style);
    }
    attach();
    setInterval(attach, 120);

    function apply() {
      var text = read("__demo_caption");
      bar.textContent = text;
      bar.style.opacity = text ? "1" : "0";
    }
    window.__demoCaption = function (text) {
      write("__demo_caption", text);
      apply();
    };
    apply();

    function move(x, y) {
      dot.style.left = x + "px";
      dot.style.top = y + "px";
      write("__demo_cursor", x + "," + y);
    }
    var last = read("__demo_cursor").split(",").map(Number);
    if (!isMobile && last.length === 2 && isFinite(last[0]) && isFinite(last[1])) move(last[0], last[1]);
    window.addEventListener("mousemove", function (event) { move(event.clientX, event.clientY); }, true);
    window.addEventListener("pointerdown", function (event) {
      move(event.clientX, event.clientY);
      dot.style.opacity = "1";
      dot.style.transform = "scale(0.72)";
    }, true);
    window.addEventListener("pointerup", function () {
      dot.style.transform = "scale(1)";
      if (isMobile) setTimeout(function () { dot.style.opacity = "0"; }, 380);
    }, true);
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
