
// Step3 即時搜索功能

let searchTimeout;
let allCases = [];

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', function() {
    loadAllCases();
    setupSearchListeners();
});

// 載入所有個案資料
function loadAllCases() {
    fetch('/step3-search', {
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
    const searchInput = document.getElementById('searchInput');
    const searchField = document.getElementById('searchField');
    
    // 輸入時即時搜索
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch();
        }, 300); // 300ms 延遲避免過於頻繁的搜索
    });
    
    // 欄位變更時重新搜索
    searchField.addEventListener('change', function() {
        performSearch();
    });
}

// 執行搜索
function performSearch() {
    const keyword = document.getElementById('searchInput').value.trim();
    const field = document.getElementById('searchField').value;
    
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

// 渲染個案列表
function renderCases(cases) {
    const container = document.getElementById('casesContainer');
    
    if (cases.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-inbox"></i>
                <p>查無符合條件的個案資料</p>
                <small>請調整搜索條件或清除搜索重新顯示所有個案</small>
            </div>
        `;
        return;
    }
    
    const casesGrid = document.createElement('div');
    casesGrid.className = 'cases-grid';
    
    cases.forEach(caseItem => {
        const genderText = caseItem.gender === '1' ? '男' : 
                          caseItem.gender === '0' ? '女' : '未填寫';
        
        const caseCard = document.createElement('div');
        caseCard.className = 'case-card';
        caseCard.innerHTML = `
            <div class="case-header">
                <div class="case-id">
                    <i class="fas fa-id-card"></i>
                    ${caseItem.medical_record_no}
                </div>
                <div class="case-status">
                    <span class="status-badge ready">可編輯</span>
                </div>
            </div>
            
            <div class="case-info">
                <div class="info-row">
                    <span class="label">姓名：</span>
                    <span class="value">${caseItem.patient_name || '未填寫'}</span>
                </div>
                <div class="info-row">
                    <span class="label">性別：</span>
                    <span class="value">${genderText}</span>
                </div>
                <div class="info-row">
                    <span class="label">出生日期：</span>
                    <span class="value">${caseItem.birth_date || '未填寫'}</span>
                </div>
                <div class="info-row">
                    <span class="label">身分證件：</span>
                    <span class="value">${caseItem.id_document_no || '未填寫'}</span>
                </div>
            </div>
            
            <div class="case-actions">
                <button class="edit-btn" onclick="editCase('${caseItem.medical_record_no}')">
                    <i class="fas fa-edit"></i> 預覽編輯
                </button>
            </div>
        `;
        
        casesGrid.appendChild(caseCard);
    });
    
    container.innerHTML = '';
    container.appendChild(casesGrid);
}

// 更新個案數量顯示
function updateCaseCount(count) {
    document.getElementById('caseCount').textContent = `共 ${count} 筆個案`;
}

// 顯示錯誤訊息
function showError(message) {
    const container = document.getElementById('casesContainer');
    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i> ${message}
        </div>
    `;
    updateCaseCount(0);
}

// 清除搜索
function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchField').value = '';
    renderCases(allCases);
    updateCaseCount(allCases.length);
}

// 編輯個案
function editCase(medicalRecordNo) {
    window.location.href = `/step3/${medicalRecordNo}`;
}

// 返回首頁
function goHome() {
    window.location.href = "/home";
}

// 返回Step3列表
function goBack() {
    window.location.href = "/step3";
}

// 語音辨識功能 (保持原有功能)
let recognition;
let isListening = false;

function startRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('您的瀏覽器不支援語音辨識功能');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-TW';

    const statusElement = document.getElementById('speechStatus');
    const resultElement = document.getElementById('speechResult');

    recognition.onstart = function() {
        isListening = true;
        statusElement.textContent = '正在聆聽...';
        statusElement.className = 'speech-status listening';
    };

    recognition.onresult = function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                transcript += event.results[i][0].transcript;
            }
        }
        
        if (transcript) {
            resultElement.value += transcript + ' ';
        }
    };

    recognition.onerror = function(event) {
        statusElement.textContent = '語音辨識錯誤: ' + event.error;
        statusElement.className = 'speech-status error';
        isListening = false;
    };

    recognition.onend = function() {
        statusElement.textContent = '語音辨識已停止';
        statusElement.className = 'speech-status stopped';
        isListening = false;
    };

    recognition.start();
}

function clearSpeechResult() {
    document.getElementById('speechResult').value = '';
}

// AI 摘要生成功能
function generateAISummary() {
    const medicalRecordNo = '{{ case.medical_record_no }}';
    
    if (!medicalRecordNo) {
        alert('無法取得病歷號');
        return;
    }

    // 顯示載入狀態
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
    button.disabled = true;

    fetch(`/generate-summary-ai/${medicalRecordNo}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('speechResult').value = data.summary;
                alert('AI 摘要已生成完成！');
            } else {
                alert('生成失敗：' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('生成失敗，請稍後再試');
        })
        .finally(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        });
}
