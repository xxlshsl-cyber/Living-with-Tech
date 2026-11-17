// ui.js - 단계 및 오브제 선택 UI

import * as State from './state.js';
import { APPLIANCE_LABELS, CATEGORIES, ITEM_CONFIGS } from './config.js';
import { spawnItem } from './objects.js';
import { setDrawingMode } from './drawing.js';

export function renderItemBar() {
  const bar = document.getElementById('item-bar');
  if (!bar) return;
  bar.innerHTML = '';
  const categories = [...CATEGORIES];
  while (categories.length < 2) categories.push(null);
  categories.forEach(cat => {
    const section = document.createElement('section');
    section.className = 'inventory-category';
    if (cat) section.dataset.catId = cat.id;

    const heading = document.createElement('h2');
    heading.className = 'inventory-category-title';
    if (cat && (cat.icon || cat.svg)) {
      const icon = document.createElement('img');
      icon.className = 'inventory-category-icon';
      icon.src = cat.icon || cat.svg;
      icon.alt = '';
      heading.appendChild(icon);
    }
    heading.appendChild(document.createTextNode(cat ? (cat.label || cat.id) : '새 카테고리'));
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'inventory-category-items';
    grid.tabIndex = 0;
    grid.setAttribute('aria-label', `${cat ? (cat.label || cat.id) : '새 카테고리'} 아이템`);
    ITEM_CONFIGS.filter(cfg => cat && cfg.category === cat.id).forEach(cfg => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'item-card';
      card.dataset.itemId = cfg.id;
      const name = cfg.label || (cfg.category === 'appliance' && APPLIANCE_LABELS[cfg.id]) || cfg.id;
      card.setAttribute('aria-label', `${name} 배치`);
      if (cfg.type === 'text') {
        card.classList.add('item-card-text');
        card.textContent = cfg.label || cfg.id;
      } else {
        const img = document.createElement('img');
        img.className = 'item-icon';
        img.src = cfg.icon || 'icon_b.png';
        img.alt = '';
        const label = document.createElement('div');
        label.className = 'item-label';
        label.textContent = name;
        label.setAttribute('aria-hidden', 'true');
        card.appendChild(img);
        card.appendChild(label);
      }
      card.addEventListener('click', () => spawnItem(cfg.id, cfg.color));
      grid.appendChild(card);
    });
    if (!grid.children.length) {
      const empty = document.createElement('p');
      empty.className = 'inventory-category-empty';
      empty.textContent = cat ? '아이템이 없습니다.' : '카테고리를 추가해주세요.';
      grid.appendChild(empty);
    }
    section.appendChild(grid);
    bar.appendChild(section);
  });
}

const STAGE_INFO = {
  1: {
    label: 'Step 01',
    desc: '당신은 어떤 모습인가요?',
    tips: ['당신은 어떤 모습을 하고 있는지, 그림으로 나타내 주세요!'],
    steps: [
      '원하는 색을 선택해요.',
      '나의 모습을 자유롭게 그려보아요.',
      '오른쪽 버튼으로 화면을 이동하고 휠로 확대·축소해요.'
    ]
  },
  2: {
    label: 'Step 02',
    desc: '당신과 기술은 어떤 관계인가요?',
    tips: ['당신과 기술의 관계가 드러나는 상징적인 방을 묘사해 주세요!\n이기술 요소, 위치, 색상, 감정, 선의 형태 등으로 자유롭게 표현해 주세요.'],
    steps: [
      '인벤토리에서 원하는 오브젝트를 클릭해요.',
      '마우스를 활용해 오브젝트의 위치를 설정해요.',
      '그리기 모드에서 언제든 그림을 추가할 수 있어요.',
      '오른쪽 버튼으로 화면을 이동하고 휠로 확대·축소해요.'
    ]
  }
};

export function updateStageInfo(stage) {
  const info = STAGE_INFO[stage];
  if (!info) return;
  const el = document.getElementById('step-info');
  const label = document.getElementById('step-label');
  const desc = document.getElementById('step-desc');
  const tips = document.getElementById('step-tips');
  if (!el || !label || !desc || !tips) return;
  el.className = `stage-${stage} show-tips`;
  label.textContent = info.label;
  desc.textContent = info.desc;
  tips.innerHTML = '';
  info.tips.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    tips.appendChild(li);
  });
  tips.setAttribute('aria-hidden', 'false');
}

export function updateHowTo(stage) {
  const info = STAGE_INFO[stage];
  const list = document.getElementById('howto-list');
  if (!info || !list) return;
  list.innerHTML = '';
  info.steps.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  });
}

export function updateStageButtons() {
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next-floating');
  const toggle = document.getElementById('btn-draw-mode');
  const bottom = document.getElementById('bottom-ui');
  const actions = document.getElementById('stage-actions');
  const relationshipGuide = document.getElementById('relationship-guide');
  if (prev) prev.style.display = State.stage === 2 ? '' : 'none';
  if (toggle) toggle.style.display = State.stage === 2 ? '' : 'none';
  if (next) next.textContent = State.stage === 1 ? '다음 단계 ➜' : '✅ 완성';
  if (bottom) bottom.style.display = State.stage === 2 ? 'flex' : 'none';
  if (actions) actions.classList.toggle('stage-two', State.stage === 2);
  if (relationshipGuide) relationshipGuide.hidden = State.stage !== 2;
  updateStageInfo(State.stage);
  updateHowTo(State.stage);
}

window.nextStage = function () {
  if (State.stage === 1) {
    window.goToStage2();
  } else if (State.stage === 2) {
    window.finishDrawing();
  }
};

window.goToStage2 = function () {
  State.setStage(2);
  renderItemBar();
  setDrawingMode(false);
  updateStageButtons();
};

window.goToStage1 = function () {
  State.setStage(1);
  setDrawingMode(true);
  updateStageButtons();
};

export function updateSelectedUI() {
  const infoEl = document.getElementById('selected-info');
  if (!infoEl) return;
  if (State.selectedObject) {
    const config = ITEM_CONFIGS.find(c => c.id === State.selectedObject.userData.itemName);
    infoEl.textContent = '선택된 오브젝트: ' +
      ((config && config.label) || State.selectedObject.userData.itemName || State.selectedObject.name || '(이름 없음)');
  } else {
    infoEl.textContent = '선택된 오브젝트: 없음';
  }
}

window.saveData = function () {
  const collectedData = State.draggableObjects.map(obj => ({
    item: obj.userData.itemName || obj.name || 'unknown',
    position: {
      x: parseFloat(obj.position.x.toFixed(2)),
      y: parseFloat(obj.position.y.toFixed(2)),
      z: parseFloat(obj.position.z.toFixed(2))
    },
    rotationY: parseFloat(obj.rotation.y.toFixed(3))
  }));
  if (collectedData.length === 0) {
    alert('아이템을 먼저 추가해주세요!');
    return;
  }
  console.log('=== 3D 배치 데이터 (JSON) ===');
  console.log(JSON.stringify(collectedData, null, 2));
  alert('배치 데이터가 콘솔(F12)에 출력되었습니다.');
};
