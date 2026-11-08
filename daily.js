// daily.js - Main script for the daily reporting system

// --- Imports ---
import { sendRequest } from './api.js?v=46';
import * as ui from './ui.js?v=46'; 
import { escapeHTML, formatThaiDateRangeArabic, exportSingleReportToExcel, buildTaf025StatusOptionsHtml, normalizeTaf025Status } from './utils.js?v=46';

// --- Global State ---
window.currentUser = null;
let currentDepartment = ''; // To store the department being reported
let currentReportDate = ''; // To store the target date for the report
let lastValidDailyReportDate = ''; // Fix 36: remember latest allowed report date
let dailyAdvanceStatusByDate = {}; // Fix 36: status map for next 7 days
let allDailyHistoryData = {}; // To cache history data
let allArchivedDailyData = {}; // To cache archived daily data
let currentDailyReports = []; // To store reports for archiving
window.editingDailyReportData = null; // To hold data for editing

const DAILY_CATEGORY_ORDER = ['officer', 'nco', 'permanent_employee', 'government_employee', 'civilian'];

const DAILY_CATEGORY_LABELS = {
    officer: 'สัญญาบัตร',
    nco: 'ประทวน',
    permanent_employee: 'ลูกจ้างประจำ',
    government_employee: 'พนักงานราชการ',
    civilian: 'ข้อมูลเดิมที่ยังไม่แยกประเภท'
};

const DAILY_CATEGORY_FULL_LABELS = {
    officer: 'นายทหารสัญญาบัตร',
    nco: 'นายทหารประทวน',
    permanent_employee: 'ลูกจ้างประจำ',
    government_employee: 'พนักงานราชการ',
    civilian: 'ข้อมูลเดิมที่ยังไม่แยกประเภท'
};

function getDailyCategoryKeys() {
    return DAILY_CATEGORY_ORDER.filter(key => document.getElementById(`submission-list-${key}`));
}

function getCategorySummary(summary, key) {
    const value = summary && summary[key];
    return value && typeof value === 'object' ? value : { total: 0, available: 0, mission: 0 };
}

// --- DOM References ---
let welcomeMessage, logoutBtn, backToSelectionBtn, appContainer, tabs, panes;
let dailyHistoryYearSelect, dailyHistoryMonthSelect, dailyHistoryDaySelect, showDailyHistoryBtn, exportDailyHistoryExcelBtn, dailyHistoryContainer;
let dailySubmissionContent, reviewReportSectionDaily, reviewDailyStatusBtn, backToFormBtnDaily, confirmSubmitDailyBtn;
let dailyReportDateSelector, dailyFutureReportNotice, dailyAdvanceDateHelp, dailyAdvanceStatusList, dailyReportDateSelectorWrapper, dailyAdvanceStatusWrapper;
let bulkStatusButtonsDaily;
let dailyReportContainer, dailyArchiveContainer, exportDailyArchiveBtn, exportDailyCurrentExcelBtn, exportDailyArchiveExcelBtn;
let dailyArchiveYearSelect, dailyArchiveMonthSelect, dailyArchiveDaySelect, showDailyArchiveBtn;
let archiveConfirmModal, cancelArchiveBtn, confirmArchiveBtn;
let resetDailyRoundBtn, resetDailyRoundModal, dailyResetDateInput, cancelResetDailyRoundBtn, confirmResetDailyRoundBtn;
let autoSubmitAllDailyBtn, autoSubmitAllDailyModal, autoSubmitAllDailyDateText, cancelAutoSubmitAllDailyBtn, confirmAutoSubmitAllDailyBtn;


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    assignDomElements();
    try {
        window.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {
        window.currentUser = null;
    }

    if (!window.currentUser) {
        window.location.href = '/login.html';
        return;
    }
    
    initializePage();
});

function assignDomElements() {
    appContainer = document.getElementById('app-container');
    welcomeMessage = document.getElementById('welcome-message');
    logoutBtn = document.getElementById('logout-btn');
    backToSelectionBtn = document.getElementById('back-to-selection-btn');
    tabs = document.querySelectorAll('.tab-button');
    panes = document.querySelectorAll('.tab-pane');
    
    dailyHistoryYearSelect = document.getElementById('daily-history-year-select');
    dailyHistoryMonthSelect = document.getElementById('daily-history-month-select');
    dailyHistoryDaySelect = document.getElementById('daily-history-day-select');
    showDailyHistoryBtn = document.getElementById('show-daily-history-btn');
    exportDailyHistoryExcelBtn = document.getElementById('export-daily-history-excel-btn');
    dailyHistoryContainer = document.getElementById('daily-history-container');
    
    dailySubmissionContent = document.getElementById('daily-submission-content');
    reviewReportSectionDaily = document.getElementById('review-report-section-daily');
    reviewDailyStatusBtn = document.getElementById('review-daily-status-btn');
    backToFormBtnDaily = document.getElementById('back-to-form-btn-daily');
    confirmSubmitDailyBtn = document.getElementById('confirm-submit-daily-btn');
    dailyReportDateSelector = document.getElementById('daily-report-date-selector');
    dailyReportDateSelectorWrapper = document.getElementById('daily-report-date-selector-wrapper');
    dailyFutureReportNotice = document.getElementById('daily-future-report-notice');
    dailyAdvanceDateHelp = document.getElementById('daily-advance-date-help');
    dailyAdvanceStatusList = document.getElementById('daily-advance-status-list');
    dailyAdvanceStatusWrapper = document.getElementById('daily-advance-status-wrapper');
    bulkStatusButtonsDaily = document.getElementById('bulk-status-buttons-daily');

    // New elements for report and archive
    dailyReportContainer = document.getElementById('daily-report-container');
    dailyArchiveContainer = document.getElementById('daily-archive-container');
    exportDailyArchiveBtn = document.getElementById('export-daily-archive-btn');
    exportDailyCurrentExcelBtn = document.getElementById('export-daily-current-excel-btn');
    exportDailyArchiveExcelBtn = document.getElementById('export-daily-archive-excel-btn');
    dailyArchiveYearSelect = document.getElementById('daily-archive-year-select');
    dailyArchiveMonthSelect = document.getElementById('daily-archive-month-select');
    dailyArchiveDaySelect = document.getElementById('daily-archive-day-select');
    showDailyArchiveBtn = document.getElementById('show-daily-archive-btn');
    
    archiveConfirmModal = document.getElementById('archive-confirm-modal');
    cancelArchiveBtn = document.getElementById('cancel-archive-btn');
    confirmArchiveBtn = document.getElementById('confirm-archive-btn');

    resetDailyRoundBtn = document.getElementById('reset-daily-round-btn');
    resetDailyRoundModal = document.getElementById('reset-daily-round-modal');
    dailyResetDateInput = document.getElementById('daily-reset-date-input');
    cancelResetDailyRoundBtn = document.getElementById('cancel-reset-daily-round-btn');
    confirmResetDailyRoundBtn = document.getElementById('confirm-reset-daily-round-btn');

    autoSubmitAllDailyBtn = document.getElementById('auto-submit-all-daily-btn');
    autoSubmitAllDailyModal = document.getElementById('auto-submit-all-daily-modal');
    autoSubmitAllDailyDateText = document.getElementById('auto-submit-all-daily-date-text');
    cancelAutoSubmitAllDailyBtn = document.getElementById('cancel-auto-submit-all-daily-btn');
    confirmAutoSubmitAllDailyBtn = document.getElementById('confirm-auto-submit-all-daily-btn');
}

