import { Vector3 } from "three";
import { HTMLMesh } from "jsm/interactive/HTMLMesh.js";
import { InteractiveGroup } from "jsm/interactive/InteractiveGroup.js";

const settingControls = [
  { key: "acceleration", label: "Acceleration", min: 1, max: 20, step: 0.5 },
  { key: "maxSpeed", label: "Maximum speed", min: 1, max: 100, step: 1 },
  { key: "friction", label: "Friction", min: 0.5, max: 10, step: 0.5 },
  { key: "brakingPower", label: "Braking power", min: 5, max: 20, step: 1 },
  {
    key: "maxTurnRadius",
    label: "Maximum turn radius",
    min: 1,
    max: 20,
    step: 1,
  },
  {
    key: "turnSensitivity",
    label: "Turn sensitivity",
    min: 10,
    max: 50,
    step: 1,
  },
  {
    key: "cameraRotationSpeed",
    label: "Camera rotation speed",
    min: 0.5,
    max: 5,
    step: 0.5,
  },
  {
    key: "cameraOffsetY",
    label: "Camera height",
    min: -5,
    max: 10,
    step: 0.1,
  },
  {
    key: "cameraOffsetZ",
    label: "Camera distance",
    min: -5,
    max: 10,
    step: 0.1,
  },
  {
    key: "menuOffsetX",
    label: "Menu horizontal offset",
    min: -5,
    max: 5,
    step: 0.1,
  },
  {
    key: "menuOffsetY",
    label: "Menu vertical offset",
    min: -5,
    max: 5,
    step: 0.1,
  },
];

const settingsStorageKey = "vibe.settings";

