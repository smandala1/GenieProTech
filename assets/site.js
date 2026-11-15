/* Geniepro Technologies - site behavior: mobile menu, process line, inquiry form. */
(function () {
  "use strict";

  /* Mobile menu */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
  }

  /* Approach line draws once when the phases come into view */
  var steps = document.querySelector(".phases");
  if (steps) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            steps.classList.add("is-visible");
            io.disconnect();
          }
        });
      }, { threshold: 0.3 });
      io.observe(steps);
    } else {
      steps.classList.add("is-visible");
    }
  }

  /* Native modal supplies focus containment, Escape handling, and focus return. */
  var inquiryDialog = document.getElementById("inquiry-dialog");
  if (inquiryDialog && typeof inquiryDialog.showModal === "function") {
    var inquiryTrigger = null;
    document.querySelectorAll("[data-inquiry-open]").forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        inquiryTrigger = trigger;
        if (!inquiryDialog.open) inquiryDialog.showModal();
        document.documentElement.classList.add("inquiry-modal-open");
      });
    });
    inquiryDialog.querySelector(".dialog-close").addEventListener("click", function () {
      inquiryDialog.close();
    });
    inquiryDialog.addEventListener("click", function (event) {
      var bounds = inquiryDialog.getBoundingClientRect();
      if (event.target === inquiryDialog &&
          (event.clientX < bounds.left || event.clientX > bounds.right ||
           event.clientY < bounds.top || event.clientY > bounds.bottom)) {
        inquiryDialog.close();
      }
    });
    inquiryDialog.addEventListener("close", function () {
      document.documentElement.classList.remove("inquiry-modal-open");
      if (inquiryTrigger) inquiryTrigger.focus();
    });
  }

  /* Inquiry form
     Delivery: set data-endpoint on the <form> to a form backend that accepts a JSON POST
     (for example a Formspree-style endpoint or your own API route).
     Until an endpoint is configured, submitting opens a pre-filled email draft instead.
     The form never reports a send it cannot confirm. */
  var form = document.getElementById("inquiry-form");
  if (!form) return;
  form.noValidate = true;

  var status = form.querySelector(".form-status");
  var button = form.querySelector('button[type="submit"]');
  var buttonLabel = button.textContent;
  var inbox = form.getAttribute("data-mailto");
  var endpoint = (form.getAttribute("data-endpoint") || "").trim();

  var rules = {
    name: function (v) { return v ? "" : "Enter your name."; },
    email: function (v) {
      if (!v) return "Enter your work email.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter a valid email address, like name@company.com.";
    },
    message: function (v) {
      if (!v) return "Tell us what you are looking to modernize.";
      return v.length >= 20 ? "" : "Add a little more detail so we can respond usefully.";
    }
  };

  function check(field) {
    var rule = rules[field.name];
    if (!rule) return true;
    var message = rule(field.value.trim());
    var error = document.getElementById(field.id + "-error");
    error.textContent = message;
    if (message) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    return !message;
  }

  function setStatus(text, isError) {
    status.textContent = text;
    status.classList.toggle("is-error", Boolean(isError));
  }

  Object.keys(rules).forEach(function (name) {
    var field = form.elements[name];
    field.addEventListener("blur", function () {
      if (field.value.trim() || field.hasAttribute("aria-invalid")) check(field);
    });
    field.addEventListener("input", function () {
      if (field.hasAttribute("aria-invalid")) check(field);
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setStatus("");

    var firstInvalid = null;
    Object.keys(rules).forEach(function (name) {
      var field = form.elements[name];
      if (!check(field) && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    if (form.elements.website.value) return; /* honeypot: bots only */

    var data = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      company: form.elements.company.value.trim(),
      message: form.elements.message.value.trim()
    };

    if (!endpoint) {
      var subject = "Data modernization inquiry from " + data.name + (data.company ? " (" + data.company + ")" : "");
      var body = data.message + "\n\n" + data.name + (data.company ? "\n" + data.company : "") + "\n" + data.email;
      window.location.href = "mailto:" + inbox + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      setStatus("Your email app should now show a draft addressed to " + inbox + ". Send that draft to reach us. If nothing opened, email us at that address directly.");
      return;
    }

    button.disabled = true;
    button.textContent = "Sending...";
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data)
    }).then(function (res) {
      if (!res.ok) throw new Error("Request failed: " + res.status);
      var done = document.createElement("div");
      done.className = "inquiry form-done";
      done.setAttribute("role", "status");
      done.setAttribute("tabindex", "-1");
      var h = document.createElement("h3");
      h.textContent = "Your inquiry has been sent.";
      var p = document.createElement("p");
      p.textContent = "Thank you, " + data.name + ". We will reply to " + data.email + " to arrange a first conversation.";
      done.appendChild(h);
      done.appendChild(p);
      form.replaceWith(done);
      done.focus();
    }).catch(function () {
      button.disabled = false;
      button.textContent = buttonLabel;
      setStatus("We could not send your inquiry. Nothing was submitted. Please try again, or email " + inbox + ".", true);
    });
  });
})();