async function initializePage() {
    appContainer.classList.remove('hidden');
    welcomeMessage.textContent = `ล็อกอินในฐานะ: ${escapeHTML(currentUser.username)} (${escapeHTML(currentUser.role)})`;
    
    logoutBtn.addEventListener('click', () => {
        sendRequest('logout', {}).finally(() => {
            localStorage.removeItem('currentUser');
            window.location.href = '/login.html';
        });
    });
    backToSelectionBtn.addEventListener('click', () => {
        window.location.href = '/selection.html';
    });
    tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.id)));

    if(reviewDailyStatusBtn) reviewDailyStatusBtn.addEventListener('click', handleReviewDailyStatus);
    if(backToFormBtnDaily) backToFormBtnDaily.addEventListener('click', () => {
        reviewReportSectionDaily.classList.add('hidden');
        dailySubmissionContent.classList.remove('hidden');
    });
    if(confirmSubmitDailyBtn) confirmSubmitDailyBtn.addEventListener('click', handleSubmitDailyReport);
    if(dailyReportDateSelector) dailyReportDateSelector.addEventListener('change', handleDailyReportDateChange);

    if(showDailyHistoryBtn) showDailyHistoryBtn.addEventListener('click', renderFilteredDailyHistory);
    if(exportDailyHistoryExcelBtn) exportDailyHistoryExcelBtn.addEventListener('click', () => exportDailyReportsToExcel(getFilteredDailyHistoryReports(), 'รายงานประวัติรายวัน'));
    if(dailyHistoryYearSelect) dailyHistoryYearSelect.addEventListener('change', populateDailyHistoryMonths);
    if(dailyHistoryMonthSelect) dailyHistoryMonthSelect.addEventListener('change', populateDailyHistoryDays);
    if(dailyHistoryContainer) dailyHistoryContainer.addEventListener('click', handleDailyHistoryEditClick);
    
    if(exportDailyCurrentExcelBtn) exportDailyCurrentExcelBtn.addEventListener('click', exportDailyNoteExcelFromOverview);

    if(exportDailyArchiveBtn) exportDailyArchiveBtn.addEventListener('click', () => {
        if (!currentDailyReports || currentDailyReports.length === 0) {
            ui.showMessage('ไม่มีข้อมูลรายงานที่จะส่งออก', false);
            return;
        }
        archiveConfirmModal.classList.add('active');
    });
    if(cancelArchiveBtn) cancelArchiveBtn.addEventListener('click', () => archiveConfirmModal.classList.remove('active'));
    if(confirmArchiveBtn) confirmArchiveBtn.addEventListener('click', handleArchiveDailyReport);

    if(resetDailyRoundBtn) resetDailyRoundBtn.addEventListener('click', openResetDailyRoundModal);
    if(cancelResetDailyRoundBtn) cancelResetDailyRoundBtn.addEventListener('click', () => resetDailyRoundModal.classList.remove('active'));
    if(confirmResetDailyRoundBtn) confirmResetDailyRoundBtn.addEventListener('click', handleResetDailyRound);

    if(autoSubmitAllDailyBtn) autoSubmitAllDailyBtn.addEventListener('click', openAutoSubmitAllDailyModal);
    if(cancelAutoSubmitAllDailyBtn) cancelAutoSubmitAllDailyBtn.addEventListener('click', () => autoSubmitAllDailyModal.classList.remove('active'));
    if(confirmAutoSubmitAllDailyBtn) confirmAutoSubmitAllDailyBtn.addEventListener('click', handleAutoSubmitAllDailyReports);

    if(showDailyArchiveBtn) showDailyArchiveBtn.addEventListener('click', renderFilteredDailyArchives);
    if(exportDailyArchiveExcelBtn) exportDailyArchiveExcelBtn.addEventListener('click', () => exportDailyReportsToExcel(getFilteredDailyArchiveReports(), 'รายงานทั้งหมดประจำวัน'));
    if(dailyArchiveYearSelect) dailyArchiveYearSelect.addEventListener('change', populateDailyArchiveMonths);
    if(dailyArchiveMonthSelect) dailyArchiveMonthSelect.addEventListener('change', populateDailyArchiveDays);

    const is_admin = (currentUser.role === 'admin');
    applyDailyAdvancePolicyUI(is_admin);
    document.getElementById('tab-daily-dashboard').classList.toggle('hidden', !is_admin);
    document.getElementById('tab-daily-report').classList.toggle('hidden', !is_admin);
    document.getElementById('tab-daily-archive').classList.toggle('hidden', !is_admin);

    // Fix 38: แท็บตรวจสอบรายชื่อและทดสอบระบบให้ Admin เห็นเท่านั้น
    // ผู้ใช้งานทั่วไปใช้เฉพาะแท็บส่งยอดรายวัน และเมนูข้อมูล/สถานะที่แยกไว้หน้าเลือกประเภทระบบ
    const dailyStatusOverviewTab = document.getElementById('tab-daily-status-overview');
    if (dailyStatusOverviewTab) {
        dailyStatusOverviewTab.classList.toggle('hidden', !is_admin);
    }
    
    if (is_admin) {
        await switchTab('tab-daily-dashboard');
    } else {
        await switchTab('tab-daily-submit');
    }
}



function applyDailyAdvancePolicyUI(isAdmin) {
    // Fix 45: ผู้ใช้งานทั่วไปห้ามส่งยอดล่วงหน้าตามระเบียบ
    // ให้เห็นเฉพาะรอบรายวันปัจจุบัน ส่วน Admin ยังเห็นเครื่องมือเลือกวันที่เพื่อจัดการรายงาน
    if (dailyReportDateSelector) {
        dailyReportDateSelector.disabled = !isAdmin;
        dailyReportDateSelector.classList.toggle('bg-gray-100', !isAdmin);
        dailyReportDateSelector.classList.toggle('cursor-not-allowed', !isAdmin);
    }
    if (dailyAdvanceStatusWrapper) {
        dailyAdvanceStatusWrapper.classList.toggle('hidden', !isAdmin);
    }
    if (dailyAdvanceDateHelp) {
        dailyAdvanceDateHelp.textContent = isAdmin
            ? 'Admin สามารถเลือกวันที่เพื่อดู/จัดการรายงานได้ตามสิทธิ์'
            : 'ผู้ใช้งานส่งได้เฉพาะรอบรายวันปัจจุบันเท่านั้น ไม่อนุญาตให้ส่งล่วงหน้า';
    }
}

// --- Tab Switching and Data Loading ---
async function loadDataForPane(paneId, department = null) {
    let payload = {};
    // If a department is passed (e.g., from admin dropdown), use it
    if (department) {
        payload.department = department;
    } 
    // If editing, ensure we load the data for the correct department/date from the report
    else if (window.editingDailyReportData) {
        payload.department = window.editingDailyReportData.department;
    }

    if (paneId === 'pane-daily-submit') {
        if (window.editingDailyReportData && window.editingDailyReportData.report_date) {
            payload.report_date = getReportDateString(window.editingDailyReportData);
        } else if (dailyReportDateSelector && dailyReportDateSelector.value) {
            payload.report_date = dailyReportDateSelector.value;
        } else if (currentReportDate) {
            payload.report_date = currentReportDate;
        }
    }

    if(dailySubmissionContent) dailySubmissionContent.classList.remove('hidden');
    if(reviewReportSectionDaily) reviewReportSectionDaily.classList.add('hidden');
    
    if (paneId === 'pane-daily-submit') {
        try {
            const res = await sendRequest('get_daily_personnel_for_submission', payload);
            if (res.status === 'success') {
                currentDepartment = res.department;
                currentReportDate = res.report_date;
                updateDailyDateSelectorFromResponse(res);
                renderSubmissionForm(res);
            } else {
                ui.showMessage(res.message, false);
            }
        } catch (error) {
            ui.showMessage(error.message, false);
        }
    }
    if (paneId === 'pane-daily-dashboard') {
        try {
            const res = await sendRequest('get_daily_dashboard_summary', {});
            if (res.status === 'success') {
                renderDailyDashboard(res.summary);
            } else {
                ui.showMessage(res.message, false);
            }
        } catch (error) {
            ui.showMessage(error.message, false);
        }
    }
    if (paneId === 'pane-daily-status-overview') {
        // Fix 38: หน้านี้เป็นของ Admin เท่านั้น
        if (currentUser.role !== 'admin') {
            ui.showMessage('เมนูตรวจสอบรายชื่อและทดสอบระบบเปิดให้เฉพาะผู้ดูแลระบบเท่านั้น', false);
            return;
        }
        const frame = document.getElementById('daily-status-overview-frame');
        if (frame && !frame.dataset.loadedOnce) {
            frame.dataset.loadedOnce = '1';
        }
    }
    if (paneId === 'pane-daily-history') {
        try {
            const res = await sendRequest('get_daily_submission_history', {});
            if (res.status === 'success') {
                allDailyHistoryData = res.history || {};
                populateDailyHistoryYears();
                dailyHistoryContainer.innerHTML = '<p class="text-center text-gray-500">กรุณาเลือกปีและเดือนเพื่อแสดงประวัติ</p>';
            }
        } catch (error) {
            ui.showMessage(error.message, false);
        }
    }
    if (paneId === 'pane-daily-report') {
        try {
            const res = await sendRequest('get_daily_final_report', {});
            if (res.status === 'success') {
                renderDailyFinalReport(res);
            }
        } catch(error) {
            ui.showMessage(error.message, false);
        }
    }
     if (paneId === 'pane-daily-archive') {
        try {
            const res = await sendRequest('get_archived_daily_reports', {});
            if (res.status === 'success') {
                allArchivedDailyData = res.archives || {};
                populateDailyArchiveYears();
                if(dailyArchiveContainer) dailyArchiveContainer.innerHTML = '<p class="text-center text-gray-500">กรุณาเลือกปีและเดือนเพื่อแสดงประวัติ</p>';
            }
        } catch (error) {
            ui.showMessage(error.message, false);
        }
    }
}

async function switchTab(tabId) {
    // Fix 38: กันผู้ใช้งานทั่วไปเปิดแท็บตรวจสอบรายชื่อและทดสอบระบบจาก daily page
    if (tabId === 'tab-daily-status-overview' && currentUser.role !== 'admin') {
        ui.showMessage('เมนูตรวจสอบรายชื่อและทดสอบระบบเปิดให้เฉพาะผู้ดูแลระบบเท่านั้น', false);
        tabId = 'tab-daily-submit';
    }

    for (const tab of tabs) {
        const paneId = tab.id.replace('tab-', 'pane-');
        const pane = document.getElementById(paneId);
        if (!pane) continue;

        if (tab.id === tabId) {
            tab.classList.add('active');
            tab.style.borderColor = '#0891b2';
            tab.style.color = '#0891b2';
            pane.classList.remove('hidden');
            await loadDataForPane(paneId);
        } else {
            tab.classList.remove('active');
            tab.style.borderColor = 'transparent';
            tab.style.color = '';
            pane.classList.add('hidden');
        }
    }
}

