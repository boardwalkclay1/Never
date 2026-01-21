// ble.js

window.BLE = (function () {
  let onMessageHandler = null;

  function sendToNative(action, payload) {
    const msg = JSON.stringify({ action, payload });

    // iOS
    if (window.webkit?.messageHandlers?.ble) {
      window.webkit.messageHandlers.ble.postMessage(msg);
    }

    // Android
    if (window.AndroidBle?.postMessage) {
      window.AndroidBle.postMessage(msg);
    }
  }

  return {
    startHost(roomName, mode, spice) {
      sendToNative("startHost", { roomName, mode, spice });
    },
    stopHost() {
      sendToNative("stopHost", {});
    },
    scanForHosts() {
      sendToNative("scanForHosts", {});
    },
    connectToHost(deviceId) {
      sendToNative("connectToHost", { deviceId });
    },
    send(messageObj) {
      sendToNative("send", { message: messageObj });
    },
    onMessage(handler) {
      onMessageHandler = handler;
    },
    _handleNativeMessage(jsonString) {
      try {
        const msg = JSON.parse(jsonString);
        if (onMessageHandler) onMessageHandler(msg);
      } catch (e) {
        console.error("BLE message parse error", e);
      }
    }
  };
})();

// called by native
window.onBleMessageFromNative = function (jsonString) {
  window.BLE._handleNativeMessage(jsonString);
};
