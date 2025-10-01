chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.type === "TRANSLATE_CODE") {
    const BACKEND_URL = process.env.BACKEND_URL;

    chrome.storage.sync.get(["targetLanguage"], (result) => {
      const targetLanguage = result.targetLanguage || "Java";
      fetch(BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: request.code,
          targetLanguage: targetLanguage,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Network response was not ok: ${response.statusText}`
            );
          }
          return response.json();
        })
        .then((data) => {
          if (data.error) {
            sendResponse({ error: data.error });
          } else {
            sendResponse({ translation: data.translation });
          }
        })
        .catch((error) => {
          console.error("Error calling backend:", error);
          sendResponse({
            error: `Failed to connect to the translation service: ${error.message}`,
          });
        });
    });

    return true;
  }
});
//Default commmand = Alt+T , Mac  = Option+T
chrome.commands.onCommand.addListener((command) => {
  if (command === "translate") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "ENABLE_PICKER" });
      }
    });
  }
});
