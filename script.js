// 資料定義：保險主題卡片
const insuranceData = [
    { name: '壽險', url: '圖片/壽險.png', display: '壽險' },
    { name: '意外險', url: '圖片/意外險.png', display: '意外險' },
    { name: '醫療險', url: '圖片/醫療險.png', display: '醫療險' },
    { name: '癌症險', url: '圖片/癌症險.png', display: '癌症險' },
    { name: '重大疾病／重大傷病險', url: '圖片/重大疾病／重大傷病險.png', display: '重大疾病／重大傷病險' },
    { name: '長照／失能險', url: '圖片/長照／失能險.png', display: '長照／失能險' },
    { name: '儲蓄／年金險', url: '圖片/儲蓄／年金險.png', display: '儲蓄／年金險' },
    { name: '投資型保險', url: '圖片/投資型保險.png', display: '投資型保險' },
    { name: '責任／旅遊／特殊保險', url: '圖片/責任／旅遊／特殊保險.png', display: '責任／旅遊／特殊保險' },
    { name: '汽機車／住宅／財產險', url: '圖片/汽機車／住宅／財產險.png', display: '汽機車／住宅／財產險' }
];
const insuranceDeck = insuranceData.map(item => ({ type: 'insurance', ...item }));

let deck = [];

// DOM 元素
const carousel = document.getElementById('carousel');

// 狀態
let secretChosenCard = null;
let viewTimer = null;
let currentlyVisibleCard = null;
let currentlyVisibleCardElement = null;
let isDraggingCarousel = false;
let hasDragged = false;
let isRecordingActive = false;
let hasRecorded = false;
let mechanism2Timer = null;
let mechanism2Ready = false;
let swipeSequence = 0;
let firstSwipeDirection = null;
let touchStartX = 0;
let touchEndX = 0;
let touchStartIndex = 0;

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            currentlyVisibleCardElement = entry.target;
            const index = parseInt(entry.target.dataset.index);
            currentlyVisibleCard = deck[index];
            
            clearTimeout(viewTimer);
            if (isRecordingActive && !hasRecorded) {
                viewTimer = setTimeout(() => {
                    secretChosenCard = currentlyVisibleCard;
                    hasRecorded = true;
                    isRecordingActive = false;
                    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                    console.log("背景紀錄觀眾的牌:", secretChosenCard.display);
                }, 5000);
            }
            
            // 第二機制：觀眾打亂後停在某張牌3秒
            clearTimeout(mechanism2Timer);
            if (hasRecorded && !mechanism2Ready && !isRecordingActive && secretChosenCard) {
                mechanism2Timer = setTimeout(() => {
                    mechanism2Ready = true;
                    swipeSequence = 0;
                    firstSwipeDirection = null;
                    if (navigator.vibrate) navigator.vibrate(20);
                    console.log("第二機制已啟動，等待首次滑動");
                }, 3000);
            }
        } else {
            if (entry.target === currentlyVisibleCardElement) {
                clearTimeout(viewTimer);
                clearTimeout(mechanism2Timer);
            }
        }
    });
}, { threshold: 0.6 });

// 綁定隱藏觸發區事件
const secretTrigger = document.getElementById('secret-trigger');
if (secretTrigger) {
    secretTrigger.addEventListener('click', (e) => {
        e.stopPropagation(); // 避免觸發到其他事件
        isRecordingActive = true;
        hasRecorded = false;
        secretChosenCard = null;
        clearTimeout(mechanism2Timer);
        mechanism2Ready = false;
        swipeSequence = 0;
        firstSwipeDirection = null;
        if (navigator.vibrate) navigator.vibrate(20); // 短震動提示開啟紀錄
        console.log("已開啟背景紀錄模式");
        
        // 如果當下已經有牌在畫面上，重新啟動計時
        clearTimeout(viewTimer);
        if (currentlyVisibleCard) {
            viewTimer = setTimeout(() => {
                secretChosenCard = currentlyVisibleCard;
                hasRecorded = true;
                isRecordingActive = false;
                if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                console.log("背景紀錄觀眾的牌:", secretChosenCard.display);
            }, 5000);
        }
    });
}

