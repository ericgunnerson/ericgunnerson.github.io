import { Vector3 } from "three";
import { HTMLMesh } from "jsm/interactive/HTMLMesh.js";
import { InteractiveGroup } from "jsm/interactive/InteractiveGroup.js";

export function createMenu({ renderer, camera, controllers, parent }) {
  const element = document.createElement("div");
  element.style.cssText = `
    box-sizing: border-box;
    width: 320px;
    height: 180px;
    color: #eef4ff;
    font: 18px Arial, sans-serif;
    position: relative;
  `;
  element.innerHTML = `
    <div id="menu-panel" style="
      position: absolute;
      top: 0;
      right: 0;
      box-sizing: border-box;
      width: 56px;
      height: 56px;
      padding: 0;
      overflow: hidden;
      background: rgba(12, 24, 42, 0.94);
      border: 2px solid #7daeff;
      border-radius: 12px;
    ">
      <div id="menu-content" style="visibility: hidden">
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
      </div>
    </div>
    <button id="menu-toggle" type="button" aria-label="Expand menu" style="
      position: absolute;
      top: 0;
      right: 0;
      z-index: 1;
      box-sizing: border-box;
      width: 56px;
      height: 56px;
      padding: 0;
      color: #eef4ff;
      background: #18304f;
      border: 2px solid #7daeff;
      border-radius: 8px;
      font: bold 28px Arial, sans-serif;
      cursor: pointer;
    ">-</button>
  `;
  element.style.position = "fixed";
  element.style.left = "-10000px";
  element.style.top = "0";
  document.body.appendChild(element);

  const panel = element.querySelector("#menu-panel");
  const content = element.querySelector("#menu-content");
  const toggle = element.querySelector("#menu-toggle");
  let expanded = false;
  function setExpanded(nextExpanded) {
    expanded = nextExpanded;
    panel.style.width = expanded ? "320px" : "56px";
    panel.style.height = expanded ? "180px" : "56px";
    panel.style.padding = expanded ? "20px" : "0";
    toggle.textContent = expanded ? "x" : "-";
    toggle.setAttribute(
      "aria-label",
      expanded ? "Collapse menu" : "Expand menu",
    );
    content.style.visibility = expanded ? "visible" : "hidden";
  }
  setExpanded(false);
  toggle.addEventListener("click", () => {
    setExpanded(!expanded);
  });

  let clickCount = 0;
  element.querySelector("#test-input").addEventListener("click", () => {
    clickCount += 1;
    element.querySelector("#menu-status").textContent =
      `Pointer input received (${clickCount})`;
  });

  const interactiveGroup = new InteractiveGroup();
  interactiveGroup.listenToPointerEvents(renderer, camera);
  for (const controller of controllers) {
    interactiveGroup.listenToXRControllerEvents(controller);
  }

  const mesh = new HTMLMesh(element);
  mesh.scale.setScalar(1.5);
  interactiveGroup.add(mesh);
  parent.add(interactiveGroup);

  const cameraOffset = new Vector3(0, 3, 5);
  const viewOffset = new Vector3(0.7, 0.38, -1.2);
  const menuPosition = new Vector3();

  return {
    update() {
      menuPosition
        .copy(viewOffset)
        .applyQuaternion(camera.quaternion)
        .add(cameraOffset);
      mesh.position.copy(menuPosition);
      mesh.quaternion.copy(camera.quaternion);
    },
  };
}