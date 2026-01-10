import { ANNOTATIONS } from "./annotation.mjs";
import { OrbitControls } from "./camera-controls.mjs";

// Set your own splat file here.
const SPLAT_URL = "/assets/splats/scene.ply";
const DEFAULT_CAMERA = {
  position: [2.8, 1.7, 4.2],
  target: [0, 1.1, 0]
};

const viewerPanel = document.getElementById("splatPanel");
const viewport = document.getElementById("splatViewport");
const infoToggle = document.getElementById("splatInfoToggle");
const infoOverlay = document.getElementById("splatInfoOverlay");
const infoClose = document.getElementById("splatInfoClose");
const infoTitle = document.getElementById("splatInfoTitle");
const infoContent = document.getElementById("splatInfoContent");
const annoToggle = document.getElementById("splatAnnoToggle");
const statusEl = document.getElementById("splatStatus");
const placeholderEl = document.getElementById("splatPlaceholder");

let appEl = null;
let app = null;
let controls = null;
let updateHandler = null;
let markers = [];
let activeAnnotation = null;
let initialized = false;
let observer = null;

const setStatus = (message) => {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.hidden = !message;
};

const openInfo = (annotation) => {
  if (!annotation || !infoOverlay || !infoTitle || !infoContent || !infoToggle) return;
  activeAnnotation = annotation;
  infoTitle.textContent = annotation.title || "Annotation";
  infoContent.innerHTML = annotation.html || "";
  infoOverlay.classList.add("is-open");
  infoOverlay.setAttribute("aria-hidden", "false");
  infoToggle.setAttribute("aria-expanded", "true");
};

const closeInfo = () => {
  if (!infoOverlay || !infoToggle) return;
  infoOverlay.classList.remove("is-open");
  infoOverlay.setAttribute("aria-hidden", "true");
  infoToggle.setAttribute("aria-expanded", "false");
};

const setAnnotationsVisible = (visible) => {
  markers.forEach((marker) => {
    marker.setAttribute("enabled", visible ? "true" : "false");
    marker.enabled = visible;
  });
};

const createMarker = (annotation) => {
  if (!appEl) return null;
  const pos = Array.isArray(annotation.pos) ? annotation.pos : [0, 0, 0];
  const marker = document.createElement("pc-entity");
  marker.setAttribute("name", `annotation-${annotation.id}`);
  marker.setAttribute("position", pos.join(" "));
  marker.setAttribute("scale", "0.14 0.14 0.14");
  marker.setAttribute("tags", "annotation");

  const render = document.createElement("pc-render");
  render.setAttribute("type", "sphere");
  render.setAttribute("material", "annotation-mat");
  marker.appendChild(render);

  marker.addEventListener("pointerdown", () => {
    openInfo(annotation);
    if (annotation.cameraPos && controls) {
      controls.moveTo(annotation.cameraPos, pos, 900);
    }
  });

  appEl.appendChild(marker);
  return marker;
};