// 1. 初始化 Carousel
function initCarousel() {
    deck.forEach((card, index) => {
        const item = document.createElement('div');
        item.className = 'carousel-item';
        item.dataset.index = index;
        
        const cardEl = document.createElement('div');
        cardEl.className = 'card flipped';
        cardEl.style.transform = "rotateY(0deg)";
        
        const front = document.createElement('div');
        renderCardFront(front, card);
        
        cardEl.appendChild(front);
        item.appendChild(cardEl);
        
        item.addEventListener('click', () => {
            if (hasDragged) return;
            if (secretChosenCard && currentlyVisibleCard && currentlyVisibleCard !== secretChosenCard) {
                if (navigator.vibrate) navigator.vibrate([50]);
                cardEl.classList.add('magic-change');
                
                const targetSecretCard = secretChosenCard;
                const clickedCardIndex = parseInt(item.dataset.index);
                const originalCard = deck[clickedCardIndex];

                setTimeout(() => {
                    renderCardFront(front, targetSecretCard);
                    
                    // 找到原本觀眾那張牌的 DOM，把它變成這張點錯的牌，避免出現兩張一樣的牌
                    const secretIndex = deck.findIndex(c => c === targetSecretCard);
                    if (secretIndex !== -1) {
                        const originalSecretDom = carousel.children[secretIndex].querySelector('.card-front');
                        if (originalSecretDom) {
                            renderCardFront(originalSecretDom, originalCard);
                        }
                        // 更新陣列資料
                        deck[clickedCardIndex] = targetSecretCard;
                        deck[secretIndex] = originalCard;
                    }

                    // 變牌後清除紀錄，結束所有機制
                    secretChosenCard = null;
                    currentlyVisibleCard = targetSecretCard;
                }, 300);
            }
        });

        observer.observe(item);
        carousel.appendChild(item);
    });
}

// 實作桌機拖曳滾動 (Drag to scroll)
let startScrollX;
let scrollLeft;

carousel.addEventListener('mousedown', (e) => {
    isDraggingCarousel = true;
    hasDragged = false;
    startScrollX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
    touchStartX = e.pageX;
    if (currentlyVisibleCardElement) {
        touchStartIndex = parseInt(currentlyVisibleCardElement.dataset.index);
    }
});
carousel.addEventListener('mouseleave', () => {
    isDraggingCarousel = false;
});
carousel.addEventListener('mouseup', (e) => {
    isDraggingCarousel = false;
    touchEndX = e.pageX;
    handleSwipe(touchStartX, touchEndX, touchStartIndex);
});
carousel.addEventListener('mousemove', (e) => {
    if (!isDraggingCarousel) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    if (Math.abs(x - startScrollX) > 5) hasDragged = true;
    const walk = (x - startScrollX) * 2; // 滾動速度
    carousel.scrollLeft = scrollLeft - walk;
});

// 手機滑動支援 (Touch events)
carousel.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
    if (currentlyVisibleCardElement) {
        touchStartIndex = parseInt(currentlyVisibleCardElement.dataset.index);
    }
}, { passive: true });

carousel.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].clientX;
    handleSwipe(touchStartX, touchEndX, touchStartIndex);
});

function handleSwipe(startX, endX, startIndex) {
    if (!mechanism2Ready) return;
    
    let diff = endX - startX;
    let threshold = 30; // 30px swipe threshold
    
    let swipeDirection = null;
    if (diff > threshold) swipeDirection = 'right';
    else if (diff < -threshold) swipeDirection = 'left';
    
    if (!swipeDirection) return;
    
    if (swipeSequence === 0) {
        firstSwipeDirection = swipeDirection;
        swipeSequence = 1;
        console.log(`第一段滑動 (${swipeDirection}) 觸發，等待反向滑動`);
    } else if (swipeSequence === 1) {
        if (swipeDirection !== firstSwipeDirection) {
            swipeSequence = 2;
            console.log(`反向滑動 (${swipeDirection}) 觸發，啟動變牌`);
            executeMechanism2(startIndex, swipeDirection);
        } else {
            console.log(`同向滑動 (${swipeDirection})，繼續等待反向滑動`);
        }
    }
}

