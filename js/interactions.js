// interactions.js - 마우스/키보드 이벤트 처리

import * as THREE from 'three';
import * as State from './state.js';
import { ROOM_BOUNDS, WALL_MARGIN, WALL_MIN_Y, WALL_MAX_Y } from './config.js';
import { setSelected } from './selection.js';

export function onPointerDown(event) {
  if (State.drawingMode) return;
  // UI 버튼 클릭 시 무시
  if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
    return;
  }

  // 하단 UI 영역 클릭 시 무시
  const sidebar = document.getElementById('bottom-ui');
  if (sidebar) {
    const barRect = sidebar.getBoundingClientRect();
    if (event.clientX >= barRect.left && event.clientY >= barRect.top) return;
  }

  // 오른쪽 및 가운데 버튼은 카메라 이동과 확대/축소에 사용
  if (event.button !== 0) return;

  // 레이캐스트
  State.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  State.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  State.raycaster.setFromCamera(State.pointer, State.camera);

  // dynamic room bounds (computed from floor) if available
  const bounds = State.roomBounds || ROOM_BOUNDS;

  const intersects = State.raycaster.intersectObjects(State.draggableObjects, true);

  if (intersects.length > 0) {
    let obj = intersects[0].object;

    // isDraggableRoot 달린 부모까지 타고 올라가기
    while (obj.parent && !obj.userData.isDraggableRoot) {
      obj = obj.parent;
    }

    State.setDraggedObject(obj);
    setSelected(obj);

    // 드래그 시작할 때 gizmo 숨기기
    if (window.gizmoEl) {
      window.gizmoEl.style.display = 'none';
    }

    // record world-space offset between the clicked point and the object's
    // world position so we can preserve that relative offset while dragging
    // (prevents the object from snapping/jumping when you click an edge).
    try {
      const clickPoint = intersects[0].point.clone();
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      if (!obj.userData) obj.userData = {};
      obj.userData._dragOffsetWorld = clickPoint.sub(worldPos);
    } catch (e) {
      // ignore
    }

    // Start dragging (do not change Y here to avoid visual jumps)
    State.controls.enabled = false;
  } else {
    // 선택 해제
    setSelected(null);
  }
}

