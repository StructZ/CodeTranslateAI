const enablePickerBtn = document.getElementById("enable-picker-btn");
const languageSelect = document.getElementById("language-select");
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

enablePickerBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "ENABLE_PICKER" });
    window.close();
  });
});

languageSelect.addEventListener("change", () => {
  chrome.storage.sync.set({ targetLanguage: languageSelect.value });
});

themeToggle.addEventListener("change", () => {
  if (themeToggle.checked) {
    body.classList.add("dark-mode");
    chrome.storage.sync.set({ theme: "dark" });
  } else {
    body.classList.remove("dark-mode");
    chrome.storage.sync.set({ theme: "light" });
  }
});

function initializePopup() {
  chrome.storage.sync.get(["targetLanguage"], (result) => {
    if (result.targetLanguage) {
      languageSelect.value = result.targetLanguage;
    }
  });

  chrome.storage.sync.get(["theme"], (result) => {
    if (result.theme === "dark") {
      body.classList.add("dark-mode");
      themeToggle.checked = true;
    } else {
      body.classList.remove("dark-mode");
      themeToggle.checked = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", initializePopup);
