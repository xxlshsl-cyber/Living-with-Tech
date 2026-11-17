// config.js - 상수 및 설정

// 방 경계 및 위치 상수
export const NEW_GROUND_Y = -2.25;
export const BACK_WALL_Z = -4.5;
export const LEFT_WALL_X = -4.5;

export const ROOM_BOUNDS = {
  minX: -2.2,
  maxX:  2.7,
  minZ: -1.8,
  maxZ:  2.4
};

// 벽 관련 상수
export const WALL_MARGIN = 0.2;
export const WALL_MIN_Y = 0.5;
export const WALL_MAX_Y = 3.5;

// 드로잉 색상 팔레트
export const DRAW_COLORS = [
  '#000000', // 검정
  '#ffffff', // 흰색
  '#ff6b6b', // 빨강
  '#4dabf7', // 파랑
  '#51cf66', // 초록
  '#f59f00'  // 노랑
];

// 1단계 카테고리 (침대)
export const BED_SETUP_CATEGORY = { id: 'bed-setup', svg: 'category/bedding.svg', icon: 'category/bedding.svg' };

// 2단계 인벤토리 카테고리
export const CATEGORIES = [
  { id: 'appliance', svg: 'category/appliance.svg', icon: 'category/appliance.svg' },
  { id: 'system' }
];

// appliance 아이템의 인벤토리 표시 이름
export const APPLIANCE_LABELS = {
  'monitor': '모니터',
  'studio-display-monitor': '스튜디오 디스플레이',
  'lap-top': '노트북',
  'computer-mouse': '컴퓨터 마우스',
  'game 1': '게임기',
  'smartwatch 1': '스마트워치',
  'speaker 1': '스피커 1',
  'speaker 2': '스피커 2',
  'speaker 3': '홈캠',
  'speaker 4': '스피커 4',
  'tablet': '아이패드',
  'Game Console 1': '게임 콘솔',
  'Smart Thermostat': '스마트 온도 조절기',
  'Home Appliances': '가전제품',
  'Treadmill': '러닝머신',
  'Bass Guitar': '베이스 기타',
  'Portable Bluetooth Speaker': '휴대용 블루투스 스피커',
  'LED Desk Lamp': 'LED 책상 조명',
  'Coffee Machine': '커피 머신',
  'Digital Body Scales': '디지털 체중계',
  'Wi-Fi Router': '와이파이 공유기',
  'Ganging Pendant Lamp': '펜던트 조명',
  'Robotic Dog': '로봇 강아지',
  'Vacuum Robot': '로봇 청소기',
  'Smart Speaker': '스마트 스피커',
  'Robot Drone': '로봇 드론',
  'Compact Printer': '소형 프린터',
  'Mini Desk Fan': '미니 탁상 선풍기',
  'air conditioner2': '에어컨',
  'Air Fryer': '에어프라이어',
  'Air Purifier': '공기청정기',
  'Airpods': '에어팟',
  'Artificial Intelligience': '인공지능',
  'CCTV Indoor': 'CCTV',
  'Chatgpt': '챗GPT',
  'Dishwasher': '식기세척기',
  'drone': '드론',
  'Food chopper': '믹서기',
  'Gameboy': '게임기',
  'gaming mouse': '게이밍 마우스',
  'Headphone': '헤드폰',
  'icons8_blue_computer_monitor': '데스크탑',
  'Oven': '오븐',
  'Piano': '전자 피아노',
  'proyektor': '프로젝터',
  'Smartphone': '스마트폰',
  'Tablet': '태블릿 PC',
  'Television': '텔레비전',
  'Vacuum Cleaner': '청소기',
  'VR HEADSET': 'VR 기기',
  'Washing Machine': '세탁기'
};

