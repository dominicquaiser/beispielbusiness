/*
 * Beispielbusiness GmbH – kleine UI-Funktionen
 * - mobile Navigation
 * - Formularvalidierung Kontaktformular (reine Frontend-Prüfung, kein Versand)
 * Alle Inhalte der Website stehen im initialen HTML; dieses Skript ergänzt nur Bedienkomfort.
 */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---------------------------------------------------------------------
   * Mobile Navigation
   * ------------------------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("hauptnavigation");

  function setNav(open) {
    if (!toggle || !nav) {
      return;
    }
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.querySelector(".nav-toggle-label").textContent = open ? "Schließen" : "Menü";
    nav.classList.toggle("is-open", open);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setNav(false);
        toggle.focus();
      }
    });

    nav.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (link && link.getAttribute("href").indexOf("#") !== -1) {
        setNav(false);
      }
    });

    if (window.matchMedia) {
      var desktop = window.matchMedia("(min-width: 1021px)");
      var onChange = function (mq) {
        if (mq.matches) {
          setNav(false);
        }
      };
      if (desktop.addEventListener) {
        desktop.addEventListener("change", onChange);
      } else if (desktop.addListener) {
        desktop.addListener(onChange);
      }
    }
  }

  /* ---------------------------------------------------------------------
   * FAQ: Anker-Links öffnen die passende Frage
   * ------------------------------------------------------------------- */
  function openDetailsFromHash() {
    if (!window.location.hash) {
      return;
    }
    var target = document.getElementById(window.location.hash.slice(1));
    if (target && target.tagName === "DETAILS") {
      target.open = true;
    }
  }
  openDetailsFromHash();
  window.addEventListener("hashchange", openDetailsFromHash);

  /* ---------------------------------------------------------------------
   * Kontaktformular
   * ------------------------------------------------------------------- */
  var form = document.getElementById("kontaktformular");
  if (!form) {
    return;
  }

  var status = document.getElementById("formular-status");
  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var phonePattern = /^[0-9+()\/\-\s]{6,}$/;

  var rules = {
    name: function (value) {
      if (!value) {
        return "Bitte geben Sie Ihren Namen an.";
      }
      if (value.length < 3) {
        return "Bitte geben Sie Vor- und Nachnamen an.";
      }
      return "";
    },
    firma: function (value) {
      return value ? "" : "Bitte geben Sie Ihr Unternehmen an.";
    },
    email: function (value) {
      if (!value) {
        return "Bitte geben Sie Ihre E-Mail-Adresse an.";
      }
      return emailPattern.test(value) ? "" : "Bitte prüfen Sie das Format der E-Mail-Adresse.";
    },
    telefon: function (value) {
      if (!value) {
        return "";
      }
      return phonePattern.test(value) ? "" : "Bitte geben Sie eine gültige Telefonnummer an.";
    },
    anliegen: function (value) {
      return value ? "" : "Bitte wählen Sie ein Anliegen aus.";
    },
    nachricht: function (value) {
      if (!value) {
        return "Bitte beschreiben Sie Ihr Anliegen.";
      }
      return value.length < 20 ? "Bitte beschreiben Sie Ihr Anliegen etwas ausführlicher (mind. 20 Zeichen)." : "";
    },
    datenschutz: function (value, field) {
      return field.checked ? "" : "Bitte bestätigen Sie den Hinweis zum Datenschutz.";
    }
  };

  function showError(field, message) {
    var errorEl = document.getElementById(field.id + "-fehler");
    if (message) {
      field.setAttribute("aria-invalid", "true");
    } else {
      field.removeAttribute("aria-invalid");
    }
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  function validateField(field) {
    var rule = rules[field.name];
    if (!rule) {
      return true;
    }
    var message = rule(field.value.trim(), field);
    showError(field, message);
    return !message;
  }

  form.setAttribute("novalidate", "novalidate");

  Array.prototype.forEach.call(form.elements, function (field) {
    if (!rules[field.name]) {
      return;
    }
    var eventName = field.type === "checkbox" || field.tagName === "SELECT" ? "change" : "blur";
    field.addEventListener(eventName, function () {
      validateField(field);
    });
    field.addEventListener("input", function () {
      if (field.getAttribute("aria-invalid") === "true") {
        validateField(field);
      }
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var firstInvalid = null;

    Array.prototype.forEach.call(form.elements, function (field) {
      if (rules[field.name] && !validateField(field) && !firstInvalid) {
        firstInvalid = field;
      }
    });

    status.textContent = "";

    if (firstInvalid) {
      var hint = document.createElement("div");
      hint.className = "notice";
      hint.textContent = "Bitte prüfen Sie die markierten Felder.";
      status.appendChild(hint);
      firstInvalid.focus();
      return;
    }

    var box = document.createElement("div");
    box.className = "notice notice--success";
    var title = document.createElement("strong");
    title.className = "notice-title";
    title.textContent = "Vielen Dank – Ihre Angaben sind vollständig.";
    var text = document.createElement("p");
    text.textContent =
      "Hinweis: Dieses Formular dient ausschließlich der Darstellung. Ihre Angaben wurden weder übertragen noch gespeichert.";
    box.appendChild(title);
    box.appendChild(text);
    status.appendChild(box);

    form.reset();
    status.setAttribute("tabindex", "-1");
    status.focus();
  });
})();
