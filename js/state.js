// state.js - 전역 상태 관리

import * as THREE from 'three';

// Three.js 핵심 객체들
export let scene, camera, renderer, controls;
export let raycaster, pointer;

// 오브젝트 관리
export let draggedObject = null;
export let selectedObject = null;
export const draggableObjects = [];

// 평면 및 위치
export let groundPlane;
export let wallMovePlane;
export let wallPlaneBack;
export let wallPlaneLeft;
export let roomFloor;
export let roomBackWall;
export let roomLeftWall;
export let roomBounds = null;

export let BACK_WALL_Z_FRONT = -5.0;
export let LEFT_WALL_X_FRONT = -5.0;

// 게임 상태
export let stage = 1;  // 1: 드로잉, 2: 오브제 배치
export let drawingMode = true;
export let bedCount = 0;
export let hasStarted = false;

// UI 요소
export let gizmoEl;

// 드로잉 상태
export let isDrawing = false;
export let drawCanvas, drawCtx;
export let lastDrawX = 0, lastDrawY = 0;
export let currentColor = '#000000';
export let strokes = [];
export let currentStroke = null;
export let roomBackground = null;

// Setter 함수들
export function setScene(value) { scene = value; }
export function setCamera(value) { camera = value; }
export function setRenderer(value) { renderer = value; }
export function setControls(value) { controls = value; }
export function setRaycaster(value) { raycaster = value; }
export function setPointer(value) { pointer = value; }
export function setDraggedObject(value) { draggedObject = value; }
export function setSelectedObject(value) { selectedObject = value; }
export function setGroundPlane(value) { groundPlane = value; }
export function setWallMovePlane(value) { wallMovePlane = value; }
export function setWallPlaneBack(value) { wallPlaneBack = value; }
export function setWallPlaneLeft(value) { wallPlaneLeft = value; }
export function setRoomFloor(value) { roomFloor = value; }
export function setRoomBackWall(value) { roomBackWall = value; }
export function setRoomLeftWall(value) { roomLeftWall = value; }
export function setRoomBounds(value) { roomBounds = value; }
export function setBackWallZFront(value) { BACK_WALL_Z_FRONT = value; }
export function setLeftWallXFront(value) { LEFT_WALL_X_FRONT = value; }
export function setStage(value) { stage = value; }
export function setDrawingMode(value) { drawingMode = value; }
export function setBedCount(value) { bedCount = value; }
export function setHasStarted(value) { hasStarted = value; }
export function setGizmoEl(value) { gizmoEl = value; }
export function setIsDrawing(value) { isDrawing = value; }
export function setDrawCanvas(value) { drawCanvas = value; }
export function setDrawCtx(value) { drawCtx = value; }
export function setLastDrawX(value) { lastDrawX = value; }
export function setLastDrawY(value) { lastDrawY = value; }
export function setCurrentColor(value) { currentColor = value; }
export function setCurrentStroke(value) { currentStroke = value; }
export function setRoomBackground(value) { roomBackground = value; }

export function addStroke(stroke) { strokes.push(stroke); }
export function removeLastStroke() { strokes.pop(); }
export function clearStrokes() { strokes = []; }
