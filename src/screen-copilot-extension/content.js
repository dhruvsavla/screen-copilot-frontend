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
    messages.innerHTML = "<p style='color:#666;'><i>Ask me about anything on your screen.</i></p>";
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
    inputBox.appendChild(sendBtn);
  
    container.appendChild(inputBox);
    document.body.appendChild(container);
  
    // -------------------
    // Toggle Chat
    // -------------------
    chatIcon.onclick = () => {
      container.style.display = container.style.display === "flex" ? "none" : "flex";
    };
  
    // -------------------
    // Show Image Overlay with Highlights
    // -------------------
    function showImageWithHighlights(imageBase64, highlights, imageWidth, imageHeight) {
      // Remove old overlay if any
      const oldOverlay = document.getElementById("highlight-overlay");
      if (oldOverlay) oldOverlay.remove();
  
      const overlay = document.createElement("div");
      overlay.id = "highlight-overlay";
      Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "999999",
        backdropFilter: "blur(2px)",
      });
  
      const wrapper = document.createElement("div");
      Object.assign(wrapper.style, {
        position: "relative",
        maxWidth: "80%",
        maxHeight: "80%",
        overflow: "hidden",
        borderRadius: "10px",
        border: "2px solid white",
        boxShadow: "0 0 20px rgba(255,255,255,0.3)",
      });
  
      const img = document.createElement("img");
      img.src = imageBase64;
      img.style.display = "block";
      img.style.width = "100%";
      img.style.height = "auto";
      wrapper.appendChild(img);
  
      // Close button
      const closeBtn = document.createElement("div");
      closeBtn.innerHTML = "✖";
      Object.assign(closeBtn.style, {
        position: "absolute",
        top: "10px",
        right: "15px",
        color: "white",
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: "50%",
        width: "30px",
        height: "30px",
        textAlign: "center",
        lineHeight: "30px",
        cursor: "pointer",
        fontSize: "18px",
        fontWeight: "bold",
      });
      closeBtn.onclick = () => overlay.remove();
      overlay.appendChild(closeBtn);
  
      // Add highlights after image loads
      // Add this inside img.onload in showImageWithHighlights()
img.onload = () => {
    const scaleX = wrapper.clientWidth / imageWidth;
    const scaleY = img.clientHeight / imageHeight;
  
    highlights.forEach((h) => {
      const box = document.createElement("div");
      Object.assign(box.style, {
        position: "absolute",
        left: `${h.x * scaleX}px`,
        top: `${h.y * scaleY}px`,
        width: `${h.w * scaleX}px`,
        height: `${h.h * scaleY}px`,
        border: "2px solid orange",
        backgroundColor: "rgba(255,165,0,0.25)",
        borderRadius: "6px",
        cursor: h.reason ? "pointer" : "default",
        animation: "pulse 1.5s infinite",
      });
  
      if (h.reason) {
        // Create custom tooltip
        const tooltip = document.createElement("div");
        tooltip.textContent = h.reason;
        Object.assign(tooltip.style, {
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginBottom: "8px",
          backgroundColor: "rgba(0,0,0,0.85)",
          color: "#fff",
          padding: "6px 10px",
          borderRadius: "8px",
          whiteSpace: "nowrap",
          fontSize: "13px",
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 0.3s ease, transform 0.3s ease",
          zIndex: 1000,
        });
  
        box.appendChild(tooltip);
  
        // Hover effect
        box.addEventListener("mouseenter", () => {
          tooltip.style.opacity = 1;
          tooltip.style.transform = "translateX(-50%) translateY(-5px)";
        });
        box.addEventListener("mouseleave", () => {
          tooltip.style.opacity = 0;
          tooltip.style.transform = "translateX(-50%) translateY(0)";
        });
      }
  
      wrapper.appendChild(box);
    });
  };
  
  
      overlay.appendChild(wrapper);
      document.body.appendChild(overlay);
    }
  
    // -------------------
    // Render Copilot Response
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
  
        if (parsed?.highlights?.length && data.image_base64) {
          html += `
            <b>Screen Analysis:</b>
            <button id="show-highlights-btn" 
              style="background:#007bff;color:white;padding:6px 10px;
              border:none;border-radius:8px;cursor:pointer;margin-top:5px;">
              Show Highlights
            </button>`;
          setTimeout(() => {
            document
              .getElementById("show-highlights-btn")
              ?.addEventListener("click", () =>
                showImageWithHighlights(
                  data.image_base64,
                  parsed.highlights,
                  data.image_width,
                  data.image_height
                )
              );
          }, 200);
        }
      } catch (e) {
        html = `<pre style="background:#f9f9f9;padding:5px;border-radius:5px;">${text}</pre>`;
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
  
      try {
        const screenshot = await captureScreen();
        if (!screenshot) throw new Error("Could not capture screen.");
  
        const res = await fetch("http://127.0.0.1:8000/api/analyze_live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: screenshot, question: userMsg }),
        });
  
        const data = await res.json();
  
        messages.innerHTML += `<div style="
          background:#f1f0f0;color:black;padding:8px 12px;margin:5px 0;
          border-radius:15px 15px 15px 0; max-width:80%; float:left; clear:both;
        ">${renderCopilotResponse(data.result)}</div>`;
  
        messages.scrollTop = messages.scrollHeight;
      } catch (err) {
        messages.innerHTML += `<div style="
          background:#ff4d4f;color:white;padding:8px 12px;margin:5px 0;
          border-radius:15px 15px 15px 0; max-width:80%; float:left; clear:both;
        ">Error: ${err.message}</div>`;
        messages.scrollTop = messages.scrollHeight;
      }
    };
  
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
        0% { transform: scale(1); opacity: 0.7; }
        50% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);
  }
  