
// === case-query.js ===

// 全域變數
let allCases = [];
let filteredCases = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentSort = { field: null, direction: 'asc' };
let currentView = 'table';
let searchTimeout;

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    loadAllCases();
});

// 初始化頁面
function initializePage() {
    // 檢查 URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const searchField = urlParams.get('search_field');
    const keyword = urlParams.get('keyword');
    
    if (searchField) {
        document.getElementById('search_field').value = searchField;
    }
    if (keyword) {
        document.getElementById('keyword').value = keyword;
    }
    
    // 設定預設檢視
    updateViewButtons();
}

// 設定事件監聽器
function setupEventListeners() {
    // 即時搜尋
    const keywordInput = document.getElementById('keyword');
    if (keywordInput) {
        keywordInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch();
            }, 300);
        });
        
        keywordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
    }
    
    // 搜尋欄位變更
    const searchField = document.getElementById('search_field');
    if (searchField) {
        searchField.addEventListener('change', performSearch);
    }
    
    // 進階搜尋欄位
    ['gender_filter', 'date_from', 'date_to'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', performSearch);
        }
    });
    
    // 表格排序
    setupTableSorting();
    
    // 檢視模式切換
    setupViewSwitching();
}

// 載入所有個案資料
function loadAllCases() {
    showLoading(true);
    
    fetch('/case-query-search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keyword: '' })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            allCases = data.data || [];
            filteredCases = [...allCases];
            renderResults();
            updateResultsCount();
        } else {
            console.error('載入失敗:', data.message);
            showError('載入個案資料失敗');
        }
    })
    .catch(error => {
        console.error('載入錯誤:', error);
        showError('載入個案資料失敗，請重新整理頁面');
    })
    .finally(() => {
        showLoading(false);
    });
}

// 執行搜尋
function performSearch() {
    const keyword = document.getElementById('keyword').value.trim();
    const searchField = document.getElementById('search_field').value;
    const genderFilter = document.getElementById('gender_filter').value;
    const dateFrom = document.getElementById('date_from').value;
    const dateTo = document.getElementById('date_to').value;
    
    showLoading(true);
    
    // 從所有資料中篩選
    filteredCases = allCases.filter(caseItem => {
        // 關鍵字搜尋
        if (keyword) {
            if (searchField) {
                const fieldValue = (caseItem[searchField] || '').toString().toLowerCase();
                if (!fieldValue.includes(keyword.toLowerCase())) {
                    return false;
                }
            } else {
                // 全部欄位搜尋
                const searchableFields = ['medical_record_no', 'patient_name', 'id_document_no'];
                const matches = searchableFields.some(field => {
                    const fieldValue = (caseItem[field] || '').toString().toLowerCase();
                    return fieldValue.includes(keyword.toLowerCase());
                });
                if (!matches) {
                    return false;
                }
            }
        }
        
        // 性別篩選
        if (genderFilter && caseItem.gender !== genderFilter) {
            return false;
        }
        
        // 日期範圍篩選
        if (dateFrom || dateTo) {
            const createdDate = caseItem.created_at ? caseItem.created_at.split('T')[0] : '';
            if (dateFrom && createdDate < dateFrom) {
                return false;
            }
            if (dateTo && createdDate > dateTo) {
                return false;
            }
        }
        
        return true;
    });
    
    // 重設分頁
    currentPage = 1;
    
    // 渲染結果
    renderResults();
    updateResultsCount();
    
    showLoading(false);
}

// 渲染結果
function renderResults() {
    if (currentView === 'table') {
        renderTableView();
    } else {
        renderGridView();
    }
    
    setupPagination();
}

