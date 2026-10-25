import { Vector3 } from "three";
import { HTMLMesh } from "jsm/interactive/HTMLMesh.js";
import { InteractiveGroup } from "jsm/interactive/InteractiveGroup.js";

export function createMenu({ renderer, camera, controllers, parent }) {
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
    width: 320px;
    height: 180px;
    padding: 20px;
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
    <div style="font-size: 24px; font-weight: bold; margin-bottom: 12px">
      Vehicle Menu
    </div>
    <div id="menu-status" style="margin-bottom: 16px">Ready</div>
    <button id="test-input" type="button" style="
      padding: 8px 14px;
      color: #10213a;
      background: #9bc2ff;
      border: 0;
      border-radius: 6px;
      font: bold 16px Arial, sans-serif;
    ">Test mouse / XR input</button>
  `;

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
  expandedElement.querySelector("#menu-collapse").addEventListener("click", () => {
    expandedMesh.visible = false;
    minimizedMesh.visible = true;
  });

  let clickCount = 0;
  expandedElement.querySelector("#test-input").addEventListener("click", () => {
    clickCount += 1;
    expandedElement.querySelector("#menu-status").textContent =
      `Pointer input received (${clickCount})`;
  });

  const cameraOffset = new Vector3(0, 3, 5);
  const viewOffset = new Vector3(0.7, 0.38, -1.2);
  const menuPosition = new Vector3();
  const minimizedOffset = new Vector3(1, 1, 0);

  return {
    update() {
      menuPosition
        .copy(viewOffset)
        .applyQuaternion(camera.quaternion)
        .add(cameraOffset);
      minimizedMesh.position
        .copy(menuPosition)
        .addScaledVector(
          minimizedOffset
            .set(1, 1, 0)
            .applyQuaternion(camera.quaternion)
            .normalize(),
          0.12,
        );
      expandedMesh.position.copy(menuPosition);
      minimizedMesh.quaternion.copy(camera.quaternion);
      expandedMesh.quaternion.copy(camera.quaternion);
    },
  };
}
