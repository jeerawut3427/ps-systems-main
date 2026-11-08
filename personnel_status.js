let currentUser = null;
let lastResponse = null;

const STATUS_COLUMNS = [
    'ปฏิบัติงานในหน่วย',
    'ราชการ',
    'คุมงาน',
    'ศึกษา',
    'อบรม/ฝึก',
    'ช่วยราชการ',
    'ป่วยที่ รพ.',
    'ลาป่วยนอก รพ.',
    'ลากิจ',
    'ลาพักผ่อน',
    'ลาพักเกษียณอายุราชการ',
    'ลาคลอด',
    'ลาช่วยภรรยาเลี้ยงดูบุตร',
    'ลาอุปสมบท',
    'ประกอบพิธีทางศาสนาอิสลาม',
    'โทษ',
    'ขาด',
    'หนี',
    'ต้องโทษคดีอาญา',
    'เสียชีวิต',
    'สาบสูญ',
    'สรก.และพักราชการ',
    'ส่วนขึ้นสมทบ',
    'เกษียณอายุราชการ',
];

const RANK_ORDER = [
    'น.อ.(พ)', 'น.อ.(พ).หญิง', 'น.อ.หม่อมหลวง', 'น.อ.', 'น.อ.หญิง',
    'น.ท.', 'น.ท.หญิง', 'น.ต.', 'น.ต.หญิง',
    'ร.อ.', 'ร.อ.หญิง', 'ร.ท.', 'ร.ท.หญิง', 'ร.ต.', 'ร.ต.หญิง',
    'พ.อ.อ.(พ)', 'พ.อ.อ.หญิง(พ)', 'พ.อ.อ.', 'พ.อ.อ.หญิง', 'พ.อ.ท.', 'พ.อ.ท.หญิง',
    'พ.อ.ต.', 'พ.อ.ต.หญิง', 'จ.อ.', 'จ.อ.หญิง', 'จ.ท.', 'จ.ท.หญิง',
    'จ.ต.', 'จ.ต.หญิง', 'นาย', 'นาง', 'นางสาว', 'ลูกจ้างประจำ', 'พนักงานราชการ'
];

function getRankSortKey(rank) {
    const normalizedRank = String(rank || '').trim();
    const index = RANK_ORDER.indexOf(normalizedRank);
    return index === -1 ? RANK_ORDER.length + 1 : index;
}

function getStatusSortKey(status) {
    const normalizedStatus = String(status || '').trim();
    const index = STATUS_COLUMNS.indexOf(normalizedStatus);
    return index === -1 ? STATUS_COLUMNS.length + 1 : index;
}