// --- Event Handlers ---
async function handleDailyReportDateChange() {
    if (!dailyReportDateSelector || !dailyReportDateSelector.value) return;
    if (currentUser.role !== 'admin') {
        ui.showMessage('ระบบไม่อนุญาตให้ผู้ใช้งานส่งยอดล่วงหน้า ตามระเบียบให้ส่งเฉพาะรอบรายวันปัจจุบันเท่านั้น', false);
        if (currentReportDate) dailyReportDateSelector.value = currentReportDate;
        return;
    }
    const selectedDate = dailyReportDateSelector.value;
    const selectedStatus = dailyAdvanceStatusByDate[selectedDate];

    // Fix 36: date input ของ browser ปิดวันหยุดรายวันเองไม่ได้ จึงกันซ้ำฝั่ง frontend
    // และ backend จะตรวจซ้ำอีกชั้นก่อนบันทึกจริง
    if (selectedStatus && selectedStatus.is_working_day === false) {
        const reason = selectedStatus.reason || selectedStatus.holiday_description || 'วันหยุด/วันไม่ทำการ';
        ui.showMessage(`วันที่ ${formatThaiDate(selectedDate)} เป็น${reason} ไม่สามารถส่งยอดรายวันได้`, false);
        dailyReportDateSelector.value = lastValidDailyReportDate || currentReportDate || selectedStatus.current_report_date || selectedDate;
        return;
    }

    currentReportDate = selectedDate;
    lastValidDailyReportDate = selectedDate;
    window.editingDailyReportData = null;
    await loadDataForPane('pane-daily-submit', currentUser.role === 'admin' ? (currentDepartment || null) : null);
}

function updateDailyDateSelectorFromResponse(res) {
    if (!res) return;

    // Fix 36: เก็บ map สถานะ 7 วัน เพื่อให้ user รู้ว่าวันไหนส่งแล้ว/ยังไม่ส่ง/วันหยุด/เก็บแล้ว
    dailyAdvanceStatusByDate = {};
    (res.advance_submission_statuses || []).forEach(item => {
        if (item && item.date) dailyAdvanceStatusByDate[item.date] = item;
    });

    if (dailyReportDateSelector) {
        if (res.min_report_date) dailyReportDateSelector.min = res.min_report_date;
        if (res.max_report_date) dailyReportDateSelector.max = res.max_report_date;
        if (res.report_date) {
            dailyReportDateSelector.value = res.report_date;
            currentReportDate = res.report_date;
            if (!dailyAdvanceStatusByDate[res.report_date] || dailyAdvanceStatusByDate[res.report_date].is_working_day !== false) {
                lastValidDailyReportDate = res.report_date;
            }
        }
    }

    if (dailyAdvanceDateHelp) {
        const isAdmin = currentUser.role === 'admin';
        const maxText = res.max_report_date ? formatThaiDate(res.max_report_date) : '';
        dailyAdvanceDateHelp.textContent = isAdmin
            ? (maxText ? `Admin เลือกได้ตั้งแต่รอบปัจจุบันถึง ${maxText} เฉพาะวันทำการ` : 'Admin สามารถเลือกวันที่รายงานเพื่อจัดการข้อมูลได้')
            : 'ผู้ใช้งานส่งได้เฉพาะรอบรายวันปัจจุบันเท่านั้น ไม่อนุญาตให้ส่งล่วงหน้า';
    }

    if (dailyFutureReportNotice) {
        const selectedStatus = dailyAdvanceStatusByDate[res.report_date];
        if (selectedStatus && selectedStatus.is_working_day === false) {
            dailyFutureReportNotice.classList.remove('hidden');
            dailyFutureReportNotice.className = 'mt-3 rounded-lg border border-red-300 bg-red-50 text-red-900 p-3 text-sm';
            dailyFutureReportNotice.innerHTML = `<span class="font-semibold">วันที่นี้เป็นวันหยุด/วันไม่ทำการ</span> ${escapeHTML(selectedStatus.reason || selectedStatus.holiday_description || '')} ไม่สามารถส่งยอดรายวันได้`;
        } else if (res.is_future_report && currentUser.role === 'admin') {
            dailyFutureReportNotice.classList.remove('hidden');
            dailyFutureReportNotice.className = 'mt-3 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-900 p-3 text-sm';
            dailyFutureReportNotice.innerHTML = `<span class="font-semibold">โหมด Admin</span> กำลังดู/จัดการรายงานวันที่ ${formatThaiDate(res.report_date)}`;
        } else {
            dailyFutureReportNotice.classList.add('hidden');
            dailyFutureReportNotice.innerHTML = '';
        }
    }

    if (currentUser.role === 'admin') {
        renderDailyAdvanceStatusList(res.advance_submission_statuses || [], res.report_date);
    } else if (dailyAdvanceStatusList) {
        dailyAdvanceStatusList.innerHTML = '';
    }
}

function renderDailyAdvanceStatusList(statuses, selectedDate) {
    if (!dailyAdvanceStatusList) return;
    if (!statuses || statuses.length === 0) {
        dailyAdvanceStatusList.innerHTML = '<p class="text-sm text-blue-700 col-span-full">ยังไม่มีข้อมูลสถานะช่วงวันที่</p>';
        return;
    }

    const buttonHtml = statuses.map(item => {
        const dateText = formatThaiDateShort(item.date);
        let stateLabel = 'ยังไม่ส่ง';
        let stateClass = 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100';
        let detailText = 'สามารถส่งยอดได้';
        let disabled = '';
        let extraAttrs = `data-date="${escapeHTML(item.date)}"`;

        if (item.is_working_day === false) {
            stateLabel = 'วันหยุด/งดส่ง';
            stateClass = 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed opacity-80';
            detailText = item.reason || item.holiday_description || 'ไม่ใช่วันทำการ';
            disabled = 'disabled';
            extraAttrs = '';
        } else if (item.is_archived) {
            stateLabel = 'เก็บแล้ว';
            stateClass = 'border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100';
            detailText = 'ดูได้ แต่แก้ไขไม่ได้';
        } else if (item.is_submitted) {
            stateLabel = 'ส่งแล้ว';
            stateClass = 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100';
            detailText = item.submitted_at ? `ส่งเมื่อ ${escapeHTML(item.submitted_at)}` : 'แก้ไขได้จนกว่า Admin จะเก็บ';
        }

        const selectedClass = item.date === selectedDate ? 'ring-2 ring-cyan-500' : '';
        return `
            <button type="button" class="daily-advance-date-chip text-left rounded-lg border p-3 transition ${stateClass} ${selectedClass}" ${extraAttrs} ${disabled}>
                <div class="font-semibold text-sm">${escapeHTML(dateText)}</div>
                <div class="text-xs mt-1">${escapeHTML(stateLabel)}</div>
                <div class="text-[11px] mt-1 opacity-80">${detailText}</div>
            </button>
        `;
    }).join('');

    dailyAdvanceStatusList.innerHTML = buttonHtml;
    dailyAdvanceStatusList.querySelectorAll('.daily-advance-date-chip[data-date]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const date = btn.dataset.date;
            if (!date || !dailyReportDateSelector) return;
            dailyReportDateSelector.value = date;
            await handleDailyReportDateChange();
        });
    });
}

