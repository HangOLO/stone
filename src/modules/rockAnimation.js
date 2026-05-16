const SHAKE_CLASS = "is-shaking";

export function createRockAnimation({ rockElement } = {}) {
  const hasRockElement = Boolean(rockElement?.classList);

  if (hasRockElement) {
    rockElement.addEventListener("animationend", (event) => {
      if (event.target === rockElement) {
        rockElement.classList.remove(SHAKE_CLASS);
      }
    });
  }

  return {
    shake() {
      if (!hasRockElement) {
        return false;
      }

      rockElement.classList.remove(SHAKE_CLASS);
      void rockElement.offsetWidth;
      rockElement.classList.add(SHAKE_CLASS);
      return true;
    }
  };
}
