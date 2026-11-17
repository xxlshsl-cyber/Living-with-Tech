// objects.js - 오브젝트 생성 및 관리

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as State from './state.js';
import { ITEM_CONFIGS } from './config.js';
import { setSelected } from './selection.js';
import { updateStageButtons } from './ui.js';

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

// Simple caches to avoid reloading assets repeatedly
const modelCache = new Map(); // key: glb path, value: { scene, center, minY }
const textureCache = new Map(); // key: texture path, value: THREE.Texture
const textCardCache = new Map();

// Reuse card geometry and textures so repeated placements do not allocate new GPU resources.
function createTextCard(label) {
  if (!textCardCache.has(label)) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '700 128px sans-serif';
    const textWidth = ctx.measureText(label).width;
    canvas.width = Math.max(1024, Math.ceil(textWidth + 192));
    canvas.height = 448;
    const radius = 64;
    ctx.fillStyle = '#efefef';
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
    ctx.lineTo(radius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#343a40';
    ctx.font = '700 128px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = State.renderer ? State.renderer.capabilities.getMaxAnisotropy() : 1;
    textCardCache.set(label, {
      faceGeometry: new THREE.PlaneGeometry(1.2 * canvas.width / 1024, 0.525),
      faceMaterial: new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.01 })
    });
  }

  const { faceGeometry, faceMaterial } = textCardCache.get(label);
  const card = new THREE.Group();
  const face = new THREE.Mesh(faceGeometry, faceMaterial);
  card.add(face);
  if (State.camera) card.quaternion.copy(State.camera.quaternion);
  return card;
}

