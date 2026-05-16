const TARGET_CLICK_COUNT = 800;
const CURVE_STEEPNESS = 0.0012;
const MIN_PROGRESS = 0;
const MAX_PROGRESS = 99;

export function calculateProgress(clickCount = 0) {
  const normalizedClickCount = normalizeClickCount(clickCount);

  if (normalizedClickCount === 0) {
    return MIN_PROGRESS;
  }

  if (normalizedClickCount >= TARGET_CLICK_COUNT) {
    return MAX_PROGRESS;
  }

  const scaledProgress = Math.floor(
    (MAX_PROGRESS * Math.log1p(CURVE_STEEPNESS * normalizedClickCount)) /
    Math.log1p(CURVE_STEEPNESS * TARGET_CLICK_COUNT)
  );
  return clampProgress(Math.max(1, scaledProgress));
}

export function renderProgress(progress = 0) {
  const normalizedProgress = clampProgress(progress);

  if (typeof document === "undefined") {
    return normalizedProgress;
  }

  const progressFill = document.querySelector("#progress-fill");
  const progressValue = document.querySelector("#progress-value");
  const progressBar = document.querySelector('[role="progressbar"]');

  if (progressFill) {
    progressFill.style.width = `${normalizedProgress}%`;
  }

  if (progressValue) {
    progressValue.textContent = `${normalizedProgress}%`;
  }

  if (progressBar) {
    progressBar.setAttribute("aria-valuemin", String(MIN_PROGRESS));
    progressBar.setAttribute("aria-valuemax", String(MAX_PROGRESS));
    progressBar.setAttribute("aria-valuenow", String(normalizedProgress));
  }

  return normalizedProgress;
}

function normalizeClickCount(clickCount) {
  const numericClickCount = Number(clickCount);

  if (!Number.isFinite(numericClickCount)) {
    return numericClickCount > 0 ? Infinity : 0;
  }

  return Math.max(0, Math.floor(numericClickCount));
}

function clampProgress(progress) {
  const numericProgress = Number(progress);

  if (!Number.isFinite(numericProgress)) {
    return numericProgress > 0 ? MAX_PROGRESS : MIN_PROGRESS;
  }

  return Math.max(MIN_PROGRESS, Math.min(MAX_PROGRESS, Math.floor(numericProgress)));
}
