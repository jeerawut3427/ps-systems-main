// ui.js
// Contains all functions related to updating and rendering the user interface.

import { escapeHTML, formatThaiDateArabic, formatThaiDateRangeArabic, buildTaf025StatusOptionsHtml, normalizeTaf025Status } from './utils.js?v=43';
import { exportSingleReportToExcel } from './utils.js?v=43'; // Import the export function

const ITEMS_PER_PAGE = 15;

// --- Thai locale settings for Flatpickr ---
export const thai_locale = {
    weekdays: {
        shorthand: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
        longhand: ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"],
    },
    months: {
        shorthand: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
        longhand: ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"],
    },
    firstDayOfWeek: 0,
    rangeSeparator: " ถึง ",
    scrollTitle: "เลื่อนเพื่อเปลี่ยน",
    toggleTitle: "คลิกเพื่อสลับ",
    ordinal: function () { return ""; },
    era: "พ.ศ.",
};


// --- Personnel constants for Fix 28 ---
export const PERSONNEL_TYPE_OPTIONS = [
    { key: '', label: 'ทั้งหมด' },
    { key: 'officer', label: 'สัญญาบัตร' },
    { key: 'nco', label: 'ประทวน' },
    { key: 'civilian', label: 'ลูกจ้างประจำและพนักงานราชการ' },
];

export const AIR_FORCE_SPECIALTIES = [
    ['ทหารอากาศ', 'ทอ.'],
    ['ทหารนักบิน', 'นบ.'],
    ['ทหารต้นหน', 'ตห.'],
    ['ทหารตรวจการณ์', 'ตก.'],
    ['ทหารทิ้งระเบิด', 'รบ.'],
    ['ทหารสื่อสาร', 'ส.'],
    ['ทหารสรรพาวุธ', 'สพ.'],
    ['ทหารอากาศโยธิน', 'อย.'],
    ['ทหารขนส่ง', 'ขส.'],
    ['ทหารสารวัตร', 'สห.'],
    ['ทหารช่างอากาศ', 'ชอ.'],
    ['ทหารพลาธิการ', 'พธ.'],
    ['ทหารช่างโยธา', 'ชย.'],
    ['ทหารแผนที่', 'ผท.'],
    ['ทหารอุตุ', 'อต.'],
    ['ทหารถ่ายรูป', 'ถร.'],
    ['ทหารการเงิน', 'กง.'],
    ['ทหารพระธรรมนูญ', 'ธน.'],
    ['ทหารดุริยางค์', 'ดย.'],
    ['ทหารสารบรรณ', 'สบ.'],
    ['ทหารแพทย์', 'พ.'],
    ['ทหารพลร่ม', 'พร.'],
    ['ทหารพัสดุ', 'พด.'],
    ['ทหารวิทยาศาสตร์', 'วท.'],
];

const OFFICER_RANKS = ['น.อ.(พ)', 'น.อ.หม่อมหลวง', 'น.อ.', 'น.ท.', 'น.ต.', 'ร.อ.', 'ร.ท.', 'ร.ต.', 'น.อ.(พ).หญิง', 'น.อ.หญิง', 'น.ท.หญิง', 'น.ต.หญิง', 'ร.อ.หญิง', 'ร.ท.หญิง', 'ร.ต.หญิง'];
const NCO_RANKS = ['พ.อ.อ.(พ)', 'พ.อ.อ.หญิง(พ)', 'พ.อ.อ.', 'พ.อ.ท.', 'พ.อ.ต.', 'จ.อ.', 'จ.ท.', 'จ.ต.', 'พ.อ.อ.หญิง', 'พ.อ.ท.หญิง', 'พ.อ.ต.หญิง', 'จ.อ.หญิง', 'จ.ท.หญิง', 'จ.ต.หญิง'];
const CIVILIAN_RANKS = ['นาย', 'นาง', 'นางสาว', 'ลูกจ้างประจำ', 'พนักงานราชการ'];


function canonicalSpecialtyValue(value) {
    const raw = (value || '').trim();
    if (!raw) return '';
    for (const [name, abbr] of AIR_FORCE_SPECIALTIES) {
        const full = `${name} (${abbr})`;
        if (raw === full || raw === name || raw === abbr) return full;
    }
    return raw;
}

export function getPersonnelTypeKey(rank) {
    if (OFFICER_RANKS.includes(rank)) return 'officer';
    if (NCO_RANKS.includes(rank)) return 'nco';
    if (CIVILIAN_RANKS.includes(rank)) return 'civilian';
    return '';
}

export function getPersonnelTypeLabel(rank) {
    const key = getPersonnelTypeKey(rank);
    if (key === 'officer') return 'สัญญาบัตร';
    if (key === 'nco') return 'ประทวน';
    if (key === 'civilian') return 'ลูกจ้างประจำและพนักงานราชการ';
    return 'ไม่ระบุ';
}

export function buildPersonnelTypeFilter(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = PERSONNEL_TYPE_OPTIONS.map((item, index) => `
        <button type="button" data-type="${escapeHTML(item.key)}"
            class="personnel-type-filter-btn px-3 py-2 rounded-lg border text-sm ${index === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-blue-50'}">
            ${escapeHTML(item.label)}
        </button>
    `).join('');
    container.dataset.activeType = '';
}

function setPersonnelTypeFilter(container, type) {
    container.dataset.activeType = type || '';
    container.querySelectorAll('.personnel-type-filter-btn').forEach(btn => {
        const active = (btn.dataset.type || '') === (type || '');
        btn.className = active
            ? 'personnel-type-filter-btn px-3 py-2 rounded-lg border text-sm bg-blue-600 text-white border-blue-600'
            : 'personnel-type-filter-btn px-3 py-2 rounded-lg border text-sm bg-white text-gray-700 hover:bg-blue-50';
    });
}

export function handlePersonnelTypeFilterClick(e, callback) {
    const btn = e.target.closest('.personnel-type-filter-btn');
    if (!btn) return;
    const container = btn.closest('[data-active-type]');
    if (!container) return;
    const selectedType = btn.dataset.type || '';
    setPersonnelTypeFilter(container, selectedType);

    const specialtyFilterId = container.id === 'my-personnel-type-filter'
        ? 'my-personnel-specialty-filter'
        : 'personnel-specialty-filter';
    const specialtyFilter = document.getElementById(specialtyFilterId);
    if (specialtyFilter) {
        const isCivilian = selectedType === 'civilian';
        specialtyFilter.disabled = isCivilian;
        if (isCivilian) specialtyFilter.value = '';
        specialtyFilter.classList.toggle('opacity-50', isCivilian);
        specialtyFilter.classList.toggle('cursor-not-allowed', isCivilian);
    }

    if (typeof callback === 'function') callback(selectedType);
}

