// popup.js

document.getElementById("scanBtn").addEventListener("click", () => {
  const btn = document.getElementById("scanBtn");
  const msg = document.getElementById("status-msg");

  btn.disabled = true;
  btn.textContent = "Starting…";
  msg.textContent = "";
  msg.className = "";

  chrome.runtime.sendMessage({ action: "startCapture" }, (response) => {
    if (chrome.runtime.lastError || (response && response.error)) {
      const errText = (response && response.error) || chrome.runtime.lastError.message;
      msg.textContent = "Error: " + errText;
      msg.className = "";
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
          <path d="M3 9V5a2 2 0 0 1 2-2h4M3 15v4a2 2 0 0 0 2 2h4M15 3h4a2 2 0 0 1 2 2v4M15 21h4a2 2 0 0 0 2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        Scan QR Code`;
    } else {
      msg.textContent = "Select the QR area on screen";
      msg.className = "success";
      // Close popup so user can interact with the page
      setTimeout(() => window.close(), 400);
    }
  });
});