function sortPersonnelStatusItems(items) {
    return [...(items || [])].sort((a, b) => {
        const statusDiff = getStatusSortKey(a.status_group || a.status) - getStatusSortKey(b.status_group || b.status);
        if (statusDiff !== 0) return statusDiff;
        const rankDiff = getRankSortKey(a.rank) - getRankSortKey(b.rank);
        if (rankDiff !== 0) return rankDiff;
        const deptDiff = String(a.department || '').localeCompare(String(b.department || ''), 'th');
        if (deptDiff !== 0) return deptDiff;
        const firstNameDiff = String(a.first_name || '').localeCompare(String(b.first_name || ''), 'th');
        if (firstNameDiff !== 0) return firstNameDiff;
        return String(a.last_name || '').localeCompare(String(b.last_name || ''), 'th');
    });
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatThaiDate(isoDate) {
    if (!isoDate) return '-';
    const parts = String(isoDate).slice(0, 10).split('-');
    if (parts.length !== 3) return isoDate;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return isoDate;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${day} ${months[month - 1]} ${year + 543}`;
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.classList.toggle('hidden', !show);
    overlay.classList.toggle('flex', show);
}

function redirectToLogin() {
    localStorage.removeItem('currentUser');
    // ถ้าหน้านี้ถูกเปิดอยู่ใน iframe/embedded ให้พาหน้าหลักออกไป login แทน
    // ไม่ให้เกิดอาการหน้า login ซ้อนอยู่ข้างในระบบ
    try {
        if (window.top && window.top !== window.self) {
            window.top.location.href = '/login.html';
            return;
        }
    } catch (error) {
        console.warn('Unable to redirect top window:', error);
    }
    window.location.href = '/login.html';
}

async function apiCall(action, payload = {}) {
    const response = await fetch('/api', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
    });

    if (response.status === 401) {
        redirectToLogin();
        return null;
    }

    return response.json();
}

function getFilters() {
    return {
        report_date: document.getElementById('report-date-filter').value,
        department: document.getElementById('department-filter').value,
        category: document.getElementById('category-filter').value,
        status: document.getElementById('status-filter').value,
    };
}

function renderStatusFilter(columns = STATUS_COLUMNS) {
    const select = document.getElementById('status-filter');
    if (!select) return;
    const current = select.value || '';
    select.innerHTML = '<option value="">ทั้งหมด</option>' + columns.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    select.value = current;
}

function renderDepartmentOptions(departments, selectedDepartment) {
    const select = document.getElementById('department-filter');
    const currentValue = selectedDepartment || select.value || '';

    if (currentUser.role === 'admin') {
        select.innerHTML = '<option value="">ทุกแผนก</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            if (dept === currentValue) option.selected = true;
            select.appendChild(option);
        });
        select.disabled = false;
    } else {
        const ownDept = departments[0] || currentUser.department || '';
        select.innerHTML = '';
        const option = document.createElement('option');
        option.value = ownDept;
        option.textContent = ownDept || 'แผนกของฉัน';
        option.selected = true;
        select.appendChild(option);
        select.disabled = true;
    }
}

function renderSummaryCards(data) {
    const container = document.getElementById('summary-cards');
    const totals = data.category_totals || {};
    const statusTotals = data.status_totals || {};

    const cards = [
        { label: 'รวมกำลังพลที่นับได้', value: totals.total || 0, color: 'bg-slate-900' },
        { label: 'สัญญาบัตร', value: totals.officer || 0, color: 'bg-blue-600' },
        { label: 'ประทวน', value: totals.nco || 0, color: 'bg-emerald-600' },
        { label: 'ลูกจ้างประจำ', value: totals.permanent_employee || 0, color: 'bg-amber-600' },
        { label: 'พนักงานราชการ', value: totals.government_employee || 0, color: 'bg-orange-600' },
        { label: 'ข้อมูลเดิม', value: totals.civilian || 0, color: 'bg-stone-600' },
    ];

    container.innerHTML = cards.map(card => `
        <div class="${card.color} text-white rounded-2xl p-5 shadow-md">
            <div class="text-sm opacity-90">${escapeHtml(card.label)}</div>
            <div class="text-3xl font-bold mt-2">${card.value}</div>
            <div class="text-xs opacity-80 mt-1">คน</div>
        </div>
    `).join('');

    const normalCount = statusTotals['ปฏิบัติงานในหน่วย'] || 0;
    const missionCount = Math.max(0, (totals.total || 0) - normalCount);
    const helper = document.getElementById('taf025-matrix-helper');
    if (helper) {
        helper.innerHTML = `ปฏิบัติงานในหน่วย ${normalCount} คน | สถานภาพอื่น ${missionCount} คน`;
    }
}

function renderTaf025Matrix(data) {
    const head = document.getElementById('rank-summary-head');
    const body = document.getElementById('rank-summary-body');
    const columns = data.rank_matrix_columns || [];
    const rows = data.taf025_matrix || [];

    head.innerHTML = `
        <th class="px-3 py-3 text-left font-semibold whitespace-nowrap sticky left-0 bg-slate-50 z-10 min-w-[220px]">สถานภาพ</th>
        ${columns.map(col => `<th class="px-3 py-3 text-center font-semibold whitespace-nowrap ${String(col.key).includes('total') ? 'bg-slate-100' : ''}">${escapeHtml(col.label)}</th>`).join('')}
    `;

    if (!rows.length) {
        body.innerHTML = `
            <tr>
                <td colspan="${columns.length + 1}" class="px-4 py-8 text-center text-slate-500">
                    ${escapeHtml(data.message || 'ไม่พบข้อมูลกำลังพลในวันที่เลือก')}
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = rows.map(row => {
        const cells = row.cells || {};
        const isNormal = row.status === 'ปฏิบัติงานในหน่วย';
        return `
            <tr class="hover:bg-slate-50 ${isNormal ? 'bg-emerald-50/40' : ''}">
                <td class="px-3 py-2 font-semibold whitespace-nowrap sticky left-0 bg-inherit z-10 min-w-[220px]">${escapeHtml(row.status || '-')}</td>
                ${columns.map(col => {
                    const value = cells[col.key] || 0;
                    const totalCol = String(col.key).includes('total') || ['permanent_employee', 'government_employee', 'civilian'].includes(col.key);
                    return `<td class="px-3 py-2 text-center ${value ? 'font-bold text-slate-900' : 'text-slate-300'} ${totalCol ? 'bg-slate-50 font-semibold' : ''}">${value || '-'}</td>`;
                }).join('')}
            </tr>
        `;
    }).join('');
}


const TAF025_GROUP_LABELS = {
    officer: 'นายทหารสัญญาบัตร',
    nco: 'นายทหารประทวน',
    conscript: 'พลฯ กองประจำการ',
    civil_defense: 'พลเรือนกลาโหม',
    government_employee: 'พนักงานราชการ',
    employee: 'ลูกจ้าง',
    student: 'นักเรียน',
    grand_total: 'ยอดรวม'
};

function getTaf025GroupFamily(column) {
    const group = String(column.group || column.key || '');
    if (group.startsWith('officer')) return 'officer';
    if (group.startsWith('nco')) return 'nco';
    if (group.startsWith('conscript')) return 'conscript';
    if (group.startsWith('civil_defense')) return 'civil_defense';
    if (group.startsWith('government_employee')) return 'government_employee';
    if (group === 'permanent_employee' || group === 'employee' || group === 'employee_total') return 'employee';
    if (group.startsWith('student')) return 'student';
    if (group === 'grand_total') return 'grand_total';
    return group || 'other';
}

function buildTaf025GroupHeaders(columns) {
    const groups = [];
    columns.forEach(col => {
        const family = getTaf025GroupFamily(col);
        const last = groups[groups.length - 1];
        if (last && last.family === family) {
            last.colspan += 1;
        } else {
            groups.push({ family, label: TAF025_GROUP_LABELS[family] || family, colspan: 1 });
        }
    });
    return groups;
}

function isTaf025TotalColumn(column) {
    const key = String(column.key || '');
    const group = String(column.group || '');
    return key.includes('total') || group.includes('total') || key === 'government_employee' || key === 'grand_total';
}

function formatTaf025Cell(value) {
    const n = Number(value || 0);
    return n ? String(n) : '-';
}

function renderTaf025DataRow(row, columns, options = {}) {
    const cells = row.cells || {};
    const systemCells = row.system_cells || {};
    const manualCells = row.manual_cells || {};
    const canEdit = row.editable && currentUser && currentUser.role === 'admin';
    const isManual = row.source === 'manual_pending' || row.source === 'manual_saved' || row.editable;
    const rowClass = isManual ? 'taf-manual-row' : '';
    const labelNote = row.editable
        ? `<div class="text-[10px] text-amber-700 font-normal">${row.has_manual_values ? 'มีค่า Admin บันทึกแล้ว' : 'Admin แก้ได้'}</div>`
        : '';
    return `
        <tr class="${rowClass}">
            <td class="taf-label-cell">
                <div>${escapeHtml(row.label || row.key || '-')}</div>
                ${labelNote}
            </td>
            ${columns.map(col => {
                const value = Number(cells[col.key] || 0);
                const systemValue = Number(systemCells[col.key] || 0);
                const hasManual = Object.prototype.hasOwnProperty.call(manualCells, col.key);
                const totalClass = isTaf025TotalColumn(col) ? ' taf-total-cell' : '';
                const zeroClass = value ? '' : ' taf-zero-cell';
                const manualClass = row.editable ? ' taf-manual-cell' : '';
                const title = row.editable
                    ? `ค่าจากระบบ: ${systemValue} | ${hasManual ? 'ค่า Admin: ' + value : 'ยังไม่บันทึกค่า Admin'}`
                    : '';
                if (canEdit) {
                    return `<td class="${totalClass}${manualClass}" title="${escapeHtml(title)}">
                        <input type="number" min="0" step="1" class="taf025-manual-input"
                            data-field-key="${escapeHtml(row.key)}"
                            data-cell-key="${escapeHtml(col.key)}"
                            data-system-value="${systemValue}"
                            value="${value}">
                    </td>`;
                }
                return `<td class="${totalClass}${zeroClass}${manualClass}" title="${escapeHtml(title)}">${formatTaf025Cell(value)}</td>`;
            }).join('')}
        </tr>
    `;
}

function renderTaf025PreviewTable(preview) {
    const table = document.getElementById('taf025-preview-table');
    if (!table) return;
    const columns = preview.strength_columns || [];
    const groupHeaders = buildTaf025GroupHeaders(columns);

    if (!columns.length) {
        table.innerHTML = '<tbody><tr><td class="p-6 text-center text-slate-500">ยังไม่พบ mapping คอลัมน์ ทอ.กพ.025</td></tr></tbody>';
        return;
    }

    let bodyRows = '';
    (preview.strength_rows || []).forEach(row => {
        bodyRows += renderTaf025DataRow(row, columns);
    });

    let lastSection = '';
    (preview.status_rows || []).forEach(row => {
        if (row.section && row.section !== lastSection) {
            lastSection = row.section;
            bodyRows += `<tr class="taf-section-row"><td colspan="${columns.length + 1}">${escapeHtml(lastSection)}</td></tr>`;
        }
        bodyRows += renderTaf025DataRow(row, columns);
    });

    table.innerHTML = `
        <thead>
            <tr>
                <th class="taf-label-cell taf-group-header" rowspan="2">8. ตอนยอดกำลัง</th>
                ${groupHeaders.map(group => `<th class="taf-group-header" colspan="${group.colspan}">${escapeHtml(group.label)}</th>`).join('')}
            </tr>
            <tr>
                ${columns.map(col => `<th class="taf-sub-header ${isTaf025TotalColumn(col) ? 'taf-total-cell' : ''}">${escapeHtml(col.label || col.key)}</th>`).join('')}
            </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
    `;
}

function renderTaf025GenderPreviewTable(preview) {
    const table = document.getElementById('taf025-gender-preview-table');
    if (!table) return;
    const columns = preview.gender_columns || [];
    const rows = preview.gender_rows || [];

    if (!columns.length) {
        table.innerHTML = '<tbody><tr><td class="p-6 text-center text-slate-500">ยังไม่พบ mapping ตอนยอดกำลังแบ่งตามเพศ</td></tr></tbody>';
        return;
    }

    table.innerHTML = `
        <thead>
            <tr>
                <th class="taf-label-cell taf-group-header">รายการ</th>
                ${columns.map(col => `<th class="taf-sub-header">${escapeHtml(col.label || col.key)}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${rows.map(row => renderTaf025DataRow(row, columns)).join('')}
        </tbody>
    `;
}


function getValidationClass(status) {
    if (status === 'ready') return 'taf025-validation-ready';
    if (status === 'incomplete') return 'taf025-validation-incomplete';
    return 'taf025-validation-needs_review';
}

function getValidationBadgeClass(status) {
    if (status === 'ready') return 'bg-green-100 text-green-800';
    if (status === 'incomplete') return 'bg-red-100 text-red-800';
    return 'bg-amber-100 text-amber-800';
}

function renderTaf025Validation(preview) {
    const panel = document.getElementById('taf025-validation-panel');
    if (!panel) return;
    const validation = preview && preview.validation ? preview.validation : null;
    const snapshot = preview && preview.snapshot ? preview.snapshot : null;
    if (!validation) {
        panel.className = 'hidden';
        panel.innerHTML = '';
        return;
    }

    const issues = validation.issues || [];
    const warnings = validation.warnings || [];
    const visibleIssues = issues.slice(0, 12);
    const hiddenCount = Math.max(0, issues.length - visibleIssues.length);
    const snapshotText = snapshot && snapshot.exists
        ? `มี Snapshot ล่าสุด: ${escapeHtml(snapshot.status_label || snapshot.status || '-')} | ผู้บันทึก: ${escapeHtml(snapshot.updated_by || snapshot.created_by || '-')} | เวลา: ${escapeHtml(snapshot.updated_at || snapshot.created_at || '-')}`
        : 'ยังไม่มี Snapshot สำหรับวันที่/แผนกนี้';

    panel.className = `mx-5 mt-4 taf025-validation-card ${getValidationClass(validation.status)}`;
    panel.innerHTML = `
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getValidationBadgeClass(validation.status)}">
                        ${escapeHtml(validation.status_label || validation.status || 'ต้องตรวจสอบ')}
                    </span>
                    <span class="font-bold">ผลตรวจ ทอ.กพ.025 ก่อน Snapshot/Export</span>
                </div>
                <div class="text-xs mt-1 opacity-90">
                    Error ${validation.error_count || 0} รายการ | Warning ${validation.warning_count || 0} รายการ | ตรวจเมื่อ ${escapeHtml(validation.checked_at || '-')}
                </div>
                <div class="text-xs mt-1 opacity-90">${snapshotText}</div>
            </div>
            <div class="text-xs opacity-90 max-w-xl">
                ถ้ายังมี Error ระบบยังให้บันทึก Snapshot ได้เพื่อเก็บหลักฐานการตรวจ แต่ไม่ควรนำไป Export ใช้งานจริงจนกว่าจะเคลียร์ครบ
            </div>
        </div>
        ${issues.length ? `
            <div class="mt-3 font-semibold">รายการที่ต้องแก้ไข/ตรวจสอบ</div>
            <ul class="list-disc ml-5 mt-1 space-y-1">
                ${visibleIssues.map(issue => `<li>${escapeHtml(issue.message || '')}</li>`).join('')}
                ${hiddenCount ? `<li>และรายการอื่นอีก ${hiddenCount} รายการ</li>` : ''}
            </ul>
        ` : '<div class="mt-3 font-semibold">ไม่พบข้อผิดพลาดจากสูตรและยอดรวมหลัก</div>'}
        ${warnings.length ? `
            <div class="mt-3 font-semibold">คำเตือนจากระบบ</div>
            <ul class="list-disc ml-5 mt-1 space-y-1">
                ${warnings.slice(0, 8).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        ` : ''}
    `;
}

function renderTaf025TemplatePreview(data) {
    const preview = data.taf025_preview || null;
    const meta = document.getElementById('taf025-preview-meta');
    const warningsBox = document.getElementById('taf025-preview-warnings');
    if (!preview) {
        if (meta) meta.textContent = 'ยังไม่มีข้อมูล preview ทอ.กพ.025';
        if (warningsBox) warningsBox.className = 'hidden';
        const validationPanel = document.getElementById('taf025-validation-panel');
        if (validationPanel) validationPanel.className = 'hidden';
        return;
    }

    if (meta) {
        const dept = preview.selected_department ? `แผนก: ${preview.selected_department}` : 'ทุกแผนก';
        const templateText = preview.template && preview.template.exists ? 'พบ template แล้ว' : 'ยังไม่พบ template';
        const manualText = preview.manual_value_count ? `มีค่า Admin ${preview.manual_value_count} ช่อง` : 'ยังไม่มีค่า Admin ที่บันทึก';
        meta.textContent = `วันที่รายงาน: ${formatThaiDate(preview.report_date)} | ${dept} | ${templateText} | ${manualText} | ช่วงพิมพ์ ${preview.print_range || '-'}`;
    }

    const saveStatus = document.getElementById('taf025-manual-save-status');
    if (saveStatus) {
        saveStatus.textContent = preview.manual_value_count
            ? `โหลดค่า Admin ที่บันทึกไว้แล้ว ${preview.manual_value_count} ช่อง`
            : 'ยังไม่มีค่า Admin ที่บันทึกไว้สำหรับวันที่/แผนกนี้';
    }

    const warnings = preview.warnings || [];
    if (warningsBox) {
        if (warnings.length) {
            warningsBox.className = 'mx-5 mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 text-sm';
            warningsBox.innerHTML = `
                <div class="font-bold mb-1">ข้อควรตรวจสอบก่อนทำ export จริง</div>
                <ul class="list-disc ml-5 space-y-1">${warnings.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            `;
        } else {
            warningsBox.className = 'hidden';
            warningsBox.innerHTML = '';
        }
    }

    renderTaf025Validation(preview);
    renderTaf025PreviewTable(preview);
    renderTaf025GenderPreviewTable(preview);
}


function collectTaf025ManualValues() {
    const inputs = Array.from(document.querySelectorAll('.taf025-manual-input'));
    return inputs.map(input => {
        const value = Number(input.value || 0);
        const safeValue = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
        return {
            field_key: input.dataset.fieldKey || '',
            cell_key: input.dataset.cellKey || '',
            system_value: Number(input.dataset.systemValue || 0),
            manual_value: safeValue,
        };
    }).filter(item => item.field_key && item.cell_key);
}

async function saveTaf025ManualValues(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!lastResponse || !lastResponse.taf025_preview) {
        alert('ยังไม่มีข้อมูล ทอ.กพ.025 สำหรับบันทึก');
        return;
    }
    if (!currentUser || currentUser.role !== 'admin') {
        alert('เฉพาะ Admin เท่านั้นที่บันทึกค่า ทอ.กพ.025 ได้');
        return;
    }

    const values = collectTaf025ManualValues();
    if (!values.length) {
        alert('ไม่พบช่องที่สามารถบันทึกได้');
        return;
    }

    const preview = lastResponse.taf025_preview;
    const deptText = preview.selected_department || 'ทุกแผนก';
    const confirmed = confirm(`ยืนยันบันทึกค่า ทอ.กพ.025 วันที่ ${formatThaiDate(preview.report_date)} (${deptText}) จำนวน ${values.length} ช่อง?`);
    if (!confirmed) return;

    showLoading(true);
    try {
        const result = await apiCall('save_taf025_manual_values', {
            report_date: preview.report_date,
            department: preview.selected_department || '',
            values,
        });
        if (!result) return;
        if (result.status !== 'success') {
            alert(result.message || 'บันทึกค่าไม่สำเร็จ');
            return;
        }
        alert(result.message || 'บันทึกค่า ทอ.กพ.025 สำเร็จ');
        await loadStatusOverview();
    } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการบันทึกค่า ทอ.กพ.025');
    } finally {
        showLoading(false);
    }
}


async function saveTaf025Snapshot(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!lastResponse || !lastResponse.taf025_preview) {
        alert('ยังไม่มีข้อมูล ทอ.กพ.025 สำหรับบันทึก Snapshot');
        return;
    }
    if (!currentUser || currentUser.role !== 'admin') {
        alert('เฉพาะ Admin เท่านั้นที่บันทึก Snapshot ทอ.กพ.025 ได้');
        return;
    }

    const preview = lastResponse.taf025_preview;
    const validation = preview.validation || {};
    const deptText = preview.selected_department || 'ทุกแผนก';
    const issueText = validation.error_count
        ? `\n\nยังมี Error ${validation.error_count} รายการ ระบบจะบันทึก Snapshot เป็นสถานะ "ยังไม่สมบูรณ์" แต่ยังไม่ควรนำไป export จริง`
        : '';
    const confirmed = confirm(
        `ยืนยันตรวจและบันทึก Snapshot ทอ.กพ.025 วันที่ ${formatThaiDate(preview.report_date)} (${deptText})?\n\n` +
        `สถานะปัจจุบัน: ${validation.status_label || 'ต้องตรวจสอบ'}${issueText}\n\n` +
        'หากเพิ่งแก้ช่องสีเหลือง ให้กด “บันทึกค่า ทอ.กพ.025” ก่อนบันทึก Snapshot'
    );
    if (!confirmed) return;

    showLoading(true);
    try {
        const result = await apiCall('save_taf025_snapshot', {
            report_date: preview.report_date,
            department: preview.selected_department || '',
        });
        if (!result) return;
        if (result.status !== 'success') {
            alert(result.message || 'บันทึก Snapshot ไม่สำเร็จ');
            return;
        }
        alert(result.message || 'บันทึก Snapshot ทอ.กพ.025 สำเร็จ');
        await loadStatusOverview();
    } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการบันทึก Snapshot ทอ.กพ.025');
    } finally {
        showLoading(false);
    }
}


async function exportTaf025Excel(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!lastResponse || !lastResponse.taf025_preview) {
        alert('ยังไม่มีข้อมูล ทอ.กพ.025 สำหรับส่งออก กรุณากดค้นหาก่อน');
        return;
    }
    if (!currentUser || currentUser.role !== 'admin') {
        alert('เฉพาะ Admin เท่านั้นที่ส่งออก Excel ทอ.กพ.025 ได้');
        return;
    }

    const preview = lastResponse.taf025_preview;
    const snapshot = preview.snapshot || {};
    if (!snapshot.exists) {
        alert('ยังไม่มี Snapshot สำหรับวันที่/แผนกนี้ กรุณากด “ตรวจและบันทึก Snapshot” ก่อนส่งออก Excel');
        return;
    }
    if (snapshot.status !== 'ready') {
        alert(`ยังไม่สามารถส่งออกได้ เพราะ Snapshot อยู่สถานะ “${snapshot.status_label || snapshot.status || 'ไม่ทราบสถานะ'}” กรุณาแก้รายการตรวจสอบและบันทึก Snapshot ใหม่ก่อน`);
        return;
    }

    const deptText = preview.selected_department || 'ทุกแผนก';
    const confirmed = confirm(
        `ยืนยันส่งออก Excel ทอ.กพ.025 วันที่ ${formatThaiDate(preview.report_date)} (${deptText})?\n\n` +
        'ระบบจะใช้ค่าใน Snapshot ล่าสุด ไม่คำนวณใหม่ตอนส่งออก เพื่อป้องกันข้อมูลเปลี่ยนย้อนหลัง'
    );
    if (!confirmed) return;

    showLoading(true);
    try {
        const result = await apiCall('export_taf025_excel', {
            report_date: preview.report_date,
            department: preview.selected_department || '',
        });
        if (!result) return;
        if (result.status !== 'success') {
            alert(result.message || 'ส่งออก Excel ทอ.กพ.025 ไม่สำเร็จ');
            return;
        }
        if (result.download_url) {
            window.location.href = result.download_url;
        } else {
            alert('สร้างไฟล์สำเร็จ แต่ไม่พบลิงก์ดาวน์โหลด');
        }
    } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการส่งออก Excel ทอ.กพ.025');
    } finally {
        showLoading(false);
    }
}

function renderDetailTable(data) {
    const body = document.getElementById('detail-table-body');
    const count = document.getElementById('detail-count');
    const items = sortPersonnelStatusItems(data.items || []);

    count.textContent = `พบรายการทั้งหมด ${items.length} รายการ`;

    if (!items.length) {
        body.innerHTML = `
            <tr>
                <td colspan="10" class="px-4 py-8 text-center text-slate-500">
                    ${escapeHtml(data.message || 'ไม่พบข้อมูลรายชื่อ')}
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = items.map((item, index) => {
        const status = item.status_group || item.status || '-';
        const normal = status === 'ปฏิบัติงานในหน่วย';
        return `
            <tr class="hover:bg-slate-50 ${normal ? 'text-slate-500' : ''}">
                <td class="px-4 py-3 whitespace-nowrap text-slate-500">${index + 1}</td>
                <td class="px-4 py-3 whitespace-nowrap font-semibold">${escapeHtml(item.full_name || '-')}</td>
                <td class="px-4 py-3 whitespace-nowrap">${escapeHtml(item.department || '-')}</td>
                <td class="px-4 py-3 whitespace-nowrap">${escapeHtml(item.category_label || '-')}</td>
                <td class="px-4 py-3 whitespace-nowrap">${escapeHtml(item.specialty || '-')}</td>
                <td class="px-4 py-3 min-w-[220px]">${escapeHtml(item.position || '-')}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${normal ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                        ${escapeHtml(status)}
                    </span>
                </td>
                <td class="px-4 py-3 min-w-[220px]">${escapeHtml(item.details || '-')}</td>
                <td class="px-4 py-3 whitespace-nowrap">${formatThaiDate(item.start_date)}</td>
                <td class="px-4 py-3 whitespace-nowrap">${formatThaiDate(item.end_date)}</td>
            </tr>
        `;
    }).join('');
}

function renderWarnings(data) {
    const box = document.getElementById('warning-box');
    if (!box) return;
    const missing = data.missing_departments || [];
    if (!missing.length) {
        box.className = 'hidden';
        box.innerHTML = '';
        return;
    }
    box.className = 'rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 text-sm';
    box.innerHTML = `
        <div class="font-bold mb-1">ข้อมูลอาจยังไม่ครบ</div>
        <div>ยังมีแผนกที่ไม่พบรายงานประจำวันที่เลือก: ${missing.map(escapeHtml).join(', ')}</div>
    `;
}

function renderMeta(data) {
    const meta = document.getElementById('report-meta');
    const badge = document.getElementById('archive-badge');
    const selectedDept = data.selected_department ? ` | แผนก: ${data.selected_department}` : ' | ทุกแผนก';
    meta.textContent = `วันที่รายงาน: ${formatThaiDate(data.report_date)}${selectedDept}`;

    if (data.is_archived) {
        badge.innerHTML = '<span class="inline-flex px-3 py-1 rounded-full bg-slate-200 text-slate-700">ข้อมูลที่เก็บแล้ว</span>';
    } else {
        badge.innerHTML = '<span class="inline-flex px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">ข้อมูลรอบปัจจุบัน</span>';
    }
}

function renderAll(data) {
    lastResponse = data;
    const dateInput = document.getElementById('report-date-filter');
    if (!dateInput.value && data.report_date) dateInput.value = data.report_date;
    renderStatusFilter(data.status_columns || STATUS_COLUMNS);
    renderDepartmentOptions(data.departments || [], data.selected_department || '');
    renderSummaryCards(data);
    renderTaf025TemplatePreview(data);
    renderTaf025Matrix(data);
    renderDetailTable(data);
    renderWarnings(data);
    renderMeta(data);
}

async function loadStatusOverview() {
    showLoading(true);
    try {
        const result = await apiCall('get_personnel_status_overview', getFilters());
        if (!result) return;
        if (result.status !== 'success') {
            alert(result.message || 'โหลดข้อมูลไม่สำเร็จ');
            return;
        }
        renderAll(result);
    } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
        showLoading(false);
    }
}

