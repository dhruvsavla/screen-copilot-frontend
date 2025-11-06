if (!window.screenCopilotInjected) {
  window.screenCopilotInjected = true;

  // -------------------
  // Floating Chat Icon
  // -------------------
  const chatIcon = document.createElement("div");
  Object.assign(chatIcon.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)",
    boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999999,
  });
  chatIcon.title = "Open Chat";
  chatIcon.innerHTML = "💬";
  document.body.appendChild(chatIcon);

  // -------------------
  // Chatbot Container
  // -------------------
  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    width: "320px",
    height: "420px",
    border: "1px solid #ccc",
    zIndex: 999998,
    display: "none",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: "15px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
    fontFamily: "Arial, sans-serif",
    background: "#fff",
    transition: "all 0.3s ease",
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    background: "linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)",
    color: "white",
    padding: "10px",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "16px",
  });
  header.textContent = "🧠 Screen Copilot";
  container.appendChild(header);

  const messages = document.createElement("div");
  Object.assign(messages.style, {
    flex: "1",
    padding: "10px",
    overflowY: "auto",
    scrollBehavior: "smooth",
  });
  messages.innerHTML =
    "<p style='color:#666;'><i>Ask me about anything on your screen.</i></p>";
  container.appendChild(messages);

  const inputBox = document.createElement("div");
  Object.assign(inputBox.style, {
    display: "flex",
    borderTop: "1px solid #ddd",
    padding: "5px",
  });

  const input = document.createElement("input");
  Object.assign(input.style, {
    flex: "1",
    border: "none",
    padding: "10px",
    borderRadius: "20px",
    outline: "none",
  });
  input.placeholder = "Ask a question...";
  inputBox.appendChild(input);

  const sendBtn = document.createElement("button");
  Object.assign(sendBtn.style, {
    background: "#007bff",
    color: "white",
    border: "none",
    padding: "10px 15px",
    borderRadius: "20px",
    marginLeft: "5px",
    cursor: "pointer",
  });
  sendBtn.textContent = "Send";
  
  // ***** THIS IS THE FIX *****
  inputBox.appendChild(sendBtn);
  // ***************************

  container.appendChild(inputBox);
  document.body.appendChild(container);

  // -------------------
  // Toggle Chat
  // -------------------
  chatIcon.onclick = () => {
    container.style.display =
      container.style.display === "flex" ? "none" : "flex";
  };

  // -------------------
  // NEW: Show Live Highlight with Summary
  // -------------------
  function showLiveHighlight(highlights, duration = 10000) {
    // Clear any existing highlights first
    const existingHighlights = document.querySelectorAll(
      ".screen-copilot-highlight-wrapper"
    );
    existingHighlights.forEach((box) => box.remove());

    highlights.forEach((h) => {
      // Create a wrapper to hold both box and text
      const wrapper = document.createElement("div");
      wrapper.className = "screen-copilot-highlight-wrapper";
      Object.assign(wrapper.style, {
        position: "absolute",
        top: "0",
        left: "0",
        zIndex: "9999998",
        pointerEvents: "none",
      });

      // --- Create the Highlight Box ---
      const highlightBox = document.createElement("div");
      Object.assign(highlightBox.style, {
        position: "absolute",
        top: `${window.scrollY + h.y}px`,
        left: `${window.scrollX + h.x}px`,
        width: `${h.w}px`,
        height: `${h.h}px`,

        // --- More Prominent Styling ---
        backgroundColor: "rgba(255, 69, 0, 0.25)", // OrangeRed fill
        border: "2px solid #FF4500", // Thicker, brighter OrangeRed border
        borderRadius: "3px",
        boxShadow: "0 0 15px 5px rgba(255, 69, 0, 0.5)", // Glow effect
        boxSizing: "border-box",
        // ---
        
        zIndex: 9999999,
        pointerEvents: "none",
        animation: "pulse 1.5s infinite",
        opacity: "1",
        transition: "opacity 0.5s ease-out",
      });
      wrapper.appendChild(highlightBox);

      // --- Create Summary Text ---
      const summary = h.summary || h.reason; // Use summary, fallback to reason
      if (summary) {
        const summaryText = document.createElement("div");
        Object.assign(summaryText.style, {
          position: "absolute",
          // Position it 5px below the highlight box
          top: `${window.scrollY + h.y + h.h + 5}px`,
          left: `${window.scrollX + h.x}px`,
          maxWidth: `${Math.max(h.w, 200)}px`,

          // Styling
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          color: "white",
          padding: "6px 10px",
          borderRadius: "5px",
          fontSize: "14px",
          fontWeight: "bold",
          fontFamily: "Arial, sans-serif",
          
          zIndex: 9999999,
          pointerEvents: "none",
          opacity: "1",
          transition: "opacity 0.5s ease-out",
        });
        summaryText.textContent = summary;
        wrapper.appendChild(summaryText);
      }

      document.body.appendChild(wrapper);

      // --- Fade-out and Removal ---
      setTimeout(() => {
        // Fade out all children
        Array.from(wrapper.children).forEach(
          (child) => (child.style.opacity = "0")
        );
      }, duration - 1000);

      setTimeout(() => {
        wrapper.remove();
      }, duration);
    });
  }

  // -------------------
  // MODIFIED: Render Copilot Response
  // -------------------
  function renderCopilotResponse(data) {
    if (!data) return "<span style='color:red'>No data returned</span>";

    let text = data.text || "";
    text = text.replace(/```json\s*/, "").replace(/```$/, "");

    let html = "";
    try {
      const parsed = JSON.parse(text);
      if (parsed?.steps?.length) {
        html += "<b>Steps:</b><ol style='padding-left:20px'>";
        parsed.steps.forEach((step) => {
          html += `<li style='margin-bottom:4px;'>${step}</li>`;
        });
        html += "</ol>";
      }

      // **MODIFIED PART**
      // If highlights exist, show them on the live page immediately
      if (parsed?.highlights?.length) {
        // Call the new function to draw highlights on the live DOM
        showLiveHighlight(parsed.highlights);

        // Add a note to the chat
        html += `<p style='font-style:italic;color:#555;margin-top:5px;'>Showing highlights on your screen...</p>`;
      }
    } catch (e) {
      // If parsing fails, just show the raw text
      html = `<pre style="white-space: pre-wrap; background:#f9f9f9;padding:5px;border-radius:5px;">${text}</pre>`;
    }

    return html;
  }

  // -------------------
  // Send Message
  // -------------------
  sendBtn.onclick = async () => {
    const userMsg = input.value.trim();
    if (!userMsg) return;

    messages.innerHTML += `<div style="
      background:#007bff;color:white;padding:8px 12px;margin:5px 0;
      border-radius:15px 15px 0 15px; max-width:80%; float:right; clear:both;
    ">${userMsg}</div>`;
    input.value = "";
    messages.scrollTop = messages.scrollHeight; // Scroll after adding user msg

    // Add a "loading" message
    const loadingMsg = document.createElement("div");
    loadingMsg.style = `
      background:#f1f0f0;color:black;padding:8px 12px;margin:5px 0;
      border-radius:15px 15px 15px 0; max-width:80%; float:left; clear:both;
      font-style: italic; color: #666;
    `;
    loadingMsg.innerHTML = "Thinking...";
    messages.appendChild(loadingMsg);
    messages.scrollTop = messages.scrollHeight; // Scroll to show loading msg

    try {
      const screenshot = await captureScreen();
      if (!screenshot) throw new Error("Could not capture screen.");

      const res = await fetch("http://127.0.0.1:8000/api/analyze_live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: screenshot, question: userMsg }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server error: ${res.status} ${res.statusText}. ${errorText}`);
      }
      
      const data = await res.json();

      // Remove loading message
      loadingMsg.remove();

      messages.innerHTML += `<div style="
        background:#f1f0f0;color:black;padding:8px 12px;margin:5px 0;
        border-radius:15px 15px 15px 0; max-width:80%; float:left; clear:both;
      ">${renderCopilotResponse(data.result)}</div>`;

      messages.scrollTop = messages.scrollHeight;
    } catch (err) {
      // Remove loading message on error too
      if(loadingMsg) loadingMsg.remove();

      messages.innerHTML += `<div style="
        background:#ff4d4f;color:white;padding:8px 12px;margin:5px 0;
        border-radius:15px 15px 15px 0; max-width:80%; float:left; clear:both;
      ">Error: ${err.message}</div>`;
      messages.scrollTop = messages.scrollHeight;
    }
  };

  // Add event listener for "Enter" key in the input
  input.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault(); // Stop default form submit
      sendBtn.click(); // Trigger send button click
    }
  });

  // -------------------
  // Capture Screen
  // -------------------
  function captureScreen() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "CAPTURE_SCREEN" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.image);
        }
      });
    });
  }

  // -------------------
  // Animation Style
  // -------------------
  const style = document.createElement("style");
  style.textContent = `
  @keyframes pulse {
    0% { 
      transform: scale(1); 
      opacity: 0.5; 
      box-shadow: 0 0 15px 5px rgba(255, 100, 100, 0.2);
    }
    50% { 
      transform: scale(1.03); 
      opacity: 1; 
      box-shadow: 0 0 25px 10px rgba(255, 100, 100, 0.5);
    }
    100% { 
      transform: scale(1); 
      opacity: 0.5; 
      box-shadow: 0 0 15px 5px rgba(255, 100, 100, 0.2);
    }
  }  
  `;
  document.head.appendChild(style);
}