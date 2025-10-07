export function injectOrUpdateTranslations(
  translations,
  originalElement,
  width,
  currentTheme,
  originalCode = ""
) {
  const componentStyles = `
        .tab-nav {
            display: flex;
            border-bottom: 1px solid #ccc;
            background-color: #f0f0f0;
        }
        .tab-link {
            padding: 10px 15px;
            cursor: pointer;
            border: none;
            background-color: transparent;
            font-size: 1em;
            font-weight: 500;
            color: #555;
            border-bottom: 3px solid transparent;
        }
        .tab-link:hover {
            background-color: #e5e5e5;
        }
        .tab-link.active {
            color: #007bff;
            font-weight: 600;
            border-bottom: 3px solid #007bff;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .code-wrapper{
            position:relative
        }
        .action-buttons {
            position: absolute;
            top: 8px;
            right: 8px;
            display: flex;
            gap: 8px;
            z-index: 10;
        }
        .copy-button, .feedback-button {
            padding: 6px 12px;
            font-size: 14px;
            background-color: rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 4px;
            color: #333;
            cursor: pointer;
            transition: background-color 0.3s, border-color 0.3s, color 0.3s;
        }
        .feedback-button {
            padding: 4px 8px;
            font-size: 18px;
            line-height: 1;
        }
        .copy-button:hover, .feedback-button:hover {
            background-color: rgba(0, 0, 0, 0.1);
            border-color: rgba(0, 0, 0, 0.2);
            color: #000;
        }
        .copy-button:active, .feedback-button:active {
            background-color: rgba(0, 0, 0, 0.15);
        }
        .feedback-button.active {
            background-color: rgba(0, 123, 255, 0.2);
            border-color: #007bff;
        }
        .feedback-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .feedback-modal-content {
            background-color: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 500px;
            width: 90%;
        }
        .feedback-modal-header {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #333;
        }
        .feedback-modal textarea {
            width: 100%;
            min-height: 100px;
            padding: 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-family: inherit;
            font-size: 14px;
            resize: vertical;
            box-sizing: border-box;
        }
        .feedback-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 16px;
        }
        .feedback-modal button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        .feedback-modal .cancel-btn {
            background-color: #e5e5e5;
            color: #333;
        }
        .feedback-modal .cancel-btn:hover {
            background-color: #d0d0d0;
        }
        .feedback-modal .submit-btn {
            background-color: #007bff;
            color: white;
        }
        .feedback-modal .submit-btn:hover {
            background-color: #0056b3;
        }
        .feedback-modal .submit-btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            
        }
        code {
            font-family: monospace;
            font-size: 0.8em;
        }
        .dark .tab-nav {
            border-bottom: 1px solid #3e3e42;
            background-color: #2d2d30;
        }
        .dark .tab-link {
            color: #969696;
        }
        .dark .tab-link:hover {
            background-color: #3e3e42;
        }
        .dark .tab-link.active {
            color: #4a9eff;
            border-bottom: 3px solid #4a9eff;
        }
        .dark .copy-button, .dark .feedback-button {
            background-color: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #f0f0f0;
        }
        .dark .copy-button:hover, .dark .feedback-button:hover {
            background-color: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            color: #ffffff;
        }
        .dark .copy-button:active, .dark .feedback-button:active {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .dark .feedback-button.active {
            background-color: rgba(74, 158, 255, 0.3);
            border-color: #4a9eff;
        }
        .dark .feedback-modal-content {
            background-color: #2d2d30;
            color: #f0f0f0;
        }
        .dark .feedback-modal-header {
            color: #f0f0f0;
        }
        .dark .feedback-modal textarea {
            background-color: #1e1e1e;
            color: #f0f0f0;
            border-color: #3e3e42;
        }
        .dark .feedback-modal .cancel-btn {
            background-color: #3e3e42;
            color: #f0f0f0;
        }
        .dark .feedback-modal .cancel-btn:hover {
            background-color: #4e4e52;
        }
        .dark pre {
            background-color: #1e1e1e;
            color: #cccccc;
        }
        .dark code {
            color: #cccccc;
        }
    `;
  let container = originalElement.nextElementSibling;

  if (!container || container.id !== "my-code-translator-container") {
    container = document.createElement("div");
    container.id = "my-code-translator-container";
    const shadowRoot = container.attachShadow({ mode: "open" });
    const prismTheme = document.createElement("link");
    prismTheme.rel = "stylesheet";
    if(currentTheme==="dark"){
      prismTheme.href = chrome.runtime.getURL("packages/prism.css");
    }else{
      prismTheme.href = chrome.runtime.getURL("packages/prism-light.css");
    }
    
    shadowRoot.appendChild(prismTheme);
    const styleElement = document.createElement("style");
    styleElement.textContent = componentStyles;
    shadowRoot.appendChild(styleElement);
    const uiWrapper = document.createElement("div");
    uiWrapper.className = "ui-wrapper";
    uiWrapper.classList.add(currentTheme === "dark" ? "dark" : "light");
    shadowRoot.appendChild(uiWrapper);
    originalElement.parentNode.insertBefore(
      container,
      originalElement.nextSibling
    );
  }

  container.style.width = `${width}px`;
  container.style.boxSizing = "border-box";
  const shadowRoot = container.shadowRoot;
  const uiWrapper = shadowRoot.querySelector(".ui-wrapper");
  uiWrapper.innerHTML = "";
  const tabNav = document.createElement("div");
  tabNav.className = "tab-nav";
  const contentArea = document.createElement("div");
  contentArea.className = "tab-content-area";
  uiWrapper.appendChild(tabNav);
  uiWrapper.appendChild(contentArea);
  Object.keys(translations).forEach((lang) => {
    const contentPanel = document.createElement("div");
    contentPanel.className = "tab-content";
    contentPanel.dataset.lang = lang;
    const codeWrapper = document.createElement("div");
    codeWrapper.className = "code-wrapper";
    
    // Create action buttons container
    const actionButtons = document.createElement("div");
    actionButtons.className = "action-buttons";
    
    // Copy button
    const copyButton = document.createElement("div");
    copyButton.className = "copy-button";
    copyButton.innerText = "Copy";
    copyButton.addEventListener("click", () => {
      navigator.clipboard.writeText(translations[lang]).then(() => {
        copyButton.innerText = "Copied!";
        setTimeout(() => (copyButton.innerText = "Copy"), 2000);
      });
    });
    
    // Thumbs up button
    const thumbsUpButton = document.createElement("button");
    thumbsUpButton.className = "feedback-button";
    thumbsUpButton.innerHTML = "👍";
    thumbsUpButton.title = "Good translation";
    thumbsUpButton.addEventListener("click", () => {
      sendFeedback(true, lang, originalCode, translations[lang], null, thumbsUpButton);
    });
    
    // Thumbs down button
    const thumbsDownButton = document.createElement("button");
    thumbsDownButton.className = "feedback-button";
    thumbsDownButton.innerHTML = "👎";
    thumbsDownButton.title = "Bad translation";
    thumbsDownButton.addEventListener("click", () => {
      showFeedbackModal(shadowRoot, lang, originalCode, translations[lang], thumbsDownButton, currentTheme);
    });
    
    actionButtons.appendChild(copyButton);
    actionButtons.appendChild(thumbsUpButton);
    actionButtons.appendChild(thumbsDownButton);
    
    const langClass = `language-${lang.toLowerCase()}`;
    const pre = document.createElement("pre");
    pre.className = langClass;
    const code = document.createElement("code");
    code.className = langClass;
    code.textContent = translations[lang];

    pre.appendChild(code);
    codeWrapper.appendChild(actionButtons);
    codeWrapper.appendChild(pre);
    contentPanel.appendChild(codeWrapper);
    contentArea.appendChild(contentPanel);
  });

  Object.keys(translations).forEach((lang, index) => {
    const tabButton = document.createElement("button");
    tabButton.className = "tab-link";
    tabButton.textContent = lang;
    tabButton.addEventListener("click", () => {
      shadowRoot
        .querySelectorAll(".tab-link")
        .forEach((btn) => btn.classList.remove("active"));
      shadowRoot
        .querySelectorAll(".tab-content")
        .forEach((panel) => panel.classList.remove("active"));
      tabButton.classList.add("active");
      shadowRoot
        .querySelector(`.tab-content[data-lang="${lang}"]`)
        .classList.add("active");
    });
    tabNav.appendChild(tabButton);
    if (index === 0) {
      tabButton.click();
    }
  });
  try {
    if (window.Prism) {
      contentArea
        .querySelectorAll(`pre[class*="language-"]`)
        .forEach((element) => window.Prism.highlightElement(element));
    }
  } catch (e) {
    console.error("CodeTranslateAI: Error highlighting syntax.", e);
  }
}

