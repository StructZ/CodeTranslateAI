import { enablePicker } from "./picker.js";
import { hashCode, getFromCache, saveToCache } from "./cache.js";
import { injectOrUpdateTranslations } from "./ui.js";

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "ENABLE_PICKER") {
    enablePicker(handleElementClick);
  }
  return true;
});

async function handleElementClick(e) {
  e.preventDefault();
  e.stopPropagation();

  const clickedElement = e.target;
  const selectedCode = clickedElement.textContent?.trim();

  if (!selectedCode) return;

  const cacheKey = `translation_${hashCode(selectedCode)}`;
  const originalWidth = clickedElement.getBoundingClientRect().width;
  const { targetLanguage, theme } = await chrome.storage.sync.get(["targetLanguage", "theme"]);
  const lang = targetLanguage;
  const cachedData = await getFromCache(cacheKey);

  if (cachedData && cachedData[lang]) {
    injectOrUpdateTranslations(cachedData, clickedElement, originalWidth,theme);
    return;
  }

  const loadingDiv = document.createElement("div");
  loadingDiv.className = "translator-loading";
  loadingDiv.textContent = `Translating to ${lang}...`;
  loadingDiv.style.width = `${originalWidth}px`;
  clickedElement.parentNode.insertBefore(
    loadingDiv,
    clickedElement.nextSibling
  );

  chrome.runtime.sendMessage(
    { type: "TRANSLATE_CODE", code: selectedCode },
    async (response) => {
      loadingDiv.remove();
      if (chrome.runtime.lastError || !response) {
        alert(`Error: Could not connect to the translation service.`);
        console.error(chrome.runtime.lastError?.message);
        return;
      }

      if (response.error) {
        alert(`Error: ${response.error}`);
      } else if (response.translation) {
        const cleaned = response.translation
          .replace(/```[a-z]*\n/g, "")
          .replace(/```/g, "")
          .trim();
        const newData = cachedData || {};
        newData[lang] = cleaned;
        await saveToCache(cacheKey, newData, 10);
        injectOrUpdateTranslations(newData, clickedElement, originalWidth,theme);
      }
    }
  );
}
