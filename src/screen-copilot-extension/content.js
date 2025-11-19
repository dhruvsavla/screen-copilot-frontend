if (!window.screenCopilotInjected) {
  window.screenCopilotInjected = true;

  // --- Listen for token from the login page ---
  window.addEventListener("message", (event) => {
    // No origin check, accept from anywhere
    if (event.data && event.data.type === "NEXAURA_AUTH_TOKEN") {
      const token = event.data.token;
      if (token) {
        chrome.storage.local.set({ "nexaura_token": token }, () => {
          console.log("NexAura: Token received and saved.");
          // Send the "thank you" message back to the login page
          window.postMessage({ type: "NEXAURA_TOKEN_RECEIVED" }, "*");
        });
      }
    }
  }, false);


  // --- Global State Variables ---
  let isRecording = false;
  let playbackGuide = null;
  let currentStepIndex = 0;
  let isProgrammaticallyClicking = false;

  // --- *** FINAL, CORRECTED CSS SELECTOR GENERATOR *** ---
  // This logic stops climbing when it finds a stable attribute (like aria-label)
  function getCssSelector(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    let currentEl = el;
    
    while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
      let selector = currentEl.nodeName.toLowerCase();
      
      // 1. Stable ID
      const id = currentEl.id;
      const isStableId = id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
      if (isStableId) {
        selector += '#' + id;
        return selector; // Return ONLY the stable ID selector
      }

      // 2. Stable, unique attributes (Fixes a[aria-label] > span bug)
      const stableAttrs = ['data-testid', 'data-test-id', 'name', 'aria-label', 'placeholder', 'role'];
      for (const attr of stableAttrs) {
        const value = currentEl.getAttribute(attr);
        if (value) {
          selector += `[${attr}="${value}"]`;
          return selector; // Return ONLY the stable attribute selector
        }
      }
      
      // 3. Fallback (if no stable attrs/ID)
      const stableClasses = Array.from(currentEl.classList) 
        .filter(c => /^[a-zA-Z_-]+$/.test(c)); 
      if (stableClasses.length > 0) {
        selector += '.' + stableClasses.join('.');
      } else {
        let sib = currentEl,
          nth = 1;
        while ((sib = sib.previousElementSibling)) {
          if (sib.nodeName.toLowerCase() === currentEl.nodeName.toLowerCase()) nth++;
        }
        if (nth > 1) {
          selector += `:nth-of-type(${nth})`;
        }
      }

      path.unshift(selector);
      currentEl = currentEl.parentNode;
    }
    return path.join(' > ');
  }

  // -------------------
  // --- Recording UI & Logic ---
  // -------------------
  
  const recordingBar = document.createElement("div");
  Object.assign(recordingBar.style, {
    position: "fixed",
    top: "10px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "rgba(255, 0, 0, 0.85)",
    color: "white",
    padding: "10px 20px",
    borderRadius: "8px",
    zIndex: 1000000,
    display: "none",
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
    fontSize: "16px",
    fontWeight: "bold",
  });
  recordingBar.innerHTML = `
    <span>🔴 Recording... Click on an element to add a step.</span>
    <button id="sc-stop-recording" style="background:#fff; color:#d90000; border:none; padding: 5px 10px; border-radius: 5px; margin-left: 15px; cursor: pointer; font-weight: bold;">
      Stop
    </button>
  `;
  document.body.appendChild(recordingBar);

  function showRecordingBar() {
    recordingBar.style.display = "block";
    
    document.getElementById("sc-stop-recording").onclick = () => {
      isRecording = false;
      recordingBar.style.display = "none";
      document.body.removeEventListener("click", onRecordClick, true);

      chrome.storage.local.get(["currentGuideSteps", "nexaura_token"], async (result) => {
        const currentGuideSteps = result.currentGuideSteps || [];
        const token = result.nexaura_token;

        await chrome.storage.local.set({ isRecording: false, currentGuideSteps: [] });

        if (currentGuideSteps.length > 0) {
          const guideName = prompt("Save this guide as:", "My New Guide");
          if (!guideName) return; 

          const guideShortcut = prompt(
              `Enter a shortcut (e.g., "/${guideName.toLowerCase().replace(/\s/g, '-')}"):`,
              `/${guideName.toLowerCase().replace(/\s/g, '-')}`
          );
          if (!guideShortcut) return; 
            
          const guideDescription = prompt("Enter a short description for this guide:");
          if (guideDescription === null) return; 

          const guide = {
            name: guideName,
            shortcut: guideShortcut,
            description: guideDescription,
            steps: currentGuideSteps,
          };

          if (!token) {
            appendMessage("bot", "<strong>Error:</strong> You are not logged in. Please log in from the extension's landing page.", true);
            return;
          }

          try {
            const response = await fetch("http://127.0.0.1:8000/api/guides/", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify(guide)
            });

            if (!response.ok) {
              const err = await response.json();
              throw new Error(err.detail || "Failed to save guide");
            }

            appendMessage(
              "bot",
              `Guide "${guideName}" saved! You can run it by typing <strong>${guideShortcut}</strong>.`,
              true
            );
            container.style.display = "flex";
          } catch (err) {
            appendMessage("bot", `<strong>Error:</strong> ${err.message}`, true);
          }
        }
      });
    };
    
    document.body.addEventListener("click", onRecordClick, true);
  }

  // --- Recording Click Listener ---
  async function onRecordClick(event) {
    if (!isRecording || isProgrammaticallyClicking) {
      return;
    }

    if (event.target.id === "sc-stop-recording" || 
        recordingBar.contains(event.target) || 
        container.contains(event.target) || 
        chatIcon.contains(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const target = event.target;
    const selector = getCssSelector(target);
    if (!selector) {
      console.warn("NexAura: Could not generate selector for", target);
      isProgrammaticallyClicking = true;
      if (typeof target.click === 'function') {
        target.click();
      }
      setTimeout(() => { isProgrammaticallyClicking = false; }, 100);
      return;
    }

    const rect = target.getBoundingClientRect();
    
    // *** TYPO FIXED HERE ***
    showLiveHighlight([{ 
      x: rect.left, 
      y: rect.top, 
      w: rect.width, 
      h: rect.height, // <- Colon added!
      summary: "Adding step for this element..." 
    }], 2000);
    // *** END TYPO FIX ***

    const result = await chrome.storage.local.get("currentGuideSteps");
    const currentSteps = result.currentGuideSteps || [];
    
    const instruction = prompt(`Step ${currentSteps.length + 1}: What should the user do here?`);
    
    if (instruction) {
      const isInput = (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'email' || target.type === 'password' || target.type === 'search')) || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      let actionType = 'click'; // Default
      let value = null;

      if (isInput) {
        actionType = 'type';
        value = target.value;
      } else if (isContentEditable) {
        actionType = 'type';
        value = target.innerText;
      } else {
        if (!confirm("Should the guide automatically CLICK this element during playback?\n\n- Click 'OK' for navigation (e.g., open menu, go to page).\n- Click 'Cancel' to only HIGHLIGHT (e.g., for copy buttons).")) {
          actionType = 'highlight'; // New action type!
        }
      }

      const newStep = {
        selector: selector,
        instruction: instruction,
        action: actionType,
        value: value,
        url: window.location.href 
      };

      currentSteps.push(newStep);
      await chrome.storage.local.set({ currentGuideSteps: currentSteps });
      
      console.log("Added step:", newStep); 

      isProgrammaticallyClicking = true;
      if (typeof target.click === 'function' && actionType === 'click') {
          target.click();
      } else if (actionType === 'type') {
          target.focus(); 
      }
      // If action is 'highlight', do nothing.
      setTimeout(() => {
        isProgrammaticallyClicking = false;
      }, 100);

    } else {
      // User cancelled prompt, do nothing.
      return; 
    }
  }

  // -------------------
  // --- Playback Logic ---
  // -------------------

  function startPlayback(guide) {
    playbackGuide = guide;
    currentStepIndex = 0;
    container.style.display = "flex"; 
    // Start playback with 10 retries
    showPlaybackStep(10);
  }

  // --- Playback Step Logic (with Retry and Click Fix) ---
  function showPlaybackStep(retries = 10) {
    if (!playbackGuide) return; 

    const isLastStep = currentStepIndex === playbackGuide.steps.length - 1;
    
    if (currentStepIndex >= playbackGuide.steps.length) {
      finishPlayback();
      return;
    }

    const step = playbackGuide.steps[currentStepIndex];
    let element = null;
    
    if (step.url && !window.location.href.startsWith(step.url)) {
        appendMessage(
            "bot",
            `<strong>Error:</strong> This step was recorded on a different page. Please navigate to <strong>${step.url}</strong> and try again.`,
            true
        );
        return;
    }
    
    try {
     console.log(`NexAura: Finding element for Step ${currentStepIndex + 1} with selector:`, step.selector);
     element = document.querySelector(step.selector);
    } catch(e) {
      console.error("NexAura: Invalid selector", step.selector, e);
    }

    if (!element) {
      // --- RETRY LOGIC ---
      if (retries > 0) {
        console.warn(`Element not found, ${retries} retries left. Retrying in 100ms...`);
        setTimeout(() => {
          showPlaybackStep(retries - 1); // Pass decremented retry count
        }, 100);
        return; // Stop execution for this attempt
      }
      // --- END RETRY LOGIC ---

      // If retries are 0, then we fail
      appendMessage(
        "bot",
        `<strong>Error:</strong> Could not find element for step ${currentStepIndex + 1}. (Selector: <code>${step.selector}</code>)`,
        true
      );
      finishPlayback();
      return; 
    }

    // If we get here, element was found
    console.log("Element FOUND:", element);

    const rect = element.getBoundingClientRect();
    showLiveHighlight(
      [{
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
        summary: `Step ${currentStepIndex + 1}: ${step.instruction}`,
      }],
      60000 
    );
    
    if (step.action !== 'highlight') {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const stepHtml = `
      <div style="padding: 10px; border: 1px solid #333; border-radius: 8px;">
        <p style="margin:0 0 10px 0;"><strong>Step ${currentStepIndex + 1} of ${playbackGuide.steps.length}</strong></p>
        <p style="margin:0 0 15px 0;">${step.instruction}</p>
        ${!isLastStep ? 
          `<button class="sc-next-step-btn" style="background:#007bff;color:white;padding:6px 10px;border:none;border-radius:8px;cursor:pointer;">
            Next Step &rarr;
          </button>` :
          `<button class="sc-next-step-btn" style="background:#28a745;color:white;padding:6px 10px;border:none;border-radius:8px;cursor:pointer;">
            Finish Guide
          </button>`
        }
        <button class="sc-stop-playback-btn" style="background:#aaa;color:white;padding:6px 10px;border:none;border-radius:8px;cursor:pointer;margin-left: 5px;">
          Stop
        </button>
      </div>
    `;
    const msgElement = appendMessage("bot", stepHtml, true);

    const nextBtn = msgElement.querySelector(".sc-next-step-btn");
    const stopBtn = msgElement.querySelector(".sc-stop-playback-btn");

    if (nextBtn) {
        nextBtn.onclick = (e) => {
          // --- CLICK-OUTSIDE FIX ---
          e.preventDefault();
          e.stopPropagation();
          // --- END OF FIX ---

          const currentElement = document.querySelector(step.selector);
          
          if (currentElement) {
            const action = step.action || 'click'; 

            if (action === 'type' && (currentElement.tagName === 'INPUT' || currentElement.tagName === 'TEXTAREA')) {
                currentElement.value = step.value;
            } else if (action === 'type' && currentElement.isContentEditable) {
                currentElement.innerText = step.value;
            } else if (action === 'click' && typeof currentElement.click === 'function') {
                currentElement.click(); 
            }
            // If action is 'highlight', we do nothing.
          } else {
             console.warn(`NexAura: Element for step ${currentStepIndex + 1} not found during click.`);
          }

          currentStepIndex++;
          
          // Call next step, starting with 10 retries
          showPlaybackStep(10);
      };
    }
    if (stopBtn) {
        stopBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          finishPlayback();
        }
    }
  }
  
  function finishPlayback() {
    if (!playbackGuide) return; 
    
    appendMessage("bot", "Guide finished!");
    playbackGuide = null;
    currentStepIndex = 0;
    showLiveHighlight([]); 
  }


  // -------------------
  // --- UI & Other Functions ---
  // -------------------

  const chatIcon = document.createElement("div");
  Object.assign(chatIcon.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "linear-gradient(90deg, #D93B3B 0%, #E87C32 100%)",
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

  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    width: "320px",
    height: "420px",
    border: "1px solid #333",
    zIndex: 999998,
    display: "none",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: "15px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
    fontFamily: "Arial, sans-serif",
    background: "#222",
    color: "#f0f0f0",
    transition: "all 0.3s ease",
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    background: "linear-gradient(90deg, #D93B3B 0%, #E87C32 100%)",
    color: "white",
    padding: "10px",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "16px",
  });
  header.textContent = "🧠 NexAura";
  container.appendChild(header);

  const messages = document.createElement("div");
  Object.assign(messages.style, {
    flex: "1",
    padding: "10px",
    overflowY: "auto",
    scrollBehavior: "smooth",
  });
  container.appendChild(messages);
  appendMessage("bot", "Ask me about your screen, or type <strong>/</strong> to see your saved guides.", true);

  const inputBox = document.createElement("div");
  Object.assign(inputBox.style, {
    display: "flex",
    borderTop: "1px solid #333",
    padding: "5px",
  });

  const input = document.createElement("input");
  Object.assign(input.style, {
    flex: "1",
    border: "none",
    padding: "10px",
    borderRadius: "20px",
    outline: "none",
    background: "#333",
    color: "#f0f0f0",
  });
  input.placeholder = "Ask or type '/' for guides...";
  inputBox.appendChild(input);

  const sendBtn = document.createElement("button");
  Object.assign(sendBtn.style, {
    background: "#E87C32",
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

  // --- Message Helpers ---
  function appendMessage(role, content, asHTML = false) {
    const msgDiv = document.createElement("div");
    let align = "left";
    let style = "background:#333;color:#f0f0f0;border-radius:15px 15px 15px 0;";
    
    if (role === "user") {
      align = "right";
      style = "background:#E87C32;color:white;border-radius:15px 15px 0 15px;";
    }
    
    if (asHTML && content.startsWith("<strong>Error:</strong>")) {
        style = "background:#5c1a1a;color:#ffc2c2;border:1px solid #D93B3B;border-radius:15px 15px 15px 0;";
    }

    msgDiv.style = `
      padding: 8px 12px;
      margin: 5px 0;
      max-width: 90%; 
      float: ${align}; 
      clear: both;
      box-sizing: border-box;
      word-wrap: break-word;
      ${style}
    `;
    
    if (asHTML) {
      msgDiv.innerHTML = content;
    } else {
      msgDiv.textContent = content;
    }
    
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
    return msgDiv; 
  }

  // --- Toggle Chat ---
  chatIcon.onclick = () => {
    container.style.display =
      container.style.display === "flex" ? "none" : "flex";
  };
  
  // --- Handle messages from popup.js ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TOGGLE_CHAT") {
      container.style.display = container.style.display === "flex" ? "none" : "flex";
      sendResponse({ success: true });
    }
    
    if (message.type === "START_RECORDING_UI") {
      isRecording = true;
      showRecordingBar();
      sendResponse({ success: true });
    }
    
    return true; 
  });

  // --- Check storage on page load ---
  chrome.storage.local.get("isRecording", (result) => {
    if (result.isRecording) {
      isRecording = true;
      showRecordingBar();
    }
  });


  // --- Show Live Highlight ---
  function showLiveHighlight(highlights, duration = 5000) {
    const existingHighlights = document.querySelectorAll(
      ".screen-copilot-highlight-wrapper"
    );
    existingHighlights.forEach((box) => box.remove());

    highlights.forEach((h) => {
      const wrapper = document.createElement("div");
      wrapper.className = "screen-copilot-highlight-wrapper";
      Object.assign(wrapper.style, {
        position: "fixed",
        top: `${h.y}px`,
        left: `${h.x}px`,
        width: `${h.w}px`,
        height: `${h.h}px`,
        zIndex: "9999998",
        pointerEvents: "none",
        opacity: "1",
        transition: "opacity 0.5s ease-out",
      });

      const highlightBox = document.createElement("div");
      Object.assign(highlightBox.style, {
        position: "absolute",
        top: `0`,
        left: `0`,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(232, 124, 50, 0.25)",
        border: "4px solid #E87C32",
        borderRadius: "6px",
        boxShadow: "0 0 15px 5px rgba(232, 124, 50, 0.5)",
        boxSizing: "border-box",
        zIndex: 9999999,
        pointerEvents: "none",
        animation: "pulse 1.5s infinite",
      });
      wrapper.appendChild(highlightBox);

      const summary = h.summary || h.reason;
      if (summary) {
        const summaryText = document.createElement("div");
        Object.assign(summaryText.style, {
          position: "absolute",
          top: `100%`,
          left: `0`,
          marginTop: '5px',
          maxWidth: `${Math.max(h.w, 200)}px`,
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          color: "white",
          padding: "6px 10px",
          borderRadius: "5px",
          fontSize: "14px",
          fontWeight: "bold",
          fontFamily: "Arial, sans-serif",
          zIndex: 9999999,
          pointerEvents: "none",
        });
        summaryText.textContent = summary;
        wrapper.appendChild(summaryText);
      }
      
      document.body.appendChild(wrapper);

      setTimeout(() => {
        wrapper.style.opacity = '0';
      }, duration - 500);

      setTimeout(() => {
        wrapper.remove();
      }, duration);
    });
  }

  // --- Render AI Copilot Response ---
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

      if (parsed?.highlights?.length) {
        const highlightsWithViewportCoords = parsed.highlights.map(h => ({
            ...h,
            x: h.x - window.scrollX,
            y: h.y - window.scrollY
        }));
        showLiveHighlight(highlightsWithViewportCoords);
        html += `<p style='font-style:italic;color:#999;margin-top:5px;'>Showing highlights on your screen...</p>`;
      }
    } catch (e) {
      html = `<pre style="white-space: pre-wrap; background:#111;padding:5px;border-radius:5px;">${text}</pre>`;
    }
    return html;
  }

  // --- handleSendMessage (Handles AI + Playback from DB) ---
  async function handleSendMessage() {
    const userMsg = input.value.trim();
    if (!userMsg) return;
    
    if (playbackGuide) return; 

    appendMessage("user", userMsg);
    const userInputForLater = userMsg;
    input.value = "";
    messages.scrollTop = messages.scrollHeight;

    // Check for Playback Command
    if (userInputForLater.startsWith("/")) {
      chrome.storage.local.get("nexaura_token", async (result) => {
        if (!result.nexaura_token) {
          appendMessage("bot", "<strong>Error:</strong> You are not logged in. Please log in from the extension's landing page.", true);
          return;
        }

        const loadingMsg = appendMessage("bot", "Finding your guide...");

        try {
          const response = await fetch("http://127.0.0.1:8000/api/guides/", {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${result.nexaura_token}`
            }
          });

          if(loadingMsg) loadingMsg.remove();

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to get guides");
          }

          const allGuides = await response.json();
          const foundGuide = allGuides.find(g => g.shortcut === userInputForLater);

          if (foundGuide) {
            startPlayback(foundGuide); 
          } else {
            appendMessage("bot", `Sorry, I couldn't find a guide with the shortcut <strong>${userInputForLater}</strong>.`, true);
          }
        } catch (err) {
          if(loadingMsg) loadingMsg.remove();
          appendMessage("bot", `<strong>Error:</strong> ${err.message}`, true);
        }
      });
      return; 
    }
    
    // --- Existing AI Logic ---
    const loadingMsg = appendMessage("bot", "Thinking...");

    try {
      const screenshot = await captureScreen();
      if (!screenshot) throw new Error("Could not capture screen.");

      const res = await fetch("http://127.0.0.1:8000/api/analyze/analyze_live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: screenshot, question: userInputForLater }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server error: ${res.status} ${res.statusText}. ${errorText}`);
      }
      
      const data = await res.json();
      loadingMsg.remove();
      appendMessage("bot", renderCopilotResponse(data.result), true);
      messages.scrollTop = messages.scrollHeight;

    } catch (err) {
      if(loadingMsg) loadingMsg.remove();
      appendMessage("bot", `<strong>Error:</strong> ${err.message}`, true);
      messages.scrollTop = messages.scrollHeight;
    }
  }
  
  sendBtn.onclick = handleSendMessage;
  input.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSendMessage();
    }
  });


  // --- Capture Screen ---
  function captureScreen() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "CAPTURE_SCREEN" }, (response) => {
        if (chrome.runtime.lastError) {
          if (chrome.runtime.lastError.message.includes("The message port closed before a response was received.")) {
             console.warn("NexAura: Capture screen failed, possibly due to page reload.");
          }
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (response?.error) {
          return reject(new Error(response.error));
        }
        resolve(response.image);
      });
    });
  }

  // --- Animation Style ---
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse {
      0% { 
        transform: scale(1); 
        opacity: 0.8; 
        box-shadow: 0 0 15px 5px rgba(232, 124, 50, 0.4);
      }
      50% { 
        transform: scale(1.03); 
        opacity: 1; 
        box-shadow: 0 0 25px 10px rgba(232, 124, 50, 0.7);
      }
      100% { 
        transform: scale(1); 
        opacity: 0.8; 
        box-shadow: 0 0 15px 5px rgba(232, 124, 50, 0.4);
      }
    }
  `;
  document.head.appendChild(style);

} // End of window.screenCopilotInjected check