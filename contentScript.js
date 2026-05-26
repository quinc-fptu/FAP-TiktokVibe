(() => {
  // src/content/index.ts
  var checkExtensionState = () => {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get("enabled", (data) => {
          const isEnabled = data["enabled"] === void 0 ? true : !!data["enabled"];
          resolve(isEnabled);
        });
      } catch (error) {
        console.error("Error checking extension state:", error);
        resolve(true);
      }
    });
  };
  var injectReactApp = () => {
    const eventTarget = document.querySelector('input[name="__VIEWSTATEGENERATOR"]');
    if (!eventTarget) {
      console.log("Not a FAP page, skipping injection");
      return;
    }
    try {
      const container = document.querySelector(".container");
      if (container) {
        window._data = {
          element: container,
          timestamp: Date.now(),
          title: document.title
        };
      }
      document.body.classList.add("text-foreground", "bg-background", "flex", "h-full", "text-base", "antialiased");
      document.body.innerHTML = '<div class="flex grow" id="root"></div>';
      try {
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            if (!sheet.href || !sheet.href.includes(chrome.runtime.id)) {
              sheet.disabled = true;
            }
          } catch (e) {
            sheet.disabled = true;
          }
        });
        document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
          const href = el.getAttribute("href");
          if (!href || !href.includes(chrome.runtime.id)) {
            el.remove();
          }
        });
      } catch (e) {
        console.warn("NeoFAP: Could not disable some host stylesheets", e);
      }
      document.head.innerHTML = `
        <title>NeoFAP \u2014 FPT Academic Portal</title>
        <meta charset="utf-8" />
          <link rel="icon" href="/media/app/favicon.ico" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="description" content="NeoFAP - TikTok Dark Vibe Neo-Brutalist FPT Academic Portal." />
          <meta name="keywords" content="neofap,fpt,academic-portal,neo-brutalism,chrome-extension" />
          <style>
            .dark body {
              background-color: hsl(240 10% 4%);
            }
          </style>
          <script>
            (function () {
              try {
                document.documentElement.classList.add('dark');
              } catch (e) {}
            })();
          <\/script>
      `;
      console.log("NeoFAP: React app injected successfully");
    } catch (error) {
      console.error("NeoFAP: Error injecting React app", error);
    }
  };
  var initialize = async () => {
    try {
      const isEnabled = await checkExtensionState();
      if (isEnabled) {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", injectReactApp);
        } else {
          injectReactApp();
        }
        console.log("NeoFAP: Extension is enabled");
      } else {
        console.log("NeoFAP: Extension is disabled");
      }
    } catch (error) {
      console.error("NeoFAP: Initialization error", error);
    }
  };
  initialize();
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      if (message.reload) {
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error processing message:", error);
      sendResponse({ success: false });
    }
    return true;
  });
})();