// 渲染表格檢視
function renderTableView() {
    const tbody = document.getElementById('caseTableBody');
    if (!tbody) return;
    
    // 排序資料
    const sortedCases = [...filteredCases];
    if (currentSort.field) {
        sortedCases.sort((a, b) => {
            let aValue = a[currentSort.field] || '';
            let bValue = b[currentSort.field] || '';
            
            // 處理數值型欄位
            if (currentSort.field === 'gender') {
                aValue = parseInt(aValue) || 0;
                bValue = parseInt(bValue) || 0;
            }
            
            if (aValue < bValue) return currentSort.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    // 分頁
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCases = sortedCases.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    if (paginatedCases.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 40px;">
                    <div class="empty-state">
                        <i class="fas fa-search" style="font-size: 2rem; color: #ccc; margin-bottom: 10px;"></i>
                        <p>查無符合條件的個案資料</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    paginatedCases.forEach(caseItem => {
        const row = createTableRow(caseItem);
        tbody.appendChild(row);
    });
}

// 建立表格行
function createTableRow(caseItem) {
    const row = document.createElement('tr');
    row.className = 'case-row';
    row.setAttribute('data-case-id', caseItem.medical_record_no);
    
    const genderBadge = getGenderBadge(caseItem.gender);
    const createdDate = caseItem.created_at ? caseItem.created_at.split('T')[0] : '未填寫';
    
    row.innerHTML = `
        <td class="medical-record">
            <strong>${caseItem.medical_record_no || ''}</strong>
        </td>
        <td class="patient-name">${caseItem.patient_name || '未填寫'}</td>
        <td class="gender">${genderBadge}</td>
        <td class="birth-date">${caseItem.birth_date || '未填寫'}</td>
        <td class="id-document">${caseItem.id_document_no || '未填寫'}</td>
        <td class="created-date">${createdDate}</td>
        <td class="actions">
            <div class="action-buttons">
                <a href="/case-detail/${caseItem.medical_record_no}" class="btn-action btn-view" title="檢視詳細">
                    <i class="fas fa-eye"></i>
                </a>
                <a href="/step2/${caseItem.medical_record_no}" class="btn-action btn-edit" title="編輯">
                    <i class="fas fa-edit"></i>
                </a>
            </div>
        </td>
    `;
    
    return row;
}

// 渲染卡片檢視
function renderGridView() {
    const gridContainer = document.getElementById('casesGrid');
    if (!gridContainer) return;
    
    // 分頁
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCases = filteredCases.slice(startIndex, endIndex);
    
    gridContainer.innerHTML = '';
    
    if (paginatedCases.length === 0) {
        gridContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>查無符合條件的個案資料</h3>
                <p>請嘗試調整搜尋條件，或<a href="/step1" class="link">新增個案</a></p>
            </div>
        `;
        return;
    }
    
    paginatedCases.forEach(caseItem => {
        const card = createCaseCard(caseItem);
        gridContainer.appendChild(card);
    });
}

// 建立個案卡片
function createCaseCard(caseItem) {
    const card = document.createElement('div');
    card.className = 'case-card';
    card.setAttribute('data-case-id', caseItem.medical_record_no);
    
    const genderBadge = getGenderBadge(caseItem.gender);
    const createdDate = caseItem.created_at ? caseItem.created_at.split('T')[0] : '未填寫';
    
    card.innerHTML = `
        <div class="case-header">
            <div class="case-id">
                <i class="fas fa-id-card"></i>
                ${caseItem.medical_record_no}
            </div>
            <div class="case-status">
                ${genderBadge}
            </div>
        </div>
        
        <div class="case-info">
            <div class="info-row">
                <span class="label">姓名：</span>
                <span class="value">${caseItem.patient_name || '未填寫'}</span>
            </div>
            <div class="info-row">
                <span class="label">出生日期：</span>
                <span class="value">${caseItem.birth_date || '未填寫'}</span>
            </div>
            <div class="info-row">
                <span class="label">身分證號：</span>
                <span class="value">${caseItem.id_document_no || '未填寫'}</span>
            </div>
            <div class="info-row">
                <span class="label">建檔日期：</span>
                <span class="value">${createdDate}</span>
            </div>
        </div>
        
        <div class="case-actions">
            <a href="/case-detail/${caseItem.medical_record_no}" class="btn btn-primary btn-sm">
                <i class="fas fa-eye"></i>
                檢視
            </a>
            <a href="/step2/${caseItem.medical_record_no}" class="btn btn-secondary btn-sm">
                <i class="fas fa-edit"></i>
                編輯
            </a>
        </div>
    `;
    
    return card;
}

// 取得性別標章
function getGenderBadge(gender) {
    if (gender === '1') {
        return '<span class="badge badge-blue">男性</span>';
    } else if (gender === '2') {
        return '<span class="badge badge-pink">女性</span>';
    } else {
        return '<span class="badge badge-gray">未填寫</span>';
    }
}

// 設定表格排序
function setupTableSorting() {
    const sortableHeaders = document.querySelectorAll('.case-table th.sortable');
    
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const sortField = this.getAttribute('data-sort');
            
            if (currentSort.field === sortField) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = sortField;
                currentSort.direction = 'asc';
            }
            
            updateSortIcons();
            renderResults();
        });
    });
}

// 更新排序圖示
function updateSortIcons() {
    const sortableHeaders = document.querySelectorAll('.case-table th.sortable');
    
    sortableHeaders.forEach(header => {
        const icon = header.querySelector('i');
        const field = header.getAttribute('data-sort');
        
        if (field === currentSort.field) {
            icon.className = currentSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        } else {
            icon.className = 'fas fa-sort';
        }
    });
}

// 設定檢視切換
function setupViewSwitching() {
    const viewButtons = document.querySelectorAll('.view-btn');
    
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            switchView(view);
        });
    });
}

// 切換檢視模式
function switchView(view) {
    currentView = view;
    
    const tableView = document.getElementById('tableView');
    const gridView = document.getElementById('gridView');
    
    if (view === 'table') {
        tableView.style.display = 'block';
        gridView.style.display = 'none';
    } else {
        tableView.style.display = 'none';
        gridView.style.display = 'block';
    }
    
    updateViewButtons();
    renderResults();
}

// 更新檢視按鈕狀態
function updateViewButtons() {
    const viewButtons = document.querySelectorAll('.view-btn');
    
    viewButtons.forEach(button => {
        const view = button.getAttribute('data-view');
        if (view === currentView) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// 設定分頁
function setupPagination() {
    const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
    const paginationContainer = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // 更新分頁資訊
    updatePaginationInfo();
    
    // 更新分頁按鈕
    updatePaginationButtons(totalPages);
}

// 更新分頁資訊
function updatePaginationInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredCases.length);
    
    document.getElementById('pageStart').textContent = startIndex;
    document.getElementById('pageEnd').textContent = endIndex;
    document.getElementById('totalRecords').textContent = filteredCases.length;
}

// 更新分頁按鈕
function updatePaginationButtons(totalPages) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageNumbers = document.getElementById('pageNumbers');
    
    // 上一頁按鈕
    prevBtn.disabled = currentPage === 1;
    
    // 下一頁按鈕
    nextBtn.disabled = currentPage === totalPages;
    
    // 頁碼按鈕
    pageNumbers.innerHTML = '';
    
    // 顯示頁碼範圍
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        pageNumbers.appendChild(pageBtn);
    }
}

// 改變頁面
function changePage(direction) {
    const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        goToPage(newPage);
    }
}

// 跳轉到指定頁面
function goToPage(page) {
    currentPage = page;
    renderResults();
}

// 更新結果數量
function updateResultsCount() {
    const countElement = document.getElementById('resultsCount');
    if (countElement) {
        if (filteredCases.length === 0) {
            countElement.textContent = '查無資料';
        } else {
            countElement.textContent = `共 ${filteredCases.length} 筆`;
        }
    }
}

// 切換進階搜尋
function toggleAdvancedSearch() {
    const advancedSearch = document.getElementById('advancedSearch');
    const expandBtn = document.querySelector('.expand-btn');
    
    if (advancedSearch.style.display === 'none') {
        advancedSearch.style.display = 'grid';
        expandBtn.classList.add('expanded');
        expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i> 簡易搜尋';
    } else {
        advancedSearch.style.display = 'none';
        expandBtn.classList.remove('expanded');
        expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i> 進階搜尋';
    }
}

// 重設搜尋
function resetSearch() {
    // 清除所有輸入
    document.getElementById('search_field').value = '';
    document.getElementById('keyword').value = '';
    document.getElementById('gender_filter').value = '';
    document.getElementById('date_from').value = '';
    document.getElementById('date_to').value = '';
    
    // 重設篩選結果
    filteredCases = [...allCases];
    currentPage = 1;
    
    // 重新渲染
    renderResults();
    updateResultsCount();
    
    // 隱藏進階搜尋
    const advancedSearch = document.getElementById('advancedSearch');
    const expandBtn = document.querySelector('.expand-btn');
    advancedSearch.style.display = 'none';
    expandBtn.classList.remove('expanded');
    expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i> 進階搜尋';
}

// 匯出結果
function exportResults() {
    if (filteredCases.length === 0) {
        alert('沒有資料可以匯出');
        return;
    }
    
    // 建立 CSV 內容
    const headers = ['病歷號', '姓名', '性別', '出生日期', '身分證號', '建檔日期'];
    const csvContent = [
        headers.join(','),
        ...filteredCases.map(caseItem => [
            caseItem.medical_record_no || '',
            caseItem.patient_name || '',
            caseItem.gender === '1' ? '男性' : caseItem.gender === '2' ? '女性' : '',
            caseItem.birth_date || '',
            caseItem.id_document_no || '',
            caseItem.created_at ? caseItem.created_at.split('T')[0] : ''
        ].join(','))
    ].join('\n');
    
    // 下載檔案
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `個案查詢結果_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 顯示載入狀態
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// 顯示錯誤訊息
function showError(message) {
    console.error(message);
    // 可以在這裡加入更好的錯誤顯示方式
    alert(message);
}

// 回到首頁
function goHome() {
    window.location.href = '/home';
}

// 舊版相容性函數
function showModal(message) {
    alert(message);
}

function closeModal() {
    // 保留以避免錯誤
}
