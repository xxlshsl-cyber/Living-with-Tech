// archive.js - JSON/PNG 아카이빙 (ZIP + localStorage)

import * as State from './state.js';
import * as THREE from 'three';
import { spawnItem } from './objects.js';
import { createCompositeCanvas, convertLegacyStrokes, redrawAllStrokes, resetDrawingHistory } from './drawing.js';

// 간단 JSON 생성: 현재 배치 데이터 수집
function collectLayoutJSON() {
  const data = State.draggableObjects.map(obj => ({
    item: obj.userData.itemName || obj.name || 'unknown',
    position: {
      x: parseFloat(obj.position.x.toFixed(2)),
      y: parseFloat(obj.position.y.toFixed(2)),
      z: parseFloat(obj.position.z.toFixed(2))
    },
    rotationY: parseFloat(obj.rotation.y.toFixed(3))
  }));
  return JSON.stringify({ createdAt: new Date().toISOString(), objects: data }, null, 2);
}

// 현재 드로잉 PNG DataURL
function collectDrawingPNGDataURL() {
  return createCompositeCanvas().toDataURL('image/png');
}

// JSZip 동적 로드
async function ensureJSZip() {
  if (window.JSZip) return window.JSZip;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('JSZip 로드 실패'));
    document.head.appendChild(s);
  });
  return window.JSZip;
}

