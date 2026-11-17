// main.js - 앱 초기화

import * as State from './js/state.js';
import { initScene, animate } from './js/scene.js';
import { renderItemBar, updateStageButtons } from './js/ui.js';
import { initDrawingCanvas, initColorPalette, setDrawingMode } from './js/drawing.js';
import './js/archive.js';

window.startGame = function () {
  if (State.hasStarted) return;
  const startScreen = document.getElementById('start-screen');
  const appContainer = document.getElementById('app-container');
  if (startScreen) startScreen.style.display = 'none';
  if (appContainer) appContainer.style.display = 'block';

  try {
    initScene();
    initDrawingCanvas();
    initColorPalette();
    renderItemBar();
    setDrawingMode(true);
    updateStageButtons();
    State.setHasStarted(true);
    animate();
  } catch (error) {
    console.error('초기화 실패:', error);
    alert('초기화 중 오류가 발생했습니다. 콘솔을 확인하세요. ' + error.message);
  }
};

window.updateStageButtons = updateStageButtons;

window.finishDrawing = function () {
  const app = document.getElementById('app-container');
  const finish = document.getElementById('finish-screen');
  if (app) app.style.display = 'none';
  if (finish) finish.style.display = 'grid';
};

function bindFinishButtons() {
  const saveBtn = document.getElementById('finish-save');
  const archiveBtn = document.getElementById('finish-archive');
  if (saveBtn) saveBtn.addEventListener('click', () => window.downloadDrawingPNG());
  if (archiveBtn) archiveBtn.addEventListener('click', () => window.showLocalGallery());
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bindFinishButtons);
} else {
  bindFinishButtons();
}
