
// Step2 即時搜索功能

let searchTimeout;
let allCases = [];

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', function() {
    loadAllCases();
    setupSearchListeners();
});

// 載入所有個案資料
function loadAllCases() {
    fetch('/step2-search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keyword: '' })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            allCases = data.data;
            renderCases(allCases);
            updateCaseCount(allCases.length);
        } else {
            showError(data.message || '載入失敗');
        }
    })
    .catch(error => {
        console.error('載入個案失敗:', error);
        showError('載入失敗，請重新整理頁面');
    });
}

// 設置搜索監聽器
function setupSearchListeners() {
    const searchInput = document.querySelector('input[name="keyword"]');
    const searchField = document.getElementById('search_field');
    
    if (searchInput) {
        // 輸入時即時搜索
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch();
            }, 300); // 300ms 延遲避免過於頻繁的請求
        });
    }
    
    if (searchField) {
        // 搜索欄位改變時也觸發搜索
        searchField.addEventListener('change', function() {
            performSearch();
        });
    }
}

// 執行搜索
function performSearch() {
    const searchInput = document.querySelector('input[name="keyword"]');
    const searchField = document.getElementById('search_field');
    
    if (!searchInput || !searchField) return;
    
    const keyword = searchInput.value.trim();
    const field = searchField.value;
    
    let filteredCases = allCases;
    
    if (keyword) {
        filteredCases = allCases.filter(caseItem => {
            if (field) {
                // 指定欄位搜索
                const fieldValue = caseItem[field] || '';
                return fieldValue.toString().toLowerCase().includes(keyword.toLowerCase());
            } else {
                // 全部欄位搜索
                const searchableFields = ['medical_record_no', 'patient_name', 'id_document_no'];
                return searchableFields.some(fieldName => {
                    const fieldValue = caseItem[fieldName] || '';
                    return fieldValue.toString().toLowerCase().includes(keyword.toLowerCase());
                });
            }
        });
    }
    
    renderCases(filteredCases);
    updateCaseCount(filteredCases.length);
}

// 渲染個案卡片
function renderCases(cases) {
    const casesGrid = document.querySelector('.cases-grid');
    
    if (!casesGrid) return;
    
    if (cases.length === 0) {
        casesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-search"></i>
                <h3>查無符合條件的個案資料</h3>
                <p>請嘗試調整查詢條件或<a href="/step1">新增個案</a></p>
            </div>
        `;
        return;
    }
    
    casesGrid.innerHTML = cases.map(caseItem => {
        const genderText = caseItem.gender === "1" ? "男性" : 
                          caseItem.gender === "2" ? "女性" : "未填寫";
        
        return `
            <div class="case-card">
                <div class="case-header">
                    <div class="case-id">
                        <i class="fas fa-id-card"></i>
                        ${caseItem.medical_record_no}
                    </div>
                    <div class="case-status">可訪談</div>
                </div>
                
                <div class="case-info">
                    <div class="info-row">
                        <span class="info-label">
                            <i class="fas fa-user"></i>
                            姓名
                        </span>
                        <span class="info-value">${caseItem.patient_name || '未填寫'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">
                            <i class="fas fa-venus-mars"></i>
                            性別
                        </span>
                        <span class="info-value">${genderText}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">
                            <i class="fas fa-calendar-alt"></i>
                            出生日期
                        </span>
                        <span class="info-value">${caseItem.birth_date || '未填寫'}</span>
                    </div>
                </div>
                
                <div class="case-actions">
                    <a href="/step2/${caseItem.medical_record_no}" class="interview-btn">
                        <i class="fas fa-notes-medical"></i>
                        開始訪談
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// 更新個案數量顯示
function updateCaseCount(count) {
    const countElement = document.querySelector('.count-number');
    if (countElement) {
        countElement.textContent = count;
    }
}

// 顯示錯誤訊息
function showError(message) {
    const casesGrid = document.querySelector('.cases-grid');
    if (casesGrid) {
        casesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>載入失敗</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// 重置搜索
function resetSearch() {
    const searchInput = document.querySelector('input[name="keyword"]');
    const searchField = document.getElementById('search_field');
    
    if (searchInput) searchInput.value = '';
    if (searchField) searchField.value = '';
    
    renderCases(allCases);
    updateCaseCount(allCases.length);
}

// 回首頁
function goHome() {
    window.location.href = "/home";
}
