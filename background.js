(() => {
  // src/background/index.ts
  var supportedPaths = [
    "/",
    "/Default.aspx*",
    "/Thongbao.aspx*",
    "/Student.aspx*",
    "/Report/ScheduleOfWeek.aspx*",
    "/Report/Help.aspx*",
    "/Exam/ScheduleExams.aspx*",
    "/FrontOffice/SubjectFees.aspx*",
    "/Report/ViewAttendstudent.aspx*",
    "/Grade/StudentGrade.aspx*",
    "/User/Profile.aspx*",
    "/User/verProfile.aspx*",
    "/Grade/StudentTranscript.aspx*",
    "/FrontOffice/StudentCurriculum.aspx*",
    "/Report/StudentFees.aspx*",
    "/Finance/TransReport.aspx*",
    "/CmsFAP/NewsDetail.aspx*",
    "/CmsFAP/News.aspx*",
    "/CmsFAP/PlusNews.aspx*",
    "/Course/Groups.aspx*",
    "/App/AcadAppView.aspx*"
    // '/Feedback/StudentFeedBack.aspx*',
    // '/Feedback/StudentFeedback.aspx*',
    // '/Feedback/DoFeedback.aspx*',
    // '/Feedback/EditDoFeedback.aspx*',
    // '/Schedule/ActivityStudent.aspx*',
  ];
  var getMatches = async () => {
    return supportedPaths.map((path) => `*://fap.fpt.edu.vn${path}`);
  };
  var checkExtensionState = async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get("enabled", (data) => {
        const isEnabled = data["enabled"] === void 0 ? true : !!data["enabled"];
        resolve(isEnabled);
      });
    });
  };
  var registerContentScript = async () => {
    try {
      try {
        await chrome.scripting.unregisterContentScripts({
          ids: ["content"]
        });
      } catch (error) {
      }
      const matches = await getMatches();
      await chrome.scripting.registerContentScripts([{
        id: "content",
        js: ["contentScript.js"],
        matches,
        runAt: "document_start"
      }]);
      console.log("NeoFAP: Content script registered");
      return true;
    } catch (error) {
      console.error("NeoFAP: Failed to register content script", error);
      return false;
    }
  };
  var updatingPromise = null;
  var updateReactScripts = async (isEnabled) => {
    if (updatingPromise) {
      try {
        await updatingPromise;
      } catch (_) {
      }
    }
    const runUpdate = async () => {
      try {
        const registered = await chrome.scripting.getRegisteredContentScripts();
        const hasReact = registered.some((s) => s.id === "reactjs");
        if (hasReact) {
          await chrome.scripting.unregisterContentScripts({
            ids: ["reactjs"]
          });
          console.log("NeoFAP: React scripts unregistered");
        }
      } catch (error) {
        console.warn("NeoFAP: Error checking/unregistering scripts", error);
      }
      if (isEnabled) {
        try {
          const matches = await getMatches();
          const manifest = await fetch(chrome.runtime.getURL("/asset-manifest.json"));
          const assets = await manifest.json();
          const js = assets.entrypoints.filter((entry) => entry.endsWith(".js"));
          const css = assets.entrypoints.filter((entry) => entry.endsWith(".css"));
          await chrome.scripting.registerContentScripts([{
            id: "reactjs",
            js,
            css,
            matches,
            runAt: "document_end"
          }]);
          console.log("NeoFAP: React scripts registered");
        } catch (error) {
          console.error("NeoFAP: Failed to register React scripts", error);
        }
      }
      try {
        chrome.tabs.query({ url: "*://fap.fpt.edu.vn/*" }, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, { reload: true }, () => {
                void chrome.runtime.lastError;
              });
            }
          });
        });
      } catch (error) {
        console.warn("NeoFAP: Error querying tabs", error);
      }
    };
    updatingPromise = runUpdate();
    try {
      await updatingPromise;
    } finally {
      updatingPromise = null;
    }
    return true;
  };
  chrome.runtime.onInstalled.addListener(async () => {
    try {
      await registerContentScript();
      chrome.storage.local.get("enabled", async (data) => {
        const isEnabled = data["enabled"] === void 0 ? true : !!data["enabled"];
        if (data["enabled"] === void 0) {
          chrome.storage.local.set({ enabled: true });
        }
        if (isEnabled) {
          await updateReactScripts(true);
        }
      });
      console.log("NeoFAP extension installed/updated successfully");
    } catch (error) {
      console.error("NeoFAP: Failed to initialize extension", error);
    }
  });
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.enabled) {
      const isEnabled = !!changes.enabled.newValue;
      updateReactScripts(isEnabled);
    }
  });
  chrome.runtime.onStartup.addListener(async () => {
    const isEnabled = await checkExtensionState();
    await registerContentScript();
    if (isEnabled) {
      await updateReactScripts(true);
    }
  });
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    try {
      if (request.type === "SIGN_IN") {
        chrome.identity.getAuthToken({ interactive: true }, function(token) {
          sendResponse({ token, success: true });
        });
        return true;
      } else if (request.type === "GET_STATE") {
        chrome.storage.local.get("enabled", (data) => {
          const isEnabled = data["enabled"] === void 0 ? true : !!data["enabled"];
          sendResponse({ enabled: isEnabled, success: true });
        });
        return true;
      }
      sendResponse({ success: false, message: "Unknown message type" });
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, message: "Error handling message" });
    }
    return true;
  });
})();
