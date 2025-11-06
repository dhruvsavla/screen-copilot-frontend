document.getElementById("toggleChatbot").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    if (!tab.url.startsWith("http")) {
      alert("Cannot run on this page. Open a normal website.");
      return;
    }
  
    // Inject content script into active tab
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  
    // Wake up background service worker
    chrome.runtime.sendMessage({ type: "PING" }, (response) => {
      console.log("Service worker status:", response?.status);
    });
  });
  