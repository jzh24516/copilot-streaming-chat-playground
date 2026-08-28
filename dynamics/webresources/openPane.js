/*
 * Dynamics 365 web resource: mjsrc_/agent/openPane.js
 *
 * Bound to a modern command-bar button on the main form. The command must pass
 * `PrimaryControl` as its only parameter, and the function name is
 * `AgentPane.open`.
 *
 * Design notes:
 *  - one reusable pane (`paneId`) instead of a new tab per click
 *  - only non-secret record context is passed: table, record id, app id, org url
 *  - no token, agent identifier, environment id or URL is exposed here; the
 *    relay pins the agent server-side
 */
var AgentPane = (function () {
  "use strict";

  // Must be stable: Xrm reuses the pane with this id instead of stacking panes.
  var PANE_ID = "mjsrc_streamed_agent";

  // Schema name of the launcher web resource, including the publisher prefix.
  var LAUNCHER_WEB_RESOURCE = "mjsrc_/agent/launcher.html";

  var PANE_TITLE = "AI assistant";
  var DEFAULT_WIDTH = 420;

  function cleanGuid(value) {
    return (value || "").replace(/[{}]/g, "");
  }

  function buildContext(primaryControl) {
    var entity =
      primaryControl && primaryControl.data && primaryControl.data.entity
        ? primaryControl.data.entity
        : null;
    var globalContext = Xrm.Utility.getGlobalContext();

    return {
      entityName: entity ? entity.getEntityName() : "",
      recordId: entity ? cleanGuid(entity.getId()) : "",
      organizationUrl: globalContext.getClientUrl()
    };
  }

  function getAppId(globalContext) {
    // getCurrentAppProperties is not present on every host version, and a
    // missing app id must not stop the pane from opening.
    if (!globalContext.getCurrentAppProperties) {
      return Promise.resolve("");
    }
    return globalContext
      .getCurrentAppProperties()
      .then(function (properties) {
        return (properties && properties.appId) || "";
      })
      .catch(function () {
        return "";
      });
  }

  function getOrCreatePane() {
    var existing = Xrm.App.sidePanes.getPane(PANE_ID);
    if (existing) {
      return Promise.resolve(existing);
    }
    return Xrm.App.sidePanes.createPane({
      title: PANE_TITLE,
      paneId: PANE_ID,
      canClose: true,
      width: DEFAULT_WIDTH,
      // Keeps the widget's conversation and signed-in session alive while the
      // user moves between records.
      alwaysRender: true,
      hideHeader: false,
      isSelected: true
    });
  }

  /**
   * @param {*} primaryControl The form context supplied by the command.
   */
  function open(primaryControl) {
    var context = buildContext(primaryControl);

    return getAppId(Xrm.Utility.getGlobalContext())
      .then(function (appId) {
        context.appId = appId;
        return getOrCreatePane();
      })
      .then(function (pane) {
        // Re-navigating on every click is intentional: it is how the pane picks
        // up the record the user is currently looking at.
        return pane
          .navigate({
            pageType: "webresource",
            webresourceName: LAUNCHER_WEB_RESOURCE,
            data: encodeURIComponent(JSON.stringify(context))
          })
          .then(function () {
            pane.select();
          });
      })
      .catch(function (error) {
        console.error("[AgentPane] Could not open the assistant pane.", error);
        Xrm.Navigation.openAlertDialog({
          title: PANE_TITLE,
          text:
            "The assistant could not be opened. " +
            ((error && error.message) || "Please try again or contact your administrator.")
        });
      });
  }

  return { open: open };
})();
