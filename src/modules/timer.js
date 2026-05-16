const DEFAULT_TOTAL_SECONDS = 60;
const ONE_SECOND_MS = 1000;
const PLAYING_STATE = "playing";

export function createTimer({ store, totalSeconds = DEFAULT_TOTAL_SECONDS, onFinish = () => {} } = {}) {
  if (!store || typeof store.setRemainingSeconds !== "function") {
    throw new TypeError("createTimer requires a store with setRemainingSeconds().");
  }

  const durationSeconds = normalizeSeconds(totalSeconds);
  let intervalId = null;
  let remainingSeconds = durationSeconds;
  let finishNotified = false;

  function canStart() {
    if (typeof store.getState !== "function") {
      return true;
    }

    return store.getState().gameState === PLAYING_STATE;
  }

  function clearTimer() {
    if (intervalId === null) {
      return false;
    }

    clearInterval(intervalId);
    intervalId = null;
    return true;
  }

  function finish() {
    if (finishNotified) {
      return;
    }

    finishNotified = true;
    clearTimer();
    onFinish();
  }

  function tick() {
    remainingSeconds = Math.max(0, remainingSeconds - 1);
    store.setRemainingSeconds(remainingSeconds);

    if (remainingSeconds === 0) {
      finish();
    }
  }

  return {
    start() {
      if (intervalId !== null || !canStart()) {
        return false;
      }

      finishNotified = false;
      remainingSeconds = durationSeconds;
      store.setRemainingSeconds(remainingSeconds);

      if (remainingSeconds === 0) {
        finish();
        return true;
      }

      intervalId = setInterval(tick, ONE_SECOND_MS);
      return true;
    },

    stop() {
      return clearTimer();
    },

    isRunning() {
      return intervalId !== null;
    }
  };
}

function normalizeSeconds(seconds) {
  return Math.max(0, Math.ceil(Number(seconds) || 0));
}
