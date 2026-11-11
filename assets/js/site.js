/* Shared header, footer and small interactions for every page.
   To add a page to the menu, add one line to NAV below. */
(function () {
  document.documentElement.classList.remove("no-js");

  var NAV = [
    { href: "index.html", label: "Home" },
    { href: "about.html", label: "About" },
    { href: "projects.html", label: "Projects" },
    { href: "career.html", label: "Career Goals" },
    { href: "resume.html", label: "Resume" },
    { href: "contact.html", label: "Contact", cta: true }
  ];

  var EMAIL = "src37@gatech.edu";
  var LINKEDIN = "https://www.linkedin.com/in/siddharth-chintalapalli";

  var here = location.pathname.split("/").pop() || "index.html";

  // ---- header ----
  var header = document.getElementById("site-header");
  if (header) {
    var links = NAV.map(function (n) {
      var current = n.href === here ? ' aria-current="page"' : "";
      var cls = n.cta ? ' class="nav-cta"' : "";
      return '<li><a href="' + n.href + '"' + cls + current + ">" + n.label + "</a></li>";
    }).join("");
    header.className = "site-header";
    header.innerHTML =
      '<nav class="container nav" aria-label="Main">' +
      '<a class="brand" href="index.html"><span class="brand-mark">SC</span><span>Sid Chintalapalli</span></a>' +
      '<button class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links"><span></span></button>' +
      '<ul class="nav-links" id="nav-links">' + links + "</ul></nav>";

    var toggle = header.querySelector(".nav-toggle");
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }

  // ---- footer ----
  var footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="container footer-inner">' +
      "<div>&copy; " + new Date().getFullYear() + " Siddharth Chintalapalli &middot; Electrical Engineering, Georgia Tech</div>" +
      '<div class="footer-links">' +
      '<a href="mailto:' + EMAIL + '">Email</a>' +
      '<a href="' + LINKEDIN + '" target="_blank" rel="noopener">LinkedIn</a>' +
      '<a href="resume.html">Resume</a>' +
      '<a href="#top">Back to top &uarr;</a>' +
      "</div></div>";
  }

  // ---- photo slots: show a labeled placeholder until the photo file exists ----
  function placeholder(img) {
    if (img.dataset.phDone) return;
    img.dataset.phDone = "1";
    var box = document.createElement("div");
    box.className = "ph";
    box.innerHTML = "<div><strong>" + (img.alt || "Photo") + "</strong>" + img.getAttribute("src") + "</div>";
    img.style.display = "none";
    img.parentNode.appendChild(box);
  }
  document.querySelectorAll(".media img").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) placeholder(img);
    img.addEventListener("error", function () { placeholder(img); });
  });

  // ---- project filters ----
  var filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.dataset.filter;
      filterBtns.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      document.querySelectorAll(".project").forEach(function (p) {
        var tags = (p.dataset.tags || "").split(" ");
        p.classList.toggle("hidden", f !== "all" && tags.indexOf(f) === -1);
      });
    });
  });

  // ---- reveal on scroll ----
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }
})();
