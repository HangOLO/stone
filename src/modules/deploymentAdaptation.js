const LANDSCAPE_CLASS = "is-landscape";
const PORTRAIT_CLASS = "is-portrait";

export function applyDeploymentAdaptation() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      destroy() {}
    };
  }

  const root = document.documentElement;
  const body = document.body;

  const updateViewport = () => {
    const viewportHeight = window.visualViewport?.height || window.innerHeight || root.clientHeight;
    const viewportWidth = window.visualViewport?.width || window.innerWidth || root.clientWidth;
    root.style.setProperty("--app-height", `${Math.max(1, Math.round(viewportHeight))}px`);
    root.style.setProperty("--app-width", `${Math.max(1, Math.round(viewportWidth))}px`);

    const isLandscape = viewportWidth >= viewportHeight;
    body.classList.toggle(LANDSCAPE_CLASS, isLandscape);
    body.classList.toggle(PORTRAIT_CLASS, !isLandscape);
    body.dataset.orientation = isLandscape ? "landscape" : "portrait";
  };

  updateViewport();
  window.addEventListener("resize", updateViewport, { passive: true });
  window.addEventListener("orientationchange", updateViewport, { passive: true });
  window.visualViewport?.addEventListener("resize", updateViewport, { passive: true });

  return {
    destroy() {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
    }
  };
}