function formatThaiDateShort(isoDateString) {
    if (!isoDateString) return '-';
    const date = new Date(isoDateString + 'T00:00:00');
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

async function loadDailyReportForEditing(reportId, btn = null) {
    if (!reportId) return;

    const originalText = btn ? btn.textContent : '';
    if (btn) {
        btn.textContent = 'กำลังโหลด...';
        btn.disabled = true;
    }

    try {
        const res = await sendRequest('get_daily_report_for_editing', { id: reportId });
        if (res.status === 'success' && res.report) {
            window.editingDailyReportData = res.report;
            await switchTab('tab-daily-submit');
        } else {
            ui.showMessage(res.message || 'ไม่สามารถดึงข้อมูลรายงานมาแก้ไขได้', false);
        }
    } catch (error) {
        ui.showMessage(error.message, false);
    } finally {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}



async function applyDailyLatestSync(reportId, btn = null) {
    if (!reportId) return;
    const confirmed = confirm('อัปเดตรายงานนี้จากข้อมูลภารกิจล่าสุดหรือไม่?\n\nระบบจะเขียนทับรายงานรายวันที่ยังไม่ถูกเก็บด้วยข้อมูลจากตารางภารกิจต่อเนื่องล่าสุด');
    if (!confirmed) return;

    const originalText = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'กำลังอัปเดต...';
    }

    try {
        const res = await sendRequest('apply_daily_latest_sync', { id: reportId });
        ui.showMessage(res.message || 'อัปเดตข้อมูลล่าสุดแล้ว', res.status === 'success');
        if (res.status === 'success') {
            window.editingDailyReportData = null;
            await loadDataForPane('pane-daily-submit', currentDepartment || null);
        }
    } catch (error) {
        ui.showMessage(error.message, false);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

async function handleDailyHistoryEditClick(e) {
    // ใช้วิธี closest เพื่อให้แน่ใจว่าจับปุ่มได้แม้กดโดน icon ข้างใน
    const btn = e.target.closest('.edit-daily-history-btn');
    if (!btn) return;
    await loadDailyReportForEditing(btn.dataset.reportId, btn);
}

function handleReviewDailyStatus() {
    const categories = getDailyCategoryKeys().reduce((acc, key) => {
        acc[key] = {
            title: DAILY_CATEGORY_FULL_LABELS[key] || key,
            reviewArea: `review-list-area-${key}`,
            container: `submission-list-${key}`
        };
        return acc;
    }, {});
    let totalLeave = 0;

    for (const key in categories) {
        const category = categories[key];
        const containerEl = document.getElementById(category.container);
        const reviewAreaEl = document.getElementById(category.reviewArea);
        const rows = containerEl.querySelectorAll('tbody > tr');
        const leaveItems = [];

        rows.forEach(row => {
            const status = row.querySelector('.status-select').value;
            if (status !== 'ไม่มี') {
                leaveItems.push({
                    name: row.querySelector('td:first-child').textContent,
                    status: status,
                    details: row.querySelector('.details-input').value,
                    startDate: row.querySelector('.start-date-input').value,
                    endDate: row.querySelector('.end-date-input').value,
                });
            }
        });

        totalLeave += leaveItems.length;

        if (leaveItems.length > 0) {
            let tableHTML = `<h3 class="text-md font-semibold text-gray-700 mb-2">${category.title}</h3>
            <table class="min-w-full bg-white text-sm mb-4">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="px-2 py-2 text-left font-medium text-gray-600 ps-nowrap-cell">ยศ-ชื่อ-สกุล</th>
                        <th class="px-2 py-2 text-left font-medium text-gray-600">สถานะ</th>
                        <th class="px-2 py-2 text-left font-medium text-gray-600">รายละเอียด</th>
                        <th class="px-2 py-2 text-left font-medium text-gray-600">ช่วงวันที่</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${leaveItems.map(item => `
                        <tr>
                            <td class="px-2 py-2 ps-nowrap-name">${escapeHTML(item.name)}</td>
                            <td class="px-2 py-2">${escapeHTML(item.status)}</td>
                            <td class="px-2 py-2">${escapeHTML(item.details)}</td>
                            <td class="px-2 py-2">${formatThaiDateRangeArabic(item.startDate, item.endDate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
            reviewAreaEl.innerHTML = tableHTML;
        } else {
            reviewAreaEl.innerHTML = '';
        }
    }

    if (totalLeave === 0) {
        document.getElementById('review-list-area-officer').innerHTML = '<p class="text-center text-gray-600 bg-green-50 p-4 rounded-lg">กำลังพลว่างทั้งหมด (ไม่มีภารกิจ)</p>';
    }

    dailySubmissionContent.classList.add('hidden');
    reviewReportSectionDaily.classList.remove('hidden');
}

async function handleSubmitDailyReport() {
    if (currentUser.role !== 'admin' && dailyReportDateSelector && currentReportDate && dailyReportDateSelector.value && dailyReportDateSelector.value !== currentReportDate) {
        ui.showMessage('ระบบไม่อนุญาตให้ผู้ใช้งานส่งยอดล่วงหน้า กรุณาส่งเฉพาะรอบรายวันปัจจุบัน', false);
        dailyReportDateSelector.value = currentReportDate;
        return;
    }
    const selectedStatus = dailyAdvanceStatusByDate[currentReportDate];
    if (selectedStatus && selectedStatus.is_working_day === false) {
        ui.showMessage(`วันที่ ${formatThaiDate(currentReportDate)} เป็น${selectedStatus.reason || 'วันหยุด/วันไม่ทำการ'} ไม่สามารถส่งยอดรายวันได้`, false);
        return;
    }

    confirmSubmitDailyBtn.disabled = true;
    confirmSubmitDailyBtn.textContent = 'กำลังบันทึก...';

    const categories = getDailyCategoryKeys();
    const reportData = {};
    const summaryData = {};

    categories.forEach(key => {
        const containerEl = document.getElementById(`submission-list-${key}`);
        const rows = containerEl.querySelectorAll('tbody > tr');
        
        const total = rows.length;
        let available = 0;
        const missionItems = [];

        rows.forEach(row => {
            const status = row.querySelector('.status-select').value;
            if (status === 'ไม่มี') {
                available++;
            } else {
                missionItems.push({
                    personnel_id: row.dataset.id,
                    status: status,
                    details: row.querySelector('.details-input').value,
                    start_date: row.querySelector('.start-date-input').value,
                    end_date: row.querySelector('.end-date-input').value
                });
            }
        });
        
        reportData[key] = missionItems;
        summaryData[key] = { total, available, mission: total - available };
    });
    
    const payload = {
        data: {
            department: currentDepartment,
            report_date: currentReportDate,
            report_data: reportData,
            summary_data: summaryData
        }
    };

    try {
        const res = await sendRequest('submit_daily_report', payload);
        ui.showMessage(res.message, res.status === 'success');
        if (res.status === 'success') {
            reviewReportSectionDaily.classList.add('hidden');
            dailySubmissionContent.classList.remove('hidden');
            if (currentUser.role === 'admin') {
                switchTab('tab-daily-dashboard');
            } else {
                 loadDataForPane('pane-daily-submit');
            }
        }
    } catch(error) {
        ui.showMessage(error.message, false);
    } finally {
        confirmSubmitDailyBtn.disabled = false;
        confirmSubmitDailyBtn.textContent = 'ยืนยันและส่งยอด';
    }
}

async function handleArchiveDailyReport() {
    archiveConfirmModal.classList.remove('active');
    try {
        exportDailyReportsToExcel(currentDailyReports, 'รายงานประจำวัน');
        const response = await sendRequest('archive_daily_reports', { reports: currentDailyReports });
        ui.showMessage(response.message, response.status === 'success');
        if (response.status === 'success') {
            loadDataForPane('pane-daily-report');
        }
    } catch(error) {
        ui.showMessage(error.message, false);
    }
}


function openAutoSubmitAllDailyModal() {
    if (!autoSubmitAllDailyModal) return;
    if (autoSubmitAllDailyDateText) {
        autoSubmitAllDailyDateText.textContent = currentReportDate
            ? `วันที่รายงาน: ${formatThaiDate(currentReportDate)}`
            : 'วันที่รายงาน: ตามรอบรายวันปัจจุบันของระบบ';
    }
    autoSubmitAllDailyModal.classList.add('active');
}

async function handleAutoSubmitAllDailyReports() {
    if (!confirmAutoSubmitAllDailyBtn) return;

    const confirmed = confirm(`ยืนยันส่งยอดทุกแผนกอัตโนมัติ${currentReportDate ? ` สำหรับวันที่ ${formatThaiDate(currentReportDate)}` : ''} ?

ระบบจะเขียนทับรายงานรายวันที่แผนกต่าง ๆ ส่งไว้แล้วในวันเดียวกัน`);
    if (!confirmed) return;

    confirmAutoSubmitAllDailyBtn.disabled = true;
    confirmAutoSubmitAllDailyBtn.textContent = 'กำลังส่งยอด...';

    try {
        const response = await sendRequest('admin_auto_submit_all_daily_reports', {
            report_date: currentReportDate || null,
            overwrite: true
        });
        ui.showMessage(response.message, response.status === 'success');
        if (response.status === 'success') {
            if (autoSubmitAllDailyModal) autoSubmitAllDailyModal.classList.remove('active');
            currentReportDate = response.report_date || currentReportDate;
            await loadDataForPane('pane-daily-dashboard');
            await loadDataForPane('pane-daily-report');
        }
    } catch(error) {
        ui.showMessage(error.message, false);
    } finally {
        confirmAutoSubmitAllDailyBtn.disabled = false;
        confirmAutoSubmitAllDailyBtn.textContent = 'ยืนยันส่งยอดทุกแผนก';
    }
}

function openResetDailyRoundModal() {
    if (!resetDailyRoundModal || !dailyResetDateInput) return;
    dailyResetDateInput.value = currentReportDate || new Date().toISOString().slice(0, 10);
    resetDailyRoundModal.classList.add('active');
}

async function handleResetDailyRound() {
    if (!dailyResetDateInput || !dailyResetDateInput.value) {
        ui.showMessage('กรุณาเลือกวันที่รายงานใหม่', false);
        return;
    }

    const selectedDate = dailyResetDateInput.value;
    const confirmed = confirm(`ยืนยันรีเซ็ตรอบรายวันเป็นวันที่ ${formatThaiDate(selectedDate)} ?

ระบบจะล้างเฉพาะรายงานของวันที่นี้เท่านั้น
รายงานวันอื่นจะไม่ถูกลบ
ถ้าวันที่เลือกเป็นวันหยุด ระบบจะไม่อนุญาตให้รีเซ็ต`);
    if (!confirmed) return;

    confirmResetDailyRoundBtn.disabled = true;
    confirmResetDailyRoundBtn.textContent = 'กำลังรีเซ็ต...';

    try {
        const response = await sendRequest('reset_daily_report_round', {
            target_date: selectedDate,
            clear_current_reports: true
        });
        ui.showMessage(response.message, response.status === 'success');
        if (response.status === 'success') {
            resetDailyRoundModal.classList.remove('active');
            currentReportDate = response.report_date || selectedDate;
            await loadDataForPane('pane-daily-report');
            await loadDataForPane('pane-daily-dashboard');
        }
    } catch(error) {
        ui.showMessage(error.message, false);
    } finally {
        confirmResetDailyRoundBtn.disabled = false;
        confirmResetDailyRoundBtn.textContent = 'ยืนยันรีเซ็ต';
    }
}


// --- Rendering and UI Update Functions ---
function formatThaiDate(isoDateString) {
    const date = new Date(isoDateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('th-TH', { dateStyle: 'full' });
}

function renderDailyDashboard(summary) {
    const container = document.getElementById('daily-dashboard-container');
    const dateEl = document.getElementById('daily-dashboard-date');
    const titleEl = document.querySelector('#pane-daily-dashboard h2');
    if (!container || !dateEl || !titleEl) return;
    
    titleEl.textContent = 'สรุปภาพรวมการส่งยอดประจำวัน';
    currentReportDate = summary.report_date;
    dateEl.textContent = `ข้อมูลสำหรับ: ${formatThaiDate(summary.report_date)}`;
    container.innerHTML = '';

    const { all_departments, submitted_info } = summary;

    if (!all_departments || all_departments.length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-full">ไม่พบข้อมูลแผนกในระบบ</p>';
        return;
    }

    all_departments.forEach(dept => {
        const submission = submitted_info[dept];
        const isSubmitted = !!submission;
        const card = document.createElement('div');
        card.className = `p-4 rounded-lg border shadow-sm ${isSubmitted ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`;

        let summaryHtml = '';
        if (isSubmitted) {
            const lines = DAILY_CATEGORY_ORDER.map(key => {
                const item = getCategorySummary(submission.summary, key);
                if (key === 'civilian' && !item.total) return '';
                return `<p><b>${DAILY_CATEGORY_LABELS[key]}:</b> ยอด ${item.total || 0} ว่าง ${item.available || 0} ภารกิจ ${item.mission || 0}</p>`;
            }).filter(Boolean).join('');
            summaryHtml = `<div class="mt-2 text-xs text-gray-600 space-y-1">${lines}</div>`;
        }

        let statusLine = isSubmitted ? `<p class="text-xs text-green-700">ส่งยอดแล้ว</p>` : `<p class="text-xs text-red-700">ยังไม่ส่งยอด</p>`;
        let detailsLine = isSubmitted ? `<p class="text-xs text-gray-500 mt-1">โดย: ${escapeHTML(submission.submitter_fullname)} (${new Date(submission.timestamp).toLocaleTimeString('th-TH')})</p>` : '';

        card.innerHTML = `<p class="font-semibold text-sm ${isSubmitted ? 'text-green-800' : 'text-red-800'}">${escapeHTML(dept)}</p>${statusLine}${summaryHtml}${detailsLine}`;
        container.appendChild(card);
    });
}

function updateCategorySummary(categoryKey) {
    const containerEl = document.getElementById(`submission-list-${categoryKey}`);
    const summaryEl = document.getElementById(`summary-${categoryKey}`);
    if (!containerEl || !summaryEl) return;

    const rows = containerEl.querySelectorAll('tbody > tr');
    const total = rows.length;
    let available = 0;

    rows.forEach(row => {
        const statusSelect = row.querySelector('.status-select');
        if (statusSelect.value === 'ไม่มี') {
            available++;
            row.classList.remove('row-selected');
        } else {
            row.classList.add('row-selected');
        }
    });
    const mission = total - available;
    summaryEl.textContent = `(ยอดทั้งหมด ${total} / ว่าง ${available} / ติดภารกิจ ${mission})`;
}

function renderSubmissionForm(res) {
    const { personnel, report_date, all_departments, submission_status, admin_submission_statuses = {} } = res;

    const submissionInfoArea = document.getElementById('submission-info-area-daily');
    const submissionContent = document.getElementById('daily-submission-content');
    const adminSelectorContainer = document.getElementById('admin-dept-selector-container-daily');
    const bulkButtonContainer = document.getElementById('bulk-status-buttons-daily');
    const titleEl = document.getElementById('daily-submit-title');
    const dateEl = document.getElementById('daily-submit-date');

    const selectedDepartment = window.editingDailyReportData
        ? window.editingDailyReportData.department
        : currentDepartment;

    const selectedSubmission = currentUser.role === 'admin'
        ? (admin_submission_statuses[selectedDepartment] || submission_status)
        : submission_status;

    const isEditingSelectedDepartment = Boolean(
        window.editingDailyReportData &&
        window.editingDailyReportData.department === selectedDepartment
    );

    const shouldShowForm = !selectedSubmission || isEditingSelectedDepartment;

    if (titleEl) {
        titleEl.textContent = (currentUser.role === 'admin' && selectedDepartment)
            ? `ส่งยอดกำลังพลประจำวัน แผนก ${selectedDepartment}`
            : 'ส่งยอดกำลังพลประจำวัน';
    }

    if (dateEl) {
        dateEl.textContent = `สำหรับวันที่: ${formatThaiDate(report_date)}` + (isEditingSelectedDepartment ? ' (กำลังแก้ไขรายงานที่ส่งแล้ว)' : '');
    }

    // --- ส่วนเลือกแผนก (Admin) พร้อมสถานะ "ส่งแล้ว" เหมือนรายสัปดาห์ ---
    adminSelectorContainer.innerHTML = '';
    if (currentUser.role === 'admin' && all_departments) {
        adminSelectorContainer.classList.remove('hidden');
        const optionsHtml = all_departments.map(dept => {
            const submitted = admin_submission_statuses[dept];
            const label = submitted ? `${dept} — ส่งแล้ว` : dept;
            const selected = dept === selectedDepartment ? 'selected' : '';
            return `<option value="${escapeHTML(dept)}" ${selected}>${escapeHTML(label)}</option>`;
        }).join('');

        adminSelectorContainer.innerHTML = `
            <label for="admin-dept-selector-daily" class="block text-sm font-medium text-gray-700 mb-1">เลือกแผนก</label>
            <select id="admin-dept-selector-daily" class="w-full md:w-1/3 border rounded px-2 py-2 bg-white shadow-sm">
                ${optionsHtml}
            </select>
        `;

        document.getElementById('admin-dept-selector-daily').addEventListener('change', (e) => {
            loadDataForPane('pane-daily-submit', e.target.value);
        });
    } else {
        adminSelectorContainer.classList.add('hidden');
    }

    // --- กล่องสถานะของแผนกที่เลือก ---
    submissionInfoArea.className = 'mb-4';
    if (selectedSubmission && !isEditingSelectedDepartment) {
        const submittedTime = selectedSubmission.timestamp
            ? new Date(selectedSubmission.timestamp).toLocaleString('th-TH')
            : '-';
        const submittedBy = selectedSubmission.submitted_name || selectedSubmission.submitted_by || '-';
        const editButtonHtml = selectedSubmission.editable && selectedSubmission.id
            ? `<button id="edit-current-daily-report-btn" data-report-id="${escapeHTML(selectedSubmission.id)}" class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg">แก้ไขรายงานที่ส่งแล้ว</button>`
            : `<span class="inline-flex items-center bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-full">เก็บแล้ว แก้ไขไม่ได้</span>`;
        const syncInfo = selectedSubmission.sync_status || {};
        const syncWarningHtml = (selectedSubmission.editable && selectedSubmission.id && syncInfo.has_updates)
            ? `<div class="mt-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-orange-900">
                   <div class="font-semibold text-sm">พบข้อมูลภารกิจล่าสุดที่เปลี่ยนแปลง (${Number(syncInfo.diff_count || 0)} รายการ)</div>
                   <div class="text-xs mt-1">รายงานนี้เคยส่งแล้ว ระบบจึงไม่เขียนทับอัตโนมัติ ให้กดปุ่มด้านล่างเพื่ออัปเดตจากข้อมูลล่าสุด</div>
                   <button id="apply-daily-latest-sync-btn" data-report-id="${escapeHTML(selectedSubmission.id)}" class="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded-lg text-sm">อัปเดตจากข้อมูลล่าสุด</button>
               </div>`
            : '';

        const submittedStatusTitle = selectedSubmission.is_archived
            ? 'รายงานวันที่นี้ถูกเก็บแล้ว'
            : (currentUser.role === 'admin' ? 'แผนกนี้ส่งรายงานแล้ว' : 'คุณส่งรายงานแล้ว');
        const submittedStatusHint = selectedSubmission.is_archived
            ? 'รายงานถูกเก็บถาวรแล้ว ไม่สามารถแก้ไขได้'
            : 'หากต้องการเปลี่ยนข้อมูล ให้กดปุ่มแก้ไขรายงานที่ส่งแล้ว ก่อน Admin กดเก็บยอด';

        submissionInfoArea.innerHTML = `
            <div class="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <div class="font-bold text-lg">${submittedStatusTitle}</div>
                        <div class="text-sm mt-1">ผู้ส่ง: ${escapeHTML(submittedBy)} | เวลา: ${escapeHTML(submittedTime)}</div>
                        <div class="text-xs text-green-700 mt-1">${submittedStatusHint}</div>
                        ${renderDailySummaryHtml(selectedSubmission.summary || {}, 'text-xs')}
                        ${syncWarningHtml}
                        <div class="mt-3">
                            <div class="font-semibold text-sm text-green-900 mb-1">รายละเอียดรายชื่อที่ส่งแล้ว</div>
                            ${renderDailyMissionTable(selectedSubmission, { compact: true })}
                        </div>
                    </div>
                    ${editButtonHtml}
                </div>
            </div>
        `;

        const editCurrentBtn = document.getElementById('edit-current-daily-report-btn');
        if (editCurrentBtn) {
            editCurrentBtn.addEventListener('click', () => loadDailyReportForEditing(editCurrentBtn.dataset.reportId, editCurrentBtn));
        }
        const applyDailySyncBtn = document.getElementById('apply-daily-latest-sync-btn');
        if (applyDailySyncBtn) {
            applyDailySyncBtn.addEventListener('click', () => applyDailyLatestSync(applyDailySyncBtn.dataset.reportId, applyDailySyncBtn));
        }

        submissionContent.classList.add('hidden');
        reviewReportSectionDaily.classList.add('hidden');
        if (bulkButtonContainer) {
            bulkButtonContainer.classList.add('hidden');
            bulkButtonContainer.innerHTML = '';
        }
        getDailyCategoryKeys().forEach(key => {
            const list = document.getElementById(`submission-list-${key}`);
            if (list) list.innerHTML = '';
        });
        return;
    }

    if (selectedSubmission && isEditingSelectedDepartment) {
        submissionInfoArea.innerHTML = `
            <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-900">
                <span class="font-semibold">กำลังแก้ไขรายงานที่ส่งแล้วของแผนกนี้</span>
                <span class="text-sm">แก้ไขข้อมูลให้ถูกต้อง แล้วกดตรวจสอบก่อนส่งเพื่อบันทึกทับรายงานเดิม</span>
            </div>
        `;
    } else if (currentUser.role === 'admin') {
        submissionInfoArea.innerHTML = `
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-700">
                <span class="font-semibold">แผนกนี้ยังไม่ส่งรายงาน</span>
                <span class="text-sm">Admin สามารถส่งยอดแทนแผนกนี้ได้จากแบบฟอร์มด้านล่าง</span>
            </div>
        `;
    } else {
        submissionInfoArea.classList.add('hidden');
        submissionInfoArea.innerHTML = '';
    }

    submissionContent.classList.remove('hidden');
    if (bulkButtonContainer) {
        bulkButtonContainer.classList.remove('hidden');
        bulkButtonContainer.innerHTML = `<button id="clear-daily-form-btn" class="bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 text-sm rounded-lg">ล้างค่า ทั้งหมด</button>`;
        document.getElementById('clear-daily-form-btn').addEventListener('click', () => {
            document.querySelectorAll('#pane-daily-submit tbody > tr').forEach(row => {
                const statusSelect = row.querySelector('.status-select');
                if (statusSelect) {
                    statusSelect.value = 'ไม่มี';
                    statusSelect.dispatchEvent(new Event('change'));
                }
                row.querySelector('.details-input').value = '';
                const startDateInput = row.querySelector('.start-date-input');
                if (startDateInput && startDateInput._flatpickr) startDateInput._flatpickr.clear();
                const endDateInput = row.querySelector('.end-date-input');
                if (endDateInput && endDateInput._flatpickr) endDateInput._flatpickr.clear();
            });
        });
    }

    // --- สร้างตารางรายชื่อ ---
    const categories = getDailyCategoryKeys().reduce((acc, key) => {
        acc[key] = { data: personnel[key] || [], container: `submission-list-${key}` };
        return acc;
    }, {});

    const legacyWrapper = document.getElementById('daily-civilian-wrapper');
    if (legacyWrapper) {
        const legacyCount = Array.isArray(personnel.civilian) ? personnel.civilian.length : 0;
        legacyWrapper.classList.toggle('hidden', legacyCount === 0);
    }

    const flatpickrConfig = {
        locale: ui.thai_locale,
        altInput: true,
        altFormat: "j F Y",
        dateFormat: "Y-m-d",
        allowInput: true
    };

    for (const key in categories) {
        const { data, container } = categories[key];
        const containerEl = document.getElementById(container);
        if (!containerEl) continue;

        if (!data || data.length === 0) {
            containerEl.innerHTML = '<p class="text-gray-500 p-4">ไม่พบข้อมูลกำลังพลในประเภทนี้</p>';
            updateCategorySummary(key);
            continue;
        }

        let tableHTML = `<table class="min-w-full bg-white text-sm">
            <thead class="bg-gray-100">
                <tr>
                    <th class="px-2 py-2 text-left font-medium text-gray-600 ps-nowrap-cell">ยศ-ชื่อ-สกุล</th>
                    <th class="px-2 py-2 text-left font-medium text-gray-600 w-[15%]">สถานะ</th>
                    <th class="px-2 py-2 text-left font-medium text-gray-600 w-[25%]">รายละเอียด/หมายเหตุ</th>
                    <th class="px-2 py-2 text-left font-medium text-gray-600 w-[15%]">วันเริ่มต้น</th>
                    <th class="px-2 py-2 text-left font-medium text-gray-600 w-[15%]">วันสิ้นสุด</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">`;

        data.forEach(p => {
            const fullName = `${escapeHTML(p.rank)} ${escapeHTML(p.first_name)} ${escapeHTML(p.last_name)}`;
            tableHTML += `<tr data-id="${escapeHTML(p.id)}">
                <td class="px-2 py-2 font-semibold ps-nowrap-name">${fullName}</td>
                <td class="px-2 py-2">
                    <select class="status-select w-full border rounded px-2 py-1 bg-white">
                        ${buildTaf025StatusOptionsHtml({ includeNone: true, isAdmin: window.currentUser && window.currentUser.role === 'admin' })}
                    </select>
                </td>
                <td class="px-2 py-2"><input type="text" class="details-input w-full border rounded px-2 py-1" placeholder="รายละเอียด (ถ้ามี)..."></td>
                <td class="px-2 py-2"><input type="text" class="start-date-input w-full border rounded px-2 py-1" placeholder="เลือกวันที่..."></td>
                <td class="px-2 py-2"><input type="text" class="end-date-input w-full border rounded px-2 py-1" placeholder="เลือกวันที่..."></td>
            </tr>`;
        });

        tableHTML += '</tbody></table>';
        containerEl.innerHTML = tableHTML;

        // Initialize Flatpickr and Events
        data.forEach(p => {
            const row = containerEl.querySelector(`tr[data-id="${p.id}"]`);
            if (row) {
                const statusSelect = row.querySelector('.status-select');
                // Set default status from persistent storage (if not editing)
                if (!window.editingDailyReportData) {
                    statusSelect.value = (p.status && p.status !== 'ไม่มี') ? normalizeTaf025Status(p.status) : 'ไม่มี';
                    row.querySelector('.details-input').value = p.details || '';
                }

                const startDatePicker = flatpickr(row.querySelector('.start-date-input'), flatpickrConfig);
                const endDatePicker = flatpickr(row.querySelector('.end-date-input'), flatpickrConfig);

                // Set default dates from persistent storage (if not editing)
                if (!window.editingDailyReportData) {
                    if (p.start_date) startDatePicker.setDate(p.start_date);
                    if (p.end_date) endDatePicker.setDate(p.end_date);
                }

                statusSelect.addEventListener('change', () => updateCategorySummary(key));
            }
        });
        updateCategorySummary(key);
    }

    // --- เติมข้อมูลเก่ากรณีแก้ไข (Pre-fill Form) ---
    if (window.editingDailyReportData && window.editingDailyReportData.report_data) {
        const savedItemMap = DAILY_CATEGORY_ORDER.reduce((map, key) => {
            const items = window.editingDailyReportData.report_data[key];
            if (Array.isArray(items)) {
                items.forEach(item => {
                    if (item && item.personnel_id) map[item.personnel_id] = item;
                });
            }
            return map;
        }, {});

        getDailyCategoryKeys().forEach(key => {
            const containerEl = document.getElementById(`submission-list-${key}`);
            if (!containerEl) return;
            containerEl.querySelectorAll('tbody > tr').forEach(row => {
                const personId = row.dataset.id;
                const savedItem = savedItemMap[personId];
                if (!savedItem) return;

                const statusSelect = row.querySelector('.status-select');
                statusSelect.value = savedItem.status;
                row.querySelector('.details-input').value = savedItem.details || '';

                const startDatePicker = row.querySelector('.start-date-input')._flatpickr;
                if (startDatePicker && savedItem.start_date) startDatePicker.setDate(savedItem.start_date);

                const endDatePicker = row.querySelector('.end-date-input')._flatpickr;
                if (endDatePicker && savedItem.end_date) endDatePicker.setDate(savedItem.end_date);

                updateCategorySummary(key);
            });
        });

        window.editingDailyReportData = null;
    }
}

// --- Daily Report and Archive Rendering ---
function getReportDateString(report) {
    if (!report || !report.report_date) return '';
    if (typeof report.report_date === 'string') return report.report_date.slice(0, 10);
    try {
        return new Date(report.report_date).toISOString().slice(0, 10);
    } catch (e) {
        return String(report.report_date).slice(0, 10);
    }
}

function getReportSummary(report) {
    return report.summary_data || report.summary || {};
}

function getReportData(report) {
    return report.report_data || {};
}

function getSubmitterText(report) {
    const rank = report.rank || '';
    const firstName = report.first_name || '';
    const lastName = report.last_name || '';
    const fullName = `${rank} ${firstName} ${lastName}`.trim();
    return fullName || report.submitted_by || '-';
}

function buildDailyMissionItems(report) {
    const reportData = getReportData(report);
    const items = [];

    Object.keys(DAILY_CATEGORY_LABELS).forEach(key => {
        const categoryItems = Array.isArray(reportData[key]) ? reportData[key] : [];
        categoryItems.forEach(item => {
            const personnelName = `${item.rank || ''} ${item.first_name || ''} ${item.last_name || ''}`.trim();
            items.push({
                ...item,
                category_key: key,
                category: DAILY_CATEGORY_LABELS[key],
                personnel_name: personnelName
            });
        });
    });

    return items;
}

function renderDailySummaryHtml(summary, textSize = 'text-sm') {
    const lines = DAILY_CATEGORY_ORDER.map(key => {
        const item = getCategorySummary(summary, key);
        if (key === 'civilian' && !item.total) return '';
        return `<p><b>${DAILY_CATEGORY_LABELS[key]}:</b> ยอด ${item.total || 0}, ว่าง ${item.available || 0}, ภารกิจ ${item.mission || 0}</p>`;
    }).filter(Boolean).join('');
    return `<div class="mt-2 ${textSize} text-gray-700 space-y-1 p-3 bg-white rounded border">${lines}</div>`;
}

function renderDailyMissionTable(report, options = {}) {
    const { showDepartment = false, compact = false } = options;
    const items = buildDailyMissionItems(report);

    if (items.length === 0) {
        return '<p class="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">ไม่มีรายชื่อกำลังพลติดภารกิจ</p>';
    }

    const departmentHeader = showDepartment ? '<th class="px-2 py-2 text-left font-medium text-gray-600">แผนก</th>' : '';
    const departmentCells = item => showDepartment ? `<td class="px-2 py-2">${escapeHTML(report.department || '')}</td>` : '';
    const textClass = compact ? 'text-xs' : 'text-sm';

    return `<div class="overflow-x-auto mt-3">
        <table class="min-w-full bg-white ${textClass}">
            <thead class="bg-gray-100">
                <tr>
                    ${departmentHeader}
                    <th class="px-2 py-2 text-left font-medium text-gray-600">ประเภท</th>
                    <th class="px-2 py-2 text-left font-medium text-gray-600 ps-nowrap-cell">ยศ-ชื่อ-สกุล</th>
                    <th class="px-2 py-2 text-left font-medium text-gray-600">สถานะ</th>
                    <th class="px-2 py-2 text-left font-medium text-gray-600">รายละเอียด</th>
                    <th class="px-2 py-2 text-left font-medium text-gray-600">ช่วงวันที่</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                ${items.map(item => `<tr>
                    ${departmentCells(item)}
                    <td class="px-2 py-2 ps-nowrap-cell">${escapeHTML(item.category)}</td>
                    <td class="px-2 py-2 font-medium ps-nowrap-name">${escapeHTML(item.personnel_name || '-')}</td>
                    <td class="px-2 py-2 ps-nowrap-cell">${escapeHTML(item.status || '')}</td>
                    <td class="px-2 py-2 ps-wrap-detail">${escapeHTML(item.details || '')}</td>
                    <td class="px-2 py-2 ps-nowrap-cell">${formatThaiDateRangeArabic(item.start_date, item.end_date)}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}


async function exportDailyNoteExcelFromOverview() {
    if (!currentUser || currentUser.role !== 'admin') {
        ui.showMessage('ส่งออก 11.ตอนหมายเหตุได้เฉพาะผู้ดูแลระบบเท่านั้น', false);
        return;
    }

    try {
        await switchTab('tab-daily-status-overview');
        const frame = document.getElementById('daily-status-overview-frame');
        if (!frame) {
            ui.showMessage('ไม่พบหน้าตรวจสอบรายชื่อและทดสอบระบบ', false);
            return;
        }

        const tryExport = () => {
            try {
                const fn = frame.contentWindow && frame.contentWindow.exportDailyNoteExcel;
                if (typeof fn === 'function') {
                    fn();
                    return true;
                }
            } catch (error) {
                console.warn('Cannot access note export function yet:', error);
            }
            return false;
        };

        if (tryExport()) return;

        ui.showMessage('กำลังโหลดหน้าตรวจสอบรายชื่อและทดสอบระบบ กรุณารอสักครู่...', true);
        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            if (tryExport()) {
                clearInterval(timer);
            } else if (attempts >= 20) {
                clearInterval(timer);
                ui.showMessage('ยังไม่สามารถส่งออก 11.ตอนหมายเหตุได้ กรุณากดปุ่มอีกครั้งหลังหน้าตรวจสอบโหลดเสร็จ', false);
            }
        }, 300);
    } catch (error) {
        ui.showMessage(error.message || 'ไม่สามารถส่งออก 11.ตอนหมายเหตุได้', false);
    }
}

function exportDailyReportsToExcel(reports, fileNamePrefix = 'รายงานประจำวัน') {
    if (!reports || reports.length === 0) {
        ui.showMessage('ไม่มีข้อมูลรายงานสำหรับส่งออก Excel', false);
        return false;
    }

    if (!window.XLSX) {
        ui.showMessage('ไม่พบไลบรารี XLSX กรุณาตรวจสอบการโหลดไฟล์ Excel CDN', false);
        return false;
    }

    const rows = [];
    rows.push(['วันที่รายงาน', 'แผนก', 'ประเภท', 'ยศ', 'ชื่อ-สกุล', 'สถานะ', 'รายละเอียด', 'ช่วงวันที่', 'ส่งโดย']);

    reports.forEach(report => {
        const reportDate = getReportDateString(report);
        const items = buildDailyMissionItems(report);
        const submitter = getSubmitterText(report);

        if (items.length === 0) {
            rows.push([
                formatThaiDate(reportDate),
                report.department || '',
                '-',
                '',
                'ไม่มีรายชื่อกำลังพลติดภารกิจ',
                'ว่างทั้งหมด',
                '',
                '',
                submitter
            ]);
            return;
        }

        items.forEach(item => {
            const name = item.personnel_name || '';
            const parts = name.split(' ');
            const rank = item.rank || parts[0] || '';
            const fullName = `${item.first_name || parts[1] || ''} ${item.last_name || parts.slice(2).join(' ') || ''}`.trim();
            rows.push([
                formatThaiDate(reportDate),
                report.department || '',
                item.category || '',
                rank,
                fullName,
                item.status || '',
                item.details || '',
                formatThaiDateRangeArabic(item.start_date, item.end_date),
                submitter
            ]);
        });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
        { wch: 28 }, { wch: 24 }, { wch: 34 }, { wch: 16 }, { wch: 34 },
        { wch: 18 }, { wch: 42 }, { wch: 26 }, { wch: 28 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'รายงานประจำวัน');

    const firstDate = getReportDateString(reports[0]) || new Date().toISOString().slice(0, 10);
    const safeDate = firstDate.replace(/[^0-9-]/g, '');
    const suffix = reports.length === 1 ? safeDate : `${safeDate}-รวม-${reports.length}-รายการ`;
    XLSX.writeFile(wb, `${fileNamePrefix}-${suffix}.xlsx`);
    return true;
}

function renderDailyFinalReport(res) {
    const { reports, report_date, all_departments, submitted_departments } = res;
    currentDailyReports = reports || [];

    currentReportDate = report_date;
    const titleEl = document.querySelector('#pane-daily-report h2');
    titleEl.textContent = `ส่งรายงานประจำวัน (${formatThaiDate(report_date)})`;

    dailyReportContainer.innerHTML = '';
    
    const allSubmitted = all_departments.length > 0 && all_departments.every(dept => submitted_departments.includes(dept));

    if (exportDailyCurrentExcelBtn) {
        const hasReports = currentDailyReports.length > 0;
        exportDailyCurrentExcelBtn.disabled = !hasReports;
        exportDailyCurrentExcelBtn.classList.toggle('bg-gray-400', !hasReports);
        exportDailyCurrentExcelBtn.classList.toggle('cursor-not-allowed', !hasReports);
        exportDailyCurrentExcelBtn.classList.toggle('bg-green-600', hasReports);
        exportDailyCurrentExcelBtn.classList.toggle('hover:bg-green-700', hasReports);
    }

    if (exportDailyArchiveBtn) {
        exportDailyArchiveBtn.disabled = !allSubmitted;
        exportDailyArchiveBtn.classList.toggle('bg-gray-400', !allSubmitted);
        exportDailyArchiveBtn.classList.toggle('cursor-not-allowed', !allSubmitted);
        exportDailyArchiveBtn.classList.toggle('bg-blue-500', allSubmitted);
        exportDailyArchiveBtn.classList.toggle('hover:bg-blue-700', allSubmitted);
        exportDailyArchiveBtn.title = allSubmitted ? 'ส่งออก Excel และเก็บรายงาน' : 'ต้องรอให้ทุกแผนกส่งรายงานก่อน';
    }

    if (!reports || reports.length === 0) {
        dailyReportContainer.innerHTML = '<p class="text-center text-gray-500">ยังไม่มีแผนกใดส่งรายงานสำหรับวันนี้</p>';
        return;
    }

    reports.forEach(report => {
        const reportWrapper = document.createElement('div');
        reportWrapper.className = 'p-4 border rounded-lg bg-gray-50 mb-4';
        const summary = getReportSummary(report);
        
        reportWrapper.innerHTML = `
            <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800">${escapeHTML(report.department)}</h3>
                    <p class="text-sm text-gray-500">ส่งโดย: ${escapeHTML(getSubmitterText(report))} (เวลา ${new Date(report.timestamp).toLocaleTimeString('th-TH')})</p>
                </div>
            </div>
            ${renderDailySummaryHtml(summary)}
            ${renderDailyMissionTable(report)}
        `;
        dailyReportContainer.appendChild(reportWrapper);
    });
}

// --- Daily History Functions ---
function populateDailyHistoryYears() {
    dailyHistoryYearSelect.innerHTML = '<option value="">เลือกปี</option>';
    dailyHistoryMonthSelect.innerHTML = '<option value="">เลือกเดือน</option>';
    if (dailyHistoryDaySelect) dailyHistoryDaySelect.innerHTML = '<option value="">ทุกวันในเดือน</option>';
    if (allDailyHistoryData && Object.keys(allDailyHistoryData).length > 0) {
        const sortedYears = Object.keys(allDailyHistoryData).sort((a, b) => b - a);
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            dailyHistoryYearSelect.appendChild(option);
        });
    }
}

function populateDailyHistoryMonths() {
    const selectedYear = dailyHistoryYearSelect.value;
    dailyHistoryMonthSelect.innerHTML = '<option value="">เลือกเดือน</option>';
    if (dailyHistoryDaySelect) dailyHistoryDaySelect.innerHTML = '<option value="">ทุกวันในเดือน</option>';
    if (selectedYear && allDailyHistoryData[selectedYear]) {
        const sortedMonths = Object.keys(allDailyHistoryData[selectedYear]).sort((a, b) => b - a);
        sortedMonths.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = new Date(2000, parseInt(month) - 1, 1).toLocaleString('th-TH', { month: 'long' });
            dailyHistoryMonthSelect.appendChild(option);
        });
    }
}

function populateDailyHistoryDays() {
    if (!dailyHistoryDaySelect) return;
    const year = dailyHistoryYearSelect.value;
    const month = dailyHistoryMonthSelect.value;
    dailyHistoryDaySelect.innerHTML = '<option value="">ทุกวันในเดือน</option>';
    const reportsForMonth = (year && month && allDailyHistoryData[year]) ? (allDailyHistoryData[year][month] || []) : [];
    const dates = [...new Set(reportsForMonth.map(r => getReportDateString(r)).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));
    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatThaiDate(date);
        dailyHistoryDaySelect.appendChild(option);
    });
}

function getFilteredDailyHistoryReports() {
    const year = dailyHistoryYearSelect.value;
    const month = dailyHistoryMonthSelect.value;
    const selectedDate = dailyHistoryDaySelect ? dailyHistoryDaySelect.value : '';
    if (!year || !month) return [];

    let reportsForMonth = allDailyHistoryData[year] ? (allDailyHistoryData[year][month] || []) : [];
    if (selectedDate) {
        reportsForMonth = reportsForMonth.filter(report => getReportDateString(report) === selectedDate);
    }
    return reportsForMonth;
}

function renderFilteredDailyHistory() {
    const year = dailyHistoryYearSelect.value;
    const month = dailyHistoryMonthSelect.value;
    if (!year || !month) {
        ui.showMessage('กรุณาเลือกปีและเดือน', false);
        return;
    }
    const reportsForPeriod = getFilteredDailyHistoryReports();
    
    dailyHistoryContainer.innerHTML = '';

    if (!reportsForPeriod || reportsForPeriod.length === 0) {
        dailyHistoryContainer.innerHTML = '<p class="text-center text-gray-500">ไม่พบประวัติการส่งรายงานสำหรับช่วงที่เลือก</p>';
        return;
    }

    reportsForPeriod.forEach(report => {
        const reportWrapper = document.createElement('div');
        reportWrapper.className = 'p-4 border rounded-lg bg-gray-50 mb-4';
        const summary = getReportSummary(report);
        let submittedByText = (currentUser.role === 'admin') ? `แผนก: ${escapeHTML(report.department)} | ` : '';
        submittedByText += `ส่งโดย: ${escapeHTML(report.submitted_by || getSubmitterText(report))}`;

        const isArchived = report.is_archived || report.source === 'archived' || report.editable === false;
        const canEdit = report.editable !== false;
        const statusBadgeHtml = isArchived
            ? `<span class="inline-flex items-center bg-gray-200 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full">เก็บแล้ว</span>`
            : `<span class="inline-flex items-center bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">ยังแก้ไขได้</span>`;
        const editButtonHtml = canEdit
            ? `<button data-report-id="${report.id}" class="edit-daily-history-btn bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-1 px-3 rounded-lg">แก้ไข</button>`
            : `<button type="button" disabled class="bg-gray-300 text-gray-600 text-sm font-bold py-1 px-3 rounded-lg cursor-not-allowed" title="รายงานนี้ถูกเก็บแล้ว ไม่สามารถแก้ไขได้">แก้ไขไม่ได้</button>`;

        reportWrapper.innerHTML = `
            <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                <div>
                    <h4 class="text-lg font-semibold text-gray-800">รายงานสำหรับวันที่ ${formatThaiDate(getReportDateString(report))}</h4>
                    <span class="text-sm text-gray-500">${submittedByText} (เวลา ${new Date(report.timestamp).toLocaleTimeString('th-TH')})</span>
                    <div class="mt-1">${statusBadgeHtml}</div>
                </div>
                ${editButtonHtml}
            </div>
            ${renderDailySummaryHtml(summary)}
            ${renderDailyMissionTable(report)}
        `;
        dailyHistoryContainer.appendChild(reportWrapper);
    });
}

