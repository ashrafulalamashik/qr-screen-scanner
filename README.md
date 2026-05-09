# 🔍 QR Screen Scanner — Chrome Extension

A lightweight Chrome Extension that lets you scan **any QR code visible on your screen** — no phone needed. Just click, drag, and get the result instantly.

---

## ✨ Features

- 📸 **Drag to select** any QR code area on screen
- ⚡ **Instant decode** — no internet required, fully offline
- 🔗 **Clickable links** — URLs open directly in a new tab
- 📋 **Copy to clipboard** — plain text results are copyable
- 🔒 **100% local** — no data sent to any server
- 🌐 Works on **any website** including HTTPS pages

---

## 🖥️ How It Works

1. Click the **QR Screen Scanner** icon in your Chrome toolbar
2. Your screen dims slightly and a crosshair cursor appears
3. **Drag** to draw a rectangle around the QR code
4. The result appears instantly in a popup on screen
5. Press **Esc** anytime to cancel

---

## 📦 Installation (Developer Mode)

> This extension is not yet on the Chrome Web Store. Load it manually in 4 steps.

**Step 1 — Download the extension**

Click the green **Code** button above → **Download ZIP** → Extract the folder.

**Step 2 — Open Chrome Extensions**

Go to `chrome://extensions` in your Chrome browser.

**Step 3 — Enable Developer Mode**

Toggle **"Developer mode"** ON (top right corner).

**Step 4 — Load the extension**

Click **"Load unpacked"** → Select the extracted `qr-screen-scanner` folder.

✅ The QR icon will appear in your Chrome toolbar. You're ready!

---

## 📁 File Structure

```
qr-screen-scanner/
├── manifest.json       # Extension config (Manifest V3)
├── background.js       # Service worker — handles screenshots
├── content.js          # Overlay UI, drag selection, QR decode, result popup
├── popup.html          # Toolbar popup UI
├── popup.js            # Popup button logic
├── jsQR.js             # QR decode library (local, no CDN)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Chrome Extension Manifest V3 | Extension framework |
| `chrome.tabs.captureVisibleTab` | Screen capture API |
| [jsQR](https://github.com/cozmo/jsQR) | QR code decoding (bundled locally) |
| Vanilla JS | Overlay, selection, UI logic |

---

## 🔒 Permissions Used

| Permission | Why |
|---|---|
| `activeTab` | Access the current tab to inject the overlay |
| `scripting` | Inject content scripts dynamically |
| `tabs` | Capture the visible tab screenshot |

> No browsing history, no personal data, no external requests.

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

## 📄 License

MIT License — free to use, modify, and distribute.
