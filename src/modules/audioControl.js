import { GAME_STATES } from "../state.js";

const AUDIO_ASSET_KEYS = Object.freeze({
  background: ["backgroundMusic", "backgroundAudio", "bgm", "music", "background"],
  click: ["clickSound", "clickAudio", "clickEffect", "clickSfx", "sfxClick", "click"]
});

const MASTER_VOLUME = 0.82;
const BACKGROUND_VOLUME = 0.032;
const CLICK_VOLUME = 0.075;
const CLICK_DURATION_SECONDS = 0.055;
const RELEASE_SECONDS = 0.05;

export function createAudioControl({ store, manifest } = {}) {
  const AudioContextConstructor = getAudioContextConstructor();
  const resourceRefs = {
    background: resolveAudioResource(manifest, AUDIO_ASSET_KEYS.background),
    click: resolveAudioResource(manifest, AUDIO_ASSET_KEYS.click)
  };

  let audioContext = null;
  let masterGain = null;
  let backgroundNodes = null;
  let backgroundAudio = null;
  let startedFromUserGesture = false;
  let backgroundRequested = false;
  let muted = Boolean(readStoreState().muted);

  return {
    async startFromUserGesture() {
      startedFromUserGesture = true;
      backgroundRequested = true;

      ensureAudioGraph();

      muted = Boolean(readStoreState().muted);
      applyMutedState();

      if (!muted && isPlaying()) {
        startBackground();
      }

      await resumeAudioContext();

      return true;
    },
    playClick() {
      if (!canPlaySoundEffect()) {
        return false;
      }

      playClickPlaceholder();
      return true;
    },
    setMuted(nextMuted) {
      muted = Boolean(nextMuted);
      syncStoreMutedState();
      applyMutedState();

      if (muted) {
        stopBackground();
        return muted;
      }

      if (startedFromUserGesture && backgroundRequested && isPlaying()) {
        startBackground();
      }

      return muted;
    },
    stopBackground() {
      backgroundRequested = false;
      stopBackground();
    },
    getResourceReferences() {
      return { ...resourceRefs };
    }
  };

  function ensureAudioGraph() {
    if (audioContext?.state === "closed") {
      audioContext = null;
      masterGain = null;
      backgroundNodes = null;
    }

    if (audioContext && masterGain) {
      return true;
    }

    if (!AudioContextConstructor) {
      return false;
    }

    try {
      audioContext = new AudioContextConstructor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = muted ? 0 : MASTER_VOLUME;
      masterGain.connect(audioContext.destination);
      return true;
    } catch {
      audioContext = null;
      masterGain = null;
      backgroundNodes = null;
      return false;
    }
  }

  async function resumeAudioContext() {
    if (!audioContext || audioContext.state !== "suspended") {
      return;
    }

    try {
      await audioContext.resume();
    } catch {
      // iPad Safari can reject resume calls outside a usable gesture. Keep the game flow alive.
    }
  }

  function startBackgroundPlaceholder() {
    if (backgroundNodes || !audioContext || !masterGain || muted) {
      return;
    }

    const now = audioContext.currentTime;
    const drone = audioContext.createOscillator();
    const harmony = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    const backgroundGain = audioContext.createGain();

    drone.type = "sine";
    drone.frequency.value = 146.83;
    harmony.type = "triangle";
    harmony.frequency.value = 220;
    lfo.type = "sine";
    lfo.frequency.value = 0.18;
    lfoGain.gain.value = 0.006;

    backgroundGain.gain.setValueAtTime(0, now);
    backgroundGain.gain.linearRampToValueAtTime(BACKGROUND_VOLUME, now + 0.35);

    lfo.connect(lfoGain);
    lfoGain.connect(backgroundGain.gain);
    drone.connect(backgroundGain);
    harmony.connect(backgroundGain);
    backgroundGain.connect(masterGain);

    drone.start(now);
    harmony.start(now);
    lfo.start(now);

    backgroundNodes = {
      oscillators: [drone, harmony, lfo],
      gain: backgroundGain
    };
  }

  function stopBackgroundPlaceholder() {
    if (!backgroundNodes || !audioContext) {
      backgroundNodes = null;
      return;
    }

    const nodesToStop = backgroundNodes;
    backgroundNodes = null;

    try {
      const now = audioContext.currentTime;
      nodesToStop.gain.gain.cancelScheduledValues(now);
      nodesToStop.gain.gain.setTargetAtTime(0.0001, now, 0.012);
      nodesToStop.oscillators.forEach((oscillator) => oscillator.stop(now + RELEASE_SECONDS));
      nodesToStop.oscillators.forEach((oscillator) => {
        oscillator.onended = () => disconnectNode(oscillator);
      });
      globalThis.setTimeout?.(() => disconnectNode(nodesToStop.gain), (RELEASE_SECONDS + 0.03) * 1000);
    } catch {
      nodesToStop.oscillators.forEach(disconnectNode);
      disconnectNode(nodesToStop.gain);
    }
  }

  function startBackground() {
    if (startBackgroundMedia()) {
      stopBackgroundPlaceholder();
      return;
    }

    startBackgroundPlaceholder();
  }

  function stopBackground() {
    stopBackgroundMedia();
    stopBackgroundPlaceholder();
  }

  function startBackgroundMedia() {
    const source = resourceRefs.background?.source;

    if (!source || typeof Audio === "undefined") {
      return false;
    }

    if (!backgroundAudio) {
      backgroundAudio = new Audio(source);
      backgroundAudio.loop = true;
      backgroundAudio.preload = "auto";
      backgroundAudio.volume = BACKGROUND_VOLUME;
    }

    backgroundAudio.muted = muted;

    if (muted) {
      return true;
    }

    const playPromise = backgroundAudio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        startBackgroundPlaceholder();
      });
    }

    return true;
  }

  function stopBackgroundMedia() {
    if (!backgroundAudio) {
      return;
    }

    try {
      backgroundAudio.pause();
    } catch {
      // Media pause failures should not interrupt gameplay.
    }
  }

  function canPlaySoundEffect() {
    if (muted || !startedFromUserGesture || !isPlaying()) {
      return false;
    }

    if (!ensureAudioGraph()) {
      return false;
    }

    void resumeAudioContext();
    return audioContext?.state !== "closed";
  }

  function playClickPlaceholder() {
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const clickGain = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(760, now);
    oscillator.frequency.exponentialRampToValueAtTime(220, now + CLICK_DURATION_SECONDS);

    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(CLICK_VOLUME, now + 0.006);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + CLICK_DURATION_SECONDS);

    oscillator.connect(clickGain);
    clickGain.connect(masterGain);

    oscillator.start(now);
    oscillator.stop(now + CLICK_DURATION_SECONDS + 0.01);
    oscillator.onended = () => {
      disconnectNode(oscillator);
      disconnectNode(clickGain);
    };
  }

  function applyMutedState() {
    if (!masterGain || !audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, now, 0.01);
  }

  function syncStoreMutedState() {
    if (typeof store?.setMuted !== "function") {
      return;
    }

    const state = readStoreState();
    if (Boolean(state.muted) !== muted) {
      store.setMuted(muted);
    }
  }

  function isPlaying() {
    return readStoreState().gameState === GAME_STATES.PLAYING;
  }

  function readStoreState() {
    if (typeof store?.getState !== "function") {
      return {};
    }

    try {
      return store.getState() ?? {};
    } catch {
      return {};
    }
  }
}

function getAudioContextConstructor() {
  return globalThis.AudioContext ?? globalThis.webkitAudioContext ?? null;
}

function resolveAudioResource(manifest, keys) {
  if (!manifest || typeof manifest !== "object") {
    return null;
  }

  const containers = [manifest, manifest.audio].filter((value) => value && typeof value === "object");

  for (const container of containers) {
    for (const key of keys) {
      const source = normalizeAssetSource(container[key]);
      if (source) {
        return { key, source };
      }
    }
  }

  return null;
}

function normalizeAssetSource(value) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  if (value.official?.provided && value.official.path) {
    return value.official.path;
  }

  return value.src ?? value.url ?? value.path ?? value.href ?? null;
}

function disconnectNode(node) {
  try {
    node?.disconnect?.();
  } catch {
    // Already disconnected nodes should not affect gameplay.
  }
}
