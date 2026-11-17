// scene.js - Three.js 씬 초기화

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as State from './state.js';
import { createRoom, createWallMovePlane } from './room.js';
import { onWindowResize, onPointerDown, onPointerMove, onPointerUp, onKeyDown } from './interactions.js';
import { setGizmoEl } from './selection.js';

export function initScene() {
  // 씬 생성
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8f9fa);
  State.setScene(scene);

  // 카메라 설정 (Orthographic)
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 15;
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  camera.position.set(10, 18, 10);
  camera.lookAt(0, 0, 0);
  State.setCamera(camera);

  // 렌더러 설정
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('canvas-container').appendChild(renderer.domElement);
  State.setRenderer(renderer);

  // 조명 설정
  // Softer ambient to allow directional light to create contrast/shadow
  // increased slightly to lift shadows overall (brighter, less contrast)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Main sun / natural light coming from the right-front (warm)
  // Slightly brighter to give a more 'airy' daylight feel
  const directionalLight = new THREE.DirectionalLight(0xfff8e6, 2.0);
  directionalLight.position.set(30, 25, 8); // from the right and slightly above
  directionalLight.target.position.set(0, 2, -3); // aim toward center/back of room
  directionalLight.castShadow = true;
  // reduce shadow map size slightly and increase radius to soften shadows
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.radius = 6;
  // small bias to avoid acne but less aggressive than before
  directionalLight.shadow.bias = -0.0002;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  scene.add(directionalLight);
  scene.add(directionalLight.target);

  // Fill/sky light for subtle softening
  // slightly stronger fill to reduce harsh shadows while keeping directional highlights
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xddddff, 0.45);
  scene.add(hemiLight);

  // 카메라 컨트롤
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.3; // 기존 0.05보다 빠르게 반응하면서 약한 관성 유지
  controls.enableRotate = false;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.mouseButtons.LEFT = null;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.touches.ONE = null;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  State.setControls(controls);

  // 방 구조 생성
  createRoom();
  createWallMovePlane();

  // Add soft ground shadows to make the whole scene appear elevated above the background.
  // We draw two canvas textures: an elliptical drop shadow under the room, and a
  // subtle rear gradient behind the room. Both are placed as transparent multiply-blended
  // planes just below the floor so they don't interact with lighting/shadow maps.
  try {
    const floorObj = State.roomFloor;
    const floorY = (floorObj && floorObj.position && typeof floorObj.position.y === 'number') ? floorObj.position.y : -2.5;
    const baseY = floorY - 0.26;

    // Helper: create radial ellipse texture for drop shadow
    const makeEllipseTexture = (size = 1024, innerAlpha = 0.35) => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      // draw radial gradient
      const cx = size / 2, cy = size / 2;
      const r = size * 0.45;
      const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      grad.addColorStop(0, `rgba(0,0,0,${innerAlpha})`);
      grad.addColorStop(0.5, 'rgba(0,0,0,0.35)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    };

    const baseTex = makeEllipseTexture(1024, 0.35);
    const baseSizeX = 6.0, baseSizeZ = 5.0;
    const baseGeo = new THREE.PlaneGeometry(baseSizeX, baseSizeZ);
    // reduce overlay opacity so the ground shadow reads softer
    const baseMat = new THREE.MeshBasicMaterial({ map: baseTex, transparent: true, blending: THREE.MultiplyBlending, depthWrite: false, opacity: 0.6 });
    const baseShadow = new THREE.Mesh(baseGeo, baseMat);
    baseShadow.rotation.x = -Math.PI / 2;
    baseShadow.position.set(0, baseY, 0);
    baseShadow.renderOrder = 998;
    baseShadow.userData._ignoreInteraction = true;
    scene.add(baseShadow);

    // rear ground gradient (fades away toward back)
    const makeRearTexture = (w = 1024, h = 512) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      // vertical gradient from semi-black to transparent
      const g = ctx.createLinearGradient(0, 0, 0, h);
      // softer rear fade so the scene looks lifted but not heavy
      g.addColorStop(0, 'rgba(0,0,0,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      // rounded rect mask
      ctx.fillStyle = g;
      const pad = 40;
      const rw = w - pad * 2, rh = h - pad * 2, rx = 24;
      ctx.beginPath();
      ctx.moveTo(pad + rx, pad);
      ctx.lineTo(pad + rw - rx, pad);
      ctx.quadraticCurveTo(pad + rw, pad, pad + rw, pad + rx);
      ctx.lineTo(pad + rw, pad + rh);
      ctx.lineTo(pad, pad + rh);
      ctx.lineTo(pad, pad + rx);
      ctx.quadraticCurveTo(pad, pad, pad + rx, pad);
      ctx.closePath();
      ctx.fill();
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    };

    const rearTex = makeRearTexture(1024, 512);
    const rearWidth = 3.2, rearDepth = 1.4;
    const rearGeo = new THREE.PlaneGeometry(rearWidth, rearDepth);
    const rearMat = new THREE.MeshBasicMaterial({ map: rearTex, transparent: true, blending: THREE.MultiplyBlending, depthWrite: false, opacity: 0.5 });
    const rearShadow = new THREE.Mesh(rearGeo, rearMat);
    rearShadow.rotation.x = -Math.PI / 2;
    // position the rear shadow slightly in front of the back wall
    const backFrontZ = (typeof State.BACK_WALL_Z_FRONT === 'number') ? State.BACK_WALL_Z_FRONT : -4.5;
    rearShadow.position.set(0, baseY + 0.02, backFrontZ + 0.6);
    rearShadow.renderOrder = 997;
    rearShadow.userData._ignoreInteraction = true;
    scene.add(rearShadow);
  } catch (e) {
    console.warn('ground shadow overlay creation failed', e);
  }

  // 레이캐스터 설정
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  State.setRaycaster(raycaster);
  State.setPointer(pointer);

  // 이벤트 리스너
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('keydown', onKeyDown);

  // Gizmo 요소 설정
  setGizmoEl();
}

export function animate() {
  requestAnimationFrame(animate);
  
  if (State.controls) {
    State.controls.update();
  }
  
  // Gizmo 위치 업데이트 (selection.js에서 import)
  if (window.updateGizmoPosition) {
    window.updateGizmoPosition();
  }
  // Quick actions 위치 업데이트
  if (window.updateQuickActionsPosition) {
    window.updateQuickActionsPosition();
  }
  
  if (State.renderer && State.scene && State.camera) {
    State.renderer.render(State.scene, State.camera);
  }
}