export function spawnItem(name, color) {
  const cfg = ITEM_CONFIGS.find(c => c.id === name);
  if (!cfg) {
    console.warn('알 수 없는 아이템 id:', name);
    return;
  }

  if (State.stage !== 2) {
    alert('2단계에서 오브제를 배치할 수 있어요.');
    return;
  }

  // 스페이스 카테고리: 바닥 재질 적용
  if (cfg.category === 'space') {
    if (cfg.texture) {
      // reuse cached texture when possible
      const texPath = cfg.texture;
      const onTextureReady = (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;

        const repeatX = (cfg.repeatX !== undefined) ? cfg.repeatX : (cfg.applyTo === 'wall' ? 2 : 4);
        const repeatY = (cfg.repeatY !== undefined) ? cfg.repeatY : (cfg.applyTo === 'wall' ? 2 : 4);
        tex.repeat.set(repeatX, repeatY);

        const newMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });

        // helper to apply material to a mesh (dispose previous)
        const applyToMesh = (mesh) => {
          if (!mesh) return;
          try {
            if (mesh.material) {
              if (mesh.material.map) mesh.material.map.dispose();
              if (typeof mesh.material.dispose === 'function') mesh.material.dispose();
            }
          } catch (e) {
            console.warn('Error disposing old material', e);
          }
          mesh.material = newMat.clone();
          mesh.material.needsUpdate = true;
        };

        const target = cfg.applyTo || 'floor';
        if (target === 'floor') {
          if (State.roomFloor) {
            applyToMesh(State.roomFloor);
          } else {
            console.warn('roomFloor not available to apply texture');
          }
        } else if (target === 'wall') {
          // apply to both walls unless specific wallTarget provided
          const wallTarget = cfg.wallTarget || 'both';
          if ((wallTarget === 'both' || wallTarget === 'back') && State.roomBackWall) applyToMesh(State.roomBackWall);
          if ((wallTarget === 'both' || wallTarget === 'left') && State.roomLeftWall) applyToMesh(State.roomLeftWall);
        } else if (target === 'both') {
          if (State.roomFloor) applyToMesh(State.roomFloor);
          if (State.roomBackWall) applyToMesh(State.roomBackWall);
          if (State.roomLeftWall) applyToMesh(State.roomLeftWall);
        }
      };

      if (textureCache.has(texPath)) {
        onTextureReady(textureCache.get(texPath));
      } else {
        textureLoader.load(texPath,
          (tex) => {
            textureCache.set(texPath, tex);
            onTextureReady(tex);
          },
          undefined,
          (err) => { console.error('텍스처 로드 실패', err); }
        );
      }
    }
    return;
  }

  const baseOffset = cfg.yOffset ?? (cfg.type === 'text' ? 1.4 : 0);
  const isBed = cfg.category === 'bed-setup';
  const baseY = State.groundPlane.position.y + baseOffset;

  // 공통 루트 그룹
  const root = new THREE.Group();
  // default position on the floor
  root.position.set(1.5, baseY, 0.5);
  // small vertical margin so items don't intersect the bed surface
  // increased margin for safer separation
  const BED_PLACEMENT_MARGIN = 0.05;
  // Determine if this item should be placed on top of a bed
  const isBeddingCategory = (cfg.category === 'bed-setup' || cfg.category === 'bedding');
  // consider actual beds to be items whose id starts with 'bed' (e.g. 'bed 1')
  const isActualBed = (/^bed\b/i).test(cfg.id);
  const shouldPlaceOnBed = isBeddingCategory && !isActualBed;
  if (shouldPlaceOnBed) {
    // prefer currently selected bed, otherwise use the last placed bed in the scene
    let bedRoot = null;
    if (State.selectedObject && State.selectedObject.userData && State.selectedObject.userData.isBed) {
      bedRoot = State.selectedObject;
    } else {
      // search scene children for bed roots (userData.isBed true), take the last one
      const beds = [];
      State.scene.traverse((obj) => {
        if (obj.userData && obj.userData.isBed) beds.push(obj);
      });
      if (beds.length > 0) bedRoot = beds[beds.length - 1];
    }

    if (bedRoot) {
      try {
        const bedBox = new THREE.Box3().setFromObject(bedRoot);
        const bedCenter = new THREE.Vector3();
        bedBox.getCenter(bedCenter);
        const bedTopY = bedBox.max.y;
        // place initial root centered on the bed top (x,z), y will be finalized after model is added
        root.position.set(bedCenter.x, bedTopY + BED_PLACEMENT_MARGIN + baseOffset, bedCenter.z);
        root.userData.parentBed = bedRoot;
        root.userData.parentBedTop = bedTopY;
        // record the margin used when placing on bed so other code (nudges)
        // can prevent the item from sinking into the bed later.
        root.userData.bedMargin = BED_PLACEMENT_MARGIN;
      } catch (e) {
        console.warn('Could not compute bed bounds for placement', e);
      }
    }
  }
  root.userData = {
    itemName: cfg.id,
    itemType: cfg.type,
    isDraggableRoot: true,
    isBed,
    // store initial desired offset; we'll update this after final alignment
    baseYOffset: baseOffset,
    baseY,
    isWall: cfg.category === 'wall'
  };

  State.draggableObjects.push(root);
  State.scene.add(root);
  setSelected(root);

  // 침대 개수 관리
  if (isBed) {
    State.setBedCount(State.bedCount + 1);
    updateStageButtons();
  }

  if (cfg.type === 'text') {
    root.add(createTextCard(cfg.label || cfg.id));
    return;
  }

  // GLB 로드
  if (cfg.glb) {
    const glbPath = `models/${cfg.glb}`;

    const addModelToRoot = (modelScene, cacheMeta) => {
      // clone to allow independent transforms while reusing geometries
      const clone = modelScene.clone(true);

      // apply texture optimizations and material tweaks on the clone
      clone.traverse((child) => {
        if (child.isMesh && child.material) {
          if (child.material.map) {
            child.material.map.minFilter = THREE.LinearFilter;
            child.material.map.magFilter = THREE.LinearFilter;
            child.material.map.generateMipmaps = false;
            child.material.map.needsUpdate = true;
          }
          if (child.material.roughness !== undefined) child.material.roughness = 0.4;
          if (child.material.metalness !== undefined) child.material.metalness = 0.05;
          if (child.material.emissive !== undefined) {
            child.material.emissive.setHex(0x111111);
            child.material.emissiveIntensity = 0.15;
          }
          child.material.flatShading = false;
          child.material.needsUpdate = true;
          // enable shadow casting/receiving for meshes so they interact with scene lights
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // apply scale if provided
      if (cfg.scale) clone.scale.setScalar(cfg.scale);

      // center & align to floor using cached metadata (if available)
      if (cacheMeta && cacheMeta.center) {
        const c = cacheMeta.center.clone();
        clone.position.sub(c);
        const minY = cacheMeta.minY || 0;
        clone.position.y -= minY * (cfg.scale || 1);
      } else {
        const box = new THREE.Box3().setFromObject(clone);
        const center = new THREE.Vector3();
        box.getCenter(center);
        clone.position.sub(center);
        const box2 = new THREE.Box3().setFromObject(clone);
        const minY = box2.min.y;
        clone.position.y -= minY;
      }

      root.add(clone);
      // Ensure the root sits flush on the ground plane: compute the final
      // bounding box and move the root so its lowest point == ground Y + baseOffset
      try {
        const finalBox = new THREE.Box3().setFromObject(root);
        const finalMinY = finalBox.min.y;
        // If the root has a parentBedTop (we want to sit on a bed), use that as the target Y
        const targetY = (root.userData && typeof root.userData.parentBedTop === 'number') ?
          (root.userData.parentBedTop + baseOffset + BED_PLACEMENT_MARGIN) :
          ((State.groundPlane && typeof State.groundPlane.position.y === 'number') ? (State.groundPlane.position.y + baseOffset) : 0);
        let delta = targetY - finalMinY;
        if (Math.abs(delta) > 1e-6) {
          root.position.y += delta;
        }
        // Safety loop: if after alignment the model still intersects the bed bounding box,
        // nudge it upward in small steps until there's no intersection or we reach a limit.
        if (root.userData && root.userData.parentBed) {
          try {
            const bedBox = new THREE.Box3().setFromObject(root.userData.parentBed);
            let attempts = 0;
            const maxAttempts = 12;
            // recompute final box and check intersection
            let newBox = new THREE.Box3().setFromObject(root);
            while (attempts < maxAttempts && newBox.intersectsBox(bedBox)) {
              root.position.y += 0.01; // nudge up 1cm
              attempts += 1;
              newBox = new THREE.Box3().setFromObject(root);
            }
          } catch (e) {
            // ignore errors in bounding computations
          }
        }
        // Persist the actual baseYOffset after final alignment so future
        // drags/clamps use the correct height reference.
        if (!root.userData) root.userData = {};
        const groundY = (State.groundPlane && typeof State.groundPlane.position.y === 'number') ? State.groundPlane.position.y : 0;
        root.userData.baseYOffset = root.position.y - groundY;
        root.userData.baseY = root.position.y;
      } catch (e) {
        // ignore any errors computing bounds
        console.warn('Could not align spawned object to ground:', e);
      }
    };

    if (modelCache.has(glbPath)) {
      const meta = modelCache.get(glbPath);
      addModelToRoot(meta.scene, meta);
    } else {
      gltfLoader.load(
        glbPath,
        (gltf) => {
          const model = gltf.scene;

          // compute center/minY once for reuse WITHOUT mutating the original
          const box = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          box.getCenter(center);

          // make a temporary clone to compute minY after centering
          const tmp = model.clone(true);
          tmp.position.sub(center);
          const box2 = new THREE.Box3().setFromObject(tmp);
          const minY = box2.min.y;

          // cache the original (unmutated) scene and metadata
          modelCache.set(glbPath, { scene: model, center: center.clone(), minY });

          addModelToRoot(model, { center: center.clone(), minY });
        },
        undefined,
        (err) => {
          console.error(`GLB 로드 실패 (${cfg.glb})`, err);
        }
      );
    }
  }
}

// 전역 함수로 노출
window.spawnItem = spawnItem;
