if (!window.screenCopilotInjected) {
  window.screenCopilotInjected = true;

  // --- Token Listener ---
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "NEXAURA_AUTH_TOKEN") {
      const token = event.data.token;
      if (token) {
        chrome.storage.local.set({ "nexaura_token": token }, () => {
          console.log("NexAura: Token received and saved.");
          window.postMessage({ type: "NEXAURA_TOKEN_RECEIVED" }, "*");
        });
      }
    }
  }, false);

  // --- Global State Variables ---
  let isRecording = false;
  let currentGuideSteps = [];
  let playbackGuide = null;
  let currentStepIndex = 0;
  let isProgrammaticallyClicking = false;

  // --- CSS Selector Generator ---
  function getCssSelector(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      const id = el.id;
      const isStableId = id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
      if (isStableId) {
        selector += '#' + id;
        path.unshift(selector);
        break; 
      }
      const stableAttrs = ['data-testid', 'data-test-id', 'name', 'aria-label', 'placeholder', 'role'];
      let foundStableAttr = false;
      for (const attr of stableAttrs) {
        const value = el.getAttribute(attr);
        if (value) {
          selector += `[${attr}="${value}"]`;
          foundStableAttr = true;
          break;
        }
      }
      const stableClasses = Array.from(el.classList)
        .filter(c => !/[.:]/.test(c) && !/^[0-9]/.test(c)); 
      if (!foundStableAttr && stableClasses.length > 0) {
        selector += '.' + stableClasses.join('.');
      }
      if (!foundStableAttr) {
        let sib = el, nth = 1;
        while ((sib = sib.previousElementSibling)) {
          if (sib.nodeName.toLowerCase() === el.nodeName.toLowerCase()) nth++;
        }
        if (nth > 1) {
          selector += `:nth-of-type(${nth})`;
        }
      }
      path.unshift(selector);
      if (foundStableAttr) {
        break;
      }
      el = el.parentNode;
    }
    return path.join(' > ');
  }

  // ===========================================
  // === FLOATING WIDGET CONTAINER (SIDEBAR) ===
  // ===========================================

  const floatingWidget = document.createElement("div");
  floatingWidget.id = "nexaura-floating-widget";
  Object.assign(floatingWidget.style, {
    position: "fixed",
    top: "0",
    right: "-400px", // Hidden initially
    width: "400px",
    height: "100vh",
    backgroundColor: "#1a1a1a",
    boxShadow: "-5px 0 25px rgba(0, 0, 0, 0.5)",
    zIndex: 2147483647, // Maximum z-index
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#fff",
    transition: "right 0.3s ease-in-out",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  });

  // Header
  const widgetHeader = document.createElement("div");
  Object.assign(widgetHeader.style, {
    background: "linear-gradient(135deg, #D93B3B 0%, #E87C32 100%)",
    padding: "15px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  });

  const headerTitle = document.createElement("div");
  headerTitle.innerHTML = '<span style="font-size: 24px; font-weight: bold;">🧠 NexAura</span>';
  widgetHeader.appendChild(headerTitle);

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "✕";
  Object.assign(closeBtn.style, {
    background: "rgba(255, 255, 255, 0.2)",
    border: "none",
    color: "#fff",
    fontSize: "24px",
    width: "35px",
    height: "35px",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  });
  closeBtn.onmouseover = () => closeBtn.style.background = "rgba(255, 255, 255, 0.3)";
  closeBtn.onmouseout = () => closeBtn.style.background = "rgba(255, 255, 255, 0.2)";
  closeBtn.onclick = () => {
    floatingWidget.style.right = "-400px";
  };
  widgetHeader.appendChild(closeBtn);

  floatingWidget.appendChild(widgetHeader);

  // Content Area (Messages)
  const widgetContent = document.createElement("div");
  Object.assign(widgetContent.style, {
    flex: "1",
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  });
  floatingWidget.appendChild(widgetContent);

  // Input Area
  const widgetInputArea = document.createElement("div");
  Object.assign(widgetInputArea.style, {
    padding: "15px 20px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    background: "#242424",
  });

  const widgetInput = document.createElement("input");
  Object.assign(widgetInput.style, {
    width: "100%",
    padding: "12px 15px",
    background: "#333",
    border: "1px solid #444",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  });
  widgetInput.placeholder = "Ask or type '/' for guides...";
  widgetInputArea.appendChild(widgetInput);

  const widgetSendBtn = document.createElement("button");
  Object.assign(widgetSendBtn.style, {
    width: "100%",
    marginTop: "10px",
    padding: "12px",
    background: "linear-gradient(135deg, #D93B3B 0%, #E87C32 100%)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "transform 0.2s",
  });
  widgetSendBtn.textContent = "Send";
  widgetSendBtn.onmouseover = () => widgetSendBtn.style.transform = "scale(1.02)";
  widgetSendBtn.onmouseout = () => widgetSendBtn.style.transform = "scale(1)";
  widgetInputArea.appendChild(widgetSendBtn);

  floatingWidget.appendChild(widgetInputArea);
  document.body.appendChild(floatingWidget);

  // Floating Action Button (FAB)
  const fab = document.createElement("div");
  fab.id = "nexaura-fab";
  Object.assign(fab.style, {
    position: "fixed",
    bottom: "30px",
    right: "30px",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #D93B3B 0%, #E87C32 100%)",
    boxShadow: "0 4px 20px rgba(217, 59, 59, 0.4)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    zIndex: 2147483646,
    transition: "all 0.3s ease",
  });
  fab.innerHTML = "💬";
  fab.title = "Open NexAura";
  fab.onmouseover = () => {
    fab.style.transform = "scale(1.1)";
    fab.style.boxShadow = "0 6px 30px rgba(217, 59, 59, 0.6)";
  };
  fab.onmouseout = () => {
    fab.style.transform = "scale(1)";
    fab.style.boxShadow = "0 4px 20px rgba(217, 59, 59, 0.4)";
  };
  fab.onclick = () => {
    const isOpen = floatingWidget.style.right === "0px";
    floatingWidget.style.right = isOpen ? "-400px" : "0px";
  };
  document.body.appendChild(fab);

  // Initial welcome message
  function appendWidgetMessage(role, content, asHTML = false) {
    const msgDiv = document.createElement("div");
    Object.assign(msgDiv.style, {
      padding: "12px 16px",
      borderRadius: "12px",
      maxWidth: "85%",
      wordWrap: "break-word",
      lineHeight: "1.5",
      fontSize: "14px",
    });

    if (role === "user") {
      Object.assign(msgDiv.style, {
        background: "linear-gradient(135deg, #D93B3B 0%, #E87C32 100%)",
        color: "#fff",
        alignSelf: "flex-end",
        marginLeft: "auto",
      });
    } else if (role === "bot") {
      Object.assign(msgDiv.style, {
        background: "#2a2a2a",
        color: "#f0f0f0",
        alignSelf: "flex-start",
      });
    }

    if (content.startsWith("<strong>Error:</strong>")) {
      msgDiv.style.background = "#5c1a1a";
      msgDiv.style.border = "1px solid #D93B3B";
    }

    if (asHTML) {
      msgDiv.innerHTML = content;
    } else {
      msgDiv.textContent = content;
    }

    widgetContent.appendChild(msgDiv);
    widgetContent.scrollTop = widgetContent.scrollHeight;
    return msgDiv;
  }

  appendWidgetMessage("bot", "👋 Hi! Ask me about your screen, or type <strong>/</strong> to run a saved guide.", true);

  // ===========================================
  // === RECORDING BAR (TOP OF PAGE) ===
  // ===========================================

  const recordingBar = document.createElement("div");
  Object.assign(recordingBar.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "rgba(220, 53, 69, 0.95)",
    color: "white",
    padding: "15px 30px",
    borderRadius: "50px",
    zIndex: 2147483645,
    display: "none",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    fontSize: "16px",
    fontWeight: "600",
    alignItems: "center",
    gap: "15px",
  });
  recordingBar.innerHTML = `
    <span>🔴 Recording Guide - Click elements to add steps</span>
    <button id="sc-stop-recording" style="background:#fff; color:#dc3545; border:none; padding: 8px 20px; border-radius: 25px; cursor: pointer; font-weight: bold; font-size: 14px;">
      Stop & Save
    </button>
  `;
  document.body.appendChild(recordingBar);

  document.getElementById("sc-stop-recording").onclick = () => {
    isRecording = false;
    recordingBar.style.display = "none";
    document.body.removeEventListener("click", onRecordClick, true);

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

      chrome.storage.local.get("nexaura_token", async (result) => {
        if (!result.nexaura_token) {
          appendWidgetMessage("bot", "<strong>Error:</strong> You are not logged in. Please log in from the extension's landing page.", true);
          floatingWidget.style.right = "0px";
          return;
        }

        try {
          const response = await fetch("http://127.0.0.1:8000/api/guides/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${result.nexaura_token}`
            },
            body: JSON.stringify(guide)
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to save guide");
          }

          appendWidgetMessage("bot", `✅ Guide "${guideName}" saved! Run it with <strong>${guideShortcut}</strong>`, true);
          floatingWidget.style.right = "0px";
        } catch (err) {
          appendWidgetMessage("bot", `<strong>Error:</strong> ${err.message}`, true);
          floatingWidget.style.right = "0px";
        }
      });
    }
    currentGuideSteps = []; 
  };

  function onRecordClick(event) {
    if (!isRecording || isProgrammaticallyClicking) {
      return;
    }

    // Ignore clicks on NexAura UI
    if (event.target.id === "sc-stop-recording" || 
        recordingBar.contains(event.target) || 
        floatingWidget.contains(event.target) || 
        fab.contains(event.target) ||
        event.target.closest('#nexaura-playback-controls')) {
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
      setTimeout(() => { isProgrammaticallyClicking = false; }, 0);
      return;
    }

    const rect = target.getBoundingClientRect();
    showLiveHighlight([{ 
      x: rect.left, 
      y: rect.top, 
      w: rect.width, 
      h: rect.height, 
      summary: "Adding step for this element..." 
    }], 2000);

    const instruction = prompt(`Step ${currentGuideSteps.length + 1}: What should the user do here?`);
    
    if (instruction) {
      const isInput = (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'email' || target.type === 'password' || target.type === 'search')) || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;
      
      let actionType = 'click';
      let value = null;

      if (isInput) {
        actionType = 'type';
        value = target.value;
      } else if (isContentEditable) {
        actionType = 'type';
        value = target.innerText;
      }

      currentGuideSteps.push({
        selector: selector,
        instruction: instruction,
        action: actionType,
        value: value 
      });
      console.log("Added step:", currentGuideSteps[currentGuideSteps.length - 1]);
    } else {
      return;
    }

    isProgrammaticallyClicking = true;
    if (typeof target.click === 'function' && currentGuideSteps[currentGuideSteps.length - 1].action === 'click') {
        target.click();
    } else {
        target.focus();
    }
    setTimeout(() => {
      isProgrammaticallyClicking = false;
    }, 0); 
  }

  // ===========================================
  // === PLAYBACK CONTROLS (FLOATING BOTTOM) ===
  // ===========================================

  let playbackControls = null;

  function createPlaybackControls() {
    if (playbackControls) return playbackControls;

    playbackControls = document.createElement("div");
    playbackControls.id = "nexaura-playback-controls";
    Object.assign(playbackControls.style, {
      position: "fixed",
      bottom: "100px",
      right: "30px",
      width: "350px",
      backgroundColor: "rgba(26, 26, 26, 0.98)",
      border: "2px solid #E87C32",
      borderRadius: "16px",
      padding: "20px",
      zIndex: 2147483644,
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "white",
    });

    document.body.appendChild(playbackControls);
    return playbackControls;
  }

  function removePlaybackControls() {
    if (playbackControls) {
      playbackControls.remove();
      playbackControls = null;
    }
  }

  // ===========================================
  // === PLAYBACK LOGIC ===
  // ===========================================

  function startPlayback(guide) {
    playbackGuide = guide;
    currentStepIndex = 0;
    showPlaybackStep();
  }

  async function waitForElement(selector, maxAttempts = 10, delayMs = 300) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const rect = element.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           window.getComputedStyle(element).visibility !== 'hidden' &&
                           window.getComputedStyle(element).display !== 'none';
          
          if (isVisible) {
            console.log(`NexAura: Found visible element on attempt ${attempt + 1}`);
            return element;
          }
        }
      } catch (e) {
        console.warn(`NexAura: Selector error on attempt ${attempt + 1}:`, e);
      }
      
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return null;
  }

  async function showPlaybackStep() {
    if (!playbackGuide) return; 

    const isLastStep = currentStepIndex === playbackGuide.steps.length - 1;
    
    if (currentStepIndex >= playbackGuide.steps.length) {
      finishPlayback();
      return;
    }

    const step = playbackGuide.steps[currentStepIndex];
    
    const controls = createPlaybackControls();
    controls.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 32px; margin-bottom: 10px;">🔍</div>
        <p style="margin: 10px 0; color: #ccc;">Looking for element...</p>
        <p style="margin: 5px 0; font-size: 12px; color: #888;">Step ${currentStepIndex + 1} of ${playbackGuide.steps.length}</p>
      </div>
    `;
    
    console.log(`NexAura: Finding element for Step ${currentStepIndex + 1} with selector:`, step.selector);
    const element = await waitForElement(step.selector, 10, 300);

    if (!element) {
      controls.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
          <h3 style="margin: 10px 0; color: #ff6b6b; font-size: 18px;">Element Not Found</h3>
          <p style="margin: 10px 0; font-size: 13px; color: #ccc;">
            Could not find element for step ${currentStepIndex + 1}.
          </p>
          <p style="margin: 10px 0; font-size: 12px; color: #aaa;">
            ${step.instruction}
          </p>
          <p style="margin: 10px 0; font-size: 10px; color: #666; font-family: monospace; word-break: break-all;">
            ${step.selector}
          </p>
          <div style="display: flex; gap: 8px; justify-content: center; margin-top: 20px; flex-wrap: wrap;">
            <button class="sc-retry-btn" style="background:#007bff;color:white;padding:10px 16px;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">
              🔄 Retry
            </button>
            <button class="sc-skip-btn" style="background:#ffc107;color:#000;padding:10px 16px;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">
              Skip
            </button>
            <button class="sc-stop-playback-btn" style="background:#dc3545;color:white;padding:10px 16px;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">
              Stop
            </button>
          </div>
        </div>
      `;
      
      controls.querySelector(".sc-retry-btn").onclick = (e) => {
        e.stopPropagation();
        showPlaybackStep();
      };
      
      controls.querySelector(".sc-skip-btn").onclick = (e) => {
        e.stopPropagation();
        currentStepIndex++;
        showPlaybackStep();
      };
      
      controls.querySelector(".sc-stop-playback-btn").onclick = (e) => {
        e.stopPropagation();
        finishPlayback();
      };
      return; 
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });

    const rect = element.getBoundingClientRect();
    showLiveHighlight([{
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
      summary: `Step ${currentStepIndex + 1}: ${step.instruction}`,
    }], 60000);

    controls.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #E87C32;">
          <h3 style="margin: 0; font-size: 16px;">🎯 Guide Playback</h3>
          <span style="background: #E87C32; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">
            ${currentStepIndex + 1} / ${playbackGuide.steps.length}
          </span>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 14px; line-height: 1.5;">
            ${step.instruction}
          </p>
        </div>

        <div style="display: flex; gap: 8px;">
          ${!isLastStep ? 
            `<button class="sc-next-step-btn" style="flex: 1; background:#007bff;color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">
              Next Step →
            </button>` :
            `<button class="sc-finish-btn" style="flex: 1; background:#28a745;color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">
              ✓ Finish
            </button>`
          }
          <button class="sc-stop-playback-btn" style="background:#6c757d;color:white;padding:12px 16px;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">
            Stop
          </button>
        </div>
      </div>
    `;

    const nextBtn = controls.querySelector(".sc-next-step-btn");
    const finishBtn = controls.querySelector(".sc-finish-btn");
    const stopBtn = controls.querySelector(".sc-stop-playback-btn");

    if (nextBtn) {
      nextBtn.onclick = async (e) => {
        e.stopPropagation();
        await executeStepAction(step);
        currentStepIndex++;
        setTimeout(() => {
          showPlaybackStep();
        }, 800); 
      };
    }

    if (finishBtn) {
      finishBtn.onclick = async (e) => {
        e.stopPropagation();
        await executeStepAction(step);
        setTimeout(() => {
          finishPlayback();
        }, 800);
      };
    }

    if (stopBtn) {
      stopBtn.onclick = (e) => {
        e.stopPropagation();
        finishPlayback();
      };
    }
  }

  async function executeStepAction(step) {
    const currentElement = document.querySelector(step.selector);
    
    if (currentElement) {
      const action = step.action || 'click'; 
      
      currentElement.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (action === 'type' && (currentElement.tagName === 'INPUT' || currentElement.tagName === 'TEXTAREA')) {
        currentElement.focus();
        currentElement.value = step.value || '';
        currentElement.dispatchEvent(new Event('input', { bubbles: true }));
        currentElement.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (action === 'type' && currentElement.isContentEditable) {
        currentElement.focus();
        currentElement.innerText = step.value || '';
      } else if (typeof currentElement.click === 'function') {
        isProgrammaticallyClicking = true;
        currentElement.click(); 
        await new Promise(resolve => setTimeout(resolve, 400));
        isProgrammaticallyClicking = false;
      }
    } else {
      console.warn(`NexAura: Element for step ${currentStepIndex + 1} not found during action execution.`);
    }
  }
  
  function finishPlayback() {
    if (!playbackGuide) return; 
    
    const controls = createPlaybackControls();
    controls.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
        <h3 style="margin: 10px 0; font-size: 18px;">Guide Completed!</h3>
        <p style="margin: 10px 0; color: #ccc; font-size: 13px;">You've finished all steps in "${playbackGuide.name}"</p>
        <button class="sc-close-overlay-btn" style="background:#E87C32;color:white;padding:10px 20px;border:none;border-radius:8px;cursor:pointer;margin-top:15px;font-weight:600;">
          Close
        </button>
      </div>
    `;
    
    controls.querySelector(".sc-close-overlay-btn").onclick = () => {
      removePlaybackControls();
    };

    playbackGuide = null;
    currentStepIndex = 0;
    showLiveHighlight([]); 

    setTimeout(() => {
      removePlaybackControls();
    }, 5000);
  }

  // ===========================================
  // === MESSAGE HANDLING ===
  // ===========================================

  async function handleSendMessage() {
    const userMsg = widgetInput.value.trim();
    if (!userMsg) return;
    
    if (playbackGuide) return; 

    appendWidgetMessage("user", userMsg);
    const userInputForLater = userMsg;
    widgetInput.value = "";

    if (userInputForLater.startsWith("/")) {
      chrome.storage.local.get("nexaura_token", async (result) => {
        if (!result.nexaura_token) {
          appendWidgetMessage("bot", "<strong>Error:</strong> You are not logged in. Please log in from the extension's landing page.", true);
          return;
        }

        const loadingMsg = appendWidgetMessage("bot", "Finding your guide...");

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
            appendWidgetMessage("bot", `🚀 Starting guide: <strong>${foundGuide.name}</strong>`, true);
            startPlayback(foundGuide); 
          } else {
            appendWidgetMessage("bot", `Sorry, I couldn't find a guide with the shortcut <strong>${userInputForLater}</strong>.`, true);
          }
        } catch (err) {
          if(loadingMsg) loadingMsg.remove();
          appendWidgetMessage("bot", `<strong>Error:</strong> ${err.message}`, true);
        }
      });
      return; 
    }
    
    const loadingMsg = appendWidgetMessage("bot", "🤔 Thinking...");

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
      appendWidgetMessage("bot", renderCopilotResponse(data.result), true);

    } catch (err) {
      if(loadingMsg) loadingMsg.remove();
      appendWidgetMessage("bot", `<strong>Error:</strong> ${err.message}`, true);
    }
  }
  
  widgetSendBtn.onclick = handleSendMessage;
  widgetInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSendMessage();
    }
  });

  // ===========================================
  // === UTILITY FUNCTIONS ===
  // ===========================================

  function showLiveHighlight(highlights, duration = 5000) {
    const existingHighlights = document.querySelectorAll(".screen-copilot-highlight-wrapper");
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
        zIndex: "2147483643",
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

  // ===========================================
  // === MESSAGE LISTENERS ===
  // ===========================================

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TOGGLE_CHAT") {
      const isOpen = floatingWidget.style.right === "0px";
      floatingWidget.style.right = isOpen ? "-400px" : "0px";
      sendResponse({ success: true });
    }
    
    if (message.type === "START_RECORDING") {
      isRecording = true;
      currentGuideSteps = [];
      recordingBar.style.display = "flex";
      document.body.addEventListener("click", onRecordClick, true);
      sendResponse({ success: true });
    }
    
    return false; 
  });

  // ===========================================
  // === ANIMATIONS & STYLES ===
  // ===========================================

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

    #nexaura-floating-widget::-webkit-scrollbar {
      width: 8px;
    }

    #nexaura-floating-widget::-webkit-scrollbar-track {
      background: #2a2a2a;
    }

    #nexaura-floating-widget::-webkit-scrollbar-thumb {
      background: #E87C32;
      border-radius: 4px;
    }

    #nexaura-floating-widget::-webkit-scrollbar-thumb:hover {
      background: #D93B3B;
    }
  `;
  document.head.appendChild(style);

  console.log("✅ NexAura: Floating widget initialized!");

}