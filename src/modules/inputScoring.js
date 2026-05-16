import { GAME_STATES } from "../state.js";

const CONTROL_SELECTOR = "[data-control]";
const DUPLICATE_EVENT_WINDOW_MS = 700;

export function createInputScoring({ targetElement, store, onValidInput } = {}) {
  if (!targetElement?.addEventListener || typeof store?.getState !== "function" || typeof onValidInput !== "function") {
    return {
      destroy() {}
    };
  }

  const removeListeners = [];
  const supportsTouchEvents = typeof window !== "undefined" && "TouchEvent" in window;
  let lastDirectInputAt = 0;

  const addListener = (type, handler, options) => {
    targetElement.addEventListener(type, handler, options);
    removeListeners.push(() => targetElement.removeEventListener(type, handler, options));
  };

  const isPlaying = () => store.getState().gameState === GAME_STATES.PLAYING;

  const isControlTarget = (target) => Boolean(target?.closest?.(CONTROL_SELECTOR));

  const submitInput = (amount, event, { preventDefault = false } = {}) => {
    if (!isPlaying() || amount <= 0) {
      return false;
    }

    lastDirectInputAt = Date.now();

    if (preventDefault && event?.cancelable) {
      event.preventDefault();
    }

    onValidInput(amount);
    return true;
  };

  const handleTouchStart = (event) => {
    const touches = Array.from(event.changedTouches ?? []);
    const validTouchCount = touches.filter((touch) => !isControlTarget(touch.target)).length;

    submitInput(validTouchCount, event, { preventDefault: true });
  };

  const handlePointerDown = (event) => {
    if (isControlTarget(event.target)) {
      return;
    }

    if (event.pointerType === "touch" && supportsTouchEvents) {
      return;
    }

    submitInput(1, event);
  };

  const handleClick = (event) => {
    if (isControlTarget(event.target)) {
      return;
    }

    if (Date.now() - lastDirectInputAt < DUPLICATE_EVENT_WINDOW_MS) {
      return;
    }

    submitInput(1, event);
  };

  addListener("touchstart", handleTouchStart, { passive: false });
  addListener("pointerdown", handlePointerDown, { passive: true });
  addListener("click", handleClick, { passive: true });

  return {
    destroy() {
      removeListeners.splice(0).forEach((removeListener) => removeListener());
    }
  };
}
