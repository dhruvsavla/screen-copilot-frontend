// Toggle Chatbot (Opens Floating Widget)
document.getElementById("toggleChatbot").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.startsWith("http")) {
    alert("Cannot run on this page. Open a normal website.");
    return;
  }

  try {
    // Inject content script if not already injected
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // Small delay to ensure script is loaded
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send message to toggle the floating widget
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_CHAT" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error toggling chat:", chrome.runtime.lastError);
      } else {
        console.log("Floating widget toggled:", response);
      }
    });

    window.close(); // Close popup after opening widget
  } catch (e) {
    console.error("Failed to inject script or send message:", e);
    alert("Failed to open NexAura. Please refresh the page and try again.");
  }
});

// Record New Guide
document.getElementById("recordGuideBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.startsWith("http")) {
    alert("Cannot run on this page. Open a normal website.");
    return;
  }

  try {
    // Inject content script if not already injected
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // Small delay to ensure script is loaded
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send message to start recording
    chrome.tabs.sendMessage(tab.id, { type: "START_RECORDING" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error starting recording:", chrome.runtime.lastError);
        alert("Failed to start recording. Please refresh the page and try again.");
      } else {
        console.log("Recording started successfully:", response);
      }
    });

    window.close(); // Close popup after starting recording
  } catch (e) {
    console.error("Failed to start recording:", e);
    alert("Failed to start recording. Please refresh the page and try again.");
  }
});

// Wake up service worker (if needed)
chrome.runtime.sendMessage({ type: "PING" }, (response) => {
  if (chrome.runtime.lastError) {
    // Ignore error if service worker isn't listening
  } else {
    console.log("Service worker status:", response?.status);
  }
});