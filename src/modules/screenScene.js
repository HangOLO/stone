const GAME_STATES = Object.freeze({
  IDLE: "idle",
  PLAYING: "playing",
  ENDED: "ended"
});

const MUTED_LABEL = "音效關閉";
const UNMUTED_LABEL = "音效開啟";

export function createScreenScene({
  store,
  guidanceText = "",
  onStart = () => {},
  onToggleMute = () => {}
} = {}) {
  const elements = {
    app: queryRequired("#app"),
    startScreen: queryRequired("#start-screen"),
    gameScreen: queryRequired("#game-screen"),
    startButton: queryRequired("#start-button"),
    muteButton: queryRequired("#mute-button"),
    muteIcon: queryRequired("#mute-icon"),
    timeValue: queryRequired("#time-value"),
    tapHint: queryRequired("#tap-hint"),
    endOverlay: queryRequired("#end-overlay"),
    finalClicks: queryRequired("#final-clicks"),
    teachingText: queryRequired(".teaching-text")
  };

  if (typeof guidanceText === "string" && guidanceText.length > 0) {
    elements.teachingText.textContent = guidanceText;
  }

  const stopControlPropagation = (event) => {
    event.stopPropagation();
  };

  const handleStart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onStart(event);
    renderFromStore();
  };

  const handleToggleMute = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleMute(event);
    renderFromStore();
  };

  elements.startButton.addEventListener("click", handleStart);
  elements.muteButton.addEventListener("click", handleToggleMute);
  elements.muteButton.addEventListener("pointerdown", stopControlPropagation);
  elements.muteButton.addEventListener("touchstart", stopControlPropagation);

  return {
    render,
    destroy() {
      elements.startButton.removeEventListener("click", handleStart);
      elements.muteButton.removeEventListener("click", handleToggleMute);
      elements.muteButton.removeEventListener("pointerdown", stopControlPropagation);
      elements.muteButton.removeEventListener("touchstart", stopControlPropagation);
    }
  };

  function renderFromStore() {
    if (store && typeof store.getState === "function") {
      render(store.getState());
    }
  }

  function render(state = {}) {
    const gameState = normalizeGameState(state.gameState);
    const isIdle = gameState === GAME_STATES.IDLE;
    const isPlaying = gameState === GAME_STATES.PLAYING;
    const isEnded = gameState === GAME_STATES.ENDED;

    elements.app.setAttribute("data-state", gameState);
    setScreenVisible(elements.startScreen, isIdle);
    setScreenVisible(elements.gameScreen, isPlaying || isEnded);
    setOverlayVisible(elements.endOverlay, isEnded);

    elements.timeValue.textContent = String(toNonNegativeInteger(state.remainingSeconds, 30));
    elements.finalClicks.textContent = String(toNonNegativeInteger(state.clickCount, 0));
    renderTapHint(isPlaying, toNonNegativeInteger(state.clickCount, 0));
    renderMuteState(Boolean(state.muted));
  }

  function renderTapHint(isPlaying, clickCount) {
    const shouldShow = isPlaying && clickCount < 5;
    elements.tapHint.classList.toggle("is-visible", shouldShow);
    elements.tapHint.classList.toggle("is-faded", isPlaying && clickCount >= 5);
    elements.tapHint.setAttribute("aria-hidden", shouldShow ? "false" : "true");
  }

  function renderMuteState(muted) {
    const label = muted ? MUTED_LABEL : UNMUTED_LABEL;
    elements.muteButton.setAttribute("aria-pressed", muted ? "true" : "false");
    elements.muteButton.setAttribute("aria-label", label);
    elements.muteButton.title = label;
    elements.muteIcon.textContent = muted ? "靜" : "音";
  }
}

function queryRequired(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Missing screen scene element: ${selector}`);
  }

  return element;
}

function normalizeGameState(gameState) {
  if (gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.ENDED) {
    return gameState;
  }

  return GAME_STATES.IDLE;
}

function setScreenVisible(element, visible) {
  if (visible) {
    element.removeAttribute("aria-hidden");
    return;
  }

  element.setAttribute("aria-hidden", "true");
}

function setOverlayVisible(element, visible) {
  element.hidden = !visible;

  if (visible) {
    element.removeAttribute("aria-hidden");
    return;
  }

  element.setAttribute("aria-hidden", "true");
}

function toNonNegativeInteger(value, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(0, Math.floor(numericValue));
}