export async function exportArchiveZip() {
  const layoutJson = collectLayoutJSON();
  const pngDataURL = collectDrawingPNGDataURL();

  const JSZip = await ensureJSZip();
  const zip = new JSZip();

  zip.file('layout.json', layoutJson);

  if (pngDataURL) {
    // DataURL 헤더 제거 후 바이너리로 추가
    const base64 = pngDataURL.split(',')[1];
    zip.file('drawing.png', base64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'room-archive.zip';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadLayoutJSON() {
  const json = collectLayoutJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'layout.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadDrawingPNG() {
  try {
    const a = document.createElement('a');
    a.href = collectDrawingPNGDataURL();
    a.download = 'my-room-drawing.png';
    a.click();
  } catch (error) {
    console.error('이미지 저장 실패:', error);
    alert('이미지 저장에 실패했습니다: ' + error.message);
  }
}

// 다중 슬롯 저장: 사용자 지정 이름으로 저장/복원
function readAllSaves() {
  try {
    const raw = localStorage.getItem('room_saves');
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function writeAllSaves(map) {
  localStorage.setItem('room_saves', JSON.stringify(map));
}

// 레거시 키에서 자동 마이그레이션 (예전 단일 저장 방식)
function migrateLegacySaves() {
  try {
    const legacyJson = localStorage.getItem('room_layout_json');
    const legacyPng  = localStorage.getItem('room_drawing_png');
    if (!legacyJson && !legacyPng) return;
    const saves = readAllSaves();
    const name = '기존저장1';
    if (!saves[name]) {
      saves[name] = {
        layoutJson: legacyJson || JSON.stringify({ objects: [] }),
        drawingPng: legacyPng || null,
        createdAt: new Date().toISOString()
      };
      writeAllSaves(saves);
      // 마이그레이션 완료 후 레거시 키 제거 (중복 재생성 방지)
      localStorage.removeItem('room_layout_json');
      localStorage.removeItem('room_drawing_png');
    }
  } catch (_) { /* ignore */ }
}

function transparentPixel() {
  // 1x1 투명 PNG
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAuMBgYw1A2sAAAAASUVORK5CYII=';
}

function generatePreviewFallback() {
  try {
    if (State.renderer && State.scene && State.camera && State.renderer.domElement) {
      // 메인 렌더러로 1프레임 그린 뒤, 메인 캔버스를 오프스크린 2D 캔버스로 축소 복사
      State.renderer.render(State.scene, State.camera);
      const src = State.renderer.domElement;
      const w = 360;
      const h = Math.round(w * (src.height / src.width));
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const ctx = off.getContext('2d');
      ctx.drawImage(src, 0, 0, off.width, off.height);
      const data = off.toDataURL('image/jpeg', 0.85);
      if (data && typeof data === 'string' && data.startsWith('data:image')) return data;
    }
  } catch (_) { /* ignore */ }
  return transparentPixel();
}

export function saveToLocal() {
  const name = (prompt('저장할 이름을 입력하세요 (예: 내방1)') || '').trim();
  if (!name) {
    alert('저장 이름이 필요합니다.');
    return;
  }
  try {
    const json = collectLayoutJSON();
    const png = collectDrawingPNGDataURL();
    const saves = readAllSaves();
    saves[name] = {
      layoutJson: json,
      drawingPng: png,
      strokes: State.strokes,
      strokeSpace: 'world-v1',
      legacyBackground: State.roomBackground ? State.roomBackground.src : null,
      createdAt: new Date().toISOString()
    };
    writeAllSaves(saves);
    alert(`'${name}' 이름으로 로컬 저장되었습니다.`);
  } catch (e) {
    alert('로컬 저장 실패: ' + e.message);
  }
}

// Attempt to recover possible save data from other localStorage keys.
// This is non-destructive: it will merge recovered entries into `room_saves` without overwriting existing names.
export function attemptRecoverFromLocalStorage() {
  try {
    const recovered = [];
    const existing = readAllSaves();
    // scan all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // skip the main saves key
      if (key === 'room_saves') continue;
      const val = localStorage.getItem(key);
      if (!val) continue;

      // If value looks like a data URL image
      if (typeof val === 'string' && val.indexOf('data:image') === 0) {
        // create a unique name
        let name = `Recovered_${key}`;
        let idx = 1;
        while (existing[name]) { name = `Recovered_${key}_${idx++}`; }
        existing[name] = { layoutJson: null, drawingPng: val, createdAt: new Date().toISOString() };
        recovered.push(name);
      }

      // If value is JSON with an objects array (likely a layout)
      if (typeof val === 'string' && val.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(val);
          if (parsed && Array.isArray(parsed.objects)) {
            let name = `Recovered_layout_${key}`;
            let idx = 1;
            while (existing[name]) { name = `Recovered_layout_${key}_${idx++}`; }
            existing[name] = { layoutJson: val, drawingPng: null, createdAt: new Date().toISOString() };
            recovered.push(name);
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    if (recovered.length > 0) {
      // write merged saves back
      writeAllSaves(existing);
    }
    return recovered;
  } catch (e) {
    console.warn('recover attempt failed', e);
    return [];
  }
}

// expose recover function
window.attemptRecoverFromLocalStorage = attemptRecoverFromLocalStorage;

// 복원은 레이아웃만 기본 제공(모델 재배치). 드로잉은 캔버스에 다시 그리기.
export function loadFromLocal() {
  const saves = readAllSaves();
  // Sort names so the most recently created saves appear first in the gallery
  const names = Object.keys(saves).sort((a, b) => {
    const ta = new Date(saves[a] && saves[a].createdAt ? saves[a].createdAt : 0).getTime();
    const tb = new Date(saves[b] && saves[b].createdAt ? saves[b].createdAt : 0).getTime();
    return tb - ta; // newest first
  });
  if (names.length === 0) {
    alert('저장된 항목이 없습니다. 먼저 저장해 주세요.');
    return;
  }
  const choice = (prompt(`복원할 이름을 입력하세요:\n${names.join(', ')}`) || '').trim();
  if (!choice || !saves[choice]) {
    alert('유효한 저장 이름이 아닙니다.');
    return;
  }
  const { layoutJson: json, drawingPng: png, strokes, strokeSpace, legacyBackground } = saves[choice];

  // 기존 오브젝트 제거
  [...State.draggableObjects].forEach(obj => {
    State.scene.remove(obj);
  });
  State.draggableObjects.length = 0;

  try {
    const parsed = JSON.parse(json);
    const items = parsed.objects || [];
    // 실제 모델 복원: 저장된 item ID로 spawnItem 후 위치/회전 적용
    items.forEach(info => {
      spawnItem(info.item);
      const obj = State.selectedObject || State.draggableObjects[State.draggableObjects.length - 1];
      if (obj) {
        obj.position.set(info.position.x, info.position.y, info.position.z);
        if (obj.userData.itemType !== 'text') obj.rotation.y = info.rotationY || 0;
        if (obj.userData.itemType === 'text' && State.groundPlane) {
          obj.userData.baseYOffset = info.position.y - State.groundPlane.position.y;
        }
      }
    });
  } catch (e) {
    alert('레이아웃 복원 실패: ' + e.message);
  }

  // 드로잉 복원
  State.clearStrokes();
  State.setRoomBackground(null);
  if (Array.isArray(strokes)) {
    const restoredStrokes = strokeSpace === 'world-v1' ? strokes : convertLegacyStrokes(strokes);
    restoredStrokes.forEach(stroke => State.addStroke(stroke));
  }
  resetDrawingHistory();
  const background = Array.isArray(strokes) ? legacyBackground : png;
  if (background && State.drawCanvas && State.drawCtx) {
    const img = new Image();
    img.onload = () => {
      State.setRoomBackground(img);
      redrawAllStrokes();
    };
    img.onerror = () => alert('저장된 드로잉을 불러오지 못했습니다.');
    img.src = background;
  } else {
    redrawAllStrokes();
  }
}

// window에 노출
window.exportArchiveZip = exportArchiveZip;
window.downloadLayoutJSON = downloadLayoutJSON;
window.downloadDrawingPNG = downloadDrawingPNG;
window.saveToLocal = saveToLocal;
window.loadFromLocal = loadFromLocal;

// 갤러리 UI: 저장 목록 미리보기 + 복원/삭제
export function showLocalGallery() {
  migrateLegacySaves();
  const saves = readAllSaves();
  // sort saved entries so newest appear first
  let names = Object.keys(saves).sort((a, b) => {
    const ta = saves[a] && saves[a].createdAt ? new Date(saves[a].createdAt).getTime() : 0;
    const tb = saves[b] && saves[b].createdAt ? new Date(saves[b].createdAt).getTime() : 0;
    return tb - ta;
  });
  let modal = document.getElementById('local-gallery-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'local-gallery-modal';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'stretch';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    const panel = document.createElement('div');
    panel.id = 'local-gallery-panel';
    panel.style.background = '#fff';
    panel.style.width = '100vw';
    panel.style.height = '100vh';
    panel.style.overflow = 'auto';
    // make the gallery panel edge-to-edge so thumbnails can touch viewport edges
    panel.style.borderRadius = '0';
    panel.style.boxShadow = 'none';
    panel.style.padding = '0';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    // add top/left padding so the title and brand aren't flush to the viewport edge
    header.style.padding = '24px 24px 12px 24px';

    // Left side: archive title
    const leftHeader = document.createElement('div');
    leftHeader.style.display = 'flex';
    leftHeader.style.flexDirection = 'column';
    leftHeader.style.gap = '4px';

    const title = document.createElement('h2');
    title.textContent = '아카이빙';
    title.className = 'archive-title';
    title.style.margin = '0';

    leftHeader.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '닫기';
    // use the same visual style as the start-screen "Archiving" button
    closeBtn.className = 'archive-btn';
    closeBtn.onclick = () => modal.remove();

    header.appendChild(leftHeader);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const grid = document.createElement('div');
    grid.id = 'local-gallery-grid';
    grid.style.display = 'grid';
    // allow cards to fill available width responsively
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(360px, 1fr))';
    // remove gaps so thumbnails sit flush with each other and the viewport
    grid.style.gap = '0';
    grid.style.marginTop = '0';
    panel.appendChild(grid);

    modal.appendChild(panel);
    document.body.appendChild(modal);
  } else {
    modal.style.display = 'flex';
  }

  const grid = modal.querySelector('#local-gallery-grid');
  grid.innerHTML = '';

  if (names.length === 0) {
    // try a non-destructive recovery scan of localStorage to find lost images/layouts
    const recovered = attemptRecoverFromLocalStorage();
    if (recovered && recovered.length > 0) {
      // reload saves and names
      const newSaves = readAllSaves();
      names = Object.keys(newSaves).sort((a, b) => {
        const ta = newSaves[a] && newSaves[a].createdAt ? new Date(newSaves[a].createdAt).getTime() : 0;
        const tb = newSaves[b] && newSaves[b].createdAt ? new Date(newSaves[b].createdAt).getTime() : 0;
        return tb - ta;
      });
    }
  }

  if (names.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = '저장된 항목이 없습니다.';
    empty.style.padding = '24px';
    grid.appendChild(empty);
    return;
  }

  names.forEach(name => {
    const item = saves[name];
    const card = document.createElement('div');

    // make each card full-bleed (no internal spacing or rounded corners)
    card.style.border = 'none';
    card.style.borderRadius = '0';
    card.style.overflow = 'hidden';
    card.style.background = '#ffffff';

    const thumbWrap = document.createElement('div');
    thumbWrap.style.width = '100%';
    thumbWrap.style.aspectRatio = '16 / 9';
    thumbWrap.style.position = 'relative';
    const img = document.createElement('img');
    img.src = item.drawingPng || transparentPixel();
    img.onerror = () => {
      img.src = transparentPixel();
      img.style.background = 'linear-gradient(135deg, #ddd, #f5f5f5)';
    };
    img.alt = name;
    img.style.position = 'absolute';
    img.style.inset = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.background = '#eee';
    thumbWrap.appendChild(img);

    const info = document.createElement('div');
    info.style.padding = '8px';
    const label = document.createElement('div');
    label.textContent = name;
    label.style.fontWeight = '600';
    const meta = document.createElement('div');
    meta.textContent = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
    meta.style.fontSize = '12px';
    meta.style.color = '#666';

    // Actions removed: restore and delete buttons are intentionally omitted
    info.appendChild(label);
    info.appendChild(meta);

    card.appendChild(thumbWrap);
    card.appendChild(info);
    grid.appendChild(card);
  });

  // make images cover their cells and remove any inner spacing
  const allCards = grid.querySelectorAll('div');
  allCards.forEach(c => {
    c.style.margin = '0';
    c.style.boxShadow = 'none';
  });

  // Close modal when clicking the dim/empty panel background (not on cards)
  const panelEl = modal.querySelector('#local-gallery-panel');
  if (panelEl) {
    panelEl.addEventListener('click', (ev) => {
      // If user clicked directly on the panel background (not inside grid/header/card), close
      if (ev.target === panelEl) {
        modal.remove();
      }
    });
  }

  // Lightbox viewer: open large image when clicking a thumbnail
  function openViewer(src) {
    // avoid duplicate viewers
    if (document.getElementById('local-gallery-viewer')) return;
    const viewer = document.createElement('div');
    viewer.id = 'local-gallery-viewer';
    viewer.style.position = 'fixed';
    viewer.style.inset = '0';
    viewer.style.display = 'flex';
    viewer.style.alignItems = 'center';
    viewer.style.justifyContent = 'center';
    viewer.style.background = 'rgba(0,0,0,0.85)';
    viewer.style.zIndex = '10001';

    const large = document.createElement('img');
    large.src = src || transparentPixel();
    large.style.maxWidth = '90%';
    large.style.maxHeight = '90%';
    large.style.objectFit = 'contain';
    large.style.boxShadow = '0 20px 60px rgba(0,0,0,0.6)';
    large.style.borderRadius = '8px';
    large.addEventListener('click', (e) => e.stopPropagation());

    viewer.appendChild(large);
    viewer.addEventListener('click', () => viewer.remove());
    document.body.appendChild(viewer);
  }

  // Attach click handlers to thumbnails after grid is populated
  const imgs = grid.querySelectorAll('img');
  imgs.forEach(imgEl => {
    imgEl.style.cursor = 'zoom-in';
    imgEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openViewer(imgEl.src);
    });
  });
}

window.showLocalGallery = showLocalGallery;
