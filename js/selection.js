// selection.js - 오브젝트 선택 및 gizmo 관리

import * as THREE from 'three';
import * as State from './state.js';
import { updateSelectedUI } from './ui.js';

export function setSelected(obj) {
  State.setSelectedObject(obj || null);
  updateSelectedUI();

  if (typeof updateSelectionControlsVisibility === 'function') {
    updateSelectionControlsVisibility();
  }

  if (!window.gizmoEl) {
    window.gizmoEl = document.getElementById('object-gizmo');
  }

  if (!State.selectedObject) {
    if (window.gizmoEl) {
      window.gizmoEl.style.display = 'none';
    }
    return;
  }

  if (typeof window.updateGizmoPosition === 'function') {
    window.updateGizmoPosition();
  }
}

// 선택 시 작은 퀵액션 버튼 보여주기 (회전/삭제)
function ensureQuickActions() {
  let qa = document.getElementById('quick-actions');
  if (!qa) {
    qa = document.createElement('div');
    qa.id = 'quick-actions';
    qa.style.position = 'fixed';
    qa.style.zIndex = '9998';
    qa.style.display = 'none';
    qa.style.gap = '6px';
    qa.style.background = 'rgba(0,0,0,0.6)';
    qa.style.color = '#fff';
    qa.style.padding = '6px 8px';
    qa.style.borderRadius = '8px';

    const btnRotate = document.createElement('button');
    btnRotate.className = 'quick-action-rotate';
    btnRotate.textContent = '회전';
    btnRotate.style.cursor = 'pointer';
    btnRotate.onclick = () => {
      if (typeof window.rotateSelected === 'function') window.rotateSelected();
      if (typeof window.updateGizmoPosition === 'function') window.updateGizmoPosition();
    };

    const btnDelete = document.createElement('button');
    btnDelete.textContent = '삭제';
    btnDelete.style.cursor = 'pointer';
    btnDelete.onclick = () => {
      if (typeof window.deleteSelected === 'function') window.deleteSelected();
      qa.style.display = 'none';
    };

    qa.appendChild(btnRotate);
    qa.appendChild(btnDelete);
    document.body.appendChild(qa);
  }
  return qa;
}

export function updateQuickActionsPosition() {
  const qa = ensureQuickActions();
  if (!State.selectedObject || !State.camera || !State.renderer) { qa.style.display = 'none'; return; }
  const rotate = qa.querySelector('.quick-action-rotate');
  if (rotate) rotate.style.display = State.selectedObject.userData.itemType === 'text' ? 'none' : '';
  const worldPos = new THREE.Vector3();
  State.selectedObject.getWorldPosition(worldPos);
  const projected = worldPos.clone().project(State.camera);
  const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
  qa.style.display = 'flex';
  qa.style.transform = `translate(${x}px, ${y - 80}px)`;
}

export function updateSelectionControlsVisibility() {
  const wrap = document.getElementById('selection-controls');
  if (!wrap) return;

  if (!State.selectedObject) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'flex';
  const rotateControl = document.getElementById('ctrl-rotate');
  if (rotateControl) rotateControl.style.display = State.selectedObject.userData.itemType === 'text' ? 'none' : '';
  // 버튼 핸들러 연결 (한 번만)
  if (!wrap.dataset.bound) {
    const btnRotate = document.getElementById('ctrl-rotate');
    const btnUp     = document.getElementById('ctrl-up');
    const btnDown   = document.getElementById('ctrl-down');
    const btnDelete = document.getElementById('ctrl-delete');

    if (btnRotate) btnRotate.onclick = () => {
      if (typeof window.rotateSelected === 'function') window.rotateSelected(90);
    };
    if (btnUp) btnUp.onclick = () => {
      if (typeof window.nudgeSelectedHeight === 'function') window.nudgeSelectedHeight(0.2);
    };
    if (btnDown) btnDown.onclick = () => {
      if (typeof window.nudgeSelectedHeight === 'function') window.nudgeSelectedHeight(-0.2);
    };
    if (btnDelete) btnDelete.onclick = () => {
      if (typeof window.deleteSelected === 'function') window.deleteSelected();
    };

    wrap.dataset.bound = '1';
  }
  updateSelectionControlsPosition();
}

