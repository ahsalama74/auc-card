/* AUC digital business card. Vanilla JS, no dependencies except the bundled QR generator. */
(function () {
  "use strict";

  var C = window.CARD_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Helpers ---------- */
  function digits(s) { return String(s || "").replace(/\D/g, ""); }
  function telHref(s) { return "tel:+" + digits(s); }
  function cleanUrl(s) { return String(s || "").trim(); }
  function pretty(url) { return cleanUrl(url).replace(/^https?:\/\//i, "").replace(/\/$/, ""); }

  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  function cardUrl() {
    if (C.cardUrl) return C.cardUrl;
    var u = location.href.split("#")[0].split("?")[0];
    return u.replace(/index\.html$/, "");
  }

  /* ---------- Fill text from config ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-bind]"), function (el) {
    var v = C[el.getAttribute("data-bind")];
    if (v) el.textContent = v;
  });

  /* ---------- Show or hide rows by data present ---------- */
  var phone = cleanUrl(C.phone);
  var wa = digits(C.whatsapp || C.phone);
  var data = {
    phone: phone,
    whatsapp: wa,
    email: cleanUrl(C.email),
    linkedin: cleanUrl(C.linkedin),
    website: cleanUrl(C.website),
    location: cleanUrl(C.location)
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-field]"), function (el) {
    el.hidden = !data[el.getAttribute("data-field")];
  });

  /* ---------- Links ---------- */
  function set(id, href) { var el = $(id); if (el && href) el.setAttribute("href", href); }
  if (data.phone) {
    set("act-call", telHref(phone));
    set("d-phone", telHref(phone));
    $("d-phone").textContent = phone;
  }
  if (data.whatsapp) {
    var msg = C.whatsappMessage ? "?text=" + encodeURIComponent(C.whatsappMessage) : "";
    set("act-whatsapp", "https://wa.me/" + wa + msg);
  }
  if (data.email) {
    set("act-email", "mailto:" + data.email);
    set("d-email", "mailto:" + data.email);
    $("d-email").textContent = data.email;
  }
  if (data.linkedin) set("act-linkedin", data.linkedin);
  if (data.website) {
    set("act-website", data.website);
    set("d-website", data.website);
    try { $("d-website").textContent = new URL(data.website).hostname; } catch (e) { $("d-website").textContent = pretty(data.website); }
  }

  /* ---------- Headshot fallback (monogram if the photo file is missing) ---------- */
  var img = $("avatar-img");
  function noPhoto() { $("avatar").classList.add("no-photo"); }
  img.addEventListener("error", noPhoto);
  if (img.complete && img.naturalWidth === 0) noPhoto();

  /* ---------- Share ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }
  $("act-share").addEventListener("click", function () {
    var payload = {
      title: C.name + " | " + C.title + ", " + C.company,
      text: C.name + ", " + C.title + ", " + C.company,
      url: cardUrl()
    };
    if (navigator.share) {
      navigator.share(payload).catch(function (e) {
        if (e && e.name === "AbortError") return;
        copyText(payload.url).then(function () { toast("Link copied"); });
      });
    } else {
      copyText(payload.url).then(
        function () { toast("Link copied"); },
        function () { toast("Copy this address: " + payload.url); }
      );
    }
  });

  /* ---------- QR code ---------- */
  var INK = "#11375B";    // AUC logo navy
  var QUIET = 4;          // quiet zone in modules (QR specification minimum)
  var qr, cut, iconData = "", withIcon = true;

  // AUC logo mark, placed in the center of the code.
  var iconImg = new Image();
  var ICON = { w: 300, h: 300 };
  iconImg.onload = function () {
    try {
      var cv = document.createElement("canvas");
      cv.width = iconImg.naturalWidth; cv.height = iconImg.naturalHeight;
      cv.getContext("2d").drawImage(iconImg, 0, 0);
      iconData = cv.toDataURL("image/png");   // embedded in the SVG download
      ICON.w = iconImg.naturalWidth; ICON.h = iconImg.naturalHeight;
    } catch (e) { iconData = ""; }
    render();
  };
  iconImg.onerror = function () { iconData = ""; };
  iconImg.src = "assets/auc-mark.png";

  function iconReady() { return withIcon && !!iconData; }
  function oddAtLeast(v, min) { v = Math.round(v); if (v % 2 === 0) v += 1; return Math.max(v, min); }

  function build() {
    try {
      // Error correction H lets the code survive the logo covering its center.
      qr = qrcode(0, iconReady() ? "H" : "M");
      qr.addData(cardUrl());
      qr.make();
      var n = qr.getModuleCount();
      var k = oddAtLeast(n * 0.21, 5);          // clear square in the center, in modules
      cut = iconReady() ? { k: k, s: (n - k) / 2 } : null;
      return true;
    } catch (e) {
      qr = null;
      $("qr").textContent = "QR code unavailable.";
      return false;
    }
  }
  function inCut(r, c) { return cut && r >= cut.s && r < cut.s + cut.k && c >= cut.s && c < cut.s + cut.k; }

  // Where the logo mark sits, in module units (one module of white padding each side).
  function iconBox() {
    var s = (cut.k - 2) / Math.max(ICON.w, ICON.h);
    var w = ICON.w * s, h = ICON.h * s;
    return { x: QUIET + cut.s + (cut.k - w) / 2, y: QUIET + cut.s + (cut.k - h) / 2, w: w, h: h };
  }

  function qrSvg(size) {
    var n = qr.getModuleCount(), total = n + QUIET * 2, d = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c) && !inCut(r, c)) d.push("M" + (c + QUIET) + " " + (r + QUIET) + "h1v1h-1z");
      }
    }
    var dim = size ? ' width="' + size + '" height="' + size + '"' : "";
    var icon = "";
    if (cut) {
      var b = iconBox();
      icon = '<image x="' + b.x.toFixed(3) + '" y="' + b.y.toFixed(3) + '" width="' + b.w.toFixed(3) + '" height="' + b.h.toFixed(3) +
        '" href="' + iconData + '" xlink:href="' + iconData + '"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + total + " " + total + '"' + dim +
      '><rect width="' + total + '" height="' + total + '" fill="#FFFFFF"/>' +
      '<path shape-rendering="crispEdges" fill="' + INK + '" d="' + d.join("") + '"/>' + icon + "</svg>";
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  function fileName(ext) { return "Ahmed-Salama-AUC-QR" + (cut ? "" : "-plain") + "." + ext; }

  function render() { if (build()) $("qr").innerHTML = qrSvg(); }

  $("qr-icon").addEventListener("change", function (e) { withIcon = e.target.checked; render(); });

  $("qr-svg").addEventListener("click", function () {
    if (!qr) return;
    download(new Blob([qrSvg(1200)], { type: "image/svg+xml" }), fileName("svg"));
  });

  $("qr-png").addEventListener("click", function () {
    if (!qr) return;
    var n = qr.getModuleCount(), total = n + QUIET * 2;
    var scale = Math.max(1, Math.floor(3000 / total)); // whole pixels per module keeps edges sharp
    var px = total * scale;
    var cv = document.createElement("canvas");
    cv.width = cv.height = px;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = INK;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c) && !inCut(r, c)) ctx.fillRect((c + QUIET) * scale, (r + QUIET) * scale, scale, scale);
      }
    }
    if (cut) {
      var b = iconBox();
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(iconImg, b.x * scale, b.y * scale, b.w * scale, b.h * scale);
    }
    if (cv.toBlob) {
      cv.toBlob(function (blob) { download(blob, fileName("png")); }, "image/png");
    } else {
      var a = document.createElement("a");
      a.href = cv.toDataURL("image/png"); a.download = fileName("png");
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  });

  render();
})();
