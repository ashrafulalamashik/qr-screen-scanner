// background.js — Service Worker (Manifest V3)
// Handles messages from popup and content script

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Popup asks to inject the selection overlay into the active tab
  if (message.action === "startCapture") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) {
        sendResponse({ error: "No active tab found." });
        return;
      }

      const tabId = tabs[0].id;

      try {
        // Inject jsQR library first
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["jsQR.js"]
        });

        // Then inject the content script
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["content.js"]
        });

        // Tell content script to start the selection UI
        await chrome.tabs.sendMessage(tabId, { action: "initOverlay" });

        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    });

    return true; // Keep message channel open for async response
  }

  // Content script requests a screenshot of the visible tab
  if (message.action === "captureTab") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) {
        sendResponse({ error: "No active tab." });
        return;
      }

      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
          format: "png"
        });
        sendResponse({ dataUrl });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    });

    return true; // Keep channel open
  }
});
