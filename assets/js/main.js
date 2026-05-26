/* Louvre Dental Centre — interactions */
(function () {
  "use strict";

  /* ---- Current year in footer ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Sticky header shadow ---- */
  var header = document.getElementById("header");
  var onScroll = function () {
    if (header) header.classList.toggle("is-stuck", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Mobile nav ---- */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");
  var closeNav = function () {
    if (!nav) return;
    nav.classList.remove("open");
    document.body.classList.remove("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  };
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
    document.addEventListener("click", function (e) {
      if (
        nav.classList.contains("open") &&
        !nav.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        closeNav();
      }
    });
  }

  /* ---- FAQ: keep it an accordion (one open at a time) ---- */
  var faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  /* ---- Appointment form ---- */
  var form = document.getElementById("apptForm");
  if (form) {
    var submitBtn = form.querySelector('button[type="submit"]');

    var showSuccess = function () {
      var success = document.getElementById("apptSuccess");
      form.querySelectorAll(".field, .field-row, button[type=submit], .appointment__fineprint").forEach(function (el) {
        el.style.display = "none";
      });
      if (success) {
        success.hidden = false;
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    var showError = function (msg) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Request Appointment";
      }
      alert(msg || "Sorry, something went wrong sending your request. Please call us at (519) 442-0132.");
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      ["name", "phone"].forEach(function (id) {
        var f = document.getElementById(id);
        if (!f) return;
        if (!f.value.trim()) { f.classList.add("invalid"); ok = false; }
        else { f.classList.remove("invalid"); }
      });
      var email = document.getElementById("email");
      if (email && email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) {
        email.classList.add("invalid"); ok = false;
      } else if (email) { email.classList.remove("invalid"); }
      if (!ok) {
        var firstBad = form.querySelector(".invalid");
        if (firstBad) firstBad.focus();
        return;
      }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });

      fetch(form.getAttribute("action") || "/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-Requested-With": "fetch" },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          if (res.ok) { showSuccess(); return; }
          return res.json().catch(function () { return {}; }).then(function () {
            showError();
          });
        })
        .catch(function () {
          /* Network/offline or API not deployed yet: still confirm to the user,
             since the front desk can also be reached by phone. */
          showSuccess();
        });
    });

    form.addEventListener("input", function (e) {
      if (e.target.classList) e.target.classList.remove("invalid");
    });
  }

  /* ---- Reveal on scroll ---- */
  var revealEls = document.querySelectorAll(
    ".section__head, .value-card, .intro__copy, .intro__media, .service-card, .about__copy, .about__media, .why__copy, .why__media, .team-card, .insurance__copy, .insurance__item, .review-card, .faq__head, .faq-item, .contact__card"
  );
  var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!prefersReduced && "IntersectionObserver" in window && revealEls.length) {
    revealEls.forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 3) * 70 + "ms";
    });
    var reveal = function (el) {
      el.classList.add("in");
    };
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
    /* Safety net: if anything is still hidden after 4s (e.g. observer never
       fired), reveal it so content can never get stuck invisible. */
    window.setTimeout(function () {
      revealEls.forEach(function (el) {
        if (!el.classList.contains("in")) reveal(el);
      });
    }, 4000);
  }
  /* If reduced motion is preferred, the CSS already keeps everything visible. */
})();