export function createMenu({ renderer, camera, controllers, parent, settings }) {
  try {
    const savedSettings = localStorage.getItem(settingsStorageKey);
    if (savedSettings !== null) {
      const parsedSettings = JSON.parse(savedSettings);
      if (
        parsedSettings === null ||
        typeof parsedSettings !== "object" ||
        Array.isArray(parsedSettings)
      ) {
        throw new TypeError("Saved settings must be an object.");
      }
      for (const control of settingControls) {
        const value = parsedSettings[control.key];
        if (
          typeof value === "number" &&
          Number.isFinite(value) &&
          value >= control.min &&
          value <= control.max
        ) {
          settings[control.key] = value;
        } else if (value !== undefined) {
          console.warn(`Ignoring invalid saved setting: ${control.key}`);
        }
      }
    }
  } catch (error) {
    console.error("Unable to load saved settings from local storage.", error);
  }

  const minimizedElement = document.createElement("div");
  minimizedElement.style.cssText = `
    box-sizing: border-box;
    width: 56px;
    height: 56px;
    color: #eef4ff;
    background: #18304f;
    border: 2px solid #7daeff;
    border-radius: 8px;
    font: bold 28px/52px Arial, sans-serif;
    text-align: center;
  `;
  minimizedElement.textContent = "+";

  const expandedElement = document.createElement("div");
  expandedElement.style.cssText = `
    box-sizing: border-box;
    position: relative;
    width: 380px;
    height: 440px;
    padding: 12px;
    color: #eef4ff;
    background: rgba(12, 24, 42, 0.94);
    border: 2px solid #7daeff;
    border-radius: 12px;
    font: 18px Arial, sans-serif;
  `;
  expandedElement.innerHTML = `
    <button id="menu-collapse" type="button" aria-label="Collapse menu" style="
      position: absolute;
      top: 0;
      right: 0;
      box-sizing: border-box;
      width: 56px;
      height: 56px;
      padding: 0;
      color: #eef4ff;
      background: #18304f;
      border: 2px solid #7daeff;
      border-radius: 8px;
      font: bold 28px Arial, sans-serif;
    ">-</button>
    <div style="font-size: 22px; font-weight: bold; margin-bottom: 8px">
      Vehicle Settings
    </div>
    <div id="settings-list" style="
      position: relative;
      top: 10px;
      max-height: 400px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    ">
      <button id="settings-scroll-up" type="button" aria-label="Scroll settings up"
        style="height: 32px; flex: 0 0 32px; font-size: 20px">↑</button>
      <div id="settings-viewport" style="height: 300px; overflow: hidden">
        <div id="settings-rows"></div>
      </div>
      <button id="settings-scroll-down" type="button" aria-label="Scroll settings down"
        style="height: 32px; flex: 0 0 32px; font-size: 20px">↓</button>
    </div>
  `;
  const settingsRows = expandedElement.querySelector("#settings-rows");
  for (const control of settingControls) {
    const row = document.createElement("div");
    row.style.cssText =
      "height: 38px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #40536d;";
    row.innerHTML = `
      <span style="flex: 1; font-size: 15px">${control.label}</span>
      <button type="button" data-setting="${control.key}" data-change="-1"
        aria-label="Decrease ${control.label}"
        style="width: 32px; height: 30px; font-size: 20px">-</button>
      <span data-value="${control.key}"
        style="width: 48px; text-align: center; font-size: 15px"></span>
      <button type="button" data-setting="${control.key}" data-change="1"
        aria-label="Increase ${control.label}"
        style="width: 32px; height: 30px; font-size: 20px">+</button>
    `;
    settingsRows.appendChild(row);
  }
  const scrollUpButton = expandedElement.querySelector("#settings-scroll-up");
  const scrollDownButton = expandedElement.querySelector("#settings-scroll-down");
  let settingsScrollTop = 0;
  const settingsScrollStep = 114;
  function updateSettingsScroll() {
    const viewport = expandedElement.querySelector("#settings-viewport");
    const maxScrollTop = Math.max(0, settingsRows.offsetHeight - viewport.clientHeight);
    settingsScrollTop = Math.min(settingsScrollTop, maxScrollTop);
    settingsRows.style.marginTop = `-${settingsScrollTop}px`;
    scrollUpButton.disabled = settingsScrollTop === 0;
    scrollDownButton.disabled = settingsScrollTop >= maxScrollTop;
  }
  scrollUpButton.addEventListener("click", () => {
    settingsScrollTop = Math.max(0, settingsScrollTop - settingsScrollStep);
    updateSettingsScroll();
  });
  scrollDownButton.addEventListener("click", () => {
    settingsScrollTop += settingsScrollStep;
    updateSettingsScroll();
  });
  updateSettingsScroll();

  for (const element of [minimizedElement, expandedElement]) {
    element.style.position = "fixed";
    element.style.left = "-10000px";
    element.style.top = "0";
    document.body.appendChild(element);
  }

  const interactiveGroup = new InteractiveGroup();
  interactiveGroup.listenToPointerEvents(renderer, camera);
  for (const controller of controllers) {
    interactiveGroup.listenToXRControllerEvents(controller);
  }

  const minimizedMesh = new HTMLMesh(minimizedElement);
  minimizedMesh.scale.setScalar(2);
  makeRaycastRespectVisibility(minimizedMesh);
  interactiveGroup.add(minimizedMesh);

  const expandedMesh = new HTMLMesh(expandedElement);
  expandedMesh.scale.setScalar(2);
  makeRaycastRespectVisibility(expandedMesh);
  expandedMesh.visible = false;
  interactiveGroup.add(expandedMesh);
  parent.add(interactiveGroup);

  minimizedElement.addEventListener("click", () => {
    minimizedMesh.visible = false;
    expandedMesh.visible = true;
  });
  expandedElement
    .querySelector("#menu-collapse")
    .addEventListener("click", () => {
      expandedMesh.visible = false;
      minimizedMesh.visible = true;
    });

  for (const control of settingControls) {
    const valueElement = expandedElement.querySelector(
      `[data-value="${control.key}"]`,
    );
    const precision = (control.step.toString().split(".")[1] || "").length;
    valueElement.textContent = settings[control.key].toFixed(precision);

    for (const button of expandedElement.querySelectorAll(
      `[data-setting="${control.key}"]`,
    )) {
      button.addEventListener("click", () => {
        const change = Number(button.dataset.change);
        const factor = 10 ** precision;
        const nextValue =
          Math.round(
            (settings[control.key] + change * control.step + Number.EPSILON) *
              factor,
          ) / factor;
        settings[control.key] = Math.min(
          control.max,
          Math.max(control.min, nextValue),
        );
        valueElement.textContent = settings[control.key].toFixed(precision);
        try {
          localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
        } catch (error) {
          console.error("Unable to save settings to local storage.", error);
        }
      });
    }
  }

  const carOffset = new Vector3();
  const viewOffset = new Vector3();
  const menuPosition = new Vector3();
  const minimizedPositionOffset = new Vector3();
  const expandedPositionOffset = new Vector3();

  return {
    update() {
      carOffset.set(0, settings.cameraOffsetY, settings.cameraOffsetZ);
      viewOffset.set(settings.menuOffsetX, settings.menuOffsetY, -1.2);
      menuPosition.copy(carOffset).add(viewOffset);
      setMeshTopRightPosition(
        minimizedMesh,
        menuPosition,
        minimizedPositionOffset,
      );
      setMeshTopRightPosition(
        expandedMesh,
        menuPosition,
        expandedPositionOffset,
      );
      minimizedMesh.quaternion.identity();
      expandedMesh.quaternion.identity();
    },
  };
}

function setMeshTopRightPosition(mesh, anchor, offset) {
  const { width, height } = mesh.geometry.parameters;
  offset.set((-width * mesh.scale.x) / 2, (-height * mesh.scale.y) / 2, 0);
  mesh.position.copy(anchor).add(offset);
}

function makeRaycastRespectVisibility(mesh) {
  const raycast = mesh.raycast;
  mesh.raycast = function (raycaster, intersections) {
    if (this.visible) {
      raycast.call(this, raycaster, intersections);
    }
  };
}
