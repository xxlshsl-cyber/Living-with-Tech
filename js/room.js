// room.js - 방 구조 생성

import * as THREE from 'three';
import * as State from './state.js';
import { NEW_GROUND_Y, BACK_WALL_Z, LEFT_WALL_X } from './config.js';

export function createRoom() {
  // Slightly brighter, cleaner colors for floor and wall
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xf9f7f2, roughness: 0.75 });
  // wall: make brighter, very close to white
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 });

  // 바닥
  const floorGeo = new THREE.BoxGeometry(10, 0.5, 10);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -2.5; 
  floor.receiveShadow = true;
  State.scene.add(floor);
  State.setRoomFloor(floor);

  // compute room bounds from visible floor mesh so interactions use accurate limits
  try {
    const w = floorGeo.parameters.width;
    const d = floorGeo.parameters.height || floorGeo.parameters.depth || floorGeo.parameters.width;
    const halfW = w / 2;
    const halfD = (floorGeo.parameters.depth !== undefined) ? floorGeo.parameters.depth / 2 : d / 2;
    const cx = floor.position.x || 0;
    const cz = floor.position.z || 0;
    const bounds = {
      minX: cx - halfW,
      maxX: cx + halfW,
      minZ: cz - halfD,
      maxZ: cz + halfD
    };
    State.setRoomBounds(bounds);
  } catch (e) {
    // ignore if geometry parameters not available
    console.warn('Could not compute room bounds from floor geometry', e);
  }

  // helper: create wall that can round only specified top corners
  function createWallWithTopCorner(width, height, thickness, opts, radius, material) {
    // opts: { topLeft: boolean, topRight: boolean }
    const shape = new THREE.Shape();
    const w = width, h = height, r = Math.min(radius, width / 2);

    // start bottom-left
    shape.moveTo(0, 0);
    // bottom edge to bottom-right
    shape.lineTo(w, 0);
    // right edge up to just below top-right (if rounding)
    if (opts.topRight) shape.lineTo(w, h - r);
    else shape.lineTo(w, h);

    // top-right corner
    if (opts.topRight) shape.quadraticCurveTo(w, h, w - r, h);
    // top edge to top-left corner start
    if (opts.topLeft) shape.lineTo(r, h);
    else shape.lineTo(0, h);

    // top-left corner
    if (opts.topLeft) shape.quadraticCurveTo(0, h, 0, h - r);
    // left edge down to origin
    shape.lineTo(0, 0);

    const extrudeSettings = { steps: 1, depth: thickness, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.computeBoundingBox();
    if (geo.boundingBox) {
      const bbox = geo.boundingBox;
      const offsetX = (bbox.max.x + bbox.min.x) / 2;
      const offsetY = (bbox.max.y + bbox.min.y) / 2;
      const offsetZ = (bbox.max.z + bbox.min.z) / 2;
      geo.translate(-offsetX, -offsetY, -offsetZ);
    }
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  // 뒷벽: round only top-right corner (right side when looking towards back)
  const backWall = createWallWithTopCorner(10, 7.0, 0.5, { topLeft: false, topRight: true }, 0.4, wallMat);
  backWall.position.set(0, 1.25, -4.75);
  State.scene.add(backWall);
  // ensure back wall does not receive shadows so no shadows appear on wall surface
  backWall.receiveShadow = false;
  State.setRoomBackWall(backWall);
  const backWallZFront = backWall.position.z + 0.5 / 2 + 0.001;
  State.setBackWallZFront(backWallZFront);

  // 왼쪽 벽: round only top-left corner (left side when looking across room)
  const leftWall = createWallWithTopCorner(10, 7.0, 0.5, { topLeft: true, topRight: false }, 0.4, wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-4.75, 1.25, 0);
  State.scene.add(leftWall);
  // ensure left wall does not receive shadows so no shadows appear on wall surface
  leftWall.receiveShadow = false;
  State.setRoomLeftWall(leftWall);
  const leftWallXFront = leftWall.position.x + 0.5 / 2 + 0.001;
  State.setLeftWallXFront(leftWallXFront);

  // 레이캐스팅용 투명한 바닥 평면
  const planeGeo = new THREE.PlaneGeometry(100, 100);
  const planeMat = new THREE.MeshBasicMaterial({ visible: false });
  
  const groundPlane = new THREE.Mesh(planeGeo, planeMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = NEW_GROUND_Y;
  State.scene.add(groundPlane);
  State.setGroundPlane(groundPlane);
}

export function createWallMovePlane() {
  const geo = new THREE.PlaneGeometry(50, 50);
  const mat = new THREE.MeshBasicMaterial({ visible: false });

  // 뒷벽 평면
  const wallPlaneBack = new THREE.Mesh(geo, mat);
  wallPlaneBack.position.set(0, 3, BACK_WALL_Z);
  State.scene.add(wallPlaneBack);
  State.setWallPlaneBack(wallPlaneBack);
  window.wallPlaneBack = wallPlaneBack;

  // 왼쪽 벽 평면
  const wallPlaneLeft = new THREE.Mesh(geo.clone(), mat.clone());
  wallPlaneLeft.rotation.y = Math.PI / 2;
  wallPlaneLeft.position.set(LEFT_WALL_X, 3, 0);
  State.scene.add(wallPlaneLeft);
  State.setWallPlaneLeft(wallPlaneLeft);
  window.wallPlaneLeft = wallPlaneLeft;
}
