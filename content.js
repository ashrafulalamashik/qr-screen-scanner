// content.js — Injected into the active tab
// Handles: dim overlay, drag-to-select, screenshot crop, QR decode, result display

(function () {
  // Prevent double-injection
  if (window.__qrScannerActive) return;
  window.__qrScannerActive = true;

  // ─── State ───────────────────────────────────────────────────────────────
  let overlay = null;
  let selectionBox = null;
  let resultPanel = null;
  let startX = 0, startY = 0;
  let isDragging = false;

  // ─── Listen for init message from background ─────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "initOverlay") {
      injectStyles();
      createOverlay();
    }
  });

  // ─── CSS Styles ──────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("__qr-scanner-styles")) return;
    const style = document.createElement("style");
    style.id = "__qr-scanner-styles";
    style.textContent = `
      #__qr-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 2147483646;
        cursor: crosshair;
        user-select: none;
      }

      #__qr-hint {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255,255,255,0.08);
        backdrop-filter: blur(6px);
        border: 1px solid rgba(255,255,255,0.18);
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 400;
        padding: 12px 22px;
        border-radius: 10px;
        pointer-events: none;
        letter-spacing: 0.01em;
        z-index: 2147483647;
        transition: opacity 0.2s;
      }

      #__qr-selection {
        position: fixed;
        border: 2px solid #22d3a5;
        background: rgba(34, 211, 165, 0.08);
        box-shadow: 0 0 0 1px rgba(34,211,165,0.3), inset 0 0 0 1px rgba(34,211,165,0.15);
        border-radius: 3px;
        z-index: 2147483647;
        pointer-events: none;
      }

      /* Scanning animation corners */
      #__qr-selection::before,
      #__qr-selection::after {
        content: '';
        position: absolute;
        width: 14px; height: 14px;
        border-color: #22d3a5;
        border-style: solid;
      }
      #__qr-selection::before {
        top: -2px; left: -2px;
        border-width: 3px 0 0 3px;
        border-radius: 2px 0 0 0;
      }
      #__qr-selection::after {
        bottom: -2px; right: -2px;
        border-width: 0 3px 3px 0;
        border-radius: 0 0 2px 0;
      }

      #__qr-result-panel {
        position: fixed;
        z-index: 2147483647;
        background: #0f1117;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 14px;
        padding: 18px 20px;
        min-width: 280px;
        max-width: 380px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: __qr-slideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes __qr-slideUp {
        from { opacity: 0; transform: translateY(10px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      #__qr-result-panel .__qr-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      #__qr-result-panel .__qr-title {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #22d3a5;
      }

      #__qr-result-panel .__qr-close {
        background: rgba(255,255,255,0.07);
        border: none;
        color: #aaa;
        width: 22px; height: 22px;
        border-radius: 50%;
        font-size: 13px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, color 0.15s;
        line-height: 1;
      }
      #__qr-result-panel .__qr-close:hover { background: rgba(255,255,255,0.15); color: #fff; }

      #__qr-result-panel .__qr-content {
        font-size: 13.5px;
        line-height: 1.6;
        color: #e2e8f0;
        word-break: break-all;
        margin-bottom: 14px;
        padding: 10px 12px;
        background: rgba(255,255,255,0.04);
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.06);
      }

      #__qr-result-panel .__qr-link {
        color: #22d3a5;
        text-decoration: none;
        font-weight: 500;
      }
      #__qr-result-panel .__qr-link:hover { text-decoration: underline; }

      #__qr-result-panel .__qr-actions {
        display: flex;
        gap: 8px;
      }

      #__qr-result-panel .__qr-btn {
        flex: 1;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.1);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
      }

      #__qr-result-panel .__qr-btn-primary {
        background: #22d3a5;
        color: #0f1117;
        border-color: #22d3a5;
      }
      #__qr-result-panel .__qr-btn-primary:hover { background: #1ab894; }

      #__qr-result-panel .__qr-btn-secondary {
        background: rgba(255,255,255,0.06);
        color: #e2e8f0;
      }
      #__qr-result-panel .__qr-btn-secondary:hover { background: rgba(255,255,255,0.12); }

      #__qr-result-panel .__qr-error {
        color: #f87171;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: rgba(248,113,113,0.07);
        border-radius: 8px;
        border: 1px solid rgba(248,113,113,0.15);
        margin-bottom: 14px;
      }

      #__qr-result-panel .__qr-copied {
        font-size: 11px;
        color: #22d3a5;
        text-align: center;
        margin-top: 6px;
        height: 14px;
        transition: opacity 0.2s;
      }

      #__qr-spinner {
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        pointer-events: none;
      }
      #__qr-spinner .__qr-spin {
        width: 36px; height: 36px;
        border: 3px solid rgba(34,211,165,0.2);
        border-top-color: #22d3a5;
        border-radius: 50%;
        animation: __qr-spin 0.7s linear infinite;
      }
      #__qr-spinner .__qr-spin-label {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 12px;
        color: #fff;
        opacity: 0.7;
      }
      @keyframes __qr-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Create dim overlay ──────────────────────────────────────────────────
  function createOverlay() {
    cleanup();

    overlay = document.createElement("div");
    overlay.id = "__qr-overlay";

    const hint = document.createElement("div");
    hint.id = "__qr-hint";
    hint.textContent = "Drag to select QR code area   ·   Esc to cancel";
    overlay.appendChild(hint);

    selectionBox = document.createElement("div");
    selectionBox.id = "__qr-selection";
    selectionBox.style.display = "none";
    overlay.appendChild(selectionBox);

    document.body.appendChild(overlay);

    overlay.addEventListener("mousedown", onMouseDown);
    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keydown", onKeyDown);
  }

  // ─── Mouse events ────────────────────────────────────────────────────────
  function onMouseDown(e) {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    selectionBox.style.display = "block";
    selectionBox.style.left = startX + "px";
    selectionBox.style.top = startY + "px";
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";

    // Hide hint once dragging
    const hint = document.getElementById("__qr-hint");
    if (hint) hint.style.opacity = "0";
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);

    selectionBox.style.left = x + "px";
    selectionBox.style.top = y + "px";
    selectionBox.style.width = w + "px";
    selectionBox.style.height = h + "px";
  }

  function onMouseUp(e) {
    if (!isDragging) return;
    e.preventDefault();
    isDragging = false;

    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);

    // Too small — ignore
    if (w < 20 || h < 20) {
      cleanup();
      return;
    }

    // Remove overlay, show spinner, capture
    overlay.removeEventListener("mousedown", onMouseDown);
    overlay.removeEventListener("mousemove", onMouseMove);
    overlay.removeEventListener("mouseup", onMouseUp);

    overlay.style.background = "transparent";
    selectionBox.style.display = "none";

    showSpinner();

    // Small delay to let overlay become transparent before screenshot
    setTimeout(() => {
      requestScreenshot(x, y, w, h);
    }, 80);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") cleanup();
  }

  // ─── Screenshot & QR decode ──────────────────────────────────────────────
  function requestScreenshot(x, y, w, h) {
    chrome.runtime.sendMessage({ action: "captureTab" }, (response) => {
      hideSpinner();
      removeOverlay();

      if (response.error || !response.dataUrl) {
        showResult({ error: "Screenshot failed: " + (response.error || "unknown error") });
        return;
      }

      cropAndDecode(response.dataUrl, x, y, w, h);
    });
  }

  function cropAndDecode(dataUrl, x, y, w, h) {
    const img = new Image();
    img.onload = function () {
      // Account for device pixel ratio
      const dpr = window.devicePixelRatio || 1;

      const canvas = document.createElement("canvas");
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(img, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, w * dpr, h * dpr);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // jsQR is globally available (injected before this script)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
      });

      if (code && code.data) {
        showResult({ text: code.data, x, y });
      } else {
        // Try with inversion (white QR on dark background)
        const code2 = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "invertFirst"
        });
        if (code2 && code2.data) {
          showResult({ text: code2.data, x, y });
        } else {
          showResult({ error: "No QR code found in the selected area." });
        }
      }
    };
    img.src = dataUrl;
  }

  // ─── Spinner ─────────────────────────────────────────────────────────────
  function showSpinner() {
    const spinner = document.createElement("div");
    spinner.id = "__qr-spinner";
    spinner.innerHTML = `<div class="__qr-spin"></div><span class="__qr-spin-label">Scanning…</span>`;
    document.body.appendChild(spinner);
  }

  function hideSpinner() {
    const s = document.getElementById("__qr-spinner");
    if (s) s.remove();
  }

  // ─── Result panel ────────────────────────────────────────────────────────
  function showResult({ text, error, x = 20, y = 20 }) {
    if (resultPanel) resultPanel.remove();

    resultPanel = document.createElement("div");
    resultPanel.id = "__qr-result-panel";

    const isUrl = text && /^https?:\/\//i.test(text);
    const isError = !!error;

    let contentHtml = "";
    let actionsHtml = "";

    if (isError) {
      contentHtml = `
        <div class="__qr-error">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="#f87171" stroke-width="1.5"/>
            <path d="M10 6v5M10 14h.01" stroke="#f87171" stroke-width="2" stroke-linecap="round"/>
          </svg>
          ${error}
        </div>
      `;
      actionsHtml = `<button class="__qr-btn __qr-btn-secondary" id="__qr-retry-btn">Try again</button>`;
    } else if (isUrl) {
      contentHtml = `
        <div class="__qr-content">
          <a href="${escapeHtml(text)}" target="_blank" rel="noopener noreferrer" class="__qr-link">${escapeHtml(text)}</a>
        </div>
      `;
      actionsHtml = `
        <button class="__qr-btn __qr-btn-primary" id="__qr-open-btn">Open link</button>
        <button class="__qr-btn __qr-btn-secondary" id="__qr-copy-btn">Copy</button>
      `;
    } else {
      contentHtml = `<div class="__qr-content">${escapeHtml(text)}</div>`;
      actionsHtml = `<button class="__qr-btn __qr-btn-primary" id="__qr-copy-btn">Copy text</button>`;
    }

    resultPanel.innerHTML = `
      <div class="__qr-header">
        <span class="__qr-title">${isError ? "Scan failed" : "QR Code Detected"}</span>
        <button class="__qr-close" id="__qr-close-btn" title="Close">✕</button>
      </div>
      ${contentHtml}
      <div class="__qr-actions">${actionsHtml}</div>
      <div class="__qr-copied" id="__qr-copied-msg"></div>
    `;

    // Position: try near the selection, but keep inside viewport
    const panelW = 340;
    const panelH = 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let px = x;
    let py = y + 10;
    if (px + panelW > vw - 16) px = vw - panelW - 16;
    if (py + panelH > vh - 16) py = Math.max(16, y - panelH - 10);
    resultPanel.style.left = px + "px";
    resultPanel.style.top = py + "px";

    document.body.appendChild(resultPanel);

    // Button events
    document.getElementById("__qr-close-btn").addEventListener("click", destroyResult);

    if (document.getElementById("__qr-copy-btn")) {
      document.getElementById("__qr-copy-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(text).then(() => {
          const msg = document.getElementById("__qr-copied-msg");
          if (msg) { msg.textContent = "Copied to clipboard!"; setTimeout(() => { if (msg) msg.textContent = ""; }, 2000); }
        });
      });
    }

    if (document.getElementById("__qr-open-btn")) {
      document.getElementById("__qr-open-btn").addEventListener("click", () => {
        window.open(text, "_blank", "noopener,noreferrer");
      });
    }

    if (document.getElementById("__qr-retry-btn")) {
      document.getElementById("__qr-retry-btn").addEventListener("click", () => {
        destroyResult();
        injectStyles();
        createOverlay();
      });
    }

    document.addEventListener("keydown", (e) => { if (e.key === "Escape") destroyResult(); }, { once: true });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function removeOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  function destroyResult() {
    if (resultPanel) { resultPanel.remove(); resultPanel = null; }
    window.__qrScannerActive = false;
    document.removeEventListener("keydown", onKeyDown);
  }

  function cleanup() {
    removeOverlay();
    hideSpinner();
    window.__qrScannerActive = false;
    document.removeEventListener("keydown", onKeyDown);
  }

})();