export function updateSelectionControlsPosition() {
  const wrap = document.getElementById('selection-controls');
  if (!wrap || !State.selectedObject || !State.camera || !State.renderer) return;

  const worldPos = new THREE.Vector3();
  State.selectedObject.getWorldPosition(worldPos);

  const projected = worldPos.clone().project(State.camera);

  const x = (projected.x *  0.5 + 0.5) * window.innerWidth;
  const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

  const offsetY = 60;
  wrap.style.left = `${x}px`;
  wrap.style.top  = `${y - offsetY}px`;
}

export function updateGizmoPosition() {
  if (!State.gizmoEl) return;

  if (!State.selectedObject) {
    State.gizmoEl.style.display = 'none';
    return;
  }

  const worldPos = new THREE.Vector3();
  State.selectedObject.getWorldPosition(worldPos);

  const projected = worldPos.clone().project(State.camera);
  const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

  State.gizmoEl.style.display = 'block';
  State.gizmoEl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
}

export function setGizmoEl() {
  const gizmo = document.getElementById('object-gizmo');
  State.setGizmoEl(gizmo);
  window.gizmoEl = gizmo;
}

// 전역 함수로 노출
window.updateGizmoPosition = updateGizmoPosition;

// 오브젝트 조작 함수들
window.rotateSelected = function (deg) {
  if (!State.selectedObject) {
    alert('먼저 회전시킬 오브젝트를 선택해 주세요.');
    return;
  }
  if (State.selectedObject.userData.itemType === 'text') return;

  let currentDeg = THREE.MathUtils.radToDeg(State.selectedObject.rotation.y);
  currentDeg = ((currentDeg % 360) + 360) % 360;
  let newDeg = currentDeg + deg;
  const snappedDeg = Math.round(newDeg / 90) * 90;
  State.selectedObject.rotation.y = THREE.MathUtils.degToRad(snappedDeg);
};

window.deleteSelected = function () {
  if (!State.selectedObject) {
    alert('삭제할 오브젝트를 먼저 선택해 주세요.');
    return;
  }

  const isBed = State.selectedObject.userData && State.selectedObject.userData.isBed;

  if (isBed) {
    State.setBedCount(Math.max(0, State.bedCount - 1));
    if (typeof window.updateStageButtons === 'function') {
      window.updateStageButtons();
    }
  }

  const idx = State.draggableObjects.indexOf(State.selectedObject);
  if (idx > -1) State.draggableObjects.splice(idx, 1);

  State.scene.remove(State.selectedObject);
  setSelected(null);
};

window.nudgeSelectedHeight = function (delta) {
  if (!State.selectedObject) {
    alert('먼저 높이를 조정할 오브젝트를 선택해 주세요.');
    return;
  }

  const baseOffset = State.selectedObject.userData?.baseYOffset || 0;
  let newY = State.selectedObject.position.y + delta;
  // Determine the target surface Y (ground or bed top + margin)
  const groundY = (State.groundPlane && typeof State.groundPlane.position.y === 'number') ? State.groundPlane.position.y : 0;
  let targetSurfaceY = groundY;
  if (State.selectedObject.userData && typeof State.selectedObject.userData.parentBedTop === 'number') {
    const bedMargin = State.selectedObject.userData.bedMargin || 0.01;
    targetSurfaceY = State.selectedObject.userData.parentBedTop + bedMargin;
  }

  // Compute object's current bounding box to know its lowest point in world coords.
  try {
    const box = new THREE.Box3().setFromObject(State.selectedObject);
    const currentMinY = box.min.y;
    // If attempting to move downward, do not allow the object's bottom to go below targetSurfaceY
    if (delta < 0) {
      const maxDownDistance = currentMinY - targetSurfaceY; // how much we can move down before hitting surface
      const allowedDelta = Math.max(delta, -maxDownDistance);
      newY = State.selectedObject.position.y + allowedDelta;
    }
  } catch (e) {
    // if bounding computation fails, fall back to conservative clamp
    if (newY < targetSurfaceY) newY = targetSurfaceY;
  }

  // Persist the new height as baseYOffset so dragging preserves it
  State.selectedObject.position.y = newY;
  const newBaseOffset = newY - State.groundPlane.position.y;
  if (!State.selectedObject.userData) State.selectedObject.userData = {};
  State.selectedObject.userData.baseYOffset = newBaseOffset;

  // update gizmo / controls positions immediately
  // Keep gizmo position fixed on screen when only adjusting vertical height.
  // Do not call updateGizmoPosition/updateSelectionControlsPosition here so
  // the UI stays visually anchored while the object moves up/down.
};
