// drawing.js - 카메라와 함께 이동하는 드로잉 및 입력 모드

import * as THREE from 'three';
import * as State from './state.js';
import { DRAW_COLORS } from './config.js';
import { setSelected } from './selection.js';

const undoHistory = [];
const redoHistory = [];
let strokeEraser = false;

function setStrokeEraser(enabled) {
  strokeEraser = enabled;
  const button = document.getElementById('draw-erase');
  if (button) button.setAttribute('aria-pressed', String(enabled));
  if (State.renderer) State.renderer.domElement.style.cursor = State.drawingMode ? (enabled ? 'pointer' : 'crosshair') : '';
}

export function toggleStrokeEraser() {
  if (!State.isDrawing) setStrokeEraser(!strokeEraser);
}

function updateHistoryButtons() {
  const undo = document.getElementById('draw-undo');
  const redo = document.getElementById('draw-redo');
  if (undo) undo.disabled = State.isDrawing || undoHistory.length === 0;
  if (redo) redo.disabled = State.isDrawing || redoHistory.length === 0;
}

export function resetDrawingHistory() {
  undoHistory.length = 0;
  redoHistory.length = 0;
  State.strokes.forEach(stroke => undoHistory.push({ type: 'stroke', stroke }));
  updateHistoryButtons();
}

export function setDrawingMode(enabled) {
  State.setDrawingMode(enabled);
  if (!enabled) setStrokeEraser(false);
  const layer = document.getElementById('draw-layer');
  const toolbar = document.getElementById('draw-toolbar');
  const toggle = document.getElementById('btn-draw-mode');
  const bottom = document.getElementById('bottom-ui');
  if (layer) layer.classList.toggle('drawing', enabled);
  if (bottom) bottom.classList.toggle('drawing-mode', enabled);
  if (toolbar) toolbar.style.display = enabled ? 'flex' : 'none';
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? '오브제 배치 모드' : '그리기 모드';
  }
  if (enabled) setSelected(null);
  if (State.renderer) State.renderer.domElement.style.cursor = enabled ? (strokeEraser ? 'pointer' : 'crosshair') : '';
}

export function toggleDrawingMode() {
  if (State.stage === 2) setDrawingMode(!State.drawingMode);
}

export function undoDrawing() {
  if (State.isDrawing || undoHistory.length === 0) return;
  const action = undoHistory.pop();
  if (action.type === 'stroke') {
    State.removeLastStroke();
  } else if (action.type === 'erase') {
    State.strokes.splice(action.index, 0, action.stroke);
  } else {
    action.strokes.forEach(stroke => State.addStroke(stroke));
    State.setRoomBackground(action.background);
  }
  redoHistory.push(action);
  redrawAllStrokes();
}

export function redoDrawing() {
  if (State.isDrawing || redoHistory.length === 0) return;
  const action = redoHistory.pop();
  if (action.type === 'stroke') {
    State.addStroke(action.stroke);
  } else if (action.type === 'erase') {
    State.strokes.splice(action.index, 1);
  } else {
    State.clearStrokes();
    State.setRoomBackground(null);
  }
  undoHistory.push(action);
  redrawAllStrokes();
}

// 기존 호출과의 호환성을 유지한다.
export const clearDrawing = undoDrawing;

export function clearAllStrokes() {
  if (State.isDrawing || (!State.strokes.length && !State.roomBackground)) return;
  undoHistory.push({ type: 'clear', strokes: [...State.strokes], background: State.roomBackground });
  redoHistory.length = 0;
  State.clearStrokes();
  State.setRoomBackground(null);
  redrawAllStrokes();
}

export function createCompositeCanvas() {
  if (!State.renderer || !State.scene || !State.camera || !State.drawCanvas) {
    throw new Error('화면이 아직 준비되지 않았습니다.');
  }
  redrawAllStrokes();
  State.renderer.render(State.scene, State.camera);
  const source = State.renderer.domElement;
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 생성할 수 없습니다.');
  ctx.drawImage(source, 0, 0);
  ctx.drawImage(State.drawCanvas, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function saveDrawingImage() {
  try {
    const a = document.createElement('a');
    a.href = createCompositeCanvas().toDataURL('image/png');
    a.download = 'my-room-drawing.png';
    a.click();
  } catch (error) {
    console.error('이미지 저장 실패:', error);
    alert('이미지 저장에 실패했습니다: ' + error.message);
  }
}

function screenToWorld(x, y) {
  const camera = State.camera;
  camera.updateMatrixWorld();
  const point = new THREE.Vector3(x * 2 - 1, 1 - y * 2, 0).unproject(camera);
  const normal = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  // Orthographic drawing plane passes through the world origin, parallel to the screen.
  point.addScaledVector(normal, -point.dot(normal));
  return { x: point.x, y: point.y, z: point.z };
}

function pixelsToWorld(width) {
  return width * (State.camera.top - State.camera.bottom) /
    (State.camera.zoom * State.drawCanvas.height);
}

function eraseStrokeAt(clientX, clientY) {
  const canvas = State.drawCanvas;
  const camera = State.camera;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const pixelsPerWorldUnit = rect.height * camera.zoom / (camera.top - camera.bottom);
  camera.updateMatrixWorld();
  const project = point => {
    const projected = new THREE.Vector3(point.x, point.y, point.z).project(camera);
    return { x: (projected.x + 1) * rect.width / 2, y: (1 - projected.y) * rect.height / 2 };
  };
  const distanceToSegment = (p, a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared)) : 0;
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };
  for (let index = State.strokes.length - 1; index >= 0; index--) {
    const stroke = State.strokes[index];
    if (!stroke.points?.length) continue;
    const tolerance = 8 + stroke.width * pixelsPerWorldUnit / 2;
    let previous = project(stroke.points[0]);
    let hit = distanceToSegment({ x, y }, previous, previous) <= tolerance;
    for (let i = 1; !hit && i < stroke.points.length; i++) {
      const current = project(stroke.points[i]);
      hit = distanceToSegment({ x, y }, previous, current) <= tolerance;
      previous = current;
    }
    if (hit) {
      State.strokes.splice(index, 1);
      undoHistory.push({ type: 'erase', stroke, index });
      redoHistory.length = 0;
      redrawAllStrokes();
      return;
    }
  }
}

