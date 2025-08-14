class FortuneWheel {
    constructor() {
        this.canvas = document.getElementById('wheelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.items = [];
        this.isSpinning = false;
        this.currentRotation = 0;
        this.targetRotation = 0;
        this.animationId = null;
        
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
        // 기본 상품들
        this.items = [
            { name: "아이폰 15", startAngle: 0, endAngle: 60, color: "#FF6B6B" },
            { name: "에어팟 프로", startAngle: 60, endAngle: 120, color: "#4ECDC4" },
            { name: "스타벅스 기프티콘", startAngle: 120, endAngle: 180, color: "#45B7D1" },
            { name: "쿠폰 10%", startAngle: 180, endAngle: 240, color: "#96CEB4" },
            { name: "쿠폰 20%", startAngle: 240, endAngle: 300, color: "#FFEAA7" },
            { name: "꽝", startAngle: 300, endAngle: 360, color: "#DDA0DD" }
        ];
    }

    setupEventListeners() {
        // 돌리기 버튼
        document.getElementById('spinBtn').addEventListener('click', () => {
            if (!this.isSpinning) {
                this.spin();
            }
        });

        // 상품 추가 버튼 - 팝업 없이 바로 추가
        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.addItemQuickly();
        });

        // 빈 영역 채우기 버튼
        document.getElementById('fillGapsBtn').addEventListener('click', () => {
            this.fillAllGaps();
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

        // 모달 외부 클릭시 닫기
        document.getElementById('addItemModal').addEventListener('click', (e) => {
            if (e.target.id === 'addItemModal') {
                this.hideAddItemModal();
            }
        });

        // 마우스 이벤트 리스너들
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));

        // 로컬 스토리지에서 데이터 로드
        this.loadFromLocalStorage();
    }

    // 마우스 이벤트 핸들러들
    handleMouseDown(e) {
        if (this.isSpinning) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const result = this.getBoundaryAtPoint(x, y);
        if (result) {
            this.isDragging = true;
            this.draggedItemIndex = result.itemIndex;
            this.dragType = result.boundary;
            this.dragStartAngle = this.getAngleFromPoint(x, y);
            
            this.canvas.style.cursor = 'grabbing';
        }
    }

    handleMouseMove(e) {
        if (this.isSpinning) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.isDragging) {
            // 드래그 중일 때 각도 업데이트
            const currentAngle = this.getAngleFromPoint(x, y);
            this.updateItemBoundary(currentAngle);
        } else {
            // 호버 효과 업데이트
            const result = this.getBoundaryAtPoint(x, y);
            if (result) {
                this.canvas.style.cursor = 'grab';
                this.hoveredItemIndex = result.itemIndex;
                this.hoveredBoundary = result.boundary;
            } else {
                // 경계선이 아닌 경우, 마우스가 어떤 상품 영역에 있는지 확인
                const currentItem = this.getItemAtMousePosition(x, y);
                if (currentItem) {
                    this.canvas.style.cursor = 'default';
                    this.hoveredItemIndex = this.items.indexOf(currentItem);
                    this.hoveredBoundary = null;
                } else {
                    this.canvas.style.cursor = 'default';
                    this.hoveredItemIndex = -1;
                    this.hoveredBoundary = null;
                }
            }
        }
        
        this.drawWheel();
        this.updateCurrentStatus();
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.draggedItemIndex = -1;
            this.dragType = null;
            this.canvas.style.cursor = 'default';
            
            // 변경사항 저장
            this.saveToLocalStorage();
            this.renderItemsList();
        }
    }

    handleMouseLeave(e) {
        if (this.isDragging) {
            this.handleMouseUp(e);
        }
        this.hoveredItemIndex = -1;
        this.hoveredBoundary = null;
        this.canvas.style.cursor = 'default';
        this.drawWheel();
        this.updateCurrentStatus();
    }

    // 마우스 위치에서 상품 감지
    getItemAtMousePosition(x, y) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        
        // 중앙에서의 거리 계산
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        // 돌림판 영역 내부인지 확인
        if (distance < radius * 0.3 || distance > radius) {
            return null;
        }
        
        const angle = this.getAngleFromPoint(x, y);
        return this.getItemAtAngle(angle);
    }

    // 포인트에서 각도 계산
    getAngleFromPoint(x, y) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const deltaX = x - centerX;
        const deltaY = y - centerY;
        
        let angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        angle = (angle + 90 + 360) % 360; // 12시 방향을 0도로 맞춤
        
        return angle;
    }

    // 포인트에서 경계선 감지
    getBoundaryAtPoint(x, y) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        
        // 중앙에서의 거리 계산
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        // 돌림판 영역 내부인지 확인
        if (distance < radius * 0.3 || distance > radius) {
            return null;
        }
        
        const angle = this.getAngleFromPoint(x, y);
        
        // 각 상품의 경계선과의 거리 확인
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const startDist = Math.abs(angle - item.startAngle);
            const endDist = Math.abs(angle - item.endAngle);
            
            // 360도 경계 처리
            const startDist360 = Math.min(startDist, Math.abs(angle - (item.startAngle + 360)), Math.abs(angle - (item.startAngle - 360)));
            const endDist360 = Math.min(endDist, Math.abs(angle - (item.endAngle + 360)), Math.abs(angle - (item.endAngle - 360)));
            
            const minStartDist = Math.min(startDist, startDist360);
            const minEndDist = Math.min(endDist, endDist360);
            
            // 경계선 감지 범위 (5도)
            if (minStartDist <= 5) {
                return { itemIndex: i, boundary: 'start' };
            }
            if (minEndDist <= 5) {
                return { itemIndex: i, boundary: 'end' };
            }
        }
        
        return null;
    }

    // 경계선 업데이트
    updateItemBoundary(currentAngle) {
        if (this.draggedItemIndex === -1) return;
        
        const item = this.items[this.draggedItemIndex];
        const newAngle = Math.round(currentAngle);
        
        if (this.dragType === 'start') {
            // 시작 각도 업데이트
            if (newAngle < item.endAngle && newAngle >= 0) {
                // 이전 상품과의 겹침 방지
                const prevItem = this.items[this.draggedItemIndex - 1];
                if (!prevItem || newAngle >= prevItem.endAngle) {
                    item.startAngle = newAngle;
                }
            }
        } else if (this.dragType === 'end') {
            // 끝 각도 업데이트
            if (newAngle > item.startAngle && newAngle <= 360) {
                // 다음 상품과의 겹침 방지
                const nextItem = this.items[this.draggedItemIndex + 1];
                if (!nextItem || newAngle <= nextItem.startAngle) {
                    item.endAngle = newAngle;
                }
            }
        }
        
        // 각도 정렬
        this.items.sort((a, b) => a.startAngle - b.startAngle);
        
        // 인덱스 재계산
        this.draggedItemIndex = this.items.findIndex(item => 
            item.name === this.items[this.draggedItemIndex].name
        );
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
        document.getElementById('addItemModal').classList.remove('hidden');
        document.getElementById('itemName').focus();
    }

    hideAddItemModal() {
        document.getElementById('addItemModal').classList.add('hidden');
        // 입력 필드 초기화
        document.getElementById('itemName').value = '';
        document.getElementById('itemStart').value = '0';
        document.getElementById('itemEnd').value = '90';
        document.getElementById('itemColor').value = '#FF6B6B';
    }

    addItem() {
        const name = document.getElementById('itemName').value.trim();
        const startAngle = parseInt(document.getElementById('itemStart').value);
        const endAngle = parseInt(document.getElementById('itemEnd').value);
        const color = document.getElementById('itemColor').value;

        if (!name) {
            alert('상품명을 입력해주세요.');
            return;
        }

        if (startAngle >= endAngle) {
            alert('시작 각도는 끝 각도보다 작아야 합니다.');
            return;
        }

        // 각도 중복 검사
        if (this.checkAngleOverlap(startAngle, endAngle)) {
            alert('다른 상품과 각도가 겹칩니다.');
            return;
        }

        const newItem = {
            name,
            startAngle,
            endAngle,
            color
        };

        this.items.push(newItem);
        this.items.sort((a, b) => a.startAngle - b.startAngle);
        
        this.hideAddItemModal();
        this.drawWheel();
        this.renderItemsList();
        this.saveToLocalStorage();
        this.updateCurrentStatus();
    }

    // 팝업 없이 바로 상품 추가 (기존 아이템 각도 자동 조정)
    addItemQuickly() {
        // 새 상품명 생성 (기본값 + 번호)
        let itemNumber = 1;
        let newName = `새 상품 ${itemNumber}`;
        
        // 중복되지 않는 이름 찾기
        while (this.items.some(item => item.name === newName)) {
            itemNumber++;
            newName = `새 상품 ${itemNumber}`;
        }
        
        // 랜덤 색상 생성
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        // 새 상품을 안전하게 추가
        const newItem = this.addItemSafely(newName, randomColor);
        
        // 돌림판 다시 그리기
        this.drawWheel();
        this.renderItemsList();
        this.saveToLocalStorage();
        this.updateCurrentStatus();
        
        // 성공 메시지
        console.log(`새 상품 "${newName}"이 추가되었습니다!`);
    }
    
    // 안전하게 상품 추가 (기존 아이템 각도 보존)
    addItemSafely(name, color) {
        if (this.items.length === 0) {
            // 첫 번째 아이템인 경우
            const newItem = {
                name: name,
                startAngle: 0,
                endAngle: 60,
                color: color
            };
            this.items.push(newItem);
            return newItem;
        }
        
        // 기존 아이템들의 각도를 균등하게 조정
        this.redistributeAngles();
        
        // 가장 큰 빈 공간에 새 상품 삽입
        const newItem = {
            name: name,
            startAngle: 0,
            endAngle: 60,
            color: color
        };
        
        this.insertItemInGap(newItem);
        return newItem;
    }
    
    // 기존 아이템들의 각도를 균등하게 재분배
    redistributeAngles() {
        const totalItems = this.items.length + 1; // 새 상품 포함
        const anglePerItem = 360 / totalItems;
        
        // 기존 아이템들의 각도를 균등하게 조정
        this.items.forEach((item, index) => {
            item.startAngle = index * anglePerItem;
            item.endAngle = (index + 1) * anglePerItem;
        });
    }
    
    // 빈 공간에 새 상품 삽입
    insertItemInGap(newItem) {
        // 가장 큰 빈 공간 찾기
        let maxGap = 0;
        let bestPosition = 0;
        
        // 아이템들 사이의 빈 공간 확인
        for (let i = 0; i < this.items.length; i++) {
            const currentItem = this.items[i];
            const nextItem = this.items[(i + 1) % this.items.length];
            
            let gap;
            if (i === this.items.length - 1) {
                // 마지막 아이템과 첫 번째 아이템 사이
                gap = (360 - currentItem.endAngle) + nextItem.startAngle;
            } else {
                gap = nextItem.startAngle - currentItem.endAngle;
            }
            
            if (gap > maxGap) {
                maxGap = gap;
                bestPosition = i;
            }
        }
        
        // 새 상품을 적절한 위치에 삽입
        const targetItem = this.items[bestPosition];
        
        if (bestPosition === this.items.length - 1) {
            // 마지막 아이템 다음에 삽입
            newItem.startAngle = targetItem.endAngle;
            newItem.endAngle = 360;
        } else {
            // 두 아이템 사이에 삽입
            newItem.startAngle = targetItem.endAngle;
            newItem.endAngle = targetItem.endAngle + 60;
        }
        
        // 새 상품을 적절한 위치에 삽입
        this.items.splice(bestPosition + 1, 0, newItem);
        
        // 각도 정규화 및 정렬
        this.normalizeAndSortAngles();
    }
    
    // 각도 정규화 및 정렬
    normalizeAndSortAngles() {
        // 각도 정규화 (0-360 범위 내로)
        this.items.forEach(item => {
            item.startAngle = (item.startAngle + 360) % 360;
            item.endAngle = (item.endAngle + 360) % 360;
            
            // 시작 각도가 끝 각도보다 큰 경우 조정
            if (item.startAngle > item.endAngle) {
                item.endAngle += 360;
            }
        });
        
        // 각도 순으로 정렬
        this.items.sort((a, b) => a.startAngle - b.startAngle);
        
        // 각도 겹침 방지
        this.preventAngleOverlap();
    }
    
    // 각도 겹침 방지
    preventAngleOverlap() {
        for (let i = 0; i < this.items.length; i++) {
            const currentItem = this.items[i];
            const nextItem = this.items[(i + 1) % this.items.length];
            
            if (i === this.items.length - 1) {
                // 마지막 아이템과 첫 번째 아이템 사이
                if (currentItem.endAngle > 360) {
                    currentItem.endAngle = 360;
                }
            } else {
                // 다음 아이템과 겹치지 않도록 조정
                if (currentItem.endAngle > nextItem.startAngle) {
                    currentItem.endAngle = nextItem.startAngle;
                }
            }
        }
    }

    checkAngleOverlap(startAngle, endAngle) {
        return this.items.some(item => {
            return (startAngle < item.endAngle && endAngle > item.startAngle);
        });
    }

    removeItem(index) {
        if (confirm('정말로 이 상품을 삭제하시겠습니까?')) {
            this.items.splice(index, 1);
            this.drawWheel();
            this.renderItemsList();
            this.saveToLocalStorage();
            this.updateCurrentStatus();
        }
    }

    editItem(index) {
        const item = this.items[index];
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemStart').value = item.startAngle;
        document.getElementById('itemEnd').value = item.endAngle;
        document.getElementById('itemColor').value = item.color;
        
        this.showAddItemModal();
        
        // 기존 아이템 삭제 후 새로 추가
        document.getElementById('confirmAddBtn').onclick = () => {
            this.items.splice(index, 1);
            this.addItem();
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
                        <div class="item-angles">${item.startAngle}° ~ ${item.endAngle}°</div>
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

        // 경계선 강조 표시
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

    // 경계선 그리기
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
            
            // 호버 효과나 드래그 중일 때 경계선 강조
            if ((this.hoveredItemIndex === index && this.hoveredBoundary === 'start') ||
                (this.draggedItemIndex === index && this.dragType === 'start')) {
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 4;
            } else {
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 3;
            }
            this.ctx.stroke();

            // 끝 경계선
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(
                centerX + radius * Math.cos(endAngle),
                centerY + radius * Math.sin(endAngle)
            );
            
            if ((this.hoveredItemIndex === index && this.hoveredBoundary === 'end') ||
                (this.draggedItemIndex === index && this.dragType === 'end')) {
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 4;
            } else {
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 3;
            }
            this.ctx.stroke();
        });
    }

    spin() {
        if (this.isSpinning) return;

        this.isSpinning = true;
        document.getElementById('spinBtn').disabled = true;
        this.updateCurrentStatus();

        // 랜덤 회전 각도 (최소 5바퀴) - 현재 회전 상태에서 추가
        const minSpins = 5;
        const maxSpins = 10;
        const spins = Math.random() * (maxSpins - minSpins) + minSpins;
        const targetAngle = this.currentRotation + (spins * 360);

        this.targetRotation = targetAngle;
        this.animateSpin();
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
        setTimeout(() => {
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
    
    // 격렬한 컨페티 효과
    createConfetti() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF1493', '#FFD700', '#FF6347', '#00CED1', '#FF69B4', '#32CD32'];
        const shapes = ['circle', 'square', 'triangle', 'star'];
        
        // 더 많은 컨페티 생성 (100개)
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                
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
                
                // 4초 후 제거
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.parentNode.removeChild(confetti);
                    }
                }, 4000);
            }, i * 30); // 더 빠른 생성
        }
        
        // 추가 효과: 화면 전체에 스파클 효과
        this.createSparkles();
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
    }

    resetToDefault() {
        if (confirm('모든 설정을 초기화하시겠습니까?')) {
            this.loadDefaultItems();
            this.drawWheel();
            this.renderItemsList();
            localStorage.removeItem('fortuneWheelItems');
            this.updateCurrentStatus();
            this.updateFillGapsButtonState(); // 빈 영역 채우기 버튼 상태 업데이트
        }
    }

    // 빈 영역 채우기 - 모든 상품 각도를 자동 조정하여 360도 꽉 채우기
    fillAllGaps() {
        if (this.items.length === 0) {
            alert('상품이 없습니다.');
            return;
        }

        // 빈 영역이 있는지 확인
        if (!this.hasGaps()) {
            alert('이미 모든 영역이 꽉 찬 상태입니다! 🎯');
            return;
        }

        // 사용자에게 확인
        if (!confirm('기존 상품들의 각도가 변경됩니다. 정말로 빈 영역을 모두 채우시겠습니까?')) {
            return;
        }

        if (this.items.length === 1) {
            // 상품이 하나뿐인 경우 360도 전체 차지
            this.items[0].startAngle = 0;
            this.items[0].endAngle = 360;
        } else {
            // 여러 상품인 경우 균등하게 분배
            this.distributeEvenly();
        }

        // 돌림판 다시 그리기
        this.drawWheel();
        this.renderItemsList();
        this.saveToLocalStorage();
        this.updateCurrentStatus();

        // 성공 메시지
        alert('빈 영역을 모두 채웠습니다! 🎯');
    }

    // 빈 영역이 있는지 확인하는 함수
    hasGaps() {
        if (this.items.length === 0) return false;
        if (this.items.length === 1) {
            // 상품이 하나뿐인 경우, 360도 전체를 차지하지 않으면 빈 영역이 있음
            return !(this.items[0].startAngle === 0 && this.items[0].endAngle === 360);
        }

        // 여러 상품인 경우, 각도가 연속되지 않거나 360도를 완전히 채우지 않으면 빈 영역이 있음
        let totalCovered = 0;
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const nextItem = this.items[(i + 1) % this.items.length];
            
            // 현재 아이템의 각도 범위 계산
            let itemRange;
            if (i === this.items.length - 1) {
                // 마지막 아이템과 첫 번째 아이템 사이
                if (item.endAngle < nextItem.startAngle) {
                    itemRange = item.endAngle - item.startAngle;
                } else {
                    itemRange = (360 - item.startAngle) + nextItem.startAngle;
                }
            } else {
                itemRange = item.endAngle - item.startAngle;
            }
            
            totalCovered += itemRange;
        }

        // 360도와 비교 (부동소수점 오차 허용)
        return Math.abs(totalCovered - 360) > 1;
    }

    // 모든 상품을 360도에 균등하게 분배
    distributeEvenly() {
        const totalItems = this.items.length;
        const anglePerItem = 360 / totalItems;

        // 각 상품의 각도를 균등하게 설정
        this.items.forEach((item, index) => {
            item.startAngle = index * anglePerItem;
            item.endAngle = (index + 1) * anglePerItem;
        });

        // 각도 정규화 및 정렬
        this.normalizeAndSortAngles();
    }
}

// 설정 영역 접기/펼치기 함수
function toggleSettings() {
    const settingsContent = document.getElementById('settingsContent');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (settingsContent.classList.contains('collapsed')) {
        settingsContent.classList.remove('collapsed');
        settingsContent.classList.add('expanded');
        toggleIcon.textContent = '▼';
        toggleIcon.style.transform = 'rotate(0deg)';
    } else {
        settingsContent.classList.remove('expanded');
        settingsContent.classList.add('collapsed');
        toggleIcon.textContent = '▶';
        toggleIcon.style.transform = 'rotate(-90deg)';
    }
}

// 애플리케이션 시작
let wheel;
document.addEventListener('DOMContentLoaded', () => {
    wheel = new FortuneWheel();
    
    // 초기 설정 영역 상태 설정
    const settingsContent = document.getElementById('settingsContent');
    settingsContent.classList.add('expanded');
});