async function logout() {
    await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
    });
    localStorage.removeItem('currentUser');
    redirectToLogin();
}

function initPage() {
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
        redirectToLogin();
        return;
    }
    try {
        currentUser = JSON.parse(currentUserStr);
    } catch (error) {
        localStorage.removeItem('currentUser');
        redirectToLogin();
        return;
    }

    const userInfo = document.getElementById('user-info');
    const fullName = [currentUser.rank, currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ');
    userInfo.textContent = `${fullName || currentUser.username || ''}${currentUser.department ? ' | ' + currentUser.department : ''}`;

    document.getElementById('search-btn').addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        loadStatusOverview();
    });
    document.getElementById('reset-filter-btn').addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        document.getElementById('category-filter').value = '';
        document.getElementById('status-filter').value = '';
        if (currentUser.role === 'admin') document.getElementById('department-filter').value = '';
        loadStatusOverview();
    });
    document.getElementById('logout-btn').addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        logout();
    });

    const exportNoteBtn = document.getElementById('export-note-excel-btn');
    if (exportNoteBtn) {
        exportNoteBtn.classList.toggle('hidden', currentUser.role !== 'admin');
        exportNoteBtn.addEventListener('click', exportDailyNoteExcel);
    }

    const saveTaf025Btn = document.getElementById('save-taf025-manual-btn');
    if (saveTaf025Btn) {
        saveTaf025Btn.classList.toggle('hidden', currentUser.role !== 'admin');
        saveTaf025Btn.addEventListener('click', saveTaf025ManualValues);
    }

    const saveTaf025SnapshotBtn = document.getElementById('save-taf025-snapshot-btn');
    if (saveTaf025SnapshotBtn) {
        saveTaf025SnapshotBtn.classList.toggle('hidden', currentUser.role !== 'admin');
        saveTaf025SnapshotBtn.addEventListener('click', saveTaf025Snapshot);
    }

    const exportTaf025Btn = document.getElementById('export-taf025-excel-btn');
    if (exportTaf025Btn) {
        exportTaf025Btn.classList.toggle('hidden', currentUser.role !== 'admin');
        exportTaf025Btn.addEventListener('click', exportTaf025Excel);
    }

    ['report-date-filter', 'department-filter', 'category-filter', 'status-filter'].forEach(id => {
        document.getElementById(id).addEventListener('change', loadStatusOverview);
    });

    loadStatusOverview();
}

