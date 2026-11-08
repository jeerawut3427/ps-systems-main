// app.js
// Main application file for initialization and state management.

import { sendRequest } from './api.js?v=43';
import * as ui from './ui.js?v=46';
import * as handlers from './handlers.js?v=43';
import { escapeHTML } from './utils.js?v=43';

// --- Global State and DOM References ---
window.currentUser = null;
window.currentWeeklyReports = [];
window.allArchivedReports = {};
window.allHistoryData = {};
window.personnelCurrentPage = 1;
window.myPersonnelCurrentPage = 1;
window.userCurrentPage = 1;
window.holidayDatepicker = null; // To store the holiday datepicker instance

// --- Auto Logout Feature ---
let inactivityTimer;
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function performLogout() {
    clearTimeout(inactivityTimer);
    sendRequest('logout', {}).finally(() => {
        localStorage.removeItem('currentUser');
        window.location.href = '/login.html';
    });
}

function autoLogoutUser() {
    alert("คุณไม่มีการใช้งานเป็นเวลานาน ระบบจะทำการออกจากระบบเพื่อความปลอดภัย");
    performLogout();
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(autoLogoutUser, INACTIVITY_TIMEOUT_MS);
}

function isCurrentUserAdmin() {
    return window.currentUser && window.currentUser.role === 'admin';
}

function isAdminOnlyPane(paneId) {
    return [
        'pane-dashboard', 'pane-report', 'pane-archive', 'pane-personnel',
        'pane-admin', 'pane-holidays', 'pane-backups'
    ].includes(paneId);
}

function isAdminOnlyTab(tabId) {
    return [
        'tab-dashboard', 'tab-report', 'tab-archive', 'tab-personnel',
        'tab-admin', 'tab-holidays', 'tab-backups'
    ].includes(tabId);
}

// DOM Elements
window.appContainer = null;
window.messageArea = null;
window.welcomeMessage = null;
window.logoutBtn = null;
window.tabs = null;
window.panes = null;
window.statusSubmissionListArea = null;
window.submitStatusTitle = null;
window.submissionFormSection = null;
window.reviewReportSection = null;
window.reviewListArea = null;
window.backToFormBtn = null;
window.confirmSubmitBtn = null;
window.reviewStatusBtn = null;
window.reportContainer = null;
window.exportArchiveBtn = null;
window.archiveContainer = null;
window.archiveYearSelect = null;
window.archiveMonthSelect = null;
window.showArchiveBtn = null;
window.archiveConfirmModal = null;
window.cancelArchiveBtn = null;
window.confirmArchiveBtn = null;
window.personnelListArea = null;
window.addPersonnelBtn = null;
window.addMyPersonnelBtn = null;
window.personnelModal = null;
window.personnelForm = null;
window.cancelPersonnelBtn = null;
window.importExcelBtn = null;
window.excelImportInput = null;
window.samplePersonnelImportBtn = null;
window.userListArea = null;
window.addUserBtn = null;
window.userModal = null;
window.userForm = null;
window.cancelUserBtn = null;
window.userModalTitle = null;
window.personnelSearchInput = null;
window.personnelSearchBtn = null;
window.personnelTypeFilter = null;
window.personnelDepartmentFilter = null;
window.personnelSpecialtyFilter = null;
window.myPersonnelListArea = null;
window.myPersonnelSearchInput = null;
window.myPersonnelSearchBtn = null;
window.myPersonnelTypeFilter = null;
window.myPersonnelSpecialtyFilter = null;
window.userSearchInput = null;
window.userSearchBtn = null;
window.historyContainer = null;
window.historyYearSelect = null;
window.historyMonthSelect = null;
window.showHistoryBtn = null;
window.activeStatusesContainer = null;
window.mainNav = null;
window.mainTitle = null;
window.holidayForm = null;
window.holidayListContainer = null;
window.userAccountsTabBtn = null;
window.onlineUsersTabBtn = null;
window.userAccountsSection = null;
window.onlineUsersSection = null;
window.onlineUsersSummary = null;
window.onlineUsersListArea = null;
window.refreshOnlineUsersBtn = null;
window.myTransferRequestsArea = null;
window.refreshMyTransferRequestsBtn = null;
window.transferRequestsArea = null;
window.transferRequestStatusFilter = null;
window.refreshTransferRequestsBtn = null;
window.permanentPersonnelArea = null;
window.permanentPersonnelSearchInput = null;
window.refreshPermanentPersonnelBtn = null;

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    assignDomElements();
    
    try {
        window.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {
        window.currentUser = null;
    }

    if (!window.currentUser) {
        localStorage.removeItem('currentUser');
        window.location.href = '/login.html';
        return;
    }
    
    ui.populateRankDropdowns();
    ui.populateSpecialtyDropdowns();
    ui.buildPersonnelTypeFilter('personnel-type-filter');
    ui.buildPersonnelTypeFilter('my-personnel-type-filter');
    initializePage();
});

