import { useEffect } from "react";
import { KOFI_USERNAME } from "@/lib/constants";

declare global {
  interface Window {
    kofiWidgetOverlay?: {
      draw: (username: string, options: Record<string, unknown>) => void;
    };
  }
}

const KofiWidget = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
    script.async = true;
    script.onload = () => {
      if (window.kofiWidgetOverlay) {
        window.kofiWidgetOverlay.draw(KOFI_USERNAME, {
          type: "floating-chat",
          "floating-chat.donateButton.text": "Support Us",
          "floating-chat.donateButton.background-color": "#5865F2",
          "floating-chat.donateButton.text-color": "#fff",
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
      document.getElementById("kofi-widget-overlay")?.remove();
    };
  }, []);

  return null;
};

export default KofiWidget;
