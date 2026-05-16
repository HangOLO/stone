const GITHUB_PAGES_PATH_NOTE = "Relative to index.html so the game can run from a GitHub Pages subpath.";

const BACKGROUND_RESTRICTIONS = Object.freeze([
  "No people or character figures.",
  "No UI, logo, title, button, HUD, hand pointer, or text baked into the image.",
  "No front rolling stone baked into the background; the stone is a separate sprite."
]);

const UI_RESTRICTIONS = Object.freeze([
  "No baked text, letters, numbers, labels, or watermarks.",
  "Transparent PNG runtime asset generated from magenta-background source art."
]);

function officialImage(path, note) {
  return Object.freeze({
    path,
    provided: true,
    note
  });
}

function generatedImageAsset({ id, purpose, path, note, restrictions = UI_RESTRICTIONS }) {
  return Object.freeze({
    id,
    kind: "image",
    purpose,
    official: officialImage(path, note),
    placeholder: Object.freeze({
      strategy: "none",
      source: "generated asset",
      note: "Production image is present in assets/images."
    }),
    restrictions
  });
}

function userProvidedImageAsset({ id, purpose, path, note, restrictions = [] }) {
  return Object.freeze({
    id,
    kind: "image",
    purpose,
    official: officialImage(path, note),
    placeholder: Object.freeze({
      strategy: "none",
      source: "user-provided asset",
      note: "Production image is present in assets/images."
    }),
    restrictions
  });
}

export const ASSET_MANIFEST = Object.freeze({
  version: 2,
  pathPolicy: Object.freeze({
    root: "./assets",
    githubPagesSafe: true,
    note: GITHUB_PAGES_PATH_NOTE
  }),
  images: Object.freeze({
    startScreenTitleArt: userProvidedImageAsset({
      id: "start-screen-title-art",
      purpose: "Static start screen title art with baked title and button visuals.",
      path: "./assets/images/start-screen-title-art.png",
      note: "User-provided concept image copied into the project; only the transparent HTML start button overlay is interactive.",
      restrictions: Object.freeze([
        "Contains baked title and button visuals by design.",
        "Do not bind pointer events to the background, title, tomb, or stone."
      ])
    }),
    emptyTombBackground: generatedImageAsset({
      id: "empty-tomb-background",
      purpose: "Clean empty tomb background shared by the start and game screens.",
      path: "./assets/images/empty-tomb-background.png",
      note: "Generated clean HD empty tomb background, normalized to 1536x1152.",
      restrictions: BACKGROUND_RESTRICTIONS
    }),
    tombFrontStone: generatedImageAsset({
      id: "tomb-front-stone",
      purpose: "Large clickable rolling stone in front of the tomb entrance.",
      path: "./assets/images/tomb-front-stone.png",
      note: "Generated transparent stone sprite extracted from the UI core sheet."
    }),
    tapHand: generatedImageAsset({
      id: "tap-hand",
      purpose: "Tutorial tap hand pointer.",
      path: "./assets/images/tap-hand.png",
      note: "Generated transparent tap hand sprite extracted from the UI core sheet."
    }),
    tapRingFx: generatedImageAsset({
      id: "tap-ring-fx",
      purpose: "Tutorial tap glow ring effect.",
      path: "./assets/images/tap-ring-fx.png",
      note: "Generated transparent tap ring effect extracted from the UI core sheet."
    }),
    startButtonFrame: generatedImageAsset({
      id: "start-button-frame",
      purpose: "Text-free glossy start button frame.",
      path: "./assets/images/start-button-frame.png",
      note: "Generated transparent button frame; button text remains HTML."
    }),
    hudCountdownPanel: generatedImageAsset({
      id: "hud-countdown-panel",
      purpose: "Text-free countdown HUD panel.",
      path: "./assets/images/hud-countdown-panel.png",
      note: "Generated transparent countdown panel; labels and numbers remain HTML."
    }),
    hudProgressPanel: generatedImageAsset({
      id: "hud-progress-panel",
      purpose: "Text-free progress HUD frame.",
      path: "./assets/images/hud-progress-panel.png",
      note: "Generated transparent progress panel; labels, value, and fill remain HTML/CSS."
    }),
    laurelSprig: generatedImageAsset({
      id: "laurel-sprig",
      purpose: "Gold laurel decoration for the title.",
      path: "./assets/images/laurel-sprig.png",
      note: "Generated transparent laurel sprig extracted from the UI core sheet."
    }),
    sparkle: generatedImageAsset({
      id: "sparkle",
      purpose: "Gold sparkle decoration.",
      path: "./assets/images/sparkle.png",
      note: "Generated transparent sparkle decoration."
    }),
    ribbonBanner: generatedImageAsset({
      id: "ribbon-banner",
      purpose: "Text-free red ribbon decoration available for title treatment.",
      path: "./assets/images/ribbon-banner.png",
      note: "Generated transparent ribbon banner decoration."
    })
  }),
  audio: Object.freeze({
    backgroundMusic: Object.freeze({
      id: "background-music",
      kind: "audio",
      purpose: "Looping background music during play.",
      official: Object.freeze({
        path: "./assets/audio/desert-bgm.mp3",
        provided: true,
        note: "User-provided desert bgm.mp3 has been copied into the project as desert-bgm.mp3."
      }),
      placeholder: Object.freeze({
        strategy: "web-audio",
        source: "Web Audio API",
        note: "Generated audio placeholder is only used if the browser cannot load the MP3."
      })
    }),
    clickEffect: Object.freeze({
      id: "click-effect",
      kind: "audio",
      purpose: "Short feedback sound for valid tapping/clicking.",
      official: Object.freeze({
        path: "./assets/audio/click-effect.mp3",
        provided: false,
        note: "Official click sound effect has not been provided."
      }),
      placeholder: Object.freeze({
        strategy: "web-audio",
        source: "Web Audio API",
        note: "Generated audio placeholder is used until the official click effect is supplied."
      })
    })
  })
});

export function reportMissingAssets({ log = true } = {}) {
  const missingAssets = listMissingOfficialAssets(ASSET_MANIFEST);

  if (log && missingAssets.length > 0 && typeof console !== "undefined") {
    console.warn(
      "[assetManagement] Official assets are missing; fallbacks are active where available.",
      missingAssets
    );
  }

  return missingAssets;
}

function listMissingOfficialAssets(manifest) {
  return ["images", "audio"].flatMap((sectionName) => {
    const section = manifest[sectionName] || {};

    return Object.values(section)
      .filter((asset) => asset.official && asset.official.provided === false)
      .map((asset) => ({
        id: asset.id,
        kind: asset.kind,
        purpose: asset.purpose,
        expectedPath: asset.official.path,
        provided: asset.official.provided,
        missingReason: asset.official.note,
        placeholderStrategy: asset.placeholder.strategy,
        placeholderSource: asset.placeholder.source,
        placeholderNote: asset.placeholder.note,
        githubPagesSafePath: ASSET_MANIFEST.pathPolicy.githubPagesSafe,
        restrictions: asset.restrictions || []
      }));
  });
}