function sendFeedback(isPositive, targetLanguage, originalCode, translatedCode, comment, buttonElement) {
  const feedbackData = {
    isPositive,
    targetLanguage,
    originalCode,
    translatedCode,
    comment: comment || (isPositive ? "Good translation" : null),
    timestamp: new Date().toISOString()
  };
  
  chrome.runtime.sendMessage(
    { type: "SUBMIT_FEEDBACK", feedback: feedbackData },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error submitting feedback:", chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
        // Visual feedback
        buttonElement.classList.add("active");
        setTimeout(() => {
          buttonElement.classList.remove("active");
        }, 2000);
      }
    }
  );
}

function showFeedbackModal(shadowRoot, targetLanguage, originalCode, translatedCode, buttonElement, currentTheme) {
  // Remove existing modal if any
  const existingModal = shadowRoot.querySelector(".feedback-modal");
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement("div");
  modal.className = "feedback-modal";
  if (currentTheme === "dark") {
    modal.classList.add("dark");
  }
  
  modal.innerHTML = `
    <div class="feedback-modal-content">
      <div class="feedback-modal-header">What was wrong with this translation?</div>
      <textarea placeholder="Please describe the issue with the translation (optional)..." maxlength="1000"></textarea>
      <div class="feedback-modal-actions">
        <button class="cancel-btn">Cancel</button>
        <button class="submit-btn">Submit Feedback</button>
      </div>
    </div>
  `;
  
  shadowRoot.appendChild(modal);
  
  const textarea = modal.querySelector("textarea");
  const cancelBtn = modal.querySelector(".cancel-btn");
  const submitBtn = modal.querySelector(".submit-btn");
  
  // Focus textarea
  textarea.focus();
  
  // Close modal on background click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  cancelBtn.addEventListener("click", () => {
    modal.remove();
  });
  
  submitBtn.addEventListener("click", () => {
    const comment = textarea.value.trim();
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    
    sendFeedback(false, targetLanguage, originalCode, translatedCode, comment, buttonElement);
    
    setTimeout(() => {
      modal.remove();
    }, 500);
  });
}