const initViewer = async () => {
  if (initialized || !viewport) return;
  initialized = true;

  appEl = document.createElement("pc-app");
  appEl.className = "splat-app";
  appEl.setAttribute("antialias", "true");
  appEl.setAttribute("high-resolution", "true");
  viewport.appendChild(appEl);

  const splatAsset = document.createElement("pc-asset");
  splatAsset.id = "splat-asset";
  splatAsset.setAttribute("src", SPLAT_URL);
  splatAsset.setAttribute("type", "gsplat");
  splatAsset.setAttribute("preload", "");
  appEl.appendChild(splatAsset);

  const markerMaterial = document.createElement("pc-material");
  markerMaterial.id = "annotation-mat";
  markerMaterial.setAttribute("diffuse", "#f5c542");
  appEl.appendChild(markerMaterial);

  const cameraEntity = document.createElement("pc-entity");
  cameraEntity.setAttribute("name", "camera");
  cameraEntity.setAttribute("position", DEFAULT_CAMERA.position.join(" "));
  const camera = document.createElement("pc-camera");
  camera.setAttribute("fov", "55");
  camera.setAttribute("near-clip", "0.02");
  camera.setAttribute("far-clip", "250");
  cameraEntity.appendChild(camera);
  appEl.appendChild(cameraEntity);

  const keyLight = document.createElement("pc-entity");
  keyLight.setAttribute("name", "key-light");
  keyLight.setAttribute("rotation", "-35 45 0");
  const keyLightComp = document.createElement("pc-light");
  keyLightComp.setAttribute("type", "directional");
  keyLightComp.setAttribute("intensity", "1.3");
  keyLightComp.setAttribute("color", "#ffffff");
  keyLight.appendChild(keyLightComp);
  appEl.appendChild(keyLight);

  const fillLight = document.createElement("pc-entity");
  fillLight.setAttribute("name", "fill-light");
  fillLight.setAttribute("rotation", "25 -120 0");
  const fillLightComp = document.createElement("pc-light");
  fillLightComp.setAttribute("type", "directional");
  fillLightComp.setAttribute("intensity", "0.6");
  fillLightComp.setAttribute("color", "#dfe7ff");
  fillLight.appendChild(fillLightComp);
  appEl.appendChild(fillLight);

  const splatEntity = document.createElement("pc-entity");
  splatEntity.setAttribute("name", "splat");
  const splatComp = document.createElement("pc-splat");
  splatComp.setAttribute("asset", "splat-asset");
  splatEntity.appendChild(splatComp);
  appEl.appendChild(splatEntity);

  await appEl.ready();
  await cameraEntity.ready();
  app = appEl.app;

  if (placeholderEl) {
    placeholderEl.hidden = true;
  }

  const asset = splatAsset.asset;
  if (!asset) {
    setStatus(`Missing splat file: ${SPLAT_URL}`);
  } else if (asset.loaded) {
    setStatus("");
  } else {
    const failTimer = window.setTimeout(() => {
      setStatus(`Missing splat file: ${SPLAT_URL}`);
    }, 2500);
    asset.once("load", () => {
      window.clearTimeout(failTimer);
      setStatus("");
    });
    asset.once("error", () => {
      window.clearTimeout(failTimer);
      setStatus(`Missing splat file: ${SPLAT_URL}`);
    });
  }

  controls = new OrbitControls(app, cameraEntity.entity, {
    target: DEFAULT_CAMERA.target
  });
  controls.attach(app.graphicsDevice.canvas);
  updateHandler = () => controls.update();
  app.on("update", updateHandler);
  controls.update();

  markers = ANNOTATIONS.map(createMarker).filter(Boolean);
  setAnnotationsVisible(annoToggle ? annoToggle.checked : true);
};

const startObserver = () => {
  if (!viewerPanel) return;
  if (!("IntersectionObserver" in window)) {
    initViewer();
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          initViewer();
          if (observer) observer.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );
  observer.observe(viewerPanel);
};

const cleanup = () => {
  if (observer) observer.disconnect();
  observer = null;

  if (app && updateHandler) {
    app.off("update", updateHandler);
  }
  updateHandler = null;

  if (controls) {
    controls.destroy();
  }
  controls = null;

  if (appEl && appEl.parentElement) {
    appEl.parentElement.removeChild(appEl);
  }
  appEl = null;
  app = null;
  markers = [];
};

if (infoToggle) {
  infoToggle.addEventListener("click", () => {
    if (!infoOverlay) return;
    const isOpen = infoOverlay.classList.contains("is-open");
    if (isOpen) {
      closeInfo();
      return;
    }
    const next = activeAnnotation || ANNOTATIONS[0];
    if (next) {
      openInfo(next);
    }
  });
}

if (infoOverlay) {
  infoOverlay.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.action === "close") {
      closeInfo();
    }
  });
}

if (infoClose) {
  infoClose.addEventListener("click", () => {
    closeInfo();
  });
}

if (annoToggle) {
  annoToggle.addEventListener("change", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      setAnnotationsVisible(input.checked);
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeInfo();
  }
});

window.addEventListener("pagehide", cleanup);
startObserver();