// 아이템 정의
export const ITEM_CONFIGS = [
  // system 텍스트 카드
  { id: 'ui-ux', label: 'UI·UX', category: 'system', type: 'text' },
  { id: 'voice-recognition', label: '음성 인식', category: 'system', type: 'text'},
  { id: 'biometric', label: '생체 인식', category: 'system', type: 'text'},
  { id: 'push-alert', label: '푸시 알림', category: 'system', type: 'text'},
  { id: 'pop-up', label: '팝업', category: 'system', type: 'text'},
  { id: 'haptic-feedback', label: '햅틱', category: 'system', type: 'text'},
  { id: 'sns', label: 'SNS', category: 'system', type: 'text'},
  { id: 'streaming', label: '스트리밍', category: 'system', type: 'text'},
  { id: 'shortform-video', label: '숏폼', category: 'system', type: 'text'},
  { id: 'algorithm', label: '알고리즘', category: 'system', type: 'text'},
  { id: 'advertisement', label: '광고', category: 'system', type: 'text'},
  { id: 'subscription', label: '구독', category: 'system', type: 'text'},
  { id: 'search', label: '검색', category: 'system', type: 'text'},
  { id: 'voice-image-search', label: '음성 및 이미지 검색', category: 'system', type: 'text'},
  { id: 'translation', label: '번역', category: 'system', type: 'text'},
  { id: 'NLP', label: '자연어 처리(NLP)', category: 'system', type: 'text'},
  { id: 'database', label: '데이터 베이스', category: 'system', type: 'text'},
  { id: 'cloud-computing', label: '클라우드 컴퓨팅', category: 'system', type: 'text'},
  { id: 'big-data', label: '빅데이터', category: 'system', type: 'text'},
  { id: 'Wi-fi', label: 'Wi-Fi', category: 'system', type: 'text'},
  { id: 'Bluetooth', label: 'Bluetooth', category: 'system', type:'text'},
  { id: 'nfc', label: 'NFC', category: 'system', type: 'text'},
  { id: 'gps', label: 'GPS', category: 'system', type: 'text'},
  { id: 'network', label: 'Network', category: 'system', type: 'text'},
  { id: 'qr-code', label: 'QR 코드', category: 'system', type: 'text'},
  { id: 'rfid', label: 'RFID', category: 'system', type: 'text'},
  { id: 'iot', label: 'IoT(사물인터넷)', category: 'system', type: 'text'},
  { id: 'api', label: 'API', category: 'system', type: 'text'},
  { id: 'cloud', label: '클라우드', category: 'system', type: 'text'},
  { id: 'smart-home', label: '스마트홈', category: 'system', type: 'text'},
  { id: 'remote-control', label: '원격 제어', category: 'system', type: 'text'},
  { id: 'password', label: '비밀번호', category: 'system', type: 'text'},
  { id: 'two-factor-authentication', label: '2단계 인증(2FA)', category: 'system', type: 'text'},
  { id: 'biometric-authentication', label: '생체 인증', category: 'system', type: 'text'},
  { id: 'encryption', label: '암호화', category: 'system', type: 'text'},
  { id: 'end-to-end-encryption', label: '종단간 암호화(E2EE)', category: 'system', type: 'text'},
  { id: 'vpn', label: 'VPN', category: 'system', type: 'text'},
  { id: 'firewall', label: '방화벽', category: 'system', type: 'text'},
  { id: 'tracking', label: '트래킹', category: 'system', type: 'text'},
  { id: 'location-information', label: '위치 정보', category: 'system', type: 'text'},
  { id: 'access-permissions', label: '접근 권한', category: 'system', type: 'text'},
  { id: 'privacy', label: '개인정보 보호', category: 'system', type: 'text'},
  { id: 'machine-learning', label: '머신러닝', category: 'system', type: 'text'},
  { id: 'deep-learning', label: '딥러닝', category: 'system', type: 'text'},
  { id: 'generative-ai', label: '생성형 AI', category: 'system', type: 'text'},
  { id: 'large-language-model', label: '대규모 언어 모델(LLM)', category: 'system', type: 'text'},
  { id: 'chatbot', label: '챗봇', category: 'system', type: 'text'},
  { id: 'ai-agent', label: 'AI 에이전트', category: 'system', type: 'text'},
  { id: 'voice-assistant', label: '음성 비서', category: 'system', type: 'text'},
  { id: 'automatic-translation-summary', label: '자동 번역 및 요약', category: 'system', type: 'text'},
  { id: 'automatic-generation', label: '자동 생성', category: 'system', type: 'text'},
  { id: 'predictive-model', label: '예측 모델', category: 'system', type: 'text'},
  { id: 'computer-vision', label: '컴퓨터 비전', category: 'system', type: 'text'},
  { id: 'generated-image', label: '생성형 이미지', category: 'system', type: 'text'},
  { id: 'speech-synthesis', label: '음성 합성', category: 'system', type: 'text'},
  


  // appliance
  { id: 'monitor', icon: 'icon/appliance/monitor.png', category: 'appliance', glb: 'monitor.glb', scale: 5.0},
  { id: 'studio-display-monitor', icon: 'icon/appliance/studio-display-monitor.png', category: 'appliance', glb: 'studio-display-monitor.glb', scale: 5.0},  { id: 'lap-top', icon: 'icon/appliance/lap-top.png', category: 'appliance', glb: 'lap-top.glb', scale: 5.0},
  { id: 'computer-mouse', icon: 'icon/appliance/computer-mouse.png', category: 'appliance', glb: 'computer-mouse.glb', scale: 6.0},
  { id: 'game 1', icon: 'icon/appliance/game 1.png', category: 'appliance', glb: 'game 1.glb', scale: 2.5},
  { id: 'smartwatch 1', icon: 'icon/appliance/smartwatch 1.png', category: 'appliance', glb: 'smartwatch 1.glb', scale: 1.5},
  { id: 'speaker 2', icon: 'icon/appliance/speaker 2.png', category: 'appliance', glb: 'speaker 2.glb', scale: 8.0},
  { id: 'speaker 3', icon: 'icon/appliance/speaker 3.png', category: 'appliance', glb: 'speaker 3.glb', scale: 3.0},
  { id: 'tablet', icon: 'icon/appliance/tablet.png', category: 'appliance', glb: 'tablet.glb', scale: 2.0},
  { id: 'Game Console 1', icon: 'icon/appliance/01_Game Console.png', category: 'appliance', glb: '01_Game Console.glb', scale: 0.2},
  { id: 'Smart Thermostat', icon: 'icon/appliance/02_Smart Thermostat.png', category: 'appliance', glb: '02_Smart Thermostat.glb', scale: 0.2},
  { id: 'Home Appliances', icon: 'icon/appliance/03_Home Appliances.png', category: 'appliance', glb: '03_Home Appliances.glb', scale: 0.4},
  { id: 'Treadmill', icon: 'icon/appliance/04_Treadmill.png', category: 'appliance', glb: '04_Treadmill.glb', scale: 0.5},
  { id: 'Bass Guitar', icon: 'icon/appliance/05_Bass Guitar.png', category: 'appliance', glb: '05_Bass Guitar.glb', scale: 1.0},
  { id: 'Portable Bluetooth Speaker', icon: 'icon/appliance/07_Portable Bluetooth Speaker.png', category: 'appliance', glb: '07_Portable Bluetooth Speaker.glb', scale: 0.1},
  { id: 'LED Desk Lamp', icon: 'icon/appliance/09_LED Desk Lamp.png', category: 'appliance', glb: '09_LED Desk Lamp.glb', scale: 0.15},
  { id: 'Coffee Machine', icon: 'icon/appliance/11_Coffee Machine.png', category: 'appliance', glb: '11_Coffee Machine.glb', scale: 0.2},
  { id: 'Digital Body Scales', icon: 'icon/appliance/12_Digital Body Scales.png', category: 'appliance', glb: '12_Digital Body Scales.glb', scale: 0.3},
  { id: 'Wi-Fi Router', icon: 'icon/appliance/14_Wi-Fi Router.png', category: 'appliance', glb: '14_Wi-Fi Router.glb', scale: 0.2},
  { id: 'Ganging Pendant Lamp', icon: 'icon/appliance/16_Ganging Pendant Lamp.png', category: 'appliance', glb: '16_Ganging Pendant Lamp.glb', scale: 0.2},
  { id: 'Robotic Dog', icon: 'icon/appliance/17_Robotic Dog.png', category: 'appliance', glb: '17_Robotic Dog.glb', scale: 0.2},
  { id: 'Vacuum Robot', icon: 'icon/appliance/18_Vacuum Robot.png', category: 'appliance', glb: '18_Vacuum Robot.glb', scale: 0.1},
  { id: 'Smart Speaker', icon: 'icon/appliance/19_Smart Speaker.png', category: 'appliance', glb: '19_Smart Speaker.glb', scale: 0.1},
  { id: 'Robot Drone', icon: 'icon/appliance/20_Robot Drone.png', category: 'appliance', glb: '20_Robot Drone.glb', scale: 0.2},
  { id: 'Compact Printer', icon: 'icon/appliance/21_Compact Printer.png', category: 'appliance', glb: '21_Compact Printer.glb', scale: 0.15},
  { id: 'Mini Desk Fan', icon: 'icon/appliance/22_Mini Desk Fan.png', category: 'appliance', glb: '22_Mini Desk Fan.glb', scale: 0.15},
  { id: 'air conditioner2', icon: 'icon/appliance/24_air conditioner2.png', category: 'appliance', glb: '24_air conditioner2.glb', scale: 0.8},
  { id: 'Air Fryer', icon: 'icon/appliance/25_Air Fryer.png', category: 'appliance', glb: '25_Air Fryer.glb', scale: 0.2},
  { id: 'Air Purifier', icon: 'icon/appliance/26_Air Purifier.png', category: 'appliance', glb: '26_Air Purifier.glb', scale: 0.3},
  { id: 'Airpods', icon: 'icon/appliance/27_Airpods.png', category: 'appliance', glb: '27_Airpods.glb', scale: 0.2},
  { id: 'Artificial Intelligience', icon: 'icon/appliance/28_Artificial Intelligence.png', category: 'appliance', glb: '28_Artificial Intelligence.glb', scale: 0.2},
  { id: 'CCTV Indoor', icon: 'icon/appliance/29_CCTV Indoor Camera.png', category: 'appliance', glb: '29_CCTV Indoor Camera.glb', scale: 0.2},
  { id: 'Chatgpt', icon: 'icon/appliance/30_Chatgpt.png', category: 'appliance', glb: '30_Chatgpt.glb', scale: 0.3},
  { id: 'Dishwasher', icon: 'icon/appliance/31_Dishwasher.png', category: 'appliance', glb: '31_Dishwasher.glb', scale: 0.2},
  { id: 'drone', icon: 'icon/appliance/32_drone.png', category: 'appliance', glb: '32_Drone.glb', scale: 0.7},
  { id: 'Food chopper', icon: 'icon/appliance/34_Food Chopper.png', category: 'appliance', glb: '34_Food Chopper.glb', scale: 0.2},
  { id: 'Gameboy', icon: 'icon/appliance/35_Gameboy.png', category: 'appliance', glb: '35_Gameboy.glb', scale: 0.3},
  { id: 'gaming mouse', icon: 'icon/appliance/36_gaming mouse.png', category: 'appliance', glb: '36_gaming mouse.glb', scale: 0.3},
  { id: 'Headphone', icon: 'icon/appliance/39_Headphone.png', category: 'appliance', glb: '39_Headphone.glb', scale: 0.6},
  { id: 'icons8_blue_computer_monitor', icon: 'icon/appliance/40_icons8_blue_computer_monitor.png', category: 'appliance', glb: '40_icons8_blue_computer_monitor.glb', scale: 0.7},
  { id: 'Oven', icon: 'icon/appliance/41_Oven.png', category: 'appliance', glb: '41_Oven.glb', scale: 0.2},
  { id: 'Piano', icon: 'icon/appliance/42_Piano.png', category: 'appliance', glb: '42_Piano.glb', scale: 1.2},
  { id: 'proyektor', icon: 'icon/appliance/44_Proyektor.png', category: 'appliance', glb: '44_Proyektor.glb', scale: 0.15},
  { id: 'Smartphone', icon: 'icon/appliance/45_Smartphone.png', category: 'appliance', glb: '45_Smartphone.glb', scale: 5.0},
  { id: 'Tablet', icon: 'icon/appliance/46_Tablet.png', category: 'appliance', glb: '46_Tablet.glb', scale: 0.6},
  { id: 'Television', icon: 'icon/appliance/47_Television.png', category: 'appliance', glb: '47_Television.glb', scale: 0.7},
  { id: 'Vacuum Cleaner', icon: 'icon/appliance/48_Vacuum Cleaner.png', category: 'appliance', glb: '48_Vacuum Cleaner.glb', scale: 0.3},
  { id: 'VR HEADSET', icon: 'icon/appliance/49_VR HEADSET.png', category: 'appliance', glb: '49_VR HEADSET.glb', scale: 0.6},
  { id: 'Washing Machine', icon: 'icon/appliance/50_Washing Machine.png', category: 'appliance', glb: '50_Washing Machine.glb', scale: 0.2},


];