export function onPointerUp() {
  if (!State.draggedObject) return;

  const data = State.draggedObject.userData || {};

  // dynamic room bounds (computed from floor) if available
  const bounds = State.roomBounds || ROOM_BOUNDS;

  // Do not forcibly change Y on pointer up beyond the clamp logic below.
  // clear any temporary drag offset
  if (State.draggedObject && State.draggedObject.userData && State.draggedObject.userData._dragOffsetWorld) {
    delete State.draggedObject.userData._dragOffsetWorld;
  }

  // 벽 오브제 처리
  if (data.isWall) {
    // Snap to wall front while accounting for object's half extents so it
    // doesn't end up penetrating the wall.
    const box = new THREE.Box3().setFromObject(State.draggedObject);
    const size = new THREE.Vector3();
    box.getSize(size);
    const halfX = size.x / 2 || 0;
    const halfZ = size.z / 2 || 0;
    const baseOffsetUp = data.baseYOffset || 0;

    const side = data.wallSide || (
      Math.abs(State.draggedObject.position.z - State.BACK_WALL_Z_FRONT) <= Math.abs(State.draggedObject.position.x - State.LEFT_WALL_X_FRONT)
        ? 'back' : 'left'
    );

    if (side === 'back') {
      const minX = bounds.minX + WALL_MARGIN + halfX;
      const maxX = bounds.maxX - WALL_MARGIN - halfX;
      const x = THREE.MathUtils.clamp(State.draggedObject.position.x, minX, maxX);
      const floorY = (State.groundPlane && typeof State.groundPlane.position.y === 'number')
        ? State.groundPlane.position.y + baseOffsetUp + (size.y / 2)
        : WALL_MIN_Y + (size.y / 2);
      const y = THREE.MathUtils.clamp(State.draggedObject.position.y, floorY, WALL_MAX_Y - (size.y / 2));
      const zPos = (typeof State.BACK_WALL_Z_FRONT === 'number') ? (State.BACK_WALL_Z_FRONT + halfZ) : State.BACK_WALL_Z_FRONT;
      State.draggedObject.position.set(x, y, zPos);
    } else if (side === 'left') {
      const minZ = bounds.minZ + WALL_MARGIN + halfZ;
      const maxZ = bounds.maxZ - WALL_MARGIN - halfZ;
      const z = THREE.MathUtils.clamp(State.draggedObject.position.z, minZ, maxZ);
      const floorY2 = (State.groundPlane && typeof State.groundPlane.position.y === 'number')
        ? State.groundPlane.position.y + baseOffsetUp + (size.y / 2)
        : WALL_MIN_Y + (size.y / 2);
      const y2 = THREE.MathUtils.clamp(State.draggedObject.position.y, floorY2, WALL_MAX_Y - (size.y / 2));
      const xPos = (typeof State.LEFT_WALL_X_FRONT === 'number') ? (State.LEFT_WALL_X_FRONT + halfX) : State.LEFT_WALL_X_FRONT;
      State.draggedObject.position.set(xPos, y2, z);
    }

    if (window.gizmoEl) window.gizmoEl.style.display = 'flex';
    if (typeof window.updateGizmoPosition === 'function') {
      window.updateGizmoPosition();
    }

    State.setDraggedObject(null);
    State.controls.enabled = true;
    return;
  }

  // 바닥 오브제 Y 위치 정리 (isBed 여부와 무관하게 모두 동일하게 적용)
  const baseOffset = data.baseYOffset || 0;
  // Preserve the current Y the user dragged to, but enforce a minimum so the
  // object never sinks below the floor. This lets users nudge height and then
  // drag while keeping that height instead of snapping back to ground.
  const minY = (State.groundPlane && typeof State.groundPlane.position.y === 'number')
    ? State.groundPlane.position.y + baseOffset
    : baseOffset;
  if (State.draggedObject.position.y < minY) {
    State.draggedObject.position.y = minY;
  }

  // Clamp X/Z to room bounds on pointer up so objects cannot go outside the floor or walls
  if (State.draggedObject) {
    const px = State.draggedObject.position.x;
    const pz = State.draggedObject.position.z;

    const isBed = !!(State.draggedObject.userData && State.draggedObject.userData.isBed);
    if (isBed) {
      // For beds, reserve extra padding and account for model half-extents
      const box = new THREE.Box3().setFromObject(State.draggedObject);
      const size = new THREE.Vector3();
      box.getSize(size);
      const halfX = size.x / 2 || 0;
      const halfZ = size.z / 2 || 0;
      const BED_EXTRA_PADDING = 0.2;
      const pad = WALL_MARGIN + BED_EXTRA_PADDING;

      const xMin = bounds.minX + pad + halfX;
      const xMax = bounds.maxX - pad - halfX;
      const zMin = bounds.minZ + pad + halfZ;
      const zMax = bounds.maxZ - pad - halfZ;

      State.draggedObject.position.x = THREE.MathUtils.clamp(px, xMin, xMax);
      State.draggedObject.position.z = THREE.MathUtils.clamp(pz, zMin, zMax);
    } else {
      // For other objects allow up to the room edge (small inward padding)
      const INNER_PADDING = 0.02;
      const xMin = bounds.minX + WALL_MARGIN + INNER_PADDING;
      const xMax = bounds.maxX - WALL_MARGIN - INNER_PADDING;
      const zMin = bounds.minZ + WALL_MARGIN + INNER_PADDING;
      const zMax = bounds.maxZ - WALL_MARGIN - INNER_PADDING;

      State.draggedObject.position.x = THREE.MathUtils.clamp(px, xMin, xMax);
      State.draggedObject.position.z = THREE.MathUtils.clamp(pz, zMin, zMax);
    }
  }

  if (window.gizmoEl) window.gizmoEl.style.display = 'flex';
  if (typeof window.updateGizmoPosition === 'function') {
    window.updateGizmoPosition();
  }

  State.setDraggedObject(null);
  State.controls.enabled = true;
}