function assignDomElements() {
    window.appContainer = document.getElementById('app-container');
    window.messageArea = document.getElementById('message-area');
    window.welcomeMessage = document.getElementById('welcome-message');
    window.logoutBtn = document.getElementById('logout-btn');
    window.tabs = document.querySelectorAll('.tab-button');
    window.panes = document.querySelectorAll('.tab-pane');
    window.statusSubmissionListArea = document.getElementById('status-submission-list-area');
    window.submitStatusTitle = document.getElementById('submit-status-title');
    window.submissionFormSection = document.getElementById('submission-form-section');
    window.reviewReportSection = document.getElementById('review-report-section');
    window.reviewListArea = document.getElementById('review-list-area');
    window.backToFormBtn = document.getElementById('back-to-form-btn');
    window.confirmSubmitBtn = document.getElementById('confirm-submit-btn');
    window.reviewStatusBtn = document.getElementById('review-status-btn');
    window.reportContainer = document.getElementById('report-container');
    window.exportArchiveBtn = document.getElementById('export-archive-btn');
    window.archiveContainer = document.getElementById('archive-container');
    window.archiveYearSelect = document.getElementById('archive-year-select');
    window.archiveMonthSelect = document.getElementById('archive-month-select');
    window.showArchiveBtn = document.getElementById('show-archive-btn');
    window.archiveConfirmModal = document.getElementById('archive-confirm-modal');
    window.cancelArchiveBtn = document.getElementById('cancel-archive-btn');
    window.confirmArchiveBtn = document.getElementById('confirm-archive-btn');
    window.personnelListArea = document.getElementById('personnel-list-area');
    window.addPersonnelBtn = document.getElementById('add-personnel-btn');
    window.addMyPersonnelBtn = document.getElementById('add-my-personnel-btn');
    window.personnelModal = document.getElementById('personnel-modal');
    window.personnelForm = document.getElementById('personnel-form');
    window.cancelPersonnelBtn = document.getElementById('cancel-personnel-btn');
    window.importExcelBtn = document.getElementById('import-excel-btn');
    window.excelImportInput = document.getElementById('excel-import-input');
    window.samplePersonnelImportBtn = document.getElementById('sample-personnel-import-btn');
    window.userListArea = document.getElementById('user-list-area');
    window.addUserBtn = document.getElementById('add-user-btn');
    window.userModal = document.getElementById('user-modal');
    window.userForm = document.getElementById('user-form');
    window.cancelUserBtn = document.getElementById('cancel-user-btn');
    window.userModalTitle = document.getElementById('user-modal-title');
    window.personnelSearchInput = document.getElementById('personnel-search-input');
    window.personnelSearchBtn = document.getElementById('personnel-search-btn');
    window.personnelTypeFilter = document.getElementById('personnel-type-filter');
    window.personnelDepartmentFilter = document.getElementById('personnel-department-filter');
    window.personnelSpecialtyFilter = document.getElementById('personnel-specialty-filter');
    window.myPersonnelListArea = document.getElementById('my-personnel-list-area');
    window.myPersonnelSearchInput = document.getElementById('my-personnel-search-input');
    window.myPersonnelSearchBtn = document.getElementById('my-personnel-search-btn');
    window.myPersonnelTypeFilter = document.getElementById('my-personnel-type-filter');
    window.myPersonnelSpecialtyFilter = document.getElementById('my-personnel-specialty-filter');
    window.userSearchInput = document.getElementById('user-search-input');
    window.userSearchBtn = document.getElementById('user-search-btn');
    window.historyContainer = document.getElementById('history-container');
    window.historyYearSelect = document.getElementById('history-year-select');
    window.historyMonthSelect = document.getElementById('history-month-select');
    window.showHistoryBtn = document.getElementById('show-history-btn');
    window.activeStatusesContainer = document.getElementById('active-statuses-container');
    window.mainNav = document.getElementById('main-nav');
    window.mainTitle = document.getElementById('main-title');
    window.holidayForm = document.getElementById('holiday-form');
    window.holidayListContainer = document.getElementById('holiday-list-container');
    window.createBackupBtn = document.getElementById('create-backup-btn');
    window.backupListContainer = document.getElementById('backup-list-container');
    window.userAccountsTabBtn = document.getElementById('user-accounts-tab-btn');
    window.onlineUsersTabBtn = document.getElementById('online-users-tab-btn');
    window.userAccountsSection = document.getElementById('user-accounts-section');
    window.onlineUsersSection = document.getElementById('online-users-section');
    window.onlineUsersSummary = document.getElementById('online-users-summary');
    window.onlineUsersListArea = document.getElementById('online-users-list-area');
    window.refreshOnlineUsersBtn = document.getElementById('refresh-online-users-btn');
    window.myTransferRequestsArea = document.getElementById('my-transfer-requests-area');
    window.refreshMyTransferRequestsBtn = document.getElementById('refresh-my-transfer-requests-btn');
    window.transferRequestsArea = document.getElementById('transfer-requests-area');
    window.transferRequestStatusFilter = document.getElementById('transfer-request-status-filter');
    window.refreshTransferRequestsBtn = document.getElementById('refresh-transfer-requests-btn');
    window.permanentPersonnelArea = document.getElementById('permanent-personnel-area');
    window.permanentPersonnelSearchInput = document.getElementById('permanent-personnel-search-input');
    window.refreshPermanentPersonnelBtn = document.getElementById('refresh-permanent-personnel-btn');
}


function escapePrintHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildDepartmentPersonnelPrintHtml(response) {
    const people = Array.isArray(response.personnel) ? response.personnel : [];
    const department = escapePrintHtml(response.department || 'ไม่ระบุแผนก');
    const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
    const countByType = {
        officer: people.filter(p => p.personnel_type === 'officer').length,
        nco: people.filter(p => p.personnel_type === 'nco').length,
        civilian: people.filter(p => p.personnel_type === 'civilian').length,
    };
    const rows = people.map((p, index) => {
        const specialty = (p.specialty || '').trim();
        return `<tr>
            <td class="center number">${index + 1}</td>
            <td class="nowrap center rank">${escapePrintHtml(p.rank || '')}</td>
            <td class="nowrap">${escapePrintHtml(p.first_name || '')}</td>
            <td class="nowrap">${escapePrintHtml(p.last_name || '')}</td>
            <td class="position">${escapePrintHtml(p.position || '')}</td>
            <td class="nowrap center">${escapePrintHtml(specialty || '-')}</td>
        </tr>`;
    }).join('');

    const emptyNotice = people.length ? '' : '<p class="empty">ไม่พบรายชื่อกำลังพลที่ยังปฏิบัติงานในแผนกนี้</p>';
    return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>รายชื่อกำลังพลแผนก ${department}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: "TH Sarabun New", "Leelawadee UI", Tahoma, sans-serif; color: #111827; margin: 0; font-size: 14pt; }
    .toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }
    .toolbar button { border: 0; background: #1d4ed8; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12pt; }
    h1 { text-align: center; font-size: 22pt; margin: 0 0 3px; font-weight: 700; }
    h2 { text-align: center; font-size: 17pt; margin: 0 0 10px; font-weight: 600; }
    .meta { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 0 0 8px; font-size: 12pt; }
    .summary { margin-bottom: 8px; font-size: 12pt; }
    table { width: 100%; border-collapse: collapse; table-layout: auto; }
    thead { display: table-header-group; }
    th, td { border: 1px solid #374151; padding: 5px 7px; vertical-align: middle; }
    th { text-align: center; background: #e5e7eb; font-weight: 700; }
    tbody tr { break-inside: avoid; page-break-inside: avoid; }
    .center { text-align: center; }
    .number { width: 5%; }
    .rank { min-width: 80px; }
    .nowrap { white-space: nowrap; }
    .position { min-width: 250px; }
    .empty { text-align: center; padding: 24px; border: 1px solid #d1d5db; }
    .signatures { display: flex; justify-content: space-around; margin-top: 24px; gap: 20px; }
    .signature { text-align: center; min-width: 240px; }
    .signature-line { margin-top: 38px; }
    @media print { .toolbar { display: none; } }
</style>
</head>
<body>
    <div class="toolbar"><button onclick="window.print()">พิมพ์รายชื่อ</button></div>
    <h1>รายชื่อกำลังพล</h1>
    <h2>แผนก ${department}</h2>
    <div class="meta"><span>จำนวนกำลังพลทั้งหมด ${people.length} นาย</span><span>วันที่พิมพ์ ${escapePrintHtml(printedAt)}</span></div>
    <div class="summary">สัญญาบัตร ${countByType.officer} นาย &nbsp; | &nbsp; ประทวน ${countByType.nco} นาย &nbsp; | &nbsp; ลูกจ้างประจำและพนักงานราชการ ${countByType.civilian} นาย</div>
    ${emptyNotice}
    ${people.length ? `<table>
        <thead><tr><th style="width:5%">ลำดับ</th><th>ยศ/คำนำหน้า</th><th>ชื่อ</th><th>นามสกุล</th><th>ตำแหน่ง</th><th>เหล่า</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>
    <div class="signatures">
        <div class="signature"><div class="signature-line">(................................................)</div><div>ผู้จัดทำ</div></div>
        <div class="signature"><div class="signature-line">(................................................)</div><div>ผู้ตรวจสอบ</div></div>
    </div>` : ''}
    <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 350); });</script>
</body>
</html>`;
}

async function handlePrintDepartmentPersonnel() {
    const select = document.getElementById('print-personnel-department-select');
    const department = select ? select.value : '';
    if (!department) {
        ui.showMessage('กรุณาเลือกแผนกที่ต้องการพิมพ์รายชื่อก่อน', false);
        return;
    }
    if (!window.currentUser || window.currentUser.role !== 'admin') {
        ui.showMessage('ฟังก์ชันนี้สำหรับผู้ดูแลระบบเท่านั้น', false);
        return;
    }
    // เปิดหน้าต่างทันทีภายใน click handler เพื่อป้องกัน browser บล็อก popup ระหว่างรอ API
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        ui.showMessage('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Pop-up แล้วลองใหม่', false);
        return;
    }
    printWindow.document.open();
    printWindow.document.write('<!DOCTYPE html><html lang="th"><meta charset="UTF-8"><body style="font-family:Tahoma,sans-serif;padding:24px">กำลังเตรียมรายชื่อกำลังพล...</body></html>');
    printWindow.document.close();
    try {
        const response = await sendRequest('get_department_personnel_for_print', { department });
        if (!response || response.status !== 'success') {
            throw new Error((response && response.message) || 'ไม่สามารถเตรียมรายชื่อเพื่อพิมพ์ได้');
        }
        printWindow.document.open();
        printWindow.document.write(buildDepartmentPersonnelPrintHtml(response));
        printWindow.document.close();
    } catch (error) {
        try { printWindow.close(); } catch (_) {}
        ui.showMessage(error.message || 'พิมพ์รายชื่อไม่สำเร็จ', false);
    }
}

function initializePage() {
    appContainer.classList.remove('hidden');
    const userRole = currentUser.role;
    welcomeMessage.textContent = `ล็อกอินในฐานะ: ${escapeHTML(currentUser.username)} (${escapeHTML(userRole)})`;
    const backToSelectionBtn = document.getElementById('back-to-selection-btn');
    if (backToSelectionBtn) {
        backToSelectionBtn.addEventListener('click', () => {
            window.location.href = '/selection.html';
        });
    }

    const is_admin = (userRole === 'admin');
    
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');

    if (view) {
        mainNav.classList.add('hidden');
        panes.forEach(pane => pane.classList.add('hidden'));

        let targetPaneId = null;
        let titleText = '';

        // เมนูเฉพาะ Admin
        if (is_admin && view === 'personnel') {
            targetPaneId = 'pane-personnel';
            titleText = 'จัดการกำลังพล';
        } else if (is_admin && view === 'users') {
            targetPaneId = 'pane-admin';
            titleText = 'จัดการผู้ใช้';
        } else if (is_admin && view === 'holidays') {
            targetPaneId = 'pane-holidays';
            titleText = 'จัดการวันหยุด';
        } else if (is_admin && view === 'backups') {
            targetPaneId = 'pane-backups';
            titleText = 'สำรองฐานข้อมูล';
        }

        // เมนูดูข้อมูลของ User/Admin ที่ย้ายออกมาไว้หน้าเลือกประเภทระบบ
        if (view === 'active_statuses') {
            targetPaneId = 'pane-active-statuses';
            titleText = 'สถานะกำลังพล';
        } else if (view === 'my_personnel') {
            if (is_admin) {
                // Admin มีหน้าจัดการกำลังพลอยู่แล้ว ถ้าเข้าลิงก์นี้ให้ไปหน้าจัดการกำลังพลแทน
                targetPaneId = 'pane-personnel';
                titleText = 'จัดการกำลังพล';
            } else {
                targetPaneId = 'pane-my-personnel';
                titleText = `ข้อมูลกำลังพลแผนก ${currentUser.department || ''}`.trim();
            }
        }

        if (targetPaneId) {
            mainTitle.textContent = titleText;
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) {
                targetPane.classList.remove('hidden');
                loadDataForPane(targetPaneId);
            }
        } else {
            // ถ้า view ไม่ถูกต้อง หรือไม่มีสิทธิ์ ให้กลับหน้าเลือกเมนูเพื่อกันหน้าว่าง
            window.location.href = '/selection.html';
        }
    } else {
        mainNav.classList.remove('hidden');
        mainTitle.textContent = 'ระบบรายงานยอดกำลังพลประจำสัปดาห์';
        
        document.getElementById('tab-dashboard').classList.toggle('hidden', !is_admin);
        // “สถานะกำลังพล” และ “ข้อมูลกำลังพลแผนก...” ถูกย้ายไปอยู่หน้าเลือกประเภทระบบแล้ว
        document.getElementById('tab-active-statuses').classList.add('hidden');
        const myPersonnelTab = document.getElementById('tab-my-personnel');
        if (myPersonnelTab) myPersonnelTab.classList.add('hidden');
        document.getElementById('tab-submit-status').classList.remove('hidden');
        document.getElementById('tab-history').classList.remove('hidden');
        document.getElementById('tab-report').classList.toggle('hidden', !is_admin);
        document.getElementById('tab-archive').classList.toggle('hidden', !is_admin);
        
        if (is_admin) {
            switchTab('tab-dashboard');
        } else {
            switchTab('tab-submit-status');
        }
    }

    logoutBtn.addEventListener('click', () => performLogout());

    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    resetInactivityTimer();

    tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.id)));
    if(addPersonnelBtn) addPersonnelBtn.addEventListener('click', () => ui.openPersonnelModal(null, 'admin'));
    const printPersonnelListBtn = document.getElementById('print-personnel-list-btn');
    if (printPersonnelListBtn) printPersonnelListBtn.addEventListener('click', handlePrintDepartmentPersonnel);
    if(addMyPersonnelBtn) addMyPersonnelBtn.addEventListener('click', () => ui.openPersonnelModal(null, 'my'));
    if(cancelPersonnelBtn) cancelPersonnelBtn.addEventListener('click', () => personnelModal.classList.remove('active'));
    if(personnelForm) personnelForm.addEventListener('submit', handlers.handlePersonnelFormSubmit);
    const personRankSelect = document.getElementById('person-rank');
    if (personRankSelect) personRankSelect.addEventListener('change', ui.updatePersonnelSpecialtyVisibility);
    if(personnelListArea) personnelListArea.addEventListener('click', handlers.handlePersonnelListClick);
    if(myPersonnelListArea) myPersonnelListArea.addEventListener('click', handlers.handlePersonnelListClick);
    if(refreshMyTransferRequestsBtn) refreshMyTransferRequestsBtn.addEventListener('click', () => handlers.loadMyTransferRequests(true));
    if(transferRequestsArea) transferRequestsArea.addEventListener('click', handlers.handleTransferRequestsClick);
    if(refreshTransferRequestsBtn) refreshTransferRequestsBtn.addEventListener('click', () => handlers.loadTransferRequests(true));
    if(transferRequestStatusFilter) transferRequestStatusFilter.addEventListener('change', () => handlers.loadTransferRequests(true));
    if(refreshPermanentPersonnelBtn) refreshPermanentPersonnelBtn.addEventListener('click', () => handlers.loadPermanentPersonnel(true));
    if(permanentPersonnelSearchInput) permanentPersonnelSearchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handlers.loadPermanentPersonnel(true); });
    if(addUserBtn) addUserBtn.addEventListener('click', () => ui.openUserModal());
    if(cancelUserBtn) cancelUserBtn.addEventListener('click', () => userModal.classList.remove('active'));
    if(userForm) userForm.addEventListener('submit', handlers.handleUserFormSubmit);
    if(userListArea) userListArea.addEventListener('click', handlers.handleUserListClick);
    if (userAccountsTabBtn) userAccountsTabBtn.addEventListener('click', () => switchUserManagementSection('accounts'));
    if (onlineUsersTabBtn) onlineUsersTabBtn.addEventListener('click', () => switchUserManagementSection('online'));
    if (refreshOnlineUsersBtn) refreshOnlineUsersBtn.addEventListener('click', () => handlers.loadOnlineUsers(true));
    if(samplePersonnelImportBtn) samplePersonnelImportBtn.addEventListener('click', handlers.handleDownloadPersonnelImportTemplate);
    if(importExcelBtn) importExcelBtn.addEventListener('click', () => excelImportInput.click());
    if(excelImportInput) excelImportInput.addEventListener('change', handlers.handleExcelImport);
    if (reviewStatusBtn) reviewStatusBtn.addEventListener('click', handlers.handleReviewStatus);
    if (backToFormBtn) backToFormBtn.addEventListener('click', () => {
        reviewReportSection.classList.add('hidden');
        submissionFormSection.classList.remove('hidden');
    });
    if (confirmSubmitBtn) confirmSubmitBtn.addEventListener('click', handlers.handleSubmitStatusReport);
    if (exportArchiveBtn) exportArchiveBtn.addEventListener('click', () => {
        if (!currentWeeklyReports || currentWeeklyReports.length === 0) {
            ui.showMessage('ไม่มีข้อมูลรายงานที่จะส่งออก', false);
            return;
        }
        archiveConfirmModal.classList.add('active');
    });
    if (cancelArchiveBtn) cancelArchiveBtn.addEventListener('click', () => archiveConfirmModal.classList.remove('active'));
    if (confirmArchiveBtn) confirmArchiveBtn.addEventListener('click', handlers.handleExportAndArchive);
    
    if (showArchiveBtn) showArchiveBtn.addEventListener('click', handlers.handleShowArchive);
    if (archiveContainer) archiveContainer.addEventListener('click', handlers.handleArchiveDownloadClick);
    
    if (personnelSearchBtn) {
        const searchPersonnel = () => resetPersonnelAdminPageAndLoad();
        personnelSearchBtn.addEventListener('click', searchPersonnel);
        personnelSearchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') searchPersonnel(); });
    }
    if (personnelTypeFilter) personnelTypeFilter.addEventListener('click', (e) => ui.handlePersonnelTypeFilterClick(e, resetPersonnelAdminPageAndLoad));
    if (personnelDepartmentFilter) personnelDepartmentFilter.addEventListener('change', resetPersonnelAdminPageAndLoad);
    if (personnelSpecialtyFilter) personnelSpecialtyFilter.addEventListener('change', resetPersonnelAdminPageAndLoad);
    if (myPersonnelSearchBtn) {
        const searchMyPersonnel = () => resetMyPersonnelPageAndLoad();
        myPersonnelSearchBtn.addEventListener('click', searchMyPersonnel);
        myPersonnelSearchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') searchMyPersonnel(); });
    }
    if (myPersonnelTypeFilter) myPersonnelTypeFilter.addEventListener('click', (e) => ui.handlePersonnelTypeFilterClick(e, resetMyPersonnelPageAndLoad));
    if (myPersonnelSpecialtyFilter) myPersonnelSpecialtyFilter.addEventListener('change', resetMyPersonnelPageAndLoad);
    if (userSearchBtn) {
        const searchUser = () => {
            window.userCurrentPage = 1;
            loadDataForPane('pane-admin');
        };
        userSearchBtn.addEventListener('click', searchUser);
        userSearchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') searchUser(); });
    }
    
    if (archiveYearSelect) {
        archiveYearSelect.addEventListener('change', () => {
            const selectedYear = archiveYearSelect.value;
            archiveMonthSelect.innerHTML = '<option value="">เลือกเดือน</option>';
            if (selectedYear && allArchivedReports[selectedYear]) {
                const sortedMonths = Object.keys(allArchivedReports[selectedYear]).sort((a, b) => b - a);
                sortedMonths.forEach(month => {
                    const option = document.createElement('option');
                    option.value = month;
                    option.textContent = new Date(2000, parseInt(month) - 1, 1).toLocaleString('th-TH', { month: 'long' });
                    archiveMonthSelect.appendChild(option);
                });
            }
        });
    }

    if (showHistoryBtn) showHistoryBtn.addEventListener('click', handlers.handleShowHistory);
    
    if (historyYearSelect) {
        historyYearSelect.addEventListener('change', () => {
            const selectedYear = historyYearSelect.value;
            historyMonthSelect.innerHTML = '<option value="">เลือกเดือน</option>';
            if (selectedYear && window.allHistoryData[selectedYear]) {
                const sortedMonths = Object.keys(window.allHistoryData[selectedYear]).sort((a, b) => b - a);
                sortedMonths.forEach(month => {
                    const option = document.createElement('option');
                    option.value = month;
                    option.textContent = new Date(2000, parseInt(month) - 1, 1).toLocaleString('th-TH', { month: 'long' });
                    historyMonthSelect.appendChild(option);
                });
            }
        });
    }

    if(historyContainer) historyContainer.addEventListener('click', handlers.handleHistoryEditClick);
    const dashboardPane = document.getElementById('pane-dashboard');
    if(dashboardPane) dashboardPane.addEventListener('click', handlers.handleWeeklyResetRoundClick);
    const weeklyReportPane = document.getElementById('pane-report');
    if(weeklyReportPane) weeklyReportPane.addEventListener('click', handlers.handleWeeklyResetRoundClick);
    if(reportContainer) reportContainer.addEventListener('click', handlers.handleWeeklyReportEditClick);
    const weeklySubmissionInfoArea = document.getElementById('submission-info-area');
    if(weeklySubmissionInfoArea) weeklySubmissionInfoArea.addEventListener('click', handlers.handleWeeklyReportEditClick);
    const adminDeptSelectorContainer = document.getElementById('admin-dept-selector-container');
    if(adminDeptSelectorContainer) adminDeptSelectorContainer.addEventListener('click', handlers.handleWeeklyReportEditClick);

    if (statusSubmissionListArea) {
        statusSubmissionListArea.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('add-status-btn')) {
                ui.addStatusRow(e.target);
            }
            if (e.target && e.target.classList.contains('remove-status-btn')) {
                const subRow = e.target.closest('tr');
                if (subRow) {
                    subRow.remove();
                }
            }
        });
    }

    // *** NEW: Holiday Management Event Listeners ***
    if (holidayForm) {
        window.holidayDatepicker = flatpickr("#holiday-date", {
            locale: ui.thai_locale,
            altInput: true,
            altFormat: "j F Y",
            dateFormat: "Y-m-d",
        });
        holidayForm.addEventListener('submit', handlers.handleAddHoliday);
    }
    if (holidayListContainer) {
        holidayListContainer.addEventListener('click', handlers.handleDeleteHoliday);
    }
    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', handlers.handleCreateDatabaseBackup);
    }

    // รีเฟรชแท็บผู้ใช้งานออนไลน์อัตโนมัติ เฉพาะตอนเปิดแท็บนี้อยู่
    window.setInterval(() => {
        if (window.onlineUsersSection && !window.onlineUsersSection.classList.contains('hidden')) {
            handlers.loadOnlineUsers(false);
        }
    }, 30000);
}

function switchUserManagementSection(section) {
    if (!window.userAccountsSection || !window.onlineUsersSection) return;
    const showOnline = section === 'online';
    window.userAccountsSection.classList.toggle('hidden', showOnline);
    window.onlineUsersSection.classList.toggle('hidden', !showOnline);

    if (window.userAccountsTabBtn && window.onlineUsersTabBtn) {
        window.userAccountsTabBtn.className = showOnline
            ? 'px-4 py-2 rounded-md text-gray-600 hover:text-purple-700'
            : 'px-4 py-2 rounded-md bg-white shadow text-purple-700 font-semibold';
        window.onlineUsersTabBtn.className = showOnline
            ? 'px-4 py-2 rounded-md bg-white shadow text-purple-700 font-semibold'
            : 'px-4 py-2 rounded-md text-gray-600 hover:text-purple-700';
    }

    if (showOnline) {
        handlers.loadOnlineUsers(true);
    }
}


function resetPersonnelAdminPageAndLoad() {
    window.personnelCurrentPage = 1;
    window.loadDataForPane('pane-personnel');
}

function resetMyPersonnelPageAndLoad() {
    window.myPersonnelCurrentPage = 1;
    window.loadDataForPane('pane-my-personnel');
}

function getActivePersonnelType(container) {
    return container ? (container.dataset.activeType || '') : '';
}

function appendPersonnelFilters(payload, mode) {
    if (mode === 'admin') {
        payload.personnelType = getActivePersonnelType(window.personnelTypeFilter);
        if (window.personnelDepartmentFilter && window.personnelDepartmentFilter.value) payload.department = window.personnelDepartmentFilter.value;
        if (window.personnelSpecialtyFilter && window.personnelSpecialtyFilter.value) payload.specialty = window.personnelSpecialtyFilter.value;
    } else if (mode === 'my') {
        payload.personnelType = getActivePersonnelType(window.myPersonnelTypeFilter);
        if (window.myPersonnelSpecialtyFilter && window.myPersonnelSpecialtyFilter.value) payload.specialty = window.myPersonnelSpecialtyFilter.value;
    }
}

// --- Data Loading and Tab Switching ---
window.loadDataForPane = async function(paneId) {
    let payload = {};
    const actions = {
        'pane-dashboard': { action: 'get_dashboard_summary', renderer: ui.renderDashboard },
        'pane-active-statuses': { action: 'get_active_statuses', renderer: ui.renderActiveStatuses },
        'pane-personnel': { action: 'list_personnel', renderer: ui.renderPersonnel, searchInput: personnelSearchInput, pageState: 'personnelCurrentPage', personnelFilterMode: 'admin' },
        'pane-my-personnel': { action: 'get_my_department_personnel', renderer: ui.renderMyDepartmentPersonnel, searchInput: myPersonnelSearchInput, pageState: 'myPersonnelCurrentPage', personnelFilterMode: 'my' },
        'pane-admin': { action: 'list_users', renderer: ui.renderUsers, searchInput: userSearchInput, pageState: 'userCurrentPage' },
        'pane-submit-status': { action: 'get_weekly_personnel_for_submission', renderer: ui.renderStatusSubmissionForm, fetchAll: true },
        'pane-history': { action: 'get_submission_history', renderer: ui.renderSubmissionHistory },
        'pane-report': { action: 'get_status_reports', renderer: ui.renderWeeklyReport },
        'pane-archive': { action: 'get_archived_reports', renderer: (res) => {
            const archives = res.archives;
            window.allArchivedReports = archives || {};
            ui.populateArchiveSelectors(window.allArchivedReports);
            if(window.archiveContainer) window.archiveContainer.innerHTML = '';
        }},
        'pane-holidays': { action: 'list_holidays', renderer: handlers.renderHolidays },
        'pane-backups': { action: 'list_database_backups', renderer: handlers.renderDatabaseBackups }
    };

    const paneConfig = actions[paneId];
    if (!paneConfig) {
        console.error("No config for pane:", paneId);
        return;
    };

    // Fix 34.2: กันไม่ให้ User ธรรมดาเรียก pane/action ฝั่ง Admin แม้แท็บจะค้างจาก DOM/cache
    // ตัวอย่างปัญหาเดิม: User อยู่หน้าส่งรายสัปดาห์ แต่ JS ไปเรียก get_status_reports แล้วเกิด 403
    if (!isCurrentUserAdmin() && isAdminOnlyPane(paneId)) {
        console.warn('[weekly] Blocked admin-only pane for non-admin user', { paneId, role: window.currentUser?.role });
        if (paneId === 'pane-report') {
            // อย่าเรียก get_status_reports จากฝั่ง User ให้กลับไปหน้า submit แทน
            return;
        }
        ui.showMessage('เมนูนี้สำหรับผู้ดูแลระบบเท่านั้น', false);
        return;
    }

    if (paneConfig.searchInput) {
        payload.searchTerm = paneConfig.searchInput.value;
    }
    if (paneConfig.pageState) {
        payload.page = window[paneConfig.pageState];
    }
    if (paneConfig.fetchAll) {
        payload.fetchAll = true;
    }
    if (paneConfig.personnelFilterMode) {
        appendPersonnelFilters(payload, paneConfig.personnelFilterMode);
    }

    if (paneId === 'pane-submit-status' && window.currentUser.role === 'admin') {
        const deptSelector = document.getElementById('admin-dept-selector');
        if (deptSelector && deptSelector.value) {
            payload.department = deptSelector.value;
        }
    }

    try {
        console.debug('[weekly] loadDataForPane', { paneId, action: paneConfig.action, role: window.currentUser?.role, payload });
        const res = await sendRequest(paneConfig.action, payload);
        if (res && res.status === 'success') {
            if (paneConfig.renderer) {
                paneConfig.renderer(res);
            }
            if (paneId === 'pane-admin') {
                handlers.loadOnlineUsers(false);
            }
            if (paneId === 'pane-personnel' && isCurrentUserAdmin()) {
                handlers.loadTransferRequests(false);
                handlers.loadPermanentPersonnel(false);
            }
            if (paneId === 'pane-my-personnel' && !isCurrentUserAdmin()) {
                handlers.loadMyTransferRequests(false);
            }
        } else if (res && res.message) {
            ui.showMessage(res.message, false);
        }
    } catch (error) {
        ui.showMessage(error.message, false);
    }
}

window.switchTab = function(tabId) {
    // Fix 34.2: ถ้า User ธรรมดาถูกสั่งเปิดแท็บ Admin จากปุ่มค้าง/cache/URL เก่า ให้บล็อกก่อนโหลดข้อมูล
    if (!isCurrentUserAdmin() && isAdminOnlyTab(tabId)) {
        console.warn('[weekly] Blocked admin-only tab for non-admin user', { tabId, role: window.currentUser?.role });
        return;
    }

    tabs.forEach(tab => {
        const paneId = tab.id.replace('tab-', 'pane-');
        const pane = document.getElementById(paneId);
        if(!pane) return;
        if (tab.id === tabId) {
            tab.classList.add('active');
            pane.classList.remove('hidden');
            if (paneId === 'pane-personnel') window.personnelCurrentPage = 1;
            if (paneId === 'pane-my-personnel') window.myPersonnelCurrentPage = 1;
            if (paneId === 'pane-admin') window.userCurrentPage = 1;
            loadDataForPane(paneId);
        } else {
            tab.classList.remove('active');
            pane.classList.add('hidden');
        }
    });
}