export function convertLegacyStrokes(strokes) {
  return strokes.map(stroke => ({
    ...stroke,
    width: pixelsToWorld(stroke.width),
    points: stroke.points.map(point => screenToWorld(point.x, point.y))
  }));
}

export function redrawAllStrokes() {
  updateHistoryButtons();
  if (!State.drawCanvas || !State.drawCtx || !State.camera) return;
  const canvas = State.drawCanvas;
  const ctx = State.drawCtx;
  const camera = State.camera;
  camera.updateMatrixWorld();
  const pixelsPerWorldUnit = canvas.height * camera.zoom / (camera.top - camera.bottom);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (State.roomBackground) {
    ctx.drawImage(State.roomBackground, 0, 0, canvas.width, canvas.height);
  }
  const strokes = State.currentStroke ? [...State.strokes, State.currentStroke] : State.strokes;
  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length === 0) continue;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width * pixelsPerWorldUnit;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    function project(point) {
      const projected = new THREE.Vector3(point.x, point.y, point.z).project(camera);
      return { x: (projected.x + 1) * canvas.width / 2, y: (1 - projected.y) * canvas.height / 2 };
    }
    const first = project(stroke.points[0]);
    if (stroke.points.length === 1) {
      ctx.beginPath();
      ctx.arc(first.x, first.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of stroke.points.slice(1)) {
      const projected = project(point);
      ctx.lineTo(projected.x, projected.y);
    }
    ctx.stroke();
  }
}

export function initDrawingCanvas() {
  const canvas = document.getElementById('draw-canvas');
  if (!canvas) throw new Error('드로잉 캔버스를 찾을 수 없습니다.');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('드로잉 캔버스를 초기화할 수 없습니다.');
  State.setDrawCanvas(canvas);
  State.setDrawCtx(ctx);
  if (!State.renderer) throw new Error('3D 화면을 찾을 수 없습니다.');
  const input = State.renderer.domElement;
  const touches = new Set();
  let drawingPointer = null;
  let multiTouch = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redrawAllStrokes();
  }
  resize();
  window.addEventListener('resize', resize);
  State.controls.addEventListener('change', redrawAllStrokes);
  window.addEventListener('keydown', event => {
    const app = document.getElementById('app-container');
    const target = event.target;
    if (!State.drawingMode || !State.hasStarted || !app || app.style.display === 'none' ||
        event.altKey || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z' ||
        target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    event.preventDefault();
    if (event.shiftKey) redoDrawing();
    else undoDrawing();
  });

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return screenToWorld((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  }

  input.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') {
      touches.add(event.pointerId);
      if (touches.size > 1) {
        multiTouch = true;
        drawingPointer = null;
        State.setIsDrawing(false);
        State.setCurrentStroke(null);
        redrawAllStrokes();
      }
    }
    if (!State.drawingMode || event.button !== 0 || multiTouch) return;
    event.preventDefault();
    event.stopPropagation();
    if (strokeEraser) {
      eraseStrokeAt(event.clientX, event.clientY);
      return;
    }
    input.setPointerCapture(event.pointerId);
    drawingPointer = event.pointerId;
    State.setIsDrawing(true);
    State.setCurrentStroke({ color: State.currentColor, width: pixelsToWorld(3), points: [point(event)] });
    redrawAllStrokes();
  });
  input.addEventListener('pointermove', event => {
    if (event.pointerId !== drawingPointer || !State.isDrawing || !State.currentStroke) return;
    event.preventDefault();
    event.stopPropagation();
    State.currentStroke.points.push(point(event));
    redrawAllStrokes();
  });
  function endDraw(event) {
    if (event.pointerType === 'touch') {
      touches.delete(event.pointerId);
      if (touches.size === 0) multiTouch = false;
    }
    if (event.pointerId !== drawingPointer || !State.isDrawing || !State.currentStroke) return;
    event.stopPropagation();
    undoHistory.push({ type: 'stroke', stroke: State.currentStroke });
    redoHistory.length = 0;
    State.addStroke(State.currentStroke);
    drawingPointer = null;
    State.setCurrentStroke(null);
    State.setIsDrawing(false);
    redrawAllStrokes();
  }
  input.addEventListener('pointerup', endDraw);
  input.addEventListener('pointercancel', endDraw);
}

export function initColorPalette() {
  const buttons = document.querySelectorAll('[data-draw-color]');
  buttons.forEach((button, index) => {
    const color = DRAW_COLORS[index];
    if (!color) return;
    button.style.backgroundColor = color;
    button.classList.toggle('active', color === State.currentColor);
    button.addEventListener('click', () => {
      setStrokeEraser(false);
      State.setCurrentColor(color);
      buttons.forEach(b => b.classList.remove('active'));
      button.classList.add('active');
    });
  });
}

window.toggleDrawingMode = toggleDrawingMode;
window.toggleStrokeEraser = toggleStrokeEraser;
window.undoDrawing = undoDrawing;
window.redoDrawing = redoDrawing;
window.clearDrawing = clearDrawing;
window.saveDrawingImage = saveDrawingImage;
window.clearAllStrokes = clearAllStrokes;
