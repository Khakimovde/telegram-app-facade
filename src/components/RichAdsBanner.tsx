import { useEffect, useRef } from "react";

declare global {
  interface Window {
    TelegramAdsController?: {
      triggerInterstitialBanner: (immediate?: boolean) => Promise<string>;
      initialize: (opts: { pubId: string; appId: string; debug?: boolean }) => void;
    };
  }
}

/**
 * Shows RichAds banner (interstitial) every 7 seconds automatically.
 * Renders nothing visible — just triggers ads in the background.
 */
const RichAdsBanner = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Start showing banners every 7 seconds
    intervalRef.current = setInterval(() => {
      try {
        if (window.TelegramAdsController?.triggerInterstitialBanner) {
          window.TelegramAdsController.triggerInterstitialBanner(true).catch(() => {
            // Silently ignore if no ad available
          });
        }
      } catch {
        // Ignore errors
      }
    }, 7000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null;
};

export default RichAdsBanner;