export function populateSpecialtyDropdowns() {
    const selects = document.querySelectorAll('.air-force-specialty-select, #person-specialty, #personnel-specialty-filter, #my-personnel-specialty-filter');
    selects.forEach(select => {
        if (!select) return;
        const isFilter = select.id && select.id.includes('filter');
        const currentValue = select.value;
        select.innerHTML = isFilter ? '<option value="">ทุกเหล่า</option>' : '<option value="">-- เลือกเหล่า --</option>';
        AIR_FORCE_SPECIALTIES.forEach(([name, abbr]) => {
            const value = `${name} (${abbr})`;
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

export function updatePersonnelSpecialtyVisibility() {
    const rankSelect = document.getElementById('person-rank');
    const specialtySelect = document.getElementById('person-specialty');
    const wrapper = document.getElementById('person-specialty-wrapper');
    if (!rankSelect || !specialtySelect) return;
    const isCivilian = getPersonnelTypeKey(rankSelect.value) === 'civilian';
    if (wrapper) wrapper.classList.toggle('hidden', isCivilian);
    specialtySelect.disabled = isCivilian;
    specialtySelect.required = !isCivilian;
    if (isCivilian) specialtySelect.value = '';
}

function fillDepartmentFilter(selectId, departments = []) {
    const select = document.getElementById(selectId);
    if (!select || select.dataset.loaded === '1') return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">ทุกแผนก</option>';
    departments.forEach(dept => {
        if (!dept) return;
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
    });
    select.value = currentValue;
    select.dataset.loaded = '1';
}

function fillPrintDepartmentSelect(departments = []) {
    const select = document.getElementById('print-personnel-department-select');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">เลือกแผนกเพื่อพิมพ์รายชื่อ</option>';
    departments.forEach(dept => {
        if (!dept) return;
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
    });
    select.value = departments.includes(currentValue) ? currentValue : '';
}

function renderPersonnelSummary(containerId, summary = {}, title = 'สรุปกำลังพล') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const cards = [
        ['ทั้งหมด', summary.total || 0, 'bg-slate-50 text-slate-700'],
        ['สัญญาบัตร', summary.officer || 0, 'bg-blue-50 text-blue-700'],
        ['ประทวน', summary.nco || 0, 'bg-emerald-50 text-emerald-700'],
        ['ลูกจ้างประจำและพนักงานราชการ', summary.civilian || 0, 'bg-amber-50 text-amber-700'],
    ];
    container.innerHTML = cards.map(([label, value, cls]) => `
        <div class="p-4 rounded-lg border ${cls}">
            <p class="text-xs font-medium opacity-80">${escapeHTML(label)}</p>
            <p class="text-2xl font-bold mt-1">${value}</p>
        </div>
    `).join('');
}

// --- Color settings for statuses ---
const STATUS_COLORS = {
    'ปฏิบัติงานในหน่วย': 'bg-emerald-50',
    'ราชการ': 'bg-blue-50',
    'คุมงาน': 'bg-indigo-50',
    'ศึกษา': 'bg-purple-50',
    'อบรม/ฝึก': 'bg-violet-50',
    'ช่วยราชการ': 'bg-cyan-50',
    'ป่วยที่ รพ.': 'bg-orange-50',
    'ลาป่วยนอก รพ.': 'bg-yellow-50',
    'ลากิจ': 'bg-red-50',
    'ลาพักผ่อน': 'bg-green-50',
    'ลาคลอด': 'bg-pink-50',
    'ลาช่วยภรรยาเลี้ยงดูบุตร': 'bg-pink-50',
    'ลาอุปสมบท': 'bg-amber-50',
    'ประกอบพิธีทางศาสนาอิสลาม': 'bg-amber-50',
    'โทษ': 'bg-red-100',
    'ขาด': 'bg-red-100',
    'หนี': 'bg-red-100',
    'ต้องโทษคดีอาญา': 'bg-red-100',
    'เสียชีวิต': 'bg-gray-200',
    'สาบสูญ': 'bg-gray-200',
    'สรก.และพักราชการ': 'bg-gray-100',
    'ส่วนขึ้นสมทบ': 'bg-teal-50',
    'เกษียณอายุราชการ': 'bg-gray-100',
};

// --- Color settings for the chart ---
const CHART_STATUS_COLORS = {
    'ว่าง': '#4CAF50',
    'ปฏิบัติงานในหน่วย': '#10B981',
    'ราชการ': '#3B82F6',
    'คุมงาน': '#6366F1',
    'ศึกษา': '#8B5CF6',
    'อบรม/ฝึก': '#7C3AED',
    'ช่วยราชการ': '#06B6D4',
    'ป่วยที่ รพ.': '#F97316',
    'ลาป่วยนอก รพ.': '#F59E0B',
    'ลากิจ': '#EF4444',
    'ลาพักผ่อน': '#10B981',
    'ลาคลอด': '#EC4899',
    'ลาช่วยภรรยาเลี้ยงดูบุตร': '#DB2777',
    'ลาอุปสมบท': '#D97706',
    'ประกอบพิธีทางศาสนาอิสลาม': '#B45309',
    'โทษ': '#991B1B',
    'ขาด': '#B91C1C',
    'หนี': '#7F1D1D',
    'ต้องโทษคดีอาญา': '#991B1B',
    'เสียชีวิต': '#4B5563',
    'สาบสูญ': '#6B7280',
    'สรก.และพักราชการ': '#6B7280',
    'ส่วนขึ้นสมทบ': '#14B8A6',
    'เกษียณอายุราชการ': '#6B7280',
};


// --- Function to create an empty state message ---
function createEmptyState(message) {
    return `
        <div class="text-center py-10 px-4">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">ไม่พบข้อมูล</h3>
            <p class="mt-1 text-sm text-gray-500">${escapeHTML(message)}</p>
        </div>
    `;
}

// --- Function to manage the confirmation modal ---
export function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const messageEl = document.getElementById('confirm-modal-message');
    const confirmBtn = document.getElementById('confirm-modal-confirm-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

    if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) return;

    titleEl.textContent = title;
    messageEl.textContent = message;

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    const confirmHandler = () => {
        onConfirm();
        modal.classList.remove('active');
    };

    const cancelHandler = () => {
        modal.classList.remove('active');
    };

    newConfirmBtn.addEventListener('click', confirmHandler, { once: true });
    cancelBtn.addEventListener('click', cancelHandler, { once: true });

    modal.classList.add('active');
}


// --- Helper function to render pagination controls ---
function renderPagination(containerId, totalItems, currentPage, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;

    const prevButton = document.createElement('button');
    prevButton.textContent = '‹ ก่อนหน้า';
    prevButton.disabled = currentPage === 1;
    prevButton.className = 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed';
    prevButton.addEventListener('click', () => onPageChange(currentPage - 1));

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `หน้า ${currentPage} จาก ${totalPages}`;
    pageInfo.className = 'text-sm text-gray-600';

    const nextButton = document.createElement('button');
    nextButton.textContent = 'ถัดไป ›';
    nextButton.disabled = currentPage === totalPages;
    nextButton.className = 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed';
    nextButton.addEventListener('click', () => onPageChange(currentPage + 1));

    container.appendChild(prevButton);
    container.appendChild(pageInfo);
    container.appendChild(nextButton);
}

export function showMessage(message, isSuccess = true) {
    if (!window.messageArea) return;
    window.messageArea.textContent = message;
    window.messageArea.className = `mb-4 text-center p-3 rounded-lg ${isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
    setTimeout(() => { if(window.messageArea) { window.messageArea.innerHTML = ''; window.messageArea.className = 'mb-4 text-center'; } }, 5000);
}

export function populateRankDropdowns() {
    const ranks = {
        'นายทหารสัญญาบัตร (ชาย)': ['น.อ.(พ)', 'น.อ.หม่อมหลวง', 'น.อ.', 'น.ท.', 'น.ต.', 'ร.อ.', 'ร.ท.', 'ร.ต.'],
        'นายทหารสัญญาบัตร (หญิง)': ['น.อ.(พ).หญิง', 'น.อ.หญิง', 'น.ท.หญิง', 'น.ต.หญิง', 'ร.อ.หญิง', 'ร.ท.หญิง', 'ร.ต.หญิง'],
        'นายทหารประทวน (ชาย)': ['พ.อ.อ.(พ)', 'พ.อ.อ.', 'พ.อ.ท.', 'พ.อ.ต.', 'จ.อ.', 'จ.ท.', 'จ.ต.'],
        'นายทหารประทวน (หญิง)': ['พ.อ.อ.หญิง(พ)', 'พ.อ.อ.หญิง', 'พ.อ.ท.หญิง', 'พ.อ.ต.หญิง', 'จ.อ.หญิง', 'จ.ท.หญิง', 'จ.ต.หญิง'],
        'ลูกจ้างประจำและพนักงานราชการ': ['นาย', 'นาง', 'นางสาว', 'ลูกจ้างประจำ', 'พนักงานราชการ']
    };
    const rankSelects = [document.getElementById('person-rank'), document.getElementById('user-rank')];
    rankSelects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">-- กรุณาเลือก --</option>';
        for (const groupName in ranks) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;
            ranks[groupName].forEach(rank => {
                const option = document.createElement('option');
                option.value = rank;
                option.textContent = rank;
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }
    });
    updatePersonnelSpecialtyVisibility();
}

export function renderDashboard(res) {
    const summary = res.summary;
    if (!summary) return;
    const totalPersonnelEl = document.getElementById('dashboard-total-personnel');
    const onDutyEl = document.getElementById('dashboard-on-duty');
    const statusSummaryArea = document.getElementById('dashboard-status-summary');
    const deptStatusArea = document.getElementById('dashboard-department-status');
    const weekRangeEl = document.getElementById('dashboard-week-range');

    if(totalPersonnelEl) totalPersonnelEl.textContent = summary.total_personnel || '0';
    if(onDutyEl) onDutyEl.textContent = summary.total_on_duty || '0';
    
    if (weekRangeEl && summary.weekly_date_range) {
        weekRangeEl.textContent = `(${summary.weekly_date_range})`;
    }


    // Fix 21.1: ปุ่มรีเซ็ตรอบรายสัปดาห์ถูกย้ายไปหน้า "ส่งรายงานประจำสัปดาห์" แล้ว
    const oldDashboardResetPanel = document.getElementById('weekly-reset-panel');
    if (oldDashboardResetPanel && oldDashboardResetPanel.closest('#pane-dashboard')) {
        oldDashboardResetPanel.remove();
    }

    if(statusSummaryArea) {
        statusSummaryArea.innerHTML = '';
        if (summary.status_summary && Object.keys(summary.status_summary).length > 0) {
            for (const [status, count] of Object.entries(summary.status_summary)) {
                const p = document.createElement('p');
                p.textContent = `${escapeHTML(status)}: ${count} นาย`;
                statusSummaryArea.appendChild(p);
            }
        } else {
            statusSummaryArea.textContent = 'ยังไม่มีรายงาน';
        }
    }

    if(deptStatusArea) {
        deptStatusArea.innerHTML = '';
        if (summary.all_departments && summary.all_departments.length > 0) {
            summary.all_departments.forEach(dept => {
                const submission = summary.submitted_info[dept];
                const isSubmitted = !!submission;
                const card = document.createElement('div');
                card.className = `p-3 rounded-lg border ${isSubmitted ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'}`;
                
                let statusLine = isSubmitted ? `<p class="text-xs text-green-600">ส่งแล้ว (มีสถานะ ${submission.status_count} นาย)</p>` : `<p class="text-xs text-red-600">ยังไม่ส่ง</p>`;
                let detailsLine = isSubmitted ? `<p class="text-xs text-gray-500 mt-1">โดย: ${escapeHTML(submission.submitter_fullname)} (${new Date(submission.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.)</p>` : '';

                card.innerHTML = `<p class="font-semibold text-sm ${isSubmitted ? 'text-green-800' : 'text-red-800'}">${escapeHTML(dept)}</p>${statusLine}${detailsLine}`;
                deptStatusArea.appendChild(card);
            });
        } else {
            deptStatusArea.innerHTML = '<p class="text-gray-500 col-span-full">ไม่พบข้อมูลแผนก</p>';
        }
    }
}

