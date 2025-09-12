class FortuneWheel {
    constructor() {
        this.canvas = document.getElementById('wheelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.items = [];
        this.isSpinning = false;
        this.currentRotation = 0;
        this.targetRotation = 0;
        this.animationId = null;
        this.stopAnimationTime = 1; // 기본 정지 애니메이션 시간 (초)
        this.celebrationTimeout = null; // 빵빠레 이펙트 타임아웃
        this.confettiIds = []; // 컨페티 ID 추적용 배열
        
        // 드래그 관련 변수들
        this.isDragging = false;
        this.draggedItemIndex = -1;
        this.dragStartAngle = 0;
        this.dragType = null; // 'start' 또는 'end'
        this.hoveredItemIndex = -1;
        this.hoveredBoundary = null; // 'start', 'end', 또는 null
        
        this.init();
    }

    init() {
        this.loadDefaultItems();
        this.setupEventListeners();
        this.resizeCanvas(); // 캔버스 크기 자동 조정
        this.drawWheel();
        this.renderItemsList();
        this.renderPresetList();
        this.updateCurrentStatus();
        
        // 화면 크기 변경 시 캔버스 재조정
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.drawWheel();
            this.updateCurrentStatus();
        });
    }
    
    // 화면 크기에 맞게 캔버스 크기 자동 조정
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.offsetWidth;
        const containerHeight = window.innerHeight;
        
        // 모바일과 데스크톱에 따른 크기 조정
        let canvasSize;
        if (window.innerWidth <= 480) {
            // 초소형 모바일
            canvasSize = Math.min(250, containerWidth - 40, containerHeight * 0.45);
        } else if (window.innerWidth <= 768) {
            // 일반 모바일
            canvasSize = Math.min(280, containerWidth - 40, containerHeight * 0.5);
        } else {
            // 데스크톱
            canvasSize = Math.min(400, containerWidth - 40, containerHeight * 0.6);
        }
        
        // 캔버스 크기 설정
        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;
        
        // 캔버스 스타일 크기도 설정 (CSS에서 사용)
        this.canvas.style.width = canvasSize + 'px';
        this.canvas.style.height = canvasSize + 'px';
        
        console.log(`캔버스 크기 조정: ${canvasSize}x${canvasSize}px`);
    }

    loadDefaultItems() {
        // 기본 상품들 (수량 기반)
        this.items = [
            { name: "우양산", quantity: 1, color: "#FF6B6B" },
            { name: "손마사지기", quantity: 1, color: "#4ECDC4" },
            { name: "헤드폰", quantity: 1, color: "#45B7D1" },
            { name: "비타민 구미", quantity: 1, color: "#96CEB4" },
            { name: "핸드 크림", quantity: 1, color: "#FFEAA7" },
            { name: "꽝", quantity: 1, color: "#DDA0DD" }
        ];
        this.redistributeAngles();
    }

    setupEventListeners() {
        // 돌리기 버튼
        document.getElementById('spinBtn').addEventListener('click', () => {
            if (!this.isSpinning) {
                this.spin();
            }
        });

        // 정지 버튼
        document.getElementById('stopBtn').addEventListener('click', () => {
            if (this.isSpinning) {
                this.stopSpin();
            }
        });

        // 상품 추가 버튼
        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.showAddItemModal();
        });

        // 상품 삭제 버튼
        document.getElementById('removeItemBtn').addEventListener('click', () => {
            this.removeLastItem();
        });

        // 모달 버튼들
        document.getElementById('confirmAddBtn').addEventListener('click', () => {
            this.addItem();
        });

        document.getElementById('cancelAddBtn').addEventListener('click', () => {
            this.hideAddItemModal();
        });

        // 초기화 버튼
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetToDefault();
        });

        // 정지 애니메이션 시간 설정
        document.getElementById('stopAnimationTime').addEventListener('change', (e) => {
            this.stopAnimationTime = parseFloat(e.target.value);
            this.saveToLocalStorage();
        });

        // 프리셋 관리 버튼들
        document.getElementById('loadDefaultPreset').addEventListener('click', () => {
            this.loadDefaultPreset();
        });

        document.getElementById('savePresetBtn').addEventListener('click', () => {
            this.showSavePresetModal();
        });

        document.getElementById('loadPresetBtn').addEventListener('click', () => {
            this.showLoadPresetModal();
        });

        // JSON Import/Export 버튼들
        document.getElementById('exportJsonBtn').addEventListener('click', () => {
            this.exportToJson();
        });

        document.getElementById('importJsonBtn').addEventListener('click', () => {
            this.importFromJson();
        });

        // 모달 외부 클릭시 닫기
        document.getElementById('addItemModal').addEventListener('click', (e) => {
            if (e.target.id === 'addItemModal') {
                this.hideAddItemModal();
            }
        });

        // 로컬 스토리지에서 데이터 로드
        this.loadFromLocalStorage();
    }

    // 수량 기반으로 각도 재분배
    redistributeAngles() {
        if (this.items.length === 0) return;
        
        // 총 수량 계산
        const totalQuantity = this.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        // 각 상품의 확률 계산 및 각도 설정
        let currentAngle = 0;
        this.items.forEach((item, index) => {
            const probability = ((item.quantity || 1) / totalQuantity) * 100;
            const angleRange = (item.quantity || 1) / totalQuantity * 360;
            
            item.startAngle = currentAngle;
            item.endAngle = currentAngle + angleRange;
            item.probability = probability;
            
            currentAngle += angleRange;
        });
        
        // 마지막 상품이 360도에 정확히 맞도록 조정
        if (this.items.length > 0) {
            this.items[this.items.length - 1].endAngle = 360;
        }
    }

    // 현재 상태 업데이트 (실시간)
    updateCurrentStatus() {
        const resultText = document.querySelector('.result-text');
        const resultItem = document.getElementById('resultItem');
        
        if (this.isSpinning) {
            // 돌리는 중에도 포인터가 가리키는 상품 표시 (회전 각도 고려)
            const normalizedRotation = (360 - (this.currentRotation % 360)) % 360;
            const currentItem = this.getItemAtAngle(normalizedRotation);
            
            if (currentItem) {
                resultText.textContent = "돌리는 중... 🎯";
                resultItem.textContent = currentItem.name;
                resultItem.style.color = currentItem.color;
            } else {
                resultText.textContent = "돌리는 중... 🎯";
                resultItem.textContent = "돌리는 중...";
                resultItem.style.color = "#fff";
            }
        } else {
            // 돌림이 끝난 후에는 currentRotation을 보존하여 결과 표시
            if (this.currentRotation !== 0) {
                // 돌림이 끝난 상태 - 포인터가 가리키는 상품 표시
                const normalizedRotation = this.currentRotation % 360;
                const pointerAngle = (360 - normalizedRotation) % 360;
                const currentItem = this.getItemAtAngle(pointerAngle);
                
                if (currentItem) {
                    resultItem.textContent = currentItem.name;
                    resultItem.style.color = currentItem.color;
                } else {
                    resultText.textContent = "";
                    resultItem.textContent = "돌림판을 돌려보세요!";
                    resultItem.style.color = "#fff";
                }
                
                // 돌림이 끝난 후에도 회전된 상태를 유지
                this.drawWheel();
                this.drawRotatedWheel();
            } else {
                // 초기 상태 - 포인터가 가리키는 상품 찾기 (12시 방향 = 0도)
                const pointerAngle = 0;
                const currentItem = this.getItemAtAngle(pointerAngle);
                
                if (currentItem) {
                    resultText.textContent = "돌림판 결과";
                    resultItem.textContent = currentItem.name;
                    resultItem.style.color = currentItem.color;
                } else {
                    resultText.textContent = "";
                    resultItem.textContent = "돌림판을 돌려보세요!";
                    resultItem.style.color = "#fff";
                }
            }
        }
        
        // 빈 영역 채우기 버튼 상태 업데이트
        this.updateFillGapsButtonState();
    }
    
    // 빈 영역 채우기 버튼의 활성화/비활성화 상태 업데이트
    updateFillGapsButtonState() {
        const fillGapsBtn = document.getElementById('fillGapsBtn');
        if (fillGapsBtn) {
            const hasGaps = this.hasGaps();
            fillGapsBtn.disabled = !hasGaps;
            
            if (hasGaps) {
                fillGapsBtn.title = "빈 영역을 모두 채워서 360도를 꽉 채웁니다";
                fillGapsBtn.classList.remove('disabled');
            } else {
                fillGapsBtn.title = "이미 모든 영역이 꽉 찬 상태입니다";
                fillGapsBtn.classList.add('disabled');
            }
        }
    }

    showAddItemModal() {
        const modal = document.getElementById('addItemModal');
        if (modal) {
            modal.classList.remove('hidden');
            const nameInput = document.getElementById('itemName');
            if (nameInput) {
                nameInput.focus();
            }
        } else {
            console.error('모달을 찾을 수 없습니다.');
        }
    }

    hideAddItemModal() {
        const modal = document.getElementById('addItemModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // 입력 필드 초기화
        const nameInput = document.getElementById('itemName');
        const quantityInput = document.getElementById('itemQuantity');
        const colorInput = document.getElementById('itemColor');
        
        if (nameInput) nameInput.value = '';
        if (quantityInput) quantityInput.value = '1';
        if (colorInput) colorInput.value = '#FF6B6B';
    }

    addItem() {
        const nameElement = document.getElementById('itemName');
        const quantityElement = document.getElementById('itemQuantity');
        const colorElement = document.getElementById('itemColor');
        
        // 요소가 존재하는지 확인
        if (!nameElement || !quantityElement || !colorElement) {
            console.error('모달 요소를 찾을 수 없습니다:', {
                nameElement: !!nameElement,
                quantityElement: !!quantityElement,
                colorElement: !!colorElement
            });
            alert('오류: 모달 요소를 찾을 수 없습니다.');
            return;
        }

        const name = nameElement.value.trim();
        const quantity = parseInt(quantityElement.value) || 1;
        const color = colorElement.value;

        console.log('상품 추가 시도:', { name, quantity, color });

        if (!name) {
            alert('상품명을 입력해주세요.');
            return;
        }

        if (quantity < 1 || quantity > 100) {
            alert('수량은 1-100 사이의 값이어야 합니다.');
            return;
        }

        const newItem = {
            name,
            quantity,
            color
        };

        this.items.push(newItem);
        this.redistributeAngles();
        
        this.hideAddItemModal();
        this.drawWheel();
        this.renderItemsList();
        this.saveToLocalStorage();
        this.updateCurrentStatus();
        
        console.log('상품 추가 완료:', newItem);
    }

    // 마지막 상품 삭제
    removeLastItem() {
        if (this.items.length <= 1) {
            alert('최소 1개의 상품은 유지되어야 합니다.');
            return;
        }
        
        if (confirm('마지막 상품을 삭제하시겠습니까?')) {
            this.items.pop();
            this.redistributeAngles();
        this.drawWheel();
        this.renderItemsList();
        this.saveToLocalStorage();
        this.updateCurrentStatus();
        }
    }

    removeItem(index) {
        if (this.items.length <= 1) {
            alert('최소 1개의 상품은 유지되어야 합니다.');
            return;
        }
        
        if (confirm('정말로 이 상품을 삭제하시겠습니까?')) {
            this.items.splice(index, 1);
            this.redistributeAngles();
            this.drawWheel();
            this.renderItemsList();
            this.saveToLocalStorage();
            this.updateCurrentStatus();
        }
    }

    editItem(index) {
        const item = this.items[index];
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemQuantity').value = item.quantity || 1;
        document.getElementById('itemColor').value = item.color;
        
        this.showAddItemModal();
        
        // 기존 아이템 삭제 후 새로 추가
        document.getElementById('confirmAddBtn').onclick = () => {
            // 입력값 검증
            const name = document.getElementById('itemName').value.trim();
            const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;
            const color = document.getElementById('itemColor').value;

            if (!name) {
                alert('상품명을 입력해주세요.');
                return;
            }

            if (quantity < 1 || quantity > 100) {
                alert('수량은 1-100 사이의 값이어야 합니다.');
                return;
            }

            // 기존 아이템 삭제
            this.items.splice(index, 1);
            
            // 새 아이템 추가
            const newItem = { name, quantity, color };
            this.items.push(newItem);
            this.redistributeAngles();
            
            this.hideAddItemModal();
            this.drawWheel();
            this.renderItemsList();
            this.saveToLocalStorage();
            this.updateCurrentStatus();
            
            // 원래 이벤트 리스너 복원
            document.getElementById('confirmAddBtn').onclick = () => this.addItem();
        };
    }

    renderItemsList() {
        const itemsList = document.getElementById('itemsList');
        itemsList.innerHTML = '';

        this.items.forEach((item, index) => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            itemCard.style.borderLeftColor = item.color;

            itemCard.innerHTML = `
                <div class="item-header">
                    <div>
                        <div class="item-name">${item.name}</div>
                        <div class="item-angles">
                            수량: 
                            <input type="number" 
                                   class="quantity-input" 
                                   value="${item.quantity || 1}" 
                                   min="1" 
                                   max="100" 
                                   onchange="wheel.updateQuantity(${index}, this.value)"
                                   oninput="wheel.updateQuantity(${index}, this.value)">
                            개
                        </div>
                        <div class="item-probability">확률: ${(item.probability || 0).toFixed(1)}%</div>
                    </div>
                    <div class="item-controls">
                        <button class="btn" onclick="wheel.editItem(${index})">수정</button>
                        <button class="btn danger" onclick="wheel.removeItem(${index})">삭제</button>
                    </div>
                </div>
            `;

            itemsList.appendChild(itemCard);
        });
    }

    // 수량 즉시 업데이트
    updateQuantity(index, newQuantity) {
        const quantity = parseInt(newQuantity);
        
        if (quantity < 1 || quantity > 100) {
            alert('수량은 1-100 사이의 값이어야 합니다.');
            // 원래 값으로 복원
            const input = document.querySelector(`.quantity-input[onchange*="wheel.updateQuantity(${index}"]`);
            if (input) {
                input.value = this.items[index].quantity || 1;
            }
            return;
        }

        // 수량 업데이트
        this.items[index].quantity = quantity;
        
        // 각도 재분배 및 확률 재계산
        this.redistributeAngles();
        
        // 돌림판과 목록 다시 그리기
        this.drawWheel();
        this.renderItemsList();
        this.saveToLocalStorage();
        this.updateCurrentStatus();
    }

    drawWheel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        // 배경 지우기
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 각 상품 영역 그리기
        this.items.forEach((item, index) => {
            const startAngle = (item.startAngle - 90) * Math.PI / 180;
            const endAngle = (item.endAngle - 90) * Math.PI / 180;

            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = item.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // 상품명 텍스트 그리기
            const textAngle = (startAngle + endAngle) / 2;
            const textRadius = radius * 0.7;
            const textX = centerX + textRadius * Math.cos(textAngle);
            const textY = centerY + textRadius * Math.sin(textAngle);

            this.ctx.save();
            this.ctx.translate(textX, textY);
            this.ctx.rotate(textAngle + Math.PI / 2);
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText(item.name, 0, 0);
            this.ctx.restore();
        });

        // 경계선 그리기 (단순화)
        this.drawBoundaries(centerX, centerY, radius);

        // 중앙 원 그리기
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }

    // 경계선 그리기 (단순화)
    drawBoundaries(centerX, centerY, radius) {
        this.items.forEach((item, index) => {
            const startAngle = (item.startAngle - 90) * Math.PI / 180;
            const endAngle = (item.endAngle - 90) * Math.PI / 180;

            // 시작 경계선
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(
                centerX + radius * Math.cos(startAngle),
                centerY + radius * Math.sin(startAngle)
            );
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // 끝 경계선
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(
                centerX + radius * Math.cos(endAngle),
                centerY + radius * Math.sin(endAngle)
            );
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 3;
            this.ctx.stroke();
        });
    }

    spin() {
        if (this.isSpinning) return;

        // 기존 빵빠레 이펙트 즉시 해제
        this.clearCelebrationEffect();

        this.isSpinning = true;
        document.getElementById('spinBtn').disabled = true;
        document.getElementById('spinBtn').classList.add('hidden');
        document.getElementById('stopBtn').classList.remove('hidden');
        this.updateCurrentStatus();

        // 확률 기반으로 상품 선택
        const selectedItem = this.selectItemByProbability();
        
        // 선택된 상품의 각도 계산
        const itemAngle = (selectedItem.startAngle + selectedItem.endAngle) / 2;
        
        // 랜덤 회전 각도 (최소 5바퀴) - 선택된 상품에 도달하도록
        const minSpins = 5;
        const maxSpins = 10;
        const spins = Math.random() * (maxSpins - minSpins) + minSpins;
        
        // 포인터가 선택된 상품을 가리키도록 계산
        // 포인터는 12시 방향(0도)에 고정되어 있으므로, 돌림판을 회전시켜야 함
        const targetAngle = this.currentRotation + (spins * 360) + (360 - itemAngle);

        this.targetRotation = targetAngle;
        this.animateSpin();
    }

    // 확률 기반으로 상품 선택
    selectItemByProbability() {
        const totalProbability = this.items.reduce((sum, item) => sum + (item.probability || 0), 0);
        const random = Math.random() * totalProbability;
        
        let currentProbability = 0;
        for (const item of this.items) {
            currentProbability += (item.probability || 0);
            if (random <= currentProbability) {
                return item;
            }
        }
        
        // 확률이 설정되지 않은 경우 마지막 상품 반환
        return this.items[this.items.length - 1];
    }

    // 정지 기능
    stopSpin() {
        if (!this.isSpinning) return;

        // 현재 애니메이션 취소
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // 설정된 시간 내에 정지
        const stopDuration = this.stopAnimationTime * 1000; // 밀리초로 변환
        const startTime = Date.now();
        const startRotation = this.currentRotation;
        const rotationDiff = this.targetRotation - startRotation;

        const stopAnimate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / stopDuration, 1);
            
            // 이징 함수 (빠르게 시작해서 천천히 끝남)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            this.currentRotation = startRotation + (rotationDiff * easeOut);
            
            this.drawWheel();
            this.drawRotatedWheel();
            this.updateCurrentStatus();

            if (progress < 1) {
                this.animationId = requestAnimationFrame(stopAnimate);
            } else {
                this.spinComplete();
            }
        };

        stopAnimate();
    }

    animateSpin() {
        const duration = 5000; // 5초
        const startTime = Date.now();
        const startRotation = this.currentRotation;
        const rotationDiff = this.targetRotation - startRotation;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 이징 함수 (천천히 시작해서 천천히 끝남)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            this.currentRotation = startRotation + (rotationDiff * easeOut);
            
            this.drawWheel();
            this.drawRotatedWheel();
            this.updateCurrentStatus(); // 실시간 상태 업데이트

            if (progress < 1) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.spinComplete();
            }
        };

        animate();
    }

    drawRotatedWheel() {
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.rotate(this.currentRotation * Math.PI / 180);
        this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
        this.drawWheel();
        this.ctx.restore();
    }

    spinComplete() {
        this.isSpinning = false;
        document.getElementById('spinBtn').disabled = false;
        document.getElementById('spinBtn').classList.remove('hidden');
        document.getElementById('stopBtn').classList.add('hidden');
        
        // 결과 계산 - 회전이 멈춘 후 포인터가 가리키는 각도 계산
        // 돌림판이 회전했으므로, 포인터가 가리키는 실제 상품을 찾아야 함
        // 포인터는 12시 방향(0도)에 고정, 돌림판은 currentRotation만큼 회전
        // 따라서 포인터가 가리키는 돌림판의 각도는 currentRotation의 반대 방향
        console.log('회전 완료 - currentRotation:', this.currentRotation); // 디버깅용
        
        const normalizedRotation = this.currentRotation % 360;
        const pointerAngle = (360 - normalizedRotation) % 360;
        
        console.log('정규화된 회전:', normalizedRotation, '포인터 각도:', pointerAngle); // 디버깅용
        
        const result = this.getItemAtAngle(pointerAngle);
        
        if (result) {
            console.log('결과 상품:', result.name, '각도 범위:', result.startAngle, '-', result.endAngle); // 디버깅용
            this.showResult(result.name);
        } else {
            // 결과를 찾을 수 없는 경우
            console.log('결과를 찾을 수 없음 - 각도:', pointerAngle); // 디버깅용
            this.showResult("꽝");
        }
        
        // 돌림이 끝난 후에도 회전된 상태를 유지하기 위해 drawRotatedWheel 호출
        this.drawWheel();
        this.drawRotatedWheel();
        
        // 상태 업데이트는 showResult에서 처리하므로 여기서는 호출하지 않음
    }

    getItemAtAngle(angle) {
        // 각도가 360을 넘어가는 경우 처리
        const normalizedAngle = angle % 360;
        
        return this.items.find(item => {
            if (item.startAngle <= item.endAngle) {
                // 일반적인 경우 (예: 0-60도)
                return normalizedAngle >= item.startAngle && normalizedAngle < item.endAngle;
            } else {
                // 360도를 넘어가는 경우 (예: 300-360도)
                return normalizedAngle >= item.startAngle || normalizedAngle < item.endAngle;
            }
        });
    }

    showResult(itemName) {
        const resultText = document.querySelector('.result-text');
        const resultItem = document.getElementById('resultItem');
        
        resultText.textContent = "돌림판 결과";
        resultItem.textContent = itemName;
        resultItem.style.color = "#FFD700";
        
        // 빵빠레 이펙트 추가
        this.addCelebrationEffect();
        
        // 5초 후 현재 상태로 복원 (currentRotation은 보존)
        this.celebrationTimeout = setTimeout(() => {
            // currentRotation을 보존한 채로 상태 업데이트
            this.updateCurrentStatus();
            // 회전된 상태도 유지
            this.drawWheel();
            this.drawRotatedWheel();
        }, 5000);
    }

    // 빵빠레 이펙트 추가
    addCelebrationEffect() {
        const resultArea = document.getElementById('result');
        
        // 기존 이펙트 제거
        resultArea.classList.remove('celebration');
        
        // 새로운 이펙트 추가
        setTimeout(() => {
            resultArea.classList.add('celebration');
        }, 100);
        
        // 격렬한 컨페티 효과
        this.createConfetti();
    }

    // 빵빠레 이펙트 즉시 해제
    clearCelebrationEffect() {
        const resultArea = document.getElementById('result');
        
        // celebration 클래스 제거
        resultArea.classList.remove('celebration');
        
        // celebration timeout 취소
        if (this.celebrationTimeout) {
            clearTimeout(this.celebrationTimeout);
            this.celebrationTimeout = null;
        }
        
        // 모든 컨페티와 스파클 강제 제거
        this.clearAllConfetti();
        
        // 결과 영역 스타일 초기화
        const resultText = document.querySelector('.result-text');
        const resultItem = document.getElementById('resultItem');
        
        if (resultText && resultItem) {
            resultText.textContent = "돌림판 결과";
            resultItem.textContent = "돌림판을 돌려보세요!";
            resultItem.style.color = "#fff";
        }
    }
    
    // 격렬한 컨페티 효과
    createConfetti() {
        // 기존 컨페티 모두 제거
        this.clearAllConfetti();
        
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF1493', '#FFD700', '#FF6347', '#00CED1', '#FF69B4', '#32CD32'];
        const shapes = ['circle', 'square', 'triangle', 'star'];
        
        // 컨페티 ID 저장용 배열
        this.confettiIds = [];
        
        // 더 많은 컨페티 생성 (100개)
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.id = `confetti-${Date.now()}-${i}`; // 고유 ID 부여
                
                // 랜덤 위치
                confetti.style.left = Math.random() * 100 + '%';
                
                // 랜덤 색상
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                
                // 랜덤 크기
                const size = Math.random() * 15 + 8;
                confetti.style.width = size + 'px';
                confetti.style.height = size + 'px';
                
                // 랜덤 모양
                const shape = shapes[Math.floor(Math.random() * shapes.length)];
                if (shape === 'square') {
                    confetti.style.borderRadius = '0';
                } else if (shape === 'triangle') {
                    confetti.style.width = '0';
                    confetti.style.height = '0';
                    confetti.style.backgroundColor = 'transparent';
                    confetti.style.borderLeft = (size/2) + 'px solid transparent';
                    confetti.style.borderRight = (size/2) + 'px solid transparent';
                    confetti.style.borderBottom = size + 'px solid ' + colors[Math.floor(Math.random() * colors.length)];
                } else if (shape === 'star') {
                    confetti.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
                }
                
                // 랜덤 애니메이션 지연
                confetti.style.animationDelay = Math.random() * 4 + 's';
                
                // 랜덤 회전
                confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
                
                document.body.appendChild(confetti);
                this.confettiIds.push(confetti.id);
                
                // 4초 후 제거
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.parentNode.removeChild(confetti);
                    }
                    // ID 배열에서도 제거
                    const index = this.confettiIds.indexOf(confetti.id);
                    if (index > -1) {
                        this.confettiIds.splice(index, 1);
                    }
                }, 4000);
            }, i * 30); // 더 빠른 생성
        }
        
        // 추가 효과: 화면 전체에 스파클 효과
        this.createSparkles();
    }

    // 모든 컨페티 강제 제거
    clearAllConfetti() {
        // ID로 저장된 컨페티들 제거
        if (this.confettiIds) {
            this.confettiIds.forEach(id => {
                const element = document.getElementById(id);
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            this.confettiIds = [];
        }
        
        // 클래스명으로 컨페티 제거
        const confettiElements = document.querySelectorAll('.confetti');
        confettiElements.forEach(element => {
            element.style.animation = 'none';
            element.style.display = 'none';
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        // 스파클 제거
        const sparkleElements = document.querySelectorAll('[style*="animation: sparkle"]');
        sparkleElements.forEach(element => {
            element.style.animation = 'none';
            element.style.display = 'none';
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }
    
    // 스파클 효과 추가
    createSparkles() {
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.style.position = 'fixed';
                sparkle.style.width = '4px';
                sparkle.style.height = '4px';
                sparkle.style.backgroundColor = '#FFD700';
                sparkle.style.borderRadius = '50%';
                sparkle.style.pointerEvents = 'none';
                sparkle.style.zIndex = '9998';
                sparkle.style.left = Math.random() * 100 + '%';
                sparkle.style.top = Math.random() * 100 + '%';
                sparkle.style.animation = 'sparkle 2s ease-in-out forwards';
                
                document.body.appendChild(sparkle);
                
                setTimeout(() => {
                    if (sparkle.parentNode) {
                        sparkle.parentNode.removeChild(sparkle);
                    }
                }, 2000);
            }, i * 100);
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('fortuneWheelItems', JSON.stringify(this.items));
        localStorage.setItem('fortuneWheelSettings', JSON.stringify({
            stopAnimationTime: this.stopAnimationTime
        }));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('fortuneWheelItems');
        if (saved) {
            try {
                this.items = JSON.parse(saved);
                this.drawWheel();
                this.renderItemsList();
                this.updateCurrentStatus();
            } catch (e) {
                console.error('저장된 데이터를 불러오는데 실패했습니다:', e);
            }
        }

        // 설정 로드
        const savedSettings = localStorage.getItem('fortuneWheelSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                this.stopAnimationTime = settings.stopAnimationTime || 1;
                document.getElementById('stopAnimationTime').value = this.stopAnimationTime;
            } catch (e) {
                console.error('저장된 설정을 불러오는데 실패했습니다:', e);
            }
        }
    }

    resetToDefault() {
        if (confirm('모든 설정을 초기화하시겠습니까?')) {
            this.loadDefaultItems();
            this.stopAnimationTime = 1;
            document.getElementById('stopAnimationTime').value = 1;
            this.drawWheel();
            this.renderItemsList();
            localStorage.removeItem('fortuneWheelItems');
            localStorage.removeItem('fortuneWheelSettings');
            this.updateCurrentStatus();
        }
    }

    // 프리셋 관리 기능들
    loadDefaultPreset() {
        if (confirm('기본 프리셋으로 로드하시겠습니까? 현재 설정이 사라집니다.')) {
            this.loadDefaultItems();
            this.drawWheel();
            this.renderItemsList();
            this.saveToLocalStorage();
            this.updateCurrentStatus();
        }
    }

    showSavePresetModal() {
        const presetName = prompt('프리셋 이름을 입력하세요:');
        if (presetName && presetName.trim()) {
            this.savePreset(presetName.trim());
        }
    }

    savePreset(name) {
        const presets = this.getPresets();
        presets[name] = {
            items: JSON.parse(JSON.stringify(this.items)),
            stopAnimationTime: this.stopAnimationTime,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('fortuneWheelPresets', JSON.stringify(presets));
        this.renderPresetList();
        alert(`프리셋 "${name}"이 저장되었습니다.`);
    }

    showLoadPresetModal() {
        const presets = this.getPresets();
        const presetNames = Object.keys(presets);
        
        if (presetNames.length === 0) {
            alert('저장된 프리셋이 없습니다.');
            return;
        }

        let presetList = '저장된 프리셋 목록:\n\n';
        presetNames.forEach((name, index) => {
            const preset = presets[name];
            const date = new Date(preset.createdAt).toLocaleDateString();
            presetList += `${index + 1}. ${name} (${date})\n`;
        });
        
        const selection = prompt(presetList + '\n로드할 프리셋 번호를 입력하세요:');
        const index = parseInt(selection) - 1;
        
        if (index >= 0 && index < presetNames.length) {
            const presetName = presetNames[index];
            this.loadPreset(presetName);
        }
    }

    loadPreset(name) {
        const presets = this.getPresets();
        if (presets[name]) {
            if (confirm(`프리셋 "${name}"을 로드하시겠습니까? 현재 설정이 사라집니다.`)) {
                this.items = JSON.parse(JSON.stringify(presets[name].items));
                this.stopAnimationTime = presets[name].stopAnimationTime || 1;
                document.getElementById('stopAnimationTime').value = this.stopAnimationTime;
                this.redistributeAngles();
        this.drawWheel();
        this.renderItemsList();
        this.saveToLocalStorage();
        this.updateCurrentStatus();
                alert(`프리셋 "${name}"이 로드되었습니다.`);
            }
        } else {
            alert('프리셋을 찾을 수 없습니다.');
        }
    }

    getPresets() {
        const saved = localStorage.getItem('fortuneWheelPresets');
        return saved ? JSON.parse(saved) : {};
    }

    renderPresetList() {
        const presetList = document.getElementById('presetList');
        const presets = this.getPresets();
        const presetNames = Object.keys(presets);
        
        presetList.innerHTML = '';
        
        if (presetNames.length === 0) {
            presetList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">저장된 프리셋이 없습니다.</div>';
            return;
        }
        
        presetNames.forEach(name => {
            const preset = presets[name];
            const presetItem = document.createElement('div');
            presetItem.className = 'preset-item';
            presetItem.innerHTML = `
                <div class="preset-content">
                    <div class="preset-name">${name}</div>
                    <div class="preset-info">상품 ${preset.items.length}개 | ${new Date(preset.createdAt).toLocaleDateString()}</div>
                </div>
                <button class="delete-preset-btn" onclick="event.stopPropagation(); wheel.deletePreset('${name}')">삭제</button>
            `;
            presetItem.addEventListener('click', () => this.loadPreset(name));
            presetList.appendChild(presetItem);
        });
    }

    // 프리셋 삭제
    deletePreset(name) {
        if (confirm(`"${name}" 프리셋을 삭제하시겠습니까?`)) {
            const presets = this.getPresets();
            delete presets[name];
            localStorage.setItem('fortuneWheelPresets', JSON.stringify(presets));
            this.renderPresetList();
        }
    }

    // JSON으로 내보내기
    exportToJson() {
        const data = {
            items: this.items,
            stopAnimationTime: this.stopAnimationTime,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        
        // 클립보드에 복사
        navigator.clipboard.writeText(jsonString).then(() => {
            alert('데이터가 클립보드에 복사되었습니다!');
        }).catch(() => {
            // 클립보드 복사 실패시 텍스트 영역에 표시
            const textarea = document.createElement('textarea');
            textarea.value = jsonString;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('데이터가 클립보드에 복사되었습니다!');
        });
    }

    // JSON에서 가져오기
    importFromJson() {
        const jsonText = document.getElementById('jsonImportText').value.trim();
        
        if (!jsonText) {
            alert('JSON 문자열을 입력해주세요.');
            return;
        }

        try {
            const data = JSON.parse(jsonText);
            
            // 데이터 유효성 검사
            if (!data.items || !Array.isArray(data.items)) {
                throw new Error('유효하지 않은 데이터 형식입니다.');
            }

            // 확인 대화상자
            if (confirm('현재 데이터를 가져온 데이터로 교체하시겠습니까?')) {
                this.items = data.items;
                if (data.stopAnimationTime) {
                    this.stopAnimationTime = data.stopAnimationTime;
                    document.getElementById('stopAnimationTime').value = this.stopAnimationTime;
                }
                
                this.redistributeAngles();
                this.drawWheel();
                this.renderItemsList();
                this.saveToLocalStorage();
                this.updateCurrentStatus();
                
                // 텍스트 영역 초기화
                document.getElementById('jsonImportText').value = '';
                
                alert('데이터를 성공적으로 가져왔습니다!');
            }
        } catch (error) {
            alert('JSON 파싱 오류: ' + error.message);
        }
    }

}

// 서랍 토글 함수
function toggleDrawer() {
    const drawer = document.getElementById('settingsDrawer');
    const wheelArea = document.querySelector('.wheel-area');
    const toggleIcon = document.getElementById('toggleIcon');
    const fixedToggle = document.getElementById('fixedSettingsToggle');
    
    if (drawer.classList.contains('open')) {
        // 서랍 닫기
        drawer.classList.remove('open');
        wheelArea.classList.remove('drawer-open');
        if (toggleIcon) toggleIcon.textContent = '◀';
        if (fixedToggle) fixedToggle.textContent = '⚙️ 설정';
    } else {
        // 서랍 열기
        drawer.classList.add('open');
        wheelArea.classList.add('drawer-open');
        if (toggleIcon) toggleIcon.textContent = '▶';
        if (fixedToggle) fixedToggle.textContent = '✖️ 닫기';
    }
}

// 드래그 리사이즈 기능
function initDrawerResize() {
    const drawer = document.getElementById('settingsDrawer');
    const resizeHandle = document.getElementById('drawerResizeHandle');
    const wheelArea = document.querySelector('.wheel-area');
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = drawer.offsetWidth;
        
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
    });
    
    function handleResize(e) {
        if (!isResizing) return;
        
        const newWidth = startWidth + (startX - e.clientX);
        const minWidth = 300;
        const maxWidth = 600;
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            drawer.style.width = newWidth + 'px';
            // 룰렛 영역 패딩도 조정
            wheelArea.style.paddingRight = (newWidth + 50) + 'px';
        }
    }
    
    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }
}

// 애플리케이션 시작
let wheel;
document.addEventListener('DOMContentLoaded', () => {
    wheel = new FortuneWheel();
    
    // 초기 서랍 상태 설정 (닫힌 상태)
    const drawer = document.getElementById('settingsDrawer');
    drawer.classList.remove('open');
    
    // 드래그 리사이즈 기능 초기화
    initDrawerResize();
});
