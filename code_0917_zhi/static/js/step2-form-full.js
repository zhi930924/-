// Step2 表單完整功能
document.addEventListener('DOMContentLoaded', function() {
    // 初始化表單功能
    initFormValidation();
    initAutoComplete();
    initDatePickers();

    console.log('Step2 表單功能已初始化');
});

// 表單驗證功能
function initFormValidation() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        if (!validateForm()) {
            e.preventDefault();
            showErrorMessage('請檢查必填欄位');
        }
    });
}

// 驗證表單
function validateForm() {
    const requiredFields = document.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });

    return isValid;
}

// 自動完成功能
function initAutoComplete() {
    const addressInput = document.querySelector('input[name="address_full"]');
    if (addressInput) {
        addressInput.addEventListener('input', function() {
            // 可以在這裡添加地址自動完成功能
        });
    }
}

// 日期選擇器初始化
function initDatePickers() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.addEventListener('change', function() {
            validateDate(this);
        });
    });
}

// 驗證日期
function validateDate(input) {
    const date = new Date(input.value);
    const today = new Date();

    if (date > today) {
        input.classList.add('error');
        showErrorMessage('日期不能超過今天');
    } else {
        input.classList.remove('error');
    }
}

// 顯示錯誤訊息
function showErrorMessage(message) {
    // 創建或更新錯誤訊息元素
    let errorDiv = document.querySelector('.error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // 3秒後自動隱藏
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

// 表單自動儲存功能
let autoSaveTimeout;
function setupAutoSave() {
    const inputs = document.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        input.addEventListener('input', function() {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                autoSaveForm();
            }, 2000); // 2秒後自動儲存
        });
    });
}

// 自動儲存表單資料
function autoSaveForm() {
    const formData = new FormData(document.querySelector('form'));
    const data = {};

    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    // 儲存到localStorage
    localStorage.setItem('step2_draft', JSON.stringify(data));

    // 顯示儲存提示
    showSaveIndicator();
}

// 顯示儲存指示器
function showSaveIndicator() {
    let indicator = document.querySelector('.save-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'save-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        indicator.textContent = '已自動儲存';
        document.body.appendChild(indicator);
    }

    indicator.style.opacity = '1';
    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 2000);
}

// 載入草稿資料
function loadDraftData() {
    const draftData = localStorage.getItem('step2_draft');
    if (draftData) {
        try {
            const data = JSON.parse(draftData);
            for (let key in data) {
                const input = document.querySelector(`[name="${key}"]`);
                if (input) {
                    input.value = data[key];
                }
            }
        } catch (e) {
            console.error('載入草稿失敗:', e);
        }
    }
}

// 清除草稿資料
function clearDraftData() {
    localStorage.removeItem('step2_draft');
}

// 頁面離開前提醒
window.addEventListener('beforeunload', function(e) {
    const form = document.querySelector('form');
    if (form && isFormModified()) {
        const message = '您有未儲存的資料，確定要離開嗎？';
        e.returnValue = message;
        return message;
    }
});

// 檢查表單是否已修改
function isFormModified() {
    // 這裡可以實作檢查表單是否有變更的邏輯
    return false;
}

// 更新行業細類選項的函數
function updateIndustryMinorOptions(industryMinorSelect, industryMinorData, majorCode) {
    // 清空細類選項
    industryMinorSelect.innerHTML = '<option value="" disabled selected hidden>請選擇</option>';

    // 過濾出對應的細類選項
    const filteredMinor = industryMinorData.filter(minor => minor.大類代碼 === majorCode);

    // 新增細類選項
    filteredMinor.forEach(minor => {
        const option = document.createElement('option');
        option.value = minor.細類代碼;
        option.textContent = `${minor.細類代碼} - ${minor.細類}`;
        industryMinorSelect.appendChild(option);
    });
}