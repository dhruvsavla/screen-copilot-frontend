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

// --- *** THIS IS THE CORRECTED FUNCTION *** ---
document.getElementById("recordGuideBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.startsWith("http")) {
    alert("Cannot run on this page. Open a normal website.");
    return;
  }

  try {
    // 1. Set the recording state in storage for multi-page recording
    await chrome.storage.local.set({ 
      isRecording: true, 
      currentGuideSteps: [] // Clear any old steps
    });

    // 2. Inject the content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // 3. Send the *correct* message to the tab to *start* the UI
    //    (popup.js was sending START_RECORDING, content.js was listening for START_RECORDING_UI)
    chrome.tabs.sendMessage(tab.id, { type: "START_RECORDING_UI" });
    window.close(); // Close the popup after starting
  } catch (e) {
    console.error("Failed to start recording:", e);
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