export function renderPersonnel(res) {
    if(!window.personnelListArea) return;
    const { personnel, total, page, summary, available_departments } = res;
    fillDepartmentFilter('personnel-department-filter', available_departments || []);
    fillPrintDepartmentSelect(available_departments || []);
    renderPersonnelSummary('personnel-summary-cards', summary || { total }, 'สรุปกำลังพล');
    window.personnelListArea.innerHTML = '';

    if (!personnel || personnel.length === 0) {
        const emptyRow = `<tr><td colspan="9">${createEmptyState('ไม่พบข้อมูลกำลังพลที่ตรงกับเงื่อนไข')}</td></tr>`;
        window.personnelListArea.innerHTML = emptyRow;
        const pagination = document.getElementById('personnel-pagination');
        if (pagination) pagination.innerHTML = '';
        return;
    }

    const startNumber = (page - 1) * ITEMS_PER_PAGE + 1;
    personnel.forEach((p, index) => {
        const row = document.createElement('tr');
        const typeLabel = p.personnel_type_label || getPersonnelTypeLabel(p.rank);
        const specialty = p.specialty_display || p.specialty || '-';
        row.innerHTML = `<td class="px-4 py-2">${startNumber + index}</td>
                         <td class="px-4 py-2 whitespace-nowrap">${escapeHTML(p.rank)}</td>
                         <td class="px-4 py-2 ps-nowrap-name">${escapeHTML(p.first_name)}</td>
                         <td class="px-4 py-2 ps-nowrap-name">${escapeHTML(p.last_name)}</td>
                         <td class="px-4 py-2">${escapeHTML(p.position)}</td>
                         <td class="px-4 py-2 whitespace-nowrap">${escapeHTML(specialty)}</td>
                         <td class="px-4 py-2 ps-nowrap-cell">${escapeHTML(p.department)}</td>
                         <td class="px-4 py-2 whitespace-nowrap"><span class="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">${escapeHTML(typeLabel)}</span></td>
                         <td class="px-4 py-2 whitespace-nowrap">
                            <button data-id='${escapeHTML(p.id)}' class="edit-person-btn text-blue-600 hover:text-blue-900 mr-2">แก้ไข</button>
                            <button data-id='${escapeHTML(p.id)}' class="delete-person-btn text-red-600 hover:text-red-900">ลบ</button>
                         </td>`;
        window.personnelListArea.appendChild(row);
    });

    renderPagination('personnel-pagination', total, page, (newPage) => {
        window.personnelCurrentPage = newPage;
        window.loadDataForPane('pane-personnel');
    });
}

export function renderMyDepartmentPersonnel(res) {
    const listArea = document.getElementById('my-personnel-list-area');
    if (!listArea) return;
    const { personnel, total, page, summary } = res;
    const deptLabel = document.getElementById('my-personnel-department-label');
    const titleEl = document.getElementById('my-personnel-title');
    if (window.currentUser) {
        const departmentName = window.currentUser.department || '';
        if (titleEl) titleEl.textContent = `ข้อมูลกำลังพลแผนก ${departmentName}`.trim();
        if (deptLabel) deptLabel.textContent = departmentName ? `แผนก: ${departmentName}` : '';
    }
    renderPersonnelSummary('my-personnel-summary-cards', summary || { total });
    listArea.innerHTML = '';

    if (!personnel || personnel.length === 0) {
        listArea.innerHTML = `<tr><td colspan="9">${createEmptyState('ไม่พบรายชื่อกำลังพลในแผนกของคุณ')}</td></tr>`;
        const pagination = document.getElementById('my-personnel-pagination');
        if (pagination) pagination.innerHTML = '';
        return;
    }

    const startNumber = (page - 1) * ITEMS_PER_PAGE + 1;
    personnel.forEach((p, index) => {
        const typeLabel = p.personnel_type_label || getPersonnelTypeLabel(p.rank);
        const specialty = p.specialty_display || p.specialty || '-';
        const row = document.createElement('tr');
        row.innerHTML = `<td class="px-4 py-2">${startNumber + index}</td>
                         <td class="px-4 py-2 whitespace-nowrap">${escapeHTML(p.rank)}</td>
                         <td class="px-4 py-2 ps-nowrap-name">${escapeHTML(p.first_name)}</td>
                         <td class="px-4 py-2 ps-nowrap-name">${escapeHTML(p.last_name)}</td>
                         <td class="px-4 py-2">${escapeHTML(p.position)}</td>
                         <td class="px-4 py-2 whitespace-nowrap">${escapeHTML(specialty)}</td>
                         <td class="px-4 py-2 whitespace-nowrap"><span class="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">${escapeHTML(typeLabel)}</span></td>
                         <td class="px-4 py-2 ps-nowrap-cell">${escapeHTML(p.department)}</td>
                         <td class="px-4 py-2 whitespace-nowrap">
                            <button data-id='${escapeHTML(p.id)}' class="edit-person-btn text-blue-600 hover:text-blue-900 mr-2">แก้ไข</button>
                            <button data-id='${escapeHTML(p.id)}' data-name='${escapeHTML(`${p.rank} ${p.first_name} ${p.last_name}`)}' class="request-transfer-person-btn text-amber-600 hover:text-amber-800">แจ้งย้าย/พ้นจากแผนก</button>
                         </td>`;
        listArea.appendChild(row);
    });

    renderPagination('my-personnel-pagination', total, page, (newPage) => {
        window.myPersonnelCurrentPage = newPage;
        window.loadDataForPane('pane-my-personnel');
    });
}


function formatDateTime(value) {
    if (!value) return '-';
    try { return new Date(value).toLocaleString('th-TH'); } catch (e) { return escapeHTML(value); }
}

function formatDateOnly(value) {
    if (!value) return '-';
    try { return formatThaiDateArabic(String(value).slice(0, 10)); } catch (e) { return escapeHTML(value); }
}

export function renderMyTransferRequests(res) {
    const container = document.getElementById('my-transfer-requests-area');
    if (!container) return;
    const requests = res.requests || [];
    if (!requests.length) {
        container.innerHTML = createEmptyState('ยังไม่มีคำขอย้าย/พ้นจากแผนก');
        return;
    }
    const rows = requests.map((r, index) => {
        const fullName = `${r.rank || ''} ${r.first_name || ''} ${r.last_name || ''}`.trim() || '-';
        const statusClass = r.status === 'pending' ? 'bg-amber-100 text-amber-800' : (r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700');
        return `<tr class="border-t text-sm">
            <td class="px-3 py-2">${index + 1}</td>
            <td class="px-3 py-2 ps-nowrap-name">${escapeHTML(fullName)}</td>
            <td class="px-3 py-2">${escapeHTML(r.request_type_label || r.request_type || '-')}</td>
            <td class="px-3 py-2">${formatDateOnly(r.effective_date)}</td>
            <td class="px-3 py-2 ps-wrap-detail">${escapeHTML(r.reason || '-')}</td>
            <td class="px-3 py-2"><span class="inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusClass}">${escapeHTML(r.status_label || r.status || '-')}</span></td>
            <td class="px-3 py-2">${escapeHTML(r.admin_to_department || r.reject_reason || r.admin_note || '-')}</td>
            <td class="px-3 py-2 ps-nowrap-cell">${formatDateTime(r.requested_at)}</td>
        </tr>`;
    }).join('');
    container.innerHTML = `<table class="min-w-full bg-white text-sm">
        <thead class="bg-amber-50"><tr>
            <th class="px-3 py-2 text-left">#</th><th class="px-3 py-2 text-left ps-nowrap-cell">กำลังพล</th><th class="px-3 py-2 text-left">ประเภทคำขอ</th><th class="px-3 py-2 text-left">วันที่มีผล</th><th class="px-3 py-2 text-left">เหตุผล</th><th class="px-3 py-2 text-left">สถานะ</th><th class="px-3 py-2 text-left">ผลดำเนินการ</th><th class="px-3 py-2 text-left">ส่งคำขอเมื่อ</th>
        </tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderTransferRequests(res) {
    const container = document.getElementById('transfer-requests-area');
    if (!container) return;
    const requests = res.requests || [];
    window.transferRequestDepartments = res.departments || [];
    if (!requests.length) {
        container.innerHTML = createEmptyState('ไม่พบคำขอย้าย/พ้นจากแผนก');
        return;
    }
    const rows = requests.map((r, index) => {
        const fullName = `${r.rank || ''} ${r.first_name || ''} ${r.last_name || ''}`.trim() || '-';
        const pending = r.status === 'pending';
        const statusClass = pending ? 'bg-amber-100 text-amber-800' : (r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700');
        const actions = pending ? `<div class="flex flex-wrap gap-2">
            <button data-request-id="${escapeHTML(r.id)}" data-person-name="${escapeHTML(fullName)}" class="approve-internal-transfer-btn bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1 rounded">อนุมัติย้ายภายในกอง</button>
            <button data-request-id="${escapeHTML(r.id)}" data-person-name="${escapeHTML(fullName)}" class="approve-out-transfer-btn bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1 rounded">ย้ายออกจากกอง</button>
            <button data-request-id="${escapeHTML(r.id)}" data-person-name="${escapeHTML(fullName)}" class="reject-transfer-btn bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded">ไม่อนุมัติ</button>
        </div>` : `<span class="text-xs text-gray-500">ดำเนินการแล้ว</span>`;
        return `<tr class="border-t align-top text-sm">
            <td class="px-3 py-2">${index + 1}</td>
            <td class="px-3 py-2 ps-nowrap-name">${escapeHTML(fullName)}</td>
            <td class="px-3 py-2">${escapeHTML(r.from_department || '-')}</td>
            <td class="px-3 py-2">${escapeHTML(r.request_type_label || '-')}</td>
            <td class="px-3 py-2">${formatDateOnly(r.effective_date)}</td>
            <td class="px-3 py-2 ps-wrap-detail">${escapeHTML(r.reason || '-')}</td>
            <td class="px-3 py-2"><span class="inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusClass}">${escapeHTML(r.status_label || '-')}</span></td>
            <td class="px-3 py-2">${actions}</td>
        </tr>`;
    }).join('');
    container.innerHTML = `<table class="min-w-full bg-white text-sm">
        <thead class="bg-gray-50"><tr>
            <th class="px-3 py-2 text-left">#</th><th class="px-3 py-2 text-left ps-nowrap-cell">กำลังพล</th><th class="px-3 py-2 text-left">แผนกต้นทาง</th><th class="px-3 py-2 text-left">ประเภท</th><th class="px-3 py-2 text-left">วันที่มีผล</th><th class="px-3 py-2 text-left">เหตุผล</th><th class="px-3 py-2 text-left">สถานะ</th><th class="px-3 py-2 text-left">จัดการ</th>
        </tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderPermanentPersonnel(res) {
    const container = document.getElementById('permanent-personnel-area');
    if (!container) return;
    const records = res.records || [];
    if (!records.length) {
        container.innerHTML = createEmptyState('ไม่พบข้อมูลกำลังพลถาวร/พ้นจากหน่วย');
        return;
    }
    const rows = records.map((r, index) => {
        const fullName = `${r.rank || ''} ${r.first_name || ''} ${r.last_name || ''}`.trim() || '-';
        return `<tr class="border-t text-sm">
            <td class="px-3 py-2">${index + 1}</td>
            <td class="px-3 py-2 ps-nowrap-name">${escapeHTML(fullName)}</td>
            <td class="px-3 py-2">${escapeHTML(r.position || '-')}</td>
            <td class="px-3 py-2">${escapeHTML(r.specialty || '-')}</td>
            <td class="px-3 py-2">${escapeHTML(r.department || '-')}</td>
            <td class="px-3 py-2">${formatDateOnly(r.exit_date)}</td>
            <td class="px-3 py-2">${escapeHTML(r.exit_reason || '-')}</td>
            <td class="px-3 py-2 ps-nowrap-cell">${formatDateTime(r.archived_at)}</td>
        </tr>`;
    }).join('');
    container.innerHTML = `<table class="min-w-full bg-white text-sm">
        <thead class="bg-gray-50"><tr>
            <th class="px-3 py-2 text-left">#</th><th class="px-3 py-2 text-left ps-nowrap-cell">ยศ-ชื่อ-สกุล</th><th class="px-3 py-2 text-left">ตำแหน่งเดิม</th><th class="px-3 py-2 text-left">เหล่า</th><th class="px-3 py-2 text-left">แผนกเดิม</th><th class="px-3 py-2 text-left">วันที่พ้น</th><th class="px-3 py-2 text-left">เหตุผล</th><th class="px-3 py-2 text-left">เก็บข้อมูลเมื่อ</th>
        </tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderUsers(res) {
    if(!window.userListArea) return;
    const { users, total, page } = res;
    window.userListArea.innerHTML = '';
    
    if (!users || users.length === 0) {
        const emptyRow = `<tr><td colspan="6">${createEmptyState('ไม่พบข้อมูลผู้ใช้ที่ตรงกับคำค้นหา')}</td></tr>`;
        window.userListArea.innerHTML = emptyRow;
        document.getElementById('user-pagination').innerHTML = '';
        return;
    }
    
    users.forEach(u => {
        const row = document.createElement('tr');
        const roleText = u.role === 'admin' ? 'Admin' : 'User';
        const roleClass = u.role === 'admin' ? 'text-red-600 font-semibold' : 'text-gray-600';
        row.innerHTML = `<td class="px-4 py-2 font-mono">${escapeHTML(u.username)}</td>
                         <td class="px-4 py-2 ps-nowrap-name">${escapeHTML(u.rank)} ${escapeHTML(u.first_name)} ${escapeHTML(u.last_name)}</td>
                         <td class="px-4 py-2">${escapeHTML(u.position)}</td>
                         <td class="px-4 py-2 ps-nowrap-cell">${escapeHTML(u.department)}</td>
                         <td class="px-4 py-2 ${roleClass}">${escapeHTML(roleText)}</td>
                         <td class="px-4 py-2 whitespace-nowrap">
                            <button data-username='${escapeHTML(u.username)}' class="edit-user-btn text-blue-600 hover:text-blue-900 mr-2">แก้ไข</button>
                            <button data-username='${escapeHTML(u.username)}' class="reset-password-user-btn text-amber-600 hover:text-amber-800 mr-2">รีเซ็ตรหัส</button>
                            <button data-username='${escapeHTML(u.username)}' class="delete-user-btn text-red-600 hover:text-red-900">ลบ</button>
                         </td>`;
        window.userListArea.appendChild(row);
    });

    renderPagination('user-pagination', total, page, (newPage) => {
        window.userCurrentPage = newPage;
        window.loadDataForPane('pane-admin');
    });
}


function renderWeeklyReportToolbar(res) {
    const reportPane = document.getElementById('pane-report');
    if (!reportPane) return;

    // เอา panel รีเซ็ตแบบเก่าออก เพื่อให้หน้ารายสัปดาห์จัดปุ่มเหมือนรายวัน
    const oldResetPanel = document.getElementById('weekly-reset-panel');
    if (oldResetPanel) oldResetPanel.remove();

    let reportContainer = document.getElementById('report-container');
    if (!reportContainer) {
        reportContainer = document.createElement('div');
        reportContainer.id = 'report-container';
        reportPane.appendChild(reportContainer);
        window.reportContainer = reportContainer;
    }

    // ลบ header แบบเก่าที่มากับ HTML เดิม ถ้ายังไม่มี toolbar ใหม่
    let toolbar = document.getElementById('weekly-report-toolbar');
    if (!toolbar) {
        const oldRangeEl = document.getElementById('report-week-range');
        const oldHeader = oldRangeEl ? oldRangeEl.closest('div') : null;
        if (oldHeader && oldHeader.parentElement === reportPane) oldHeader.remove();

        toolbar = document.createElement('div');
        toolbar.id = 'weekly-report-toolbar';
        reportPane.insertBefore(toolbar, reportContainer);
    }

    const isAdmin = window.currentUser && window.currentUser.role === 'admin';
    const weekRangeText = res.weekly_date_range || '-';
    const startDateValue = res.current_week_start_date || '';

    toolbar.className = 'flex flex-wrap justify-between items-center gap-3 mb-6';
    toolbar.innerHTML = `
        <h2 class="text-xl font-semibold">
            ส่งรายงานประจำสัปดาห์
            <span id="report-week-range" class="text-lg text-gray-500 font-normal">(${escapeHTML(weekRangeText)})</span>
        </h2>
        <div class="flex flex-wrap gap-2">
            ${isAdmin ? `<button id="auto-submit-all-weekly-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">ส่งยอดทุกแผนกอัตโนมัติ</button>` : ''}
            ${isAdmin ? `<button id="weekly-reset-round-btn" data-default-date="${escapeHTML(startDateValue)}" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">รีเซ็ตรอบรายสัปดาห์</button>` : ''}
            <button id="export-weekly-current-excel-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">ส่งออก Excel</button>
            <button id="export-archive-btn" class="bg-gray-400 cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg" disabled>ส่งออกและเก็บรายงาน</button>
        </div>
    `;
}

function removeWeeklyResetPanelFromWrongPane() {
    const resetPanel = document.getElementById('weekly-reset-panel');
    if (resetPanel) resetPanel.remove();
}

export function renderStatusSubmissionForm(res) {
    const { personnel, submission_status, weekly_date_range, persistent_statuses = [], all_departments = [], admin_submission_statuses = {} } = res;

    const selectorContainer = document.getElementById('admin-dept-selector-container');
    const bulkButtonContainer = document.getElementById('bulk-status-buttons');
    const submissionInfoArea = document.getElementById('submission-info-area');
    const submissionForm = document.getElementById('submission-form-section');

    if (!selectorContainer || !bulkButtonContainer || !window.statusSubmissionListArea || !window.submitStatusTitle || !submissionInfoArea || !submissionForm) return;

    removeWeeklyResetPanelFromWrongPane();

    if (window.currentUser.role !== 'admin' && submission_status && !window.editingReportData) {
        const submittedTime = new Date(submission_status.timestamp).toLocaleString('th-TH');
        const submittedItems = Array.isArray(submission_status.items) ? submission_status.items : [];
        const itemsHtml = submittedItems.length > 0
            ? submittedItems.map((item, index) => `
                <tr class="border-t">
                    <td class="py-2 px-2 text-center">${index + 1}</td>
                    <td class="py-2 px-2 font-semibold ps-nowrap-name">${escapeHTML(item.personnel_name || '')}</td>
                    <td class="py-2 px-2 text-blue-700">${escapeHTML(item.status || '-')}</td>
                    <td class="py-2 px-2 ps-wrap-detail">${escapeHTML(item.details || '-')}</td>
                    <td class="py-2 px-2">${formatThaiDateRangeArabic(item.start_date, item.end_date)}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="5" class="py-3 px-2 text-center text-gray-500">ส่งรายงานแล้ว: กำลังพลมาปฏิบัติงานครบถ้วน / ไม่มีผู้ติดภารกิจ</td></tr>`;

        const editButtonHtml = submission_status.id
            ? `<button type="button" data-id="${escapeHTML(submission_status.id)}" class="edit-weekly-report-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg whitespace-nowrap">แก้ไขรายงานที่ส่งแล้ว</button>`
            : '';
        const syncInfo = submission_status.sync_status || {};
        const syncWarningHtml = (submission_status.id && syncInfo.has_updates)
            ? `<div class="mb-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-orange-900">
                   <div class="font-semibold text-sm">พบข้อมูลภารกิจล่าสุดที่เปลี่ยนแปลง (${Number(syncInfo.diff_count || 0)} รายการ)</div>
                   <div class="text-xs mt-1">รายงานนี้เคยส่งแล้ว ระบบจึงไม่เขียนทับอัตโนมัติ ให้กดปุ่มด้านล่างเพื่ออัปเดตจากข้อมูลล่าสุด</div>
                   <button type="button" data-id="${escapeHTML(submission_status.id)}" class="apply-weekly-latest-sync-btn mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded-lg text-sm">อัปเดตจากข้อมูลล่าสุด</button>
               </div>`
            : '';

        submissionInfoArea.className = 'mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900';
        submissionInfoArea.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
                <div>
                    <div class="font-bold text-lg">คุณส่งรายงานประจำสัปดาห์แล้ว</div>
                    <div class="text-sm mt-1">ส่งเมื่อ: ${escapeHTML(submittedTime)} น.</div>
                    <div class="text-xs text-green-700 mt-1">หากต้องการเปลี่ยนข้อมูล ให้กดปุ่มแก้ไขรายงานที่ส่งแล้ว ก่อน Admin กดเก็บรายงาน</div>
                </div>
                ${editButtonHtml}
            </div>
            ${syncWarningHtml}
            <div class="overflow-x-auto bg-white rounded border border-green-100">
                <table class="min-w-full text-sm">
                    <thead class="bg-green-100 text-green-900">
                        <tr>
                            <th class="py-2 px-2 text-center w-[6%]">ลำดับ</th>
                            <th class="py-2 px-2 text-left ps-nowrap-cell">ยศ-ชื่อ-สกุล</th>
                            <th class="py-2 px-2 text-left w-[15%]">สถานะ</th>
                            <th class="py-2 px-2 text-left w-[30%]">รายละเอียด</th>
                            <th class="py-2 px-2 text-left w-[20%]">ช่วงวันที่</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
            </div>
        `;
        submissionForm.classList.add('hidden');
        bulkButtonContainer.classList.add('hidden');
        selectorContainer.classList.add('hidden');
        window.submitStatusTitle.textContent = `สถานะการส่งยอดประจำสัปดาห์`;
        return;
    }
    
    submissionInfoArea.className = 'hidden text-center p-4 mb-4 bg-green-100 text-green-800 rounded-lg';
    submissionForm.classList.remove('hidden');
    bulkButtonContainer.classList.remove('hidden');
    selectorContainer.classList.remove('hidden');

    const updateRowHighlight = (selectElement) => {
        const row = selectElement.closest('tr');
        row.classList.toggle('row-selected', selectElement.value !== 'ไม่มี');
    };

    const setAllStatus = (status) => {
        window.statusSubmissionListArea.querySelectorAll('tr').forEach(row => {
            const statusSelect = row.querySelector('.status-select');
            if (statusSelect) {
                statusSelect.value = status;
                statusSelect.dispatchEvent(new Event('change'));

                if (status === 'ไม่มี') {
                    const detailsInput = row.querySelector('.details-input');
                    if (detailsInput) detailsInput.value = '';

                    const startDateInput = row.querySelector('.start-date-input');
                    if (startDateInput && startDateInput._flatpickr) {
                        startDateInput._flatpickr.clear();
                    }

                    const endDateInput = row.querySelector('.end-date-input');
                    if (endDateInput && endDateInput._flatpickr) {
                        endDateInput._flatpickr.clear();
                    }
                }
            }
        });
    };

    bulkButtonContainer.innerHTML = '';
    const bulkActions = [{ label: 'ล้างค่า ทั้งหมด', value: 'ไม่มี', class: 'bg-gray-400 hover:bg-gray-500' }];
    bulkActions.forEach(action => {
        const button = document.createElement('button');
        button.textContent = action.label;
        button.className = `text-white font-bold py-1 px-3 text-sm rounded-lg ${action.class}`;
        button.addEventListener('click', () => setAllStatus(action.value));
        bulkButtonContainer.appendChild(button);
    });

    const displayPersonnelForDept = (dept) => {
        const itemsToPreFill = window.editingReportData ? window.editingReportData.items : persistent_statuses.filter(s => s.department === dept);

        window.submitStatusTitle.innerHTML = `ส่งยอดกำลังพล แผนก ${escapeHTML(dept)}`;
        if (weekly_date_range) {
            const weekRangeEl = document.createElement('span');
            weekRangeEl.className = 'text-lg text-gray-500 font-normal ml-2';
            weekRangeEl.textContent = `(${weekly_date_range})`;
            window.submitStatusTitle.appendChild(weekRangeEl);
        }

        window.statusSubmissionListArea.innerHTML = '';
        const personnelInDept = personnel.filter(p => p.department === dept);

        if (personnelInDept.length === 0) {
            window.statusSubmissionListArea.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">ไม่พบข้อมูลกำลังพลในแผนกนี้</td></tr>';
            return;
        }

        personnelInDept.forEach((p, index) => {
            const personnelName = `${escapeHTML(p.rank)} ${escapeHTML(p.first_name)} ${escapeHTML(p.last_name)}`;
            
            const statusesToRender = itemsToPreFill.filter(item => item.personnel_id === p.id);

            if (statusesToRender.length === 0) {
                statusesToRender.push({ status: 'ไม่มี', details: '', start_date: '', end_date: '' });
            }

            statusesToRender.forEach((statusData, statusIndex) => {
                const row = document.createElement('tr');
                row.dataset.personnelId = escapeHTML(p.id);
                row.dataset.personnelName = personnelName;

                if (statusIndex === 0) {
                    row.innerHTML = `
                        <td class="px-4 py-2">${index + 1}</td>
                        <td class="px-4 py-2 font-semibold ps-nowrap-name">${personnelName}</td>
                        <td class="px-4 py-2">
                            <select class="status-select w-full border rounded px-2 py-1 bg-white"></select>
                        </td>
                        <td class="px-4 py-2"><input type="text" class="details-input w-full border rounded px-2 py-1" placeholder="รายละเอียด/สถานที่..."></td>
                        <td class="px-4 py-2"><input type="text" class="start-date-input w-full border rounded px-2 py-1" placeholder="เลือกวันที่..."></td>
                        <td class="px-4 py-2"><input type="text" class="end-date-input w-full border rounded px-2 py-1" placeholder="เลือกวันที่..."></td>
                        <td class="px-4 py-2">
                            <button type="button" class="add-status-btn bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded-full text-xs">+</button>
                        </td>
                    `;
                } else {
                    row.innerHTML = `
                        <td class="px-4 py-2"></td>
                        <td class="px-4 py-2 text-right text-gray-500 pr-4">↳</td>
                        <td class="px-4 py-2">
                            <select class="status-select w-full border rounded px-2 py-1 bg-white"></select>
                        </td>
                        <td class="px-4 py-2"><input type="text" class="details-input w-full border rounded px-2 py-1" placeholder="รายละเอียด/สถานที่..."></td>
                        <td class="px-4 py-2"><input type="text" class="start-date-input w-full border rounded px-2 py-1" placeholder="เลือกวันที่..."></td>
                        <td class="px-4 py-2"><input type="text" class="end-date-input w-full border rounded px-2 py-1" placeholder="เลือกวันที่..."></td>
                        <td class="px-4 py-2">
                            <button type="button" class="remove-status-btn bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-full text-xs">-</button>
                        </td>
                    `;
                }
                
                window.statusSubmissionListArea.appendChild(row);

                const statusSelect = row.querySelector('.status-select');
                statusSelect.innerHTML = `
                    ${buildTaf025StatusOptionsHtml({ includeNone: true, isAdmin: window.currentUser && window.currentUser.role === 'admin' })}
                `;
                statusSelect.value = (statusData.status && statusData.status !== 'ไม่มี') ? normalizeTaf025Status(statusData.status) : 'ไม่มี';
                row.querySelector('.details-input').value = statusData.details || '';
                
                statusSelect.addEventListener('change', () => updateRowHighlight(statusSelect));
                updateRowHighlight(statusSelect);

                const flatpickrConfig = {
                    locale: thai_locale, 
                    altInput: true,
                    altFormat: "j F Y",
                    dateFormat: "Y-m-d",
                    allowInput: true
                };

                const startDatePicker = flatpickr(row.querySelector('.start-date-input'), flatpickrConfig);
                const endDatePicker = flatpickr(row.querySelector('.end-date-input'), flatpickrConfig);
                
                if (statusData.start_date) startDatePicker.setDate(statusData.start_date);
                if (statusData.end_date) endDatePicker.setDate(statusData.end_date);
            });
        });
    };

    if (window.currentUser.role === 'admin') {
        selectorContainer.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'space-y-3';

        const label = document.createElement('label');
        label.htmlFor = 'admin-dept-selector';
        label.className = 'block text-sm font-medium text-gray-700 mb-1';
        label.textContent = 'เลือกแผนกเพื่อส่งยอด';

        const selector = document.createElement('select');
        selector.id = 'admin-dept-selector';
        selector.className = 'w-full md:w-1/3 border rounded px-2 py-2 bg-white shadow-sm';

        const adminWeeklyStatusArea = document.createElement('div');
        adminWeeklyStatusArea.id = 'admin-weekly-submission-status-area';

        let currentDept = window.editingReportData ? window.editingReportData.department : (all_departments.length > 0 ? all_departments[0] : '');

        all_departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            if (admin_submission_statuses[dept]) {
                option.textContent = `${dept} — ส่งแล้ว`;
            }
            if (dept === currentDept) {
                option.selected = true;
            }
            selector.appendChild(option);
        });

        wrapper.appendChild(label);
        wrapper.appendChild(selector);
        wrapper.appendChild(adminWeeklyStatusArea);
        selectorContainer.appendChild(wrapper);

        const renderAdminDepartmentState = (dept) => {
            const submission = admin_submission_statuses[dept];
            const isEditingSelectedDepartment = Boolean(window.editingReportData && window.editingReportData.department === dept);

            window.submitStatusTitle.innerHTML = `ส่งยอดกำลังพล แผนก ${escapeHTML(dept)}`;
            if (weekly_date_range) {
                const weekRangeEl = document.createElement('span');
                weekRangeEl.className = 'text-lg text-gray-500 font-normal ml-2';
                weekRangeEl.textContent = `(${weekly_date_range})`;
                window.submitStatusTitle.appendChild(weekRangeEl);
            }

            if (submission && !isEditingSelectedDepartment) {
                const submittedTime = submission.timestamp ? new Date(submission.timestamp).toLocaleString('th-TH') : '-';
                const submittedBy = submission.submitted_name || submission.submitted_by || '-';
                const syncInfo = submission.sync_status || {};
                const syncWarningHtml = (submission.id && syncInfo.has_updates)
                    ? `<div class="mt-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-orange-900">
                           <div class="font-semibold text-sm">พบข้อมูลภารกิจล่าสุดที่เปลี่ยนแปลง (${Number(syncInfo.diff_count || 0)} รายการ)</div>
                           <div class="text-xs mt-1">รายงานนี้เคยส่งแล้ว ระบบจึงไม่เขียนทับอัตโนมัติ ให้กดปุ่มด้านล่างเพื่ออัปเดตจากข้อมูลล่าสุด</div>
                           <button type="button" data-id="${escapeHTML(submission.id)}" class="apply-weekly-latest-sync-btn mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded-lg text-sm">อัปเดตจากข้อมูลล่าสุด</button>
                       </div>`
                    : '';

                adminWeeklyStatusArea.innerHTML = `
                    <div class="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <div class="font-bold text-lg">แผนกนี้ส่งรายงานแล้ว</div>
                                <div class="text-sm mt-1">ผู้ส่ง: ${escapeHTML(submittedBy)} | เวลา: ${escapeHTML(submittedTime)}</div>
                                <div class="text-xs text-green-700 mt-1">หากต้องการเปลี่ยนข้อมูล ให้กดปุ่มแก้ไขรายงานที่ส่งแล้ว</div>
                                ${syncWarningHtml}
                            </div>
                            <button type="button" data-id="${escapeHTML(submission.id)}" class="edit-weekly-report-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg">
                                แก้ไขรายงานที่ส่งแล้ว
                            </button>
                        </div>
                    </div>
                `;
                submissionForm.classList.add('hidden');
                bulkButtonContainer.classList.add('hidden');
                window.statusSubmissionListArea.innerHTML = '';
                return;
            }

            if (submission && isEditingSelectedDepartment) {
                adminWeeklyStatusArea.innerHTML = `
                    <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-900">
                        <span class="font-semibold">กำลังแก้ไขรายงานที่ส่งแล้วของแผนกนี้</span>
                        <span class="text-sm">แก้ไขข้อมูลให้ถูกต้อง แล้วกดตรวจสอบก่อนส่งเพื่อบันทึกทับรายงานเดิม</span>
                    </div>
                `;
            } else {
                adminWeeklyStatusArea.innerHTML = `
                    <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-700">
                        <span class="font-semibold">แผนกนี้ยังไม่ส่งรายงาน</span>
                        <span class="text-sm">Admin สามารถส่งยอดแทนแผนกนี้ได้จากแบบฟอร์มด้านล่าง</span>
                    </div>
                `;
            }

            submissionForm.classList.remove('hidden');
            bulkButtonContainer.classList.remove('hidden');
            displayPersonnelForDept(dept);
        };

        renderAdminDepartmentState(currentDept);
        if (window.editingReportData) delete window.editingReportData;

        selector.addEventListener('change', (e) => {
            renderAdminDepartmentState(e.target.value);
        });
    } else {
        selectorContainer.innerHTML = '';
        const dept = window.editingReportData ? window.editingReportData.department : window.currentUser.department;
        displayPersonnelForDept(dept);
        if (window.editingReportData) delete window.editingReportData;
    }
}

export function addStatusRow(clickedButton) {
    const mainRow = clickedButton.closest('tr');
    const newRow = document.createElement('tr');
    newRow.dataset.personnelId = mainRow.dataset.personnelId;
    newRow.dataset.personnelName = mainRow.dataset.personnelName;

    newRow.innerHTML = `
        <td class="px-4 py-2"></td>
        <td class="px-4 py-2 text-right text-gray-500 pr-4">↳</td>
        <td class="px-4 py-2">
            <select class="status-select w-full border rounded px-2 py-1 bg-white">
                ${buildTaf025StatusOptionsHtml({ includeNone: true, isAdmin: window.currentUser && window.currentUser.role === 'admin' })}
            </select>
        </td>
        <td class="px-4 py-2"><input type="text" class="details-input w-full border rounded px-2 py-1" placeholder="รายละเอียด/สถานที่..."></td>
        <td class="px-4 py-2"><input type="text" class="start-date-input w-full border rounded px-2 py-1" placeholder="เลือกวันที่..."></td>
        <td class="px-4 py-2"><input type="text" class="end-date-input w-full border rounded px-2 py-1" placeholder="เลือกวันที่..."></td>
        <td class="px-4 py-2">
            <button type="button" class="remove-status-btn bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-full text-xs">-</button>
        </td>
    `;

    mainRow.parentNode.insertBefore(newRow, mainRow.nextSibling);

    const flatpickrConfig = {
        locale: thai_locale, 
        altInput: true,
        altFormat: "j F Y",
        dateFormat: "Y-m-d",
        allowInput: true
    };
    flatpickr(newRow.querySelector('.start-date-input'), flatpickrConfig);
    flatpickr(newRow.querySelector('.end-date-input'), flatpickrConfig);
}


export function renderWeeklyReport(res) {
    const reports = res.reports; 
    const weekly_date_range = res.weekly_date_range;
    const all_departments = res.all_departments || [];
    const submitted_departments = res.submitted_departments || [];

    const weekRangeEl = document.getElementById('report-week-range');
    if (weekRangeEl && weekly_date_range) {
        weekRangeEl.textContent = `(${weekly_date_range})`;
    } else if (weekRangeEl) {
        weekRangeEl.textContent = '';
    }

    renderWeeklyReportToolbar(res);

    const exportArchiveBtn = document.getElementById('export-archive-btn');
    if (exportArchiveBtn) {
        const allSubmitted = all_departments.length > 0 && all_departments.every(dept => submitted_departments.includes(dept));
        if (allSubmitted) {
            exportArchiveBtn.disabled = false;
            exportArchiveBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            exportArchiveBtn.classList.add('bg-blue-500', 'hover:bg-blue-700');
            exportArchiveBtn.title = 'ส่งออกรายงานทั้งหมดเป็นไฟล์ Excel และเก็บเข้าสู่ระบบถาวร';
        } else {
            exportArchiveBtn.disabled = true;
            exportArchiveBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
            exportArchiveBtn.classList.remove('bg-blue-500', 'hover:bg-blue-700');
            exportArchiveBtn.title = 'ต้องรอให้ทุกแผนกส่งรายงานก่อนจึงจะสามารถส่งออกได้';
        }
    }

    if(!window.reportContainer) return;
    window.reportContainer.innerHTML = '';
    window.currentWeeklyReports = reports;
    if (!reports || reports.length === 0) {
        window.reportContainer.innerHTML = createEmptyState('ยังไม่มีแผนกใดส่งรายงานประจำสัปดาห์');
        return;
    }
    const reportsByDept = reports.reduce((acc, report) => {
        const dept = report.department || 'ไม่ระบุแผนก';
        if (!acc[dept]) {
            acc[dept] = { 
                submitterName: `${escapeHTML(report.rank)} ${escapeHTML(report.first_name)} ${escapeHTML(report.last_name)}`, 
                timestamp: report.timestamp, 
                items: [],
                id: report.id
            };
        }
        acc[dept].items.push(...report.items);
        return acc;
    }, {});
    
    window.reportContainer.className = 'space-y-6';

    for (const department in reportsByDept) {
        const deptReport = reportsByDept[department];
        const reportWrapper = document.createElement('div');
        reportWrapper.className = 'p-4 border rounded-lg bg-gray-50';
        const itemsHtml = deptReport.items.map((item, index) => `<tr class="border-t"><td class="py-2 pr-2 text-center">${index + 1}</td><td class="py-2 px-2">${escapeHTML(item.personnel_name)}</td><td class="py-2 px-2 text-blue-600">${escapeHTML(item.status)}</td><td class="py-2 px-2 text-gray-600">${escapeHTML(item.details) || '-'}</td><td class="py-2 pl-2 text-gray-600">${formatThaiDateRangeArabic(item.start_date, item.end_date)}</td></tr>`).join('');
        const submittedTime = new Date(deptReport.timestamp).toLocaleString('th-TH');
        
        const editButtonHtml = `<button data-id="${deptReport.id}" class="edit-weekly-report-btn bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-1 px-3 rounded-lg">แก้ไข</button>`;

        reportWrapper.innerHTML = `
            <div class="flex flex-wrap justify-between items-center mb-3 gap-2">
                <div>
                    <h3 class="text-lg font-semibold text-gray-700">แผนก: ${escapeHTML(department)}</h3>
                    <p class="text-sm text-gray-500">ส่งโดย: ${deptReport.submitterName}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-500">ส่งล่าสุดเมื่อ: ${submittedTime} น.</span>
                    ${editButtonHtml}
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white text-sm">
                    <thead>
                        <tr>
                            <th class="text-center font-medium text-gray-500 uppercase pb-1 w-[5%]">ลำดับ</th>
                            <th class="text-left font-medium text-gray-500 uppercase pb-1 w-[30%]">ชื่อ-สกุล</th>
                            <th class="text-left font-medium text-gray-500 uppercase pb-1 w-[15%]">สถานะ</th>
                            <th class="text-left font-medium text-gray-500 uppercase pb-1 w-[30%]">รายละเอียด</th>
                            <th class="text-left font-medium text-gray-500 uppercase pb-1 w-[20%]">ช่วงวันที่</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
            </div>`;
        window.reportContainer.appendChild(reportWrapper);
    }
}

export function renderSubmissionHistory(res) {
    const history = res.history;
    window.allHistoryData = history || {};
    populateHistorySelectors(window.allHistoryData);
    if(window.historyContainer) window.historyContainer.innerHTML = createEmptyState('กรุณาเลือกปีและเดือนเพื่อแสดงประวัติ');
}

export function populateHistorySelectors(history) {
    const yearSelect = document.getElementById('history-year-select');
    const monthSelect = document.getElementById('history-month-select');
    if(!yearSelect || !monthSelect) return;
    
    yearSelect.innerHTML = '<option value="">เลือกปี</option>';
    monthSelect.innerHTML = '<option value="">เลือกเดือน</option>';

    if (history && Object.keys(history).length > 0) {
        const sortedYears = Object.keys(history).sort((a, b) => b - a);
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }
}

export function renderFilteredHistoryReports(reports) {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;
    historyContainer.innerHTML = '';

    if (!reports || reports.length === 0) {
        historyContainer.innerHTML = createEmptyState('ไม่พบประวัติการส่งรายงานสำหรับเดือนที่เลือก');
        return;
    }

    reports.forEach(report => {
        const reportWrapper = document.createElement('div');
        reportWrapper.className = 'p-4 border rounded-lg bg-gray-50 mb-4';
        const itemsHtml = report.items.map((item, index) => `<tr class="border-t"><td class="py-2 pr-2 text-center">${index + 1}</td><td class="py-2 px-2">${escapeHTML(item.personnel_name)}</td><td class="py-2 px-2 text-blue-600">${escapeHTML(item.status)}</td><td class="py-2 px-2 text-gray-600">${escapeHTML(item.details) || '-'}</td><td class="py-2 pl-2 text-gray-600">${formatThaiDateRangeArabic(item.start_date, item.end_date)}</td></tr>`).join('');
        
        const editButtonHtml = report.source === 'active' 
            ? `<button data-id="${report.id}" class="edit-history-btn bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded-lg">แก้ไข</button>` 
            : `<span class="text-sm text-gray-400">(เก็บถาวรแล้ว)</span>`;

        reportWrapper.innerHTML = `
            <div class="flex flex-wrap justify-between items-center mb-3 gap-2">
                <div>
                    <h4 class="text-lg font-semibold text-gray-800">รายงานวันที่ ${formatThaiDateArabic(report.date)}</h4>
                    <span class="text-sm text-gray-500">ส่งเมื่อ: ${new Date(report.timestamp).toLocaleString('th-TH')}</span>
                </div>
                ${editButtonHtml}
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white text-sm">
                    <thead>
                        <tr>
                            <th class="text-center font-medium text-gray-500 uppercase pb-1 w-[5%]">ลำดับ</th>
                            <th class="text-left font-medium text-gray-500 uppercase pb-1 w-[30%]">ชื่อ-สกุล</th>
                            <th class="text-left font-medium text-gray-500 uppercase pb-1 w-[15%]">สถานะ</th>
                            <th class="text-left font-medium text-gray-500 uppercase pb-1 w-[30%]">รายละเอียด</th>
                            <th class="text-left font-medium text-gray-500 uppercase pb-1 w-[20%]">ช่วงวันที่</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
            </div>`;
        historyContainer.appendChild(reportWrapper);
    });
}


export function populateArchiveSelectors(archives) {
    if(!window.archiveYearSelect || !window.archiveMonthSelect) return;
    window.archiveYearSelect.innerHTML = '<option value="">เลือกปี</option>';
    window.archiveMonthSelect.innerHTML = '<option value="">เลือกเดือน</option>';
    if (archives && Object.keys(archives).length > 0) {
        const sortedYears = Object.keys(archives).sort((a, b) => b - a);
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            window.archiveYearSelect.appendChild(option);
        });
    }
}

