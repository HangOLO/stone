import { createGameStore } from "./state.js";
import { createScreenScene } from "./modules/screenScene.js";
import { createInputScoring } from "./modules/inputScoring.js";
import { createTimer } from "./modules/timer.js";
import { calculateProgress, renderProgress } from "./modules/progressBar.js";
import { createRockAnimation } from "./modules/rockAnimation.js";
import { createAudioControl } from "./modules/audioControl.js";
import { ASSET_MANIFEST, reportMissingAssets } from "./modules/assetManagement.js";
import { applyDeploymentAdaptation } from "./modules/deploymentAdaptation.js";

const REQUIRED_GUIDANCE = [
  "30秒內怎樣點也推不到100%。",
  "若我們都推不開，當時婦女更不可能移開封墓巨石。",
  "真正問題是：墓為何空了？"
].join("\n");

const store = createGameStore();
const scene = createScreenScene({
  store,
  guidanceText: REQUIRED_GUIDANCE,
  onStart: () => startGame(),
  onToggleMute: () => {
    const muted = store.toggleMuted();
    audio.setMuted(muted);
  }
});

const rock = createRockAnimation({
  rockElement: document.querySelector("#rock")
});

const audio = createAudioControl({
  store,
  manifest: ASSET_MANIFEST
});

const timer = createTimer({
  store,
  totalSeconds: 30,
  onFinish: () => endGame()
});

createInputScoring({
  targetElement: document.querySelector("#game-input-area"),
  store,
  onValidInput: (amount) => {
    const state = store.addClicks(amount);
    const progress = calculateProgress(state.clickCount);
    store.setProgress(progress);
    renderProgress(progress);
    rock.shake();
    audio.playClick();
  }
});

store.subscribe((state) => {
  scene.render(state);
  renderProgress(state.progressPercent);
});

applyDeploymentAdaptation();
reportMissingAssets();
scene.render(store.getState());
renderProgress(0);

async function startGame() {
  if (!store.startGame()) {
    return;
  }

  const initialState = store.getState();
  renderProgress(initialState.progressPercent);
  scene.render(initialState);
  await audio.startFromUserGesture();
  timer.start();
}

function endGame() {
  if (!store.endGame()) {
    return;
  }

  timer.stop();
  audio.stopBackground();
  scene.render(store.getState());
}

window.__emptyTombGame = {
  store,
  calculateProgress,
  endGame
};