export function onPointerMove(event) {
  if (!State.draggedObject) return;

  const data = State.draggedObject.userData || {};

  State.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  State.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  State.raycaster.setFromCamera(State.pointer, State.camera);

  // dynamic room bounds (computed from floor) if available
  const bounds = State.roomBounds || ROOM_BOUNDS;

  // 벽 오브제 처리
  if (data.isWall) {
    // Determine which wall plane the pointer is actually hitting (prefer ray hit)
    let side = null;
    if (State.wallPlaneBack || State.wallPlaneLeft) {
      const planes = [];
      if (State.wallPlaneBack) planes.push(State.wallPlaneBack);
      if (State.wallPlaneLeft) planes.push(State.wallPlaneLeft);
      const planeHits = State.raycaster.intersectObjects(planes, true);
      if (planeHits.length > 0) {
        const hitObj = planeHits[0].object;
        if (hitObj === State.wallPlaneBack || hitObj.parent === State.wallPlaneBack) side = 'back';
        else if (hitObj === State.wallPlaneLeft || hitObj.parent === State.wallPlaneLeft) side = 'left';
      }
    }

    // fallback to distance-based if ray didn't hit a wall plane
    if (!side) {
      const distBack = Math.abs(State.draggedObject.position.z - State.BACK_WALL_Z_FRONT);
      const distLeft = Math.abs(State.draggedObject.position.x - State.LEFT_WALL_X_FRONT);
      side = distBack <= distLeft ? 'back' : 'left';
    }
    data.wallSide = side;

    if (side === 'back' && State.wallPlaneBack) {
      let hits = State.raycaster.intersectObject(State.wallPlaneBack, true);
      let p = null;
      if (hits.length > 0) {
        p = hits[0].point;
      } else {
        // fallback: intersect against a plane located at the back wall Z
        const planeNormal = new THREE.Vector3(0, 0, -1).applyQuaternion(State.wallPlaneBack.quaternion).normalize();
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, State.wallPlaneBack.getWorldPosition(new THREE.Vector3()));
        const intersectPoint = new THREE.Vector3();
        if (State.raycaster.ray.intersectPlane(plane, intersectPoint)) {
          p = intersectPoint;
        }
      }

      if (p) {

        // compute bounding box (may be zero if model not loaded yet)
        const box = new THREE.Box3().setFromObject(State.draggedObject);
        const size = new THREE.Vector3();
        box.getSize(size);
        const halfZ = (size.z > 0.001) ? size.z / 2 : 0.1;

        // allow movement across the full wall width
        const minX = bounds.minX + WALL_MARGIN;
        const maxX = bounds.maxX - WALL_MARGIN;
        // apply stored drag offset so the object keeps the same relative
        // position to the pointer where it was clicked
        let desiredWorld = new THREE.Vector3(p.x, p.y, p.z);
        if (State.draggedObject.userData && State.draggedObject.userData._dragOffsetWorld) {
          desiredWorld.sub(State.draggedObject.userData._dragOffsetWorld);
        }
        const x = THREE.MathUtils.clamp(desiredWorld.x, minX, maxX);

        // Preserve the current Y while dragging to avoid jumps; ensure it
        // remains within allowed wall vertical range. Final Y clamping will
        // be applied on pointer up if needed.
        const baseOffset = data.baseYOffset || 0;
        const floorY = (State.groundPlane && typeof State.groundPlane.position.y === 'number')
          ? State.groundPlane.position.y + baseOffset + (size.y / 2 || 0)
          : WALL_MIN_Y + (size.y / 2 || 0);
        const currentY = State.draggedObject.position.y;
        const y = THREE.MathUtils.clamp(desiredWorld.y !== undefined ? desiredWorld.y : currentY, floorY, WALL_MAX_Y - (size.y / 2 || 0));

        // depth: place object center slightly in front of wall to avoid penetration
        const zPos = (typeof State.BACK_WALL_Z_FRONT === 'number') ? (State.BACK_WALL_Z_FRONT + halfZ) : State.BACK_WALL_Z_FRONT;

        // convert desired world (x,y) into local coordinates relative to parent
        const newWorld = new THREE.Vector3(x, y, zPos);
        const local = newWorld.clone();
        if (State.draggedObject.parent) State.draggedObject.parent.worldToLocal(local);
        State.draggedObject.position.copy(local);
        // align object to back wall
        State.draggedObject.rotation.y = 0;
      }
    } else if (side === 'left' && State.wallPlaneLeft) {
      let hits = State.raycaster.intersectObject(State.wallPlaneLeft, true);
      let p = null;
      if (hits.length > 0) {
        p = hits[0].point;
      } else {
        // fallback: compute ray-plane intersection if the plane mesh wasn't hit
        const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(State.wallPlaneLeft.quaternion).normalize();
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, State.wallPlaneLeft.getWorldPosition(new THREE.Vector3()));
        const intersectPoint = new THREE.Vector3();
        if (State.raycaster.ray.intersectPlane(plane, intersectPoint)) {
          p = intersectPoint;
        }
      }

      if (p) {
        const box = new THREE.Box3().setFromObject(State.draggedObject);
        const size = new THREE.Vector3();
        box.getSize(size);
        const halfX = (size.x > 0.001) ? size.x / 2 : 0.1;

        // allow movement across the full left wall height span
        const minZ = bounds.minZ + WALL_MARGIN;
        const maxZ = bounds.maxZ - WALL_MARGIN;
        let desiredWorldL = new THREE.Vector3(p.x, p.y, p.z);
        if (State.draggedObject.userData && State.draggedObject.userData._dragOffsetWorld) {
          desiredWorldL.sub(State.draggedObject.userData._dragOffsetWorld);
        }
        const z = THREE.MathUtils.clamp(desiredWorldL.z, minZ, maxZ);

        // Preserve the current Y while dragging to avoid jumps; final clamp
        // will be enforced on pointer up.
        const baseOffsetLeft = data.baseYOffset || 0;
        const floorYLeft = (State.groundPlane && typeof State.groundPlane.position.y === 'number')
          ? State.groundPlane.position.y + baseOffsetLeft + (size.y / 2 || 0)
          : WALL_MIN_Y + (size.y / 2 || 0);
        const y = THREE.MathUtils.clamp(desiredWorldL.y !== undefined ? desiredWorldL.y : State.draggedObject.position.y, floorYLeft, WALL_MAX_Y - (size.y / 2 || 0));

        // place object's side flush with left wall front, accounting for half-width
        const xPos = (typeof State.LEFT_WALL_X_FRONT === 'number') ? (State.LEFT_WALL_X_FRONT + halfX) : State.LEFT_WALL_X_FRONT;

        const newWorldL = new THREE.Vector3(xPos, y, z);
        const localL = newWorldL.clone();
        if (State.draggedObject.parent) State.draggedObject.parent.worldToLocal(localL);
        State.draggedObject.position.copy(localL);
        State.draggedObject.rotation.y = Math.PI / 2;
      }
    }

    if (window.gizmoEl) window.gizmoEl.style.display = 'none';
    return;
  }

  // 텍스트 카드는 현재 높이의 평면에서 이동해 클릭 시 위치가 튀지 않도록 한다.
  let p = null;
  if (data.itemType === 'text') {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -State.draggedObject.position.y);
    p = State.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  } else {
    const hit = State.raycaster.intersectObject(State.groundPlane);
    if (hit.length > 0) p = hit[0].point.clone();
  }
  if (p) {

    // compute desired world position while preserving initial click offset
    let desiredWorld = p.clone();
    if (State.draggedObject.userData && State.draggedObject.userData._dragOffsetWorld) {
      desiredWorld.sub(State.draggedObject.userData._dragOffsetWorld);
    }

    // convert to local coords for assignment
    const local = desiredWorld.clone();
    if (State.draggedObject.parent) State.draggedObject.parent.worldToLocal(local);

    // preserve current Y (don't change) unless offset requires it
    local.y = State.draggedObject.position.y;

    State.draggedObject.position.x = local.x;
    State.draggedObject.position.z = local.z;
  }

  if (window.gizmoEl) window.gizmoEl.style.display = 'none';
}

export function onKeyDown(event) {
  if (State.drawingMode) return;
  if (!State.selectedObject) return;

  if (event.key === 'Delete' || event.key === 'Backspace') {
    window.deleteSelected();
  } else if (event.key === 'q' || event.key === 'Q') {
    window.rotateSelected(-90);
  } else if (event.key === 'e' || event.key === 'E') {
    window.rotateSelected(90);
  } else if (event.key === 'r' || event.key === 'R') {
    window.nudgeSelectedHeight(0.1);
  } else if (event.key === 'f' || event.key === 'F') {
    window.nudgeSelectedHeight(-0.1);
  }
}

export function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 15;
  State.camera.left   = (-frustumSize * aspect) / 2;
  State.camera.right  = (frustumSize * aspect) / 2;
  State.camera.top    =  frustumSize / 2;
  State.camera.bottom = -frustumSize / 2;
  State.camera.updateProjectionMatrix();
  State.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  State.renderer.setSize(window.innerWidth, window.innerHeight);
}