export function renderArchivedReports(reports) {
    if(!window.archiveContainer) return;
    window.archiveContainer.innerHTML = '';

    if (!reports || reports.length === 0) {
        window.archiveContainer.innerHTML = createEmptyState('ไม่พบรายงานที่เก็บถาวรสำหรับเดือนที่เลือก');
        return;
    }

    reports.forEach(batch => {
        const archiveWrapper = document.createElement('div');
        archiveWrapper.className = 'mb-6 p-4 border rounded-lg bg-gray-50';

        const submittedTime = new Date(batch.timestamp).toLocaleString('th-TH', { dateStyle: 'full', timeStyle: 'short' });
        const archivedBy = batch.archived_by || 'ไม่ระบุ';

        let reportsHtml = batch.reports.map(report => {
            const itemsHtml = report.items.map((item, index) => 
                `<tr class="border-t">
                    <td class="py-2 pr-2 text-center">${index + 1}</td>
                    <td class="py-2 px-2">${escapeHTML(item.personnel_name)}</td>
                    <td class="py-2 px-2">${escapeHTML(item.status)}: ${escapeHTML(item.details) || '-'}</td>
                    <td class="py-2 pl-2">${formatThaiDateRangeArabic(item.start_date, item.end_date)}</td>
                </tr>`
            ).join('');

            return `<div class="mt-4">
                <div class="flex justify-between items-center text-sm text-gray-600 mb-2 p-2 bg-gray-100 rounded-t-md">
                    <strong>แผนก: ${escapeHTML(report.department)}</strong>
                    <span>(ส่งโดย: ${escapeHTML(report.rank)} ${escapeHTML(report.first_name)})</span>
                </div>
                <table class="min-w-full bg-white text-sm">
                    <thead><tr>
                        <th class="w-[5%]"></th>
                        <th class="w-[35%]"></th>
                        <th class="w-[40%]"></th>
                        <th class="w-[20%]"></th>
                    </tr></thead>
                    <tbody>${itemsHtml || '<tr><td colspan="4" class="text-center py-3 text-gray-500">ไม่มีกำลังพลที่ติดภารกิจในรอบนี้</td></tr>'}</tbody>
                </table>
            </div>`;
        }).join('');
        
        // --- ↓ จุดที่แก้ไขทั้งหมดอยู่ตรงนี้ ---
        archiveWrapper.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800">รายงานประจำสัปดาห์ (${escapeHTML(batch.week_range)})</h3>
                    <p class="text-sm text-gray-500">เก็บเข้าระบบเมื่อ: ${submittedTime} น. (โดย: ${escapeHTML(archivedBy)})</p>
                </div>
                <button class="download-archive-batch-btn bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">ดาวน์โหลดรายงานรอบนี้</button>
            </div>
            <div class="mt-4 space-y-4">${reportsHtml}</div>
        `;

        archiveWrapper.querySelector('.download-archive-batch-btn').addEventListener('click', () => {
            exportSingleReportToExcel(batch.reports, `รายงานย้อนหลัง-${batch.week_range}.xlsx`, batch.week_range);
        });
        // --- สิ้นสุดจุดที่แก้ไข ---

        window.archiveContainer.appendChild(archiveWrapper);
    });
}

export function openPersonnelModal(person = null, context = 'admin') {
    window.personnelForm.reset();
    window.personnelForm.dataset.context = context || 'admin';
    const title = window.personnelForm.querySelector('#personnel-modal-title');
    const departmentSelect = window.personnelForm.querySelector('#person-department');
    const departmentWrapper = document.getElementById('person-department-wrapper');
    const isMyDepartmentContext = context === 'my' || (window.currentUser && window.currentUser.role !== 'admin');
    const myDepartment = (window.currentUser && window.currentUser.department) ? window.currentUser.department : '';

    const ensureDepartmentOption = (departmentName) => {
        if (!departmentSelect || !departmentName) return;
        const exists = Array.from(departmentSelect.options).some(opt => opt.value === departmentName);
        if (!exists) {
            const option = document.createElement('option');
            option.value = departmentName;
            option.textContent = departmentName;
            departmentSelect.appendChild(option);
        }
    };
    ensureDepartmentOption(isMyDepartmentContext ? myDepartment : (person ? person.department : ''));

    if (person) {
        title.textContent = isMyDepartmentContext ? `แก้ไขข้อมูลกำลังพลแผนก ${myDepartment}`.trim() : 'แก้ไขข้อมูลกำลังพล';
        window.personnelForm.querySelector('#person-id').value = person.id;
        window.personnelForm.querySelector('#person-rank').value = person.rank;
        window.personnelForm.querySelector('#person-first-name').value = person.first_name;
        window.personnelForm.querySelector('#person-last-name').value = person.last_name;
        window.personnelForm.querySelector('#person-position').value = person.position;
        window.personnelForm.querySelector('#person-specialty').value = canonicalSpecialtyValue(person.specialty || '');
        departmentSelect.value = isMyDepartmentContext ? myDepartment : person.department;
    } else {
        title.textContent = isMyDepartmentContext ? `เพิ่มกำลังพลแผนก ${myDepartment}`.trim() : 'เพิ่มข้อมูลกำลังพล';
        window.personnelForm.querySelector('#person-id').value = '';
        if (isMyDepartmentContext) departmentSelect.value = myDepartment;
    }

    if (departmentSelect) {
        departmentSelect.disabled = isMyDepartmentContext;
        departmentSelect.classList.toggle('bg-gray-100', isMyDepartmentContext);
        departmentSelect.classList.toggle('cursor-not-allowed', isMyDepartmentContext);
    }
    if (departmentWrapper) {
        const noteId = 'person-department-lock-note';
        let note = document.getElementById(noteId);
        if (isMyDepartmentContext) {
            if (!note) {
                note = document.createElement('p');
                note.id = noteId;
                note.className = 'text-xs text-amber-700 mt-1';
                departmentWrapper.appendChild(note);
            }
            note.textContent = 'ระบบล็อกแผนกตามบัญชีผู้ใช้งาน ไม่สามารถเลือกแผนกอื่นได้';
        } else if (note) {
            note.remove();
        }
    }

    updatePersonnelSpecialtyVisibility();
    window.personnelModal.classList.add('active');
}

export function openUserModal(user = null) {
    window.userForm.reset();
    const usernameInput = window.userForm.querySelector('#user-username');
    if (user) {
        window.userModalTitle.textContent = 'แก้ไขข้อมูลผู้ใช้';
        usernameInput.value = user.username;
        usernameInput.readOnly = true;
        usernameInput.classList.add('bg-gray-200');
        window.userForm.querySelector('#user-rank').value = user.rank;
        window.userForm.querySelector('#user-first-name').value = user.first_name;
        window.userForm.querySelector('#user-last-name').value = user.last_name;
        window.userForm.querySelector('#user-position').value = user.position;
        window.userForm.querySelector('#user-department').value = user.department;
        window.userForm.querySelector('#user-role').value = user.role;
    } else {
        window.userModalTitle.textContent = 'เพิ่มผู้ใช้ใหม่';
        usernameInput.readOnly = false;
        usernameInput.classList.remove('bg-gray-200');
    }
    window.userModal.classList.add('active');
}

// A global variable to hold the full dataset for filtering
let fullStatusDataCache = null;

// Function to update the view based on the selected filter
function updateActiveStatusesView(filter) {
    if (!fullStatusDataCache) return;

    // Update button styles
    document.querySelectorAll('.status-filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
            btn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            btn.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
        }
    });

    const { active_statuses, available_personnel, total_personnel } = fullStatusDataCache;
    const unavailableContainer = document.getElementById('active-statuses-container');
    const availableContainer = document.getElementById('available-personnel-container');
    const chartContainer = document.getElementById('status-chart-container');
    const unavailableTitle = document.getElementById('unavailable-title');
    const availableTitle = document.getElementById('available-title');

    // Filter data
    let filteredUnavailable = active_statuses;
    let filteredAvailable = available_personnel;
    let showUnavailable = true;
    let showAvailable = true;

    if (filter === 'ว่าง') {
        filteredUnavailable = [];
        showUnavailable = false;
    } else if (filter !== 'ทั้งหมด') {
        filteredUnavailable = active_statuses.filter(s => s.status === filter);
        filteredAvailable = [];
        showAvailable = false;
    }

    // --- Chart Logic (Update based on filter) ---
    chartContainer.innerHTML = '<canvas id="status-chart-canvas"></canvas>';
    const unavailable_count = filteredUnavailable.length;
    const available_count = showAvailable ? filteredAvailable.length : 0;
    
    const status_counts = filteredUnavailable.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
    }, {});

    let chartLabels = [];
    let chartData = [];
    
    if (showAvailable && available_count > 0) {
        chartLabels.push('ว่าง');
        chartData.push(available_count);
    }
    chartLabels.push(...Object.keys(status_counts));
    chartData.push(...Object.values(status_counts));
    
    // Dynamically create the color array based on the labels
    const dynamicChartColors = chartLabels.map(label => CHART_STATUS_COLORS[label] || '#CCCCCC'); // Use gray for any unknown status

    const ctx = document.getElementById('status-chart-canvas').getContext('2d');
    if (window.myStatusChart) {
        window.myStatusChart.destroy();
    }
    
    const centerTextPlugin = {
        id: 'centerText',
        afterDraw: (chart) => {
            const { ctx } = chart;
            const chartArea = chart.chartArea;
            const x = (chartArea.left + chartArea.right) / 2;
            const y = (chartArea.top + chartArea.bottom) / 2;
            
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.font = "bold 1.2rem 'Kanit', sans-serif";
            ctx.fillStyle = '#4B5563';
            ctx.fillText('กำลังพลทั้งหมด', x, y - 30);
            
            ctx.font = "bold 2.5rem 'Kanit', sans-serif";
            ctx.fillStyle = '#1F2937';
            ctx.fillText(total_personnel, x, y + 5);

            ctx.font = "1rem 'Kanit', sans-serif";
            ctx.fillStyle = '#6B7280';
            ctx.fillText(`ว่าง ${available_personnel.length} | ติดภารกิจ ${active_statuses.length}`, x, y + 40);

            ctx.restore();
        }
    };

    Chart.register(ChartDataLabels, centerTextPlugin);

    window.myStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'จำนวนกำลังพล',
                data: chartData,
                backgroundColor: dynamicChartColors,
                borderColor: '#FFFFFF',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: { family: "'Kanit', sans-serif", size: 14 }, boxWidth: 20 }
                },
                title: { display: false },
                datalabels: {
                    formatter: (value) => value > 0 ? value : '',
                    color: '#fff',
                    font: { family: "'Kanit', sans-serif", weight: 'bold', size: 14 },
                    textStrokeColor: 'black',
                    textStrokeWidth: 2
                }
            }
        }
    });

    // --- Table Logic (Update based on filter) ---
    unavailableTitle.style.display = showUnavailable ? 'block' : 'none';
    unavailableContainer.style.display = showUnavailable ? 'block' : 'none';
    availableTitle.style.display = showAvailable ? 'block' : 'none';
    availableContainer.style.display = showAvailable ? 'block' : 'none';

    if (showUnavailable) {
        if (!filteredUnavailable || filteredUnavailable.length === 0) {
            unavailableContainer.innerHTML = createEmptyState('ไม่พบกำลังพลที่ติดภารกิจตามเงื่อนไขที่เลือก');
        } else {
            const is_admin = (window.currentUser.role === 'admin');
            let tableHTML = `<table class="min-w-full bg-white"><thead class="bg-gray-50"><tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ลำดับ</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ยศ-ชื่อ-สกุล</th>
                ${is_admin ? '<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">แผนก</th>' : ''}
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">รายละเอียด/สถานที่</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ช่วงวันที่</th>
            </tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
            filteredUnavailable.forEach((s, index) => {
                const fullName = `${escapeHTML(s.rank)} ${escapeHTML(s.first_name)} ${escapeHTML(s.last_name)}`;
                const bgColorClass = STATUS_COLORS[s.status] || '';
                tableHTML += `<tr class="${bgColorClass}">
                    <td class="px-4 py-2 ps-nowrap-cell">${index + 1}</td>
                    <td class="px-4 py-2 ps-nowrap-name">${fullName}</td>
                    ${is_admin ? `<td class="px-4 py-2">${escapeHTML(s.department)}</td>` : ''}
                    <td class="px-4 py-2">${escapeHTML(s.status)}</td>
                    <td class="px-4 py-2 ps-wrap-detail">${escapeHTML(s.details)}</td>
                    <td class="px-4 py-2">${formatThaiDateRangeArabic(s.start_date, s.end_date)}</td>
                </tr>`;
            });
            tableHTML += `</tbody></table>`;
            unavailableContainer.innerHTML = tableHTML;
        }
    }

    if (showAvailable) {
        if (!filteredAvailable || filteredAvailable.length === 0) {
            availableContainer.innerHTML = createEmptyState('ไม่พบกำลังพลที่ว่าง');
        } else {
            const is_admin = (window.currentUser.role === 'admin');
            let tableHTML = `<table class="min-w-full bg-white"><thead class="bg-gray-50"><tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ลำดับ</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ยศ-ชื่อ-สกุล</th>
                ${is_admin ? '<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">แผนก</th>' : ''}
            </tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
            filteredAvailable.forEach((p, index) => {
                const fullName = `${escapeHTML(p.rank)} ${escapeHTML(p.first_name)} ${escapeHTML(p.last_name)}`;
                tableHTML += `<tr class="bg-green-50/50">
                    <td class="px-4 py-2 ps-nowrap-cell">${index + 1}</td>
                    <td class="px-4 py-2 ps-nowrap-name">${fullName}</td>
                    ${is_admin ? `<td class="px-4 py-2 ps-nowrap-cell">${escapeHTML(p.department)}</td>` : ''}
                </tr>`;
            });
            tableHTML += `</tbody></table>`;
            availableContainer.innerHTML = tableHTML;
        }
    }
}

// Main function to set up the status view
export function renderActiveStatuses(res) {
    fullStatusDataCache = res; // Cache the data
    const titleEl = document.getElementById('active-statuses-title');
    const filterContainer = document.getElementById('status-filter-container');

    if (!titleEl || !filterContainer) return;

    if (window.currentUser.role !== 'admin') {
        titleEl.textContent = `สถานะกำลังพล แผนก ${escapeHTML(window.currentUser.department)}`;
    } else {
        titleEl.textContent = `สถานะกำลังพล (ภาพรวม)`;
    }

    // Render filter buttons
    filterContainer.innerHTML = '';
    const filters = ['ทั้งหมด', 'ว่าง', ...Object.keys(STATUS_COLORS)];
    
    filters.forEach(filter => {
        const button = document.createElement('button');
        button.textContent = filter;
        button.dataset.filter = filter;
        button.className = 'status-filter-btn px-3 py-1 text-sm font-medium rounded-full border transition-colors bg-white text-gray-700 border-gray-300';
        
        button.addEventListener('click', () => {
            updateActiveStatusesView(filter);
        });

        filterContainer.appendChild(button);
    });

    // Render the initial view with 'ทั้งหมด' filter
    updateActiveStatusesView('ทั้งหมด');
}