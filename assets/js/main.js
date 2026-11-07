/*
 * Beispielbusiness GmbH – kleine UI-Funktionen
 * - mobile Navigation
 * - Formularvalidierung Kontaktformular (reine Frontend-Prüfung, kein Versand)
 * - Anbieter-Leiste im Stil von krake.run: Raster, Logo-Welle, Blinzeln, Auftritt
 *   und Anzeige des anonymen Gesamtzählers für HTTP-Anfragen
 * Alle redaktionellen Inhalte stehen im initialen HTML.
 */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* Mobile Navigation */
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

  /* FAQ: Anker-Links öffnen die passende Frage */
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

  /* Anbieter-Leiste: Animationen wie auf krake.run. Alles ist Zugabe; ohne
     JavaScript oder bei reduzierter Bewegung bleibt die Leiste statisch. */
  var operatorBar = document.querySelector(".operator-bar");
  var calm = !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canObserve = "IntersectionObserver" in window;

  // Ruft fn einmal auf, sobald element sichtbar ist.
  function whenVisible(element, fn, threshold) {
    if (!canObserve) {
      fn();
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        fn();
      }
    }, { threshold: threshold || 0 });
    observer.observe(element);
  }

  /* Strichraster wie auf krake.run: Um den Mauszeiger leuchten die Striche
     orange auf und verblassen wieder. Die grauen Striche kommen aus dem CSS. */
  function gridGlow(host, area) {
    var GRID = 16;
    var RADIUS = 140;
    var DECAY = 0.86;
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    canvas.className = "operator-glow";
    canvas.setAttribute("aria-hidden", "true");
    host.insertBefore(canvas, host.firstChild);

    var accent = getComputedStyle(host).getPropertyValue("--krake-accent").trim() || "#ff6a00";
    var width = 0;
    var height = 0;
    var cols = 0;
    var rows = 0;
    var boost = new Float32Array(0);
    var lit = new Set();
    var pointer = null;
    var frame = 0;

    function resize() {
      var ratio = window.devicePixelRatio || 1;
      width = host.clientWidth;
      height = host.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      cols = Math.ceil(width / GRID);
      rows = Math.ceil(height / GRID);
      boost = new Float32Array(cols * rows);
      lit.clear();
    }

    function step() {
      frame = 0;
      lit.forEach(function (i) {
        boost[i] *= DECAY;
        if (boost[i] < 0.01) {
          boost[i] = 0;
          lit.delete(i);
        }
      });
      if (pointer) {
        var firstCol = Math.max(0, Math.floor((pointer.x - RADIUS) / GRID));
        var lastCol = Math.min(cols - 1, Math.ceil((pointer.x + RADIUS) / GRID));
        var firstRow = Math.max(0, Math.floor((pointer.y - RADIUS) / GRID));
        var lastRow = Math.min(rows - 1, Math.ceil((pointer.y + RADIUS) / GRID));
        for (var row = firstRow; row <= lastRow; row++) {
          for (var col = firstCol; col <= lastCol; col++) {
            var dx = col * GRID + 8 - pointer.x;
            var dy = row * GRID + 6 - pointer.y;
            var strength = 1 - Math.sqrt(dx * dx + dy * dy) / RADIUS;
            var i = row * cols + col;
            if (strength > boost[i]) {
              boost[i] = strength;
              lit.add(i);
            }
          }
        }
      }
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = accent;
      lit.forEach(function (i) {
        ctx.globalAlpha = boost[i];
        ctx.fillRect((i % cols) * GRID + 8, Math.floor(i / cols) * GRID + 6, 1, 4);
      });
      ctx.globalAlpha = 1;
      // Nur weiterzeichnen, solange etwas leuchtet.
      if (pointer || lit.size) {
        frame = window.requestAnimationFrame(step);
      }
    }

    function wake() {
      if (!frame) {
        frame = window.requestAnimationFrame(step);
      }
    }

    area.addEventListener("pointermove", function (event) {
      var box = host.getBoundingClientRect();
      pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
      wake();
    });
    area.addEventListener("pointerleave", function () {
      pointer = null;
      wake();
    });
    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(host);
    } else {
      window.addEventListener("resize", resize);
    }
    resize();
  }

  /* Pixel-Logo: diagonale Farbwelle von Weiß zu Orange und zufälliges Blinzeln */
  function animateLogo(mark) {
    Array.prototype.forEach.call(mark.querySelectorAll(".operator-pixel"), function (pixel) {
      var diagonal = Number(pixel.getAttribute("x")) + Number(pixel.getAttribute("y")) - 3;
      pixel.style.setProperty("--d", (diagonal * 0.06).toFixed(2) + "s");
    });

    function wave(delay) {
      mark.classList.add("is-wave-start");
      window.setTimeout(function () {
        mark.classList.remove("is-wave-start");
      }, delay);
    }

    var eyes = mark.querySelectorAll(".operator-eye");
    function blinkLater() {
      window.setTimeout(function () {
        Array.prototype.forEach.call(eyes, function (eye) { eye.classList.add("is-blink"); });
        window.setTimeout(function () {
          Array.prototype.forEach.call(eyes, function (eye) { eye.classList.remove("is-blink"); });
        }, 140);
        blinkLater();
      }, 4000 + Math.random() * 12000);
    }

    return { wave: wave, blinkLater: blinkLater };
  }

  /* Zählt eine Zahl hoch, sobald sie sichtbar ist. */
  function countUp(element, target) {
    function show(value) {
      element.textContent = value.toLocaleString("de-DE");
    }
    if (calm) {
      show(target);
      return;
    }
    show(0);
    whenVisible(element, function () {
      var start = null;
      var duration = 1400;
      function tick(now) {
        if (start === null) {
          start = now;
        }
        var progress = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        show(Math.round(target * eased));
        if (progress < 1) {
          window.requestAnimationFrame(tick);
        }
      }
      window.requestAnimationFrame(tick);
    }, 0.6);
  }

  if (operatorBar) {
    var operatorMark = operatorBar.querySelector(".operator-mark");
    var operatorKrake = operatorBar.querySelector(".operator-krake");
    var logo = operatorMark ? animateLogo(operatorMark) : null;

    if (!calm) {
      gridGlow(operatorBar, operatorBar);
      if (operatorKrake) {
        gridGlow(operatorKrake, operatorKrake);
      }
      // Auftritt und Welle nur, wenn die Leiste beim Laden noch unter dem sichtbaren Bereich liegt.
      var below = canObserve && operatorBar.getBoundingClientRect().top > window.innerHeight;
      if (below) {
        operatorBar.classList.add("is-animated");
        if (operatorMark) {
          operatorMark.classList.add("is-wave-start");
        }
      }
      whenVisible(operatorBar, function () {
        operatorBar.classList.add("is-visible");
        if (logo && below) {
          logo.wave(450);
        }
      }, 0.15);
      if (logo) {
        logo.blinkLater();
        operatorMark.parentNode.addEventListener("pointerenter", function () {
          logo.wave(60);
        });
      }
    }

    /* HTTP-Anfragen: Der Server zählt jede Anfrage selbst; hier wird nur der Stand angezeigt.
       Der Zähler steht in der Zelle mit dem krake.run-Knopf, unter dem Knopf. */
    var operatorButton = operatorBar.querySelector(".operator-button");
    var counterCell = operatorButton && operatorButton.closest(".operator-cell");
    if (counterCell && window.fetch) {
      window.fetch("/api/requests", {
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer"
      }).then(function (response) {
        if (!response.ok) {
          throw new Error("Counter unavailable");
        }
        return response.json();
      }).then(function (data) {
        if (!Number.isSafeInteger(data.requests) || data.requests < 0) {
          return;
        }
        var line = document.createElement("p");
        line.className = "operator-requests";
        var label = document.createElement("span");
        label.className = "operator-requests-label";
        label.textContent = "HTTP-Anfragen gesamt";
        var value = document.createElement("span");
        value.className = "operator-requests-value";
        line.appendChild(label);
        line.appendChild(document.createTextNode(" "));
        line.appendChild(value);
        counterCell.appendChild(line);
        countUp(value, data.requests);
      }).catch(function () {
        // Die Website bleibt auch ohne Zähler vollständig nutzbar.
      });
    }
  }

  /* Kontaktformular */
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