function executeMechanism2(startIndex, finalSwipeDirection) {
    let targetIndex = (finalSwipeDirection === 'left') ? startIndex + 4 : startIndex - 4;
    
    if (targetIndex >= deck.length) {
        targetIndex = deck.length - 1;
    } else if (targetIndex < 0) {
        targetIndex = 0;
    }
    
    let targetCardEl = carousel.children[targetIndex];
    if (targetCardEl && secretChosenCard) {
        let front = targetCardEl.querySelector('.card-front');
        let secretIndex = deck.findIndex(c => c === secretChosenCard);
        let originalTargetCard = deck[targetIndex];
        
        if (secretIndex !== -1 && secretIndex !== targetIndex) {
            let originalSecretDom = carousel.children[secretIndex].querySelector('.card-front');
            if (originalSecretDom) {
                renderCardFront(originalSecretDom, originalTargetCard);
            }
            deck[secretIndex] = originalTargetCard;
        }
        
        renderCardFront(front, secretChosenCard);
        deck[targetIndex] = secretChosenCard;
        
        if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
        let dirName = (finalSwipeDirection === 'left') ? '左' : '右';
        console.log(`已將觀眾的牌放置於第 ${targetIndex} 張 (${dirName}滑的第四張)`);
        
        mechanism2Ready = false;
        swipeSequence = 0;
        firstSwipeDirection = null;
    }
}

function renderCardFront(element, card) {
    element.className = 'card-front';
    element.innerHTML = '';
    element.style.backgroundColor = '#fff';
    element.style.backgroundImage = `url("${card.url}")`;
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
    element.style.backgroundRepeat = 'no-repeat';
}

function loadDeckTheme() {
    const baseDeck = [...insuranceDeck];
    baseDeck.sort(() => Math.random() - 0.5);
    
    // 建立重複牌組以產生流暢循環效果
    deck = [];
    const repeatCount = 4;
    for (let i = 0; i < repeatCount; i++) {
        deck.push(...baseDeck.map(c => ({...c})));
    }
    
    carousel.innerHTML = '';
    if (typeof observer !== 'undefined') {
        observer.disconnect();
    }
    
    initCarousel();
    
    secretChosenCard = null;
    currentlyVisibleCard = null;
    isRecordingActive = false;
    hasRecorded = false;
    clearTimeout(mechanism2Timer);
    mechanism2Ready = false;
    swipeSequence = 0;
    firstSwipeDirection = null;
    
    setTimeout(() => {
        const middleIndex = Math.floor(deck.length / 2);
        if (carousel.children[middleIndex]) {
            carousel.children[middleIndex].scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
        }
    }, 0);
}

// 後台設定邏輯
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('btn-close-settings');
const themeSelect = document.getElementById('theme-select');

if (settingsBtn) {
    let lastTap = 0;
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
            settingsModal.classList.add('show');
            lastTap = 0;
        } else {
            lastTap = currentTime;
        }
    });

    settingsBtn.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        settingsModal.classList.add('show');
    });
}

if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsModal.classList.remove('show');
    });
}

// 預載圖片
function preloadImages() {
    setTimeout(() => {
        insuranceData.forEach(card => {
            const img = new Image();
            img.src = card.url;
        });
    }, 500);
}

function initializeApp() {
    document.body.className = 'theme-insurance';
    if (themeSelect) {
        themeSelect.value = 'theme-insurance';
    }
    loadDeckTheme();
    preloadImages();
}

initializeApp();