// --- Daily Archive Functions ---
function populateDailyArchiveYears() {
    dailyArchiveYearSelect.innerHTML = '<option value="">เลือกปี</option>';
    dailyArchiveMonthSelect.innerHTML = '<option value="">เลือกเดือน</option>';
    if (dailyArchiveDaySelect) dailyArchiveDaySelect.innerHTML = '<option value="">ทุกวันในเดือน</option>';
    if (allArchivedDailyData && Object.keys(allArchivedDailyData).length > 0) {
        const sortedYears = Object.keys(allArchivedDailyData).sort((a, b) => b - a);
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = parseInt(year) + 543;
            dailyArchiveYearSelect.appendChild(option);
        });
    }
}

function populateDailyArchiveMonths() {
    const selectedYear = dailyArchiveYearSelect.value;
    dailyArchiveMonthSelect.innerHTML = '<option value="">เลือกเดือน</option>';
    if (dailyArchiveDaySelect) dailyArchiveDaySelect.innerHTML = '<option value="">ทุกวันในเดือน</option>';
    if (selectedYear && allArchivedDailyData[selectedYear]) {
        const sortedMonths = Object.keys(allArchivedDailyData[selectedYear]).sort((a, b) => b - a);
        sortedMonths.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = new Date(2000, parseInt(month) - 1, 1).toLocaleString('th-TH', { month: 'long' });
            dailyArchiveMonthSelect.appendChild(option);
        });
    }
}

