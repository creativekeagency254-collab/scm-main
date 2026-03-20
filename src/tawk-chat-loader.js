const chatFlagRaw = String(import.meta.env.VITE_ENABLE_TAWK_CHAT ?? "");
const chatFlag = chatFlagRaw.trim().toLowerCase();
const chatEnabled = chatFlag === "1" || chatFlag === "true";

let chatConsent = null;
try {
  chatConsent = localStorage.getItem("ep:chat-consent");
} catch (e) {}

const canLoadChat = chatEnabled && (chatConsent === "1" || chatConsent === "true");

if (canLoadChat) {
  const Tawk_API = window.Tawk_API || {};
  window.Tawk_API = Tawk_API;
  window.Tawk_LoadStart = new Date();
  Tawk_API.onLoad = function onLoad() {
    try { Tawk_API.hideWidget(); } catch (e) {}
  };
  Tawk_API.onChatMinimized = function onChatMinimized() {
    try { Tawk_API.hideWidget(); } catch (e) {}
  };
  (() => {
    const s1 = document.createElement("script");
    const s0 = document.getElementsByTagName("script")[0];
    if (!s0 || !s0.parentNode) return;
    s1.async = true;
    s1.src = "https://embed.tawk.to/69b323009090b01c368b958f/1jjhs1fev";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s0.parentNode.insertBefore(s1, s0);
  })();
}
