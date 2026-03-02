import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Adsgram?: {
      init(params: { blockId: string; debug?: boolean }): {
        show(): Promise<{ done: boolean; description: string; state: string; error: boolean }>;
        destroy(): void;
      };
    };
  }
}

const AdsgramInterstitial = () => {
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;

    const timer = setTimeout(() => {
      try {
        if (window.Adsgram) {
          const adController = window.Adsgram.init({ blockId: "int-24092" });
          adController.show().then((result) => {
            console.log("Adsgram interstitial result:", result);
          }).catch((err) => {
            console.log("Adsgram interstitial dismissed or error:", err);
          });
        }
      } catch (e) {
        console.log("Adsgram not available:", e);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return null;
};

export default AdsgramInterstitial;