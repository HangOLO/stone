export const GAME_STATES = Object.freeze({
  IDLE: "idle",
  PLAYING: "playing",
  ENDED: "ended"
});

const STARTING_SECONDS = 30;
const MAX_PROGRESS_PERCENT = 99;
const VALID_GAME_STATES = new Set(Object.values(GAME_STATES));

const DEFAULT_STATE = Object.freeze({
  gameState: GAME_STATES.IDLE,
  muted: false,
  remainingSeconds: STARTING_SECONDS,
  clickCount: 0,
  progressPercent: 0
});

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toNonNegativeInteger = (value) => Math.max(0, Math.floor(toFiniteNumber(value)));

const toRemainingSeconds = (value) => Math.max(0, Math.ceil(toFiniteNumber(value)));

const toProgressPercent = (value) => {
  return Math.max(0, Math.min(MAX_PROGRESS_PERCENT, Math.floor(toFiniteNumber(value))));
};

const isValidGameState = (gameState) => VALID_GAME_STATES.has(gameState);

const normalizeInitialState = (initialState) => {
  const overrides = initialState && typeof initialState === "object" ? initialState : {};
  const gameState = isValidGameState(overrides.gameState)
    ? overrides.gameState
    : DEFAULT_STATE.gameState;

  return {
    gameState,
    muted: Boolean(overrides.muted ?? DEFAULT_STATE.muted),
    remainingSeconds: gameState === GAME_STATES.ENDED
      ? 0
      : toRemainingSeconds(overrides.remainingSeconds ?? DEFAULT_STATE.remainingSeconds),
    clickCount: toNonNegativeInteger(overrides.clickCount ?? DEFAULT_STATE.clickCount),
    progressPercent: toProgressPercent(overrides.progressPercent ?? DEFAULT_STATE.progressPercent)
  };
};

export function createGameStore(initialState = {}) {
  let state = normalizeInitialState(initialState);
  const listeners = new Set();

  const emit = () => {
    const snapshot = getState();
    listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  };

  const patch = (updates) => {
    const nextState = {
      ...state,
      ...updates
    };

    const hasChanged = Object.keys(updates).some((key) => !Object.is(state[key], nextState[key]));
    if (!hasChanged) {
      return getState();
    }

    state = nextState;
    return emit();
  };

  const getState = () => ({ ...state });
  const canAcceptScoring = () => {
    return state.gameState === GAME_STATES.PLAYING && state.remainingSeconds > 0;
  };

  return {
    getState,
    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Game store subscriber must be a function.");
      }

      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    startGame() {
      if (state.gameState !== GAME_STATES.IDLE) {
        return false;
      }

      patch({
        gameState: GAME_STATES.PLAYING,
        remainingSeconds: STARTING_SECONDS,
        clickCount: 0,
        progressPercent: 0
      });
      return true;
    },
    endGame() {
      if (state.gameState !== GAME_STATES.PLAYING) {
        return false;
      }

      patch({
        gameState: GAME_STATES.ENDED,
        remainingSeconds: 0
      });
      return true;
    },
    setRemainingSeconds(seconds) {
      if (state.gameState !== GAME_STATES.PLAYING) {
        return getState();
      }

      const remainingSeconds = Math.min(state.remainingSeconds, toRemainingSeconds(seconds));
      return patch({ remainingSeconds });
    },
    addClicks(amount = 1) {
      if (!canAcceptScoring()) {
        return getState();
      }

      const clickIncrement = toNonNegativeInteger(amount);
      if (clickIncrement === 0) {
        return getState();
      }

      return patch({
        clickCount: state.clickCount + clickIncrement
      });
    },
    setProgress(progressPercent) {
      if (!canAcceptScoring()) {
        return getState();
      }

      const nextProgress = Math.max(state.progressPercent, toProgressPercent(progressPercent));
      return patch({ progressPercent: nextProgress });
    },
    setMuted(muted) {
      return patch({ muted: Boolean(muted) });
    },
    toggleMuted() {
      patch({ muted: !state.muted });
      return state.muted;
    }
  };
}
