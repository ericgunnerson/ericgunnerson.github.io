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
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  {
    key: "cameraOffsetZ",
    label: "Camera distance",
    min: 0.1,
    max: 10,
    step: 0.1,
  },
];

export function createMenu({ renderer, camera, controllers, parent, settings }) {
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
  minimizedElement.textContent = "-";

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
    ">+</button>
    <div style="font-size: 22px; font-weight: bold; margin-bottom: 8px">
      Vehicle Settings
    </div>
    <div id="settings-list"></div>
  `;
  const settingsList = expandedElement.querySelector("#settings-list");
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
    settingsList.appendChild(row);
  }

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
  minimizedMesh.scale.setScalar(1.5);
  interactiveGroup.add(minimizedMesh);

  const expandedMesh = new HTMLMesh(expandedElement);
  expandedMesh.scale.setScalar(1.5);
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
      });
    }
  }

  const cameraOffset = new Vector3();
  const viewOffset = new Vector3(0.7, 0.38, -1.2);
  const menuPosition = new Vector3();
  const minimizedOffset = new Vector3(1, 1, 0);

  return {
    update() {
      cameraOffset.set(0, settings.cameraOffsetY, settings.cameraOffsetZ);
      menuPosition
        .copy(viewOffset)
        .applyQuaternion(camera.quaternion)
        .add(cameraOffset);
      minimizedMesh.position
        .copy(menuPosition)
        .addScaledVector(
          minimizedOffset.set(1, 1, 0).applyQuaternion(camera.quaternion),
          0.2,
        );
      expandedMesh.position.copy(menuPosition);
      minimizedMesh.quaternion.copy(camera.quaternion);
      expandedMesh.quaternion.copy(camera.quaternion);
    },
  };
}