document.addEventListener('DOMContentLoaded', initPage);

// Fix 44: Export Excel เฉพาะชีต 11.ตอนหมายเหตุ
function getSpecialtyAbbreviation(specialty, category) {
    const raw = String(specialty || '').trim();
    if (!raw || ['civilian', 'permanent_employee', 'government_employee'].includes(category)) return '';
    const match = raw.match(/\(([^()]+)\)\s*$/);
    if (match && match[1]) return match[1].trim();
    // ถ้าเก็บมาเป็นตัวย่ออยู่แล้ว เช่น ชย. / สบ. ให้ใช้ตามนั้น
    if (raw.length <= 8 && !raw.includes('ทหาร')) return raw;
    return raw;
}

function getNameWithoutRank(item) {
    return [item.first_name || '', item.last_name || ''].filter(Boolean).join(' ').trim() || String(item.full_name || '').replace(String(item.rank || ''), '').trim();
}

function formatShortThaiDate(isoDate) {
    if (!isoDate) return '';
    const parts = String(isoDate).slice(0, 10).split('-');
    if (parts.length !== 3) return '';
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return '';
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${day} ${months[month - 1]} ${String(year + 543).slice(-2)}`;
}

function formatShortDateRange(startDate, endDate) {
    const start = formatShortThaiDate(startDate);
    const end = formatShortThaiDate(endDate);
    if (start && end && start !== end) return `${start} - ${end}`;
    if (start) return start;
    if (end) return end;
    return '';
}

function buildDailyNoteSituation(item) {
    const status = item.status_group || item.status || '';
    const details = String(item.details || '').trim();
    const range = formatShortDateRange(item.start_date, item.end_date);
    const parts = [];
    if (status) parts.push(status);
    if (details) parts.push(details);
    let text = parts.join(' ');
    if (range) text = text ? `${text} (${range})` : `(${range})`;
    return text;
}

function getDailyNoteItems(data) {
    const items = sortPersonnelStatusItems(data && data.items ? data.items : []);
    return items.filter(item => {
        const status = String(item.status_group || item.status || '').trim();
        return status && status !== 'ปฏิบัติงานในหน่วย';
    });
}

function setCellStyle(ws, address, style) {
    if (!ws[address]) return;
    ws[address].s = Object.assign({}, ws[address].s || {}, style);
}

function exportDailyNoteExcel() {
    if (!lastResponse) {
        alert('ยังไม่มีข้อมูลสำหรับส่งออก กรุณากดค้นหาหรือรอให้ระบบโหลดข้อมูลก่อน');
        return;
    }
    if (!window.XLSX) {
        alert('ไม่พบไลบรารี XLSX กรุณาตรวจสอบการเชื่อมต่อ CDN');
        return;
    }

    const noteItems = getDailyNoteItems(lastResponse);
    const normalItems = noteItems.filter(item => (item.status_group || item.status) !== 'ส่วนขึ้นสมทบ');
    const attachedItems = noteItems.filter(item => (item.status_group || item.status) === 'ส่วนขึ้นสมทบ');

    const rows = [];
    rows.push(['11. ตอนหมายเหตุ', '', '', '', '', '12. ตอนบันทึกเหตุการณ์']);
    rows.push(['ชื่อ', 'ยศ', 'เหล่า', 'หน้าที่', 'สภาพการณ์หรือการเปลี่ยนแปลง', '']);

    const pushPersonRow = (item) => {
        rows.push([
            getNameWithoutRank(item),
            item.rank || '',
            getSpecialtyAbbreviation(item.specialty, item.category),
            item.position || '',
            buildDailyNoteSituation(item),
            item.event_note || item.eventNote || item.note || ''
        ]);
    };

    if (normalItems.length === 0 && attachedItems.length === 0) {
        rows.push(['-', '', '', '', 'ไม่มีรายการสถานภาพหรือการเปลี่ยนแปลงในวันที่เลือก', '']);
    } else {
        normalItems.forEach(pushPersonRow);
        if (attachedItems.length > 0) {
            rows.push(['', '', '', '', '', '']);
            rows.push(['ส่วนขึ้นสมทบ', '', '', '', '', '']);
            attachedItems.forEach(pushPersonRow);
        }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
        { wch: 28 },
        { wch: 12 },
        { wch: 9 },
        { wch: 55 },
        { wch: 66 },
        { wch: 38 }
    ];
    ws['!rows'] = rows.map((row, idx) => {
        if (idx === 0) return { hpt: 26 };
        if (idx === 1) return { hpt: 32 };
        const maxLen = Math.max(...row.map(cell => String(cell || '').length));
        return { hpt: maxLen > 90 ? 54 : maxLen > 45 ? 38 : 24 };
    });
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 0, c: 5 }, e: { r: 1, c: 5 } }
    ];

    const sectionRowIndex = rows.findIndex(row => row[0] === 'ส่วนขึ้นสมทบ');
    if (sectionRowIndex >= 0) {
        ws['!merges'].push({ s: { r: sectionRowIndex, c: 0 }, e: { r: sectionRowIndex, c: 5 } });
    }

    // ใส่ style metadata ไว้รองรับ Excel reader ที่อ่าน style ได้ ส่วน XLSX community จะยังคงข้อมูล/merge/width ครบ
    const border = { style: 'thin', color: { rgb: '000000' } };
    const headerStyle = {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: { top: border, bottom: border, left: border, right: border }
    };
    const bodyStyle = {
        alignment: { vertical: 'top', wrapText: true },
        border: { top: border, bottom: border, left: border, right: border }
    };

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            if (!ws[addr]) continue;
            setCellStyle(ws, addr, r <= 1 || r === sectionRowIndex ? headerStyle : bodyStyle);
        }
    }

    XLSX.utils.book_append_sheet(wb, ws, '11.ตอนหมายเหตุ');
    const reportDate = lastResponse.report_date || new Date().toISOString().slice(0, 10);
    const selectedDept = lastResponse.selected_department ? `-${lastResponse.selected_department}` : '';
    const safeDept = selectedDept.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '');
    XLSX.writeFile(wb, `11.ตอนหมายเหตุ-${reportDate}${safeDept}.xlsx`);
}


// Fix 44.1: เปิดให้หน้า daily.html เรียกปุ่มส่งออก 11.ตอนหมายเหตุแทนปุ่มส่งออก Excel เดิมได้
window.exportDailyNoteExcel = exportDailyNoteExcel;