function populateDailyArchiveDays() {
    if (!dailyArchiveDaySelect) return;
    const year = dailyArchiveYearSelect.value;
    const month = dailyArchiveMonthSelect.value;
    dailyArchiveDaySelect.innerHTML = '<option value="">ทุกวันในเดือน</option>';
    const reportsForMonth = (year && month && allArchivedDailyData[year]) ? (allArchivedDailyData[year][month] || []) : [];
    const dates = [...new Set(reportsForMonth.map(r => getReportDateString(r)).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));
    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatThaiDate(date);
        dailyArchiveDaySelect.appendChild(option);
    });
}

function getFilteredDailyArchiveReports() {
    const year = dailyArchiveYearSelect.value;
    const month = dailyArchiveMonthSelect.value;
    const selectedDate = dailyArchiveDaySelect ? dailyArchiveDaySelect.value : '';
    if (!year || !month) return [];

    let reportsForMonth = allArchivedDailyData[year] ? (allArchivedDailyData[year][month] || []) : [];
    if (selectedDate) {
        reportsForMonth = reportsForMonth.filter(report => getReportDateString(report) === selectedDate);
    }
    return reportsForMonth;
}

function renderFilteredDailyArchives() {
    const year = dailyArchiveYearSelect.value;
    const month = dailyArchiveMonthSelect.value;
    if (!year || !month) {
        ui.showMessage('กรุณาเลือกปีและเดือน', false);
        return;
    }
    const reportsForPeriod = getFilteredDailyArchiveReports();
    
    dailyArchiveContainer.innerHTML = '';

    if (!reportsForPeriod || reportsForPeriod.length === 0) {
        dailyArchiveContainer.innerHTML = '<p class="text-center text-gray-500">ไม่พบรายงานที่เก็บถาวรสำหรับช่วงที่เลือก</p>';
        return;
    }

    const reportsByDate = reportsForPeriod.reduce((acc, report) => {
        const date = getReportDateString(report);
        if(!acc[date]) acc[date] = [];
        acc[date].push(report);
        return acc;
    }, {});

    Object.keys(reportsByDate).sort((a,b) => new Date(b) - new Date(a)).forEach(date => {
        const dateCard = document.createElement('div');
        dateCard.className = 'mb-6 p-4 border rounded-lg bg-gray-50';
        
        let reportsHtml = '';
        reportsByDate[date].forEach(report => {
            const summary = getReportSummary(report);
            reportsHtml += `
            <div class="mt-4 p-4 bg-white rounded border">
                 <div class="flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <p class="text-md font-semibold text-gray-800">${escapeHTML(report.department)}</p>
                        <p class="text-xs text-gray-500 mb-2">ส่งโดย: ${escapeHTML(report.submitted_by || getSubmitterText(report))}</p>
                    </div>
                 </div>
                 ${renderDailySummaryHtml(summary, 'text-xs')}
                 ${renderDailyMissionTable(report, { compact: true })}
            </div>`;
        });
        
        dateCard.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2">
                <h3 class="text-lg font-semibold text-gray-800">รายงานวันที่ ${formatThaiDate(date)}</h3>
                <button type="button" class="export-daily-date-excel-btn bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded-lg" data-date="${escapeHTML(date)}">ส่งออก Excel วันนี้</button>
            </div>
            ${reportsHtml}
        `;
        dailyArchiveContainer.appendChild(dateCard);
    });

    dailyArchiveContainer.querySelectorAll('.export-daily-date-excel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const date = btn.dataset.date;
            const reports = reportsForPeriod.filter(report => getReportDateString(report) === date);
            exportDailyReportsToExcel(reports, 'รายงานทั้งหมดประจำวัน');
        });
    });
}
