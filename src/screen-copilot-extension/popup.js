document.getElementById("toggleChatbot").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.startsWith("http")) {
    alert("Cannot run on this page. Open a normal website.");
    return;
  }

  // Inject content script into active tab
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    // Send message to *toggle* the chat
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_CHAT" });
  } catch (e) {
    console.error("Failed to inject script or send message:", e);
  }
});

// --- NEW ---
// Add listener for the new "Create Guide" button
document.getElementById("recordGuideBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.startsWith("http")) {
    alert("Cannot run on this page. Open a normal website.");
    return;
  }

  // Inject content script first
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // Send a message to START recording
    chrome.tabs.sendMessage(tab.id, { type: "START_RECORDING" });
    window.close(); // Close the popup after starting
  } catch (e) {
    console.error("Failed to inject script or send message:", e);
  }
});

// Wake up service worker (if needed)
chrome.runtime.sendMessage({ type: "PING" }, (response) => {
  if (chrome.runtime.lastError) {
    /* ignore */
  } else {
    console.log("Service worker status:", response?.status);
  }
});