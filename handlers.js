// handlers.js
// Contains all event handler functions.

import { sendRequest } from './api.js?v=46';
import { showMessage, openPersonnelModal, openUserModal, showConfirmModal, addStatusRow, renderArchivedReports, renderFilteredHistoryReports, renderMyTransferRequests, renderTransferRequests, renderPermanentPersonnel } from './ui.js?v=46';
import { exportSingleReportToExcel, formatThaiDateRangeArabic, escapeHTML } from './utils.js?v=46';

// --- Global Variables ---
let pendingImportData = null; // ตัวแปรเก็บข้อมูลนำเข้าที่รอการยืนยัน

// --- Personnel Handlers ---

export async function handlePersonnelFormSubmit(e) {
    e.preventDefault();
    const personId = window.personnelForm.querySelector('#person-id').value;
    const specialtySelect = window.personnelForm.querySelector('#person-specialty');
    const departmentSelect = window.personnelForm.querySelector('#person-department');
    const isMyDepartmentContext = window.personnelForm.dataset.context === 'my' || (window.currentUser && window.currentUser.role !== 'admin');
    const data = {
        id: personId,
        rank: window.personnelForm.querySelector('#person-rank').value.trim(),
        first_name: window.personnelForm.querySelector('#person-first-name').value.trim(),
        last_name: window.personnelForm.querySelector('#person-last-name').value.trim(),
        position: window.personnelForm.querySelector('#person-position').value.trim(),
        specialty: specialtySelect && !specialtySelect.disabled ? specialtySelect.value.trim() : '',
        department: isMyDepartmentContext ? (window.currentUser?.department || '') : (departmentSelect ? departmentSelect.value.trim() : ''),
    };
    const action = isMyDepartmentContext
        ? (personId ? 'update_my_department_personnel' : 'add_my_department_personnel')
        : (personId ? 'update_personnel' : 'add_personnel');
    try {
        const response = await sendRequest(action, { data });
        if (response.status === 'success') {
            window.personnelModal.classList.remove('active');
            if (isMyDepartmentContext) {
                window.loadDataForPane('pane-my-personnel');
            } else {
                window.loadDataForPane('pane-personnel');
                if (document.getElementById('pane-my-personnel') && !document.getElementById('pane-my-personnel').classList.contains('hidden')) {
                    window.loadDataForPane('pane-my-personnel');
                }
            }
        }
        showMessage(response.message, response.status === 'success');
    } catch (error) {
        showMessage(error.message, false);
    }
}


function ensureTransferRequestModal() {
    let modal = document.getElementById('transfer-request-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'transfer-request-modal';
    modal.className = 'modal fixed inset-0 bg-gray-600 bg-opacity-50 z-40 hidden items-center justify-center';
    modal.innerHTML = `
        <div class="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <form id="transfer-request-form">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">แจ้งย้าย/พ้นจากแผนก</h3>
                <p id="transfer-request-person-label" class="text-sm text-gray-600 mb-4"></p>
                <input type="hidden" id="transfer-request-person-id">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">ประเภทคำขอ</label>
                        <select id="transfer-request-type" class="mt-1 w-full border rounded px-3 py-2 bg-white" required>
                            <option value="internal_transfer">ย้ายภายในกอง</option>
                            <option value="out_of_unit">ย้ายออกจากกอง / พ้นจากหน่วย</option>
                        </select>
                        <p class="text-xs text-gray-500 mt-1">Admin จะเป็นผู้อนุมัติ และเลือกแผนกปลายทางกรณีย้ายภายในกอง</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">วันที่มีผล</label>
                        <input type="date" id="transfer-effective-date" class="mt-1 w-full border rounded px-3 py-2" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">เหตุผล/หมายเหตุ</label>
                        <textarea id="transfer-reason" rows="3" class="mt-1 w-full border rounded px-3 py-2" required placeholder="ระบุรายละเอียด เช่น ย้ายไปแผนก... / ย้ายออกจากกอง..."></textarea>
                    </div>
                </div>
                <div class="items-center px-1 py-3 mt-4 text-right">
                    <button id="cancel-transfer-request-btn" type="button" class="px-4 py-2 bg-gray-200 rounded-md mr-2">ยกเลิก</button>
                    <button type="submit" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md">ส่งคำขอ</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function openTransferRequestModal(personId, personName) {
    const modal = ensureTransferRequestModal();
    const form = modal.querySelector('#transfer-request-form');
    const cancelBtn = modal.querySelector('#cancel-transfer-request-btn');
    modal.querySelector('#transfer-request-person-id').value = personId;
    modal.querySelector('#transfer-request-person-label').textContent = `กำลังพล: ${personName || personId}`;
    form.reset();
    modal.classList.remove('hidden');
    modal.classList.add('active', 'flex');

    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('active', 'flex');
        form.onsubmit = null;
        cancelBtn.onclick = null;
    };
    cancelBtn.onclick = closeModal;
    form.onsubmit = async (event) => {
        event.preventDefault();
        const payload = {
            personnel_id: personId,
            request_type: modal.querySelector('#transfer-request-type').value,
            effective_date: modal.querySelector('#transfer-effective-date').value,
            reason: modal.querySelector('#transfer-reason').value.trim(),
        };
        try {
            const response = await sendRequest('create_my_transfer_request', payload);
            showMessage(response.message, response.status === 'success');
            if (response.status === 'success') {
                closeModal();
                loadMyTransferRequests(true);
            }
        } catch (error) {
            showMessage(error.message, false);
        }
    };
}

export async function handlePersonnelListClick(e) {
    const target = e.target;
    const personId = target.dataset.id;
    if (!personId) return;

    if (target.classList.contains('request-transfer-person-btn')) {
        openTransferRequestModal(personId, target.dataset.name || '');
    } else if (target.classList.contains('delete-person-btn')) {
        showConfirmModal('ยืนยันการลบข้อมูล', 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลกำลังพลนี้?', async () => {
            try {
                const response = await sendRequest('delete_personnel', { id: personId });
                if (response.status === 'success') window.loadDataForPane('pane-personnel');
                showMessage(response.message, response.status === 'success');
            } catch(error) {
                showMessage(error.message, false);
            }
        });
    } else if (target.classList.contains('edit-person-btn')) {
        try {
            const isMyDepartmentList = !!target.closest('#my-personnel-list-area') || (window.currentUser && window.currentUser.role !== 'admin');
            const action = isMyDepartmentList ? 'get_my_personnel_details' : 'get_personnel_details';
            const res = await sendRequest(action, { id: personId });
            if (res.status === 'success' && res.personnel) {
                openPersonnelModal(res.personnel, isMyDepartmentList ? 'my' : 'admin');
            } else {
                showMessage(res.message || 'ไม่พบข้อมูลกำลังพลที่ต้องการแก้ไข', false);
            }
        } catch(error) {
            showMessage(error.message, false);
        }
    }
}


export async function loadMyTransferRequests(showToast = false) {
    if (!window.myTransferRequestsArea) return;
    try {
        const res = await sendRequest('get_my_transfer_requests', {});
        if (res.status === 'success') {
            renderMyTransferRequests(res);
            if (showToast) showMessage('โหลดคำขอล่าสุดแล้ว', true);
        } else {
            showMessage(res.message || 'โหลดคำขอไม่สำเร็จ', false);
        }
    } catch (error) {
        showMessage(error.message, false);
    }
}

export async function loadTransferRequests(showToast = false) {
    if (!window.transferRequestsArea) return;
    const status = window.transferRequestStatusFilter ? window.transferRequestStatusFilter.value : 'pending';
    try {
        const res = await sendRequest('admin_list_transfer_requests', { status });
        if (res.status === 'success') {
            renderTransferRequests(res);
            if (showToast) showMessage('โหลดคำขอย้าย/พ้นจากแผนกล่าสุดแล้ว', true);
        } else {
            showMessage(res.message || 'โหลดคำขอไม่สำเร็จ', false);
        }
    } catch (error) {
        showMessage(error.message, false);
    }
}

export async function loadPermanentPersonnel(showToast = false) {
    if (!window.permanentPersonnelArea) return;
    const search = window.permanentPersonnelSearchInput ? window.permanentPersonnelSearchInput.value.trim() : '';
    try {
        const res = await sendRequest('admin_list_permanent_personnel', { search });
        if (res.status === 'success') {
            renderPermanentPersonnel(res);
            if (showToast) showMessage('โหลดข้อมูลกำลังพลถาวรแล้ว', true);
        } else {
            showMessage(res.message || 'โหลดข้อมูลกำลังพลถาวรไม่สำเร็จ', false);
        }
    } catch (error) {
        showMessage(error.message, false);
    }
}

function chooseDepartmentForTransfer(currentName) {
    const departments = window.transferRequestDepartments || [];
    if (!departments.length) return prompt(`ระบุแผนกปลายทางสำหรับ ${currentName}`) || '';
    const listText = departments.map((d, i) => `${i + 1}. ${d}`).join('\n');
    const answer = prompt(`เลือกเลขแผนกปลายทางสำหรับ ${currentName}\n\n${listText}\n\nพิมพ์เลขลำดับ หรือพิมพ์ชื่อแผนกโดยตรง`);
    if (!answer) return '';
    const index = parseInt(answer, 10);
    if (!Number.isNaN(index) && departments[index - 1]) return departments[index - 1];
    return answer.trim();
}

export async function handleTransferRequestsClick(e) {
    const target = e.target;
    const requestId = target.dataset.requestId;
    if (!requestId) return;
    const personName = target.dataset.personName || 'กำลังพลรายการนี้';

    if (target.classList.contains('approve-internal-transfer-btn')) {
        const toDepartment = chooseDepartmentForTransfer(personName);
        if (!toDepartment) return;
        const adminNote = prompt('หมายเหตุจาก Admin (ถ้ามี)') || '';
        showConfirmModal('ยืนยันอนุมัติย้ายภายในกอง', `อนุมัติให้ ${personName} ย้ายไปแผนก ${toDepartment} ใช่หรือไม่?`, async () => {
            try {
                const response = await sendRequest('admin_decide_transfer_request', { request_id: requestId, decision: 'approve_internal', to_department: toDepartment, admin_note: adminNote });
                showMessage(response.message, response.status === 'success');
                if (response.status === 'success') {
                    loadTransferRequests(true);
                    loadPermanentPersonnel(false);
                    if (window.loadDataForPane) window.loadDataForPane('pane-personnel');
                }
            } catch (error) { showMessage(error.message, false); }
        });
    } else if (target.classList.contains('approve-out-transfer-btn')) {
        const adminNote = prompt('หมายเหตุ/เหตุผลการย้ายออกจากกอง (ถ้ามี)') || '';
        showConfirmModal('ยืนยันย้ายออกจากกอง', `อนุมัติให้ ${personName} ย้ายออกจากกองและเก็บในข้อมูลถาวรใช่หรือไม่?`, async () => {
            try {
                const response = await sendRequest('admin_decide_transfer_request', { request_id: requestId, decision: 'approve_out', admin_note: adminNote });
                showMessage(response.message, response.status === 'success');
                if (response.status === 'success') {
                    loadTransferRequests(true);
                    loadPermanentPersonnel(false);
                    if (window.loadDataForPane) window.loadDataForPane('pane-personnel');
                }
            } catch (error) { showMessage(error.message, false); }
        });
    } else if (target.classList.contains('reject-transfer-btn')) {
        const rejectReason = prompt(`เหตุผลที่ไม่อนุมัติคำขอของ ${personName}`);
        if (!rejectReason) return;
        showConfirmModal('ยืนยันไม่อนุมัติคำขอ', `บันทึกไม่อนุมัติคำขอนี้ใช่หรือไม่?`, async () => {
            try {
                const response = await sendRequest('admin_decide_transfer_request', { request_id: requestId, decision: 'reject', reject_reason: rejectReason });
                showMessage(response.message, response.status === 'success');
                if (response.status === 'success') loadTransferRequests(true);
            } catch (error) { showMessage(error.message, false); }
        });
    }
}

// --- User (Admin) Handlers ---

function ensureResetPasswordModal() {
    let modal = document.getElementById('reset-password-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'reset-password-modal';
    modal.className = 'modal fixed inset-0 bg-gray-600 bg-opacity-50 z-30 hidden items-center justify-center';
    modal.innerHTML = `
        <div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <form id="reset-password-form">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">รีเซ็ตรหัสผ่านผู้ใช้</h3>
                <p id="reset-password-username-label" class="text-sm text-gray-500 mb-4"></p>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">รหัสผ่านใหม่</label>
                        <input type="password" id="reset-new-password" class="mt-1 w-full border rounded px-3 py-2" required autocomplete="new-password">
                        <p class="text-xs text-gray-500 mt-1">อย่างน้อย 8 ตัวอักษร มีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">ยืนยันรหัสผ่านใหม่</label>
                        <input type="password" id="reset-confirm-password" class="mt-1 w-full border rounded px-3 py-2" required autocomplete="new-password">
                    </div>
                </div>
                <div class="items-center px-1 py-3 mt-4 text-right">
                    <button id="cancel-reset-password-btn" type="button" class="px-4 py-2 bg-gray-200 rounded-md mr-2">ยกเลิก</button>
                    <button type="submit" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md">ยืนยันรีเซ็ต</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function openResetPasswordModal(username) {
    const modal = ensureResetPasswordModal();
    const form = modal.querySelector('#reset-password-form');
    const label = modal.querySelector('#reset-password-username-label');
    const passwordInput = modal.querySelector('#reset-new-password');
    const confirmInput = modal.querySelector('#reset-confirm-password');
    const cancelBtn = modal.querySelector('#cancel-reset-password-btn');

    form.reset();
    label.textContent = `ผู้ใช้: ${username}`;
    modal.classList.remove('hidden');
    modal.classList.add('active', 'flex');
    setTimeout(() => passwordInput.focus(), 50);

    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('active', 'flex');
        form.onsubmit = null;
        cancelBtn.onclick = null;
    };

    cancelBtn.onclick = closeModal;
    form.onsubmit = async (event) => {
        event.preventDefault();
        const newPassword = passwordInput.value;
        const confirmPassword = confirmInput.value;

        if (!newPassword || !confirmPassword) {
            showMessage('กรุณากรอกรหัสผ่านใหม่และยืนยันรหัสผ่าน', false);
            return;
        }
        if (newPassword !== confirmPassword) {
            showMessage('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน', false);
            return;
        }

        try {
            const response = await sendRequest('reset_user_password', { username, new_password: newPassword });
            showMessage(response.message, response.status === 'success');
            if (response.status === 'success') closeModal();
        } catch (error) {
            showMessage(error.message, false);
        }
    };
}


export async function handleUserFormSubmit(e) {
    e.preventDefault();
    const username = window.userForm.querySelector('#user-username').value;
    const password = window.userForm.querySelector('#user-password').value;
    const data = {
        username: username, password: password,
        rank: window.userForm.querySelector('#user-rank').value,
        first_name: window.userForm.querySelector('#user-first-name').value,
        last_name: window.userForm.querySelector('#user-last-name').value,
        position: window.userForm.querySelector('#user-position').value,
        department: window.userForm.querySelector('#user-department').value,
        role: window.userForm.querySelector('#user-role').value,
    };
    if (!password) delete data.password;
    const action = window.userForm.querySelector('#user-username').readOnly ? 'update_user' : 'add_user';
    
    try {
        const response = await sendRequest(action, { data });
        if (response.status === 'success') {
            window.userModal.classList.remove('active');
            window.loadDataForPane('pane-admin');
        }
        showMessage(response.message, response.status === 'success');
    } catch(error) {
        showMessage(error.message, false);
    }
}

export async function handleUserListClick(e) {
    const target = e.target;
    const username = target.dataset.username;
    if (!username) return;

    if (target.classList.contains('reset-password-user-btn')) {
        openResetPasswordModal(username);
    } else if (target.classList.contains('delete-user-btn')) {
        showConfirmModal('ยืนยันการลบผู้ใช้', `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ '${username}'?`, async () => {
            try {
                const response = await sendRequest('delete_user', { username: username });
                if (response.status === 'success') window.loadDataForPane('pane-admin');
                showMessage(response.message, response.status === 'success');
            } catch(error) {
                showMessage(error.message, false);
            }
        });
    } else if (target.classList.contains('edit-user-btn')) {
        try {
            const res = await sendRequest('list_users', { page: 1, searchTerm: '' });
            if (res.status === 'success') {
                const userToEdit = res.users.find(u => u.username === username);
                if (userToEdit) openUserModal(userToEdit);
                else showMessage('ไม่พบข้อมูลผู้ใช้ที่ต้องการแก้ไข', false);
            }
        } catch(error) {
            showMessage(error.message, false);
        }
    }
}

// --- Import / Export Handlers ---


export function handleDownloadPersonnelImportTemplate() {
    try {
        if (typeof XLSX === 'undefined') {
            showMessage('ไม่พบไลบรารี XLSX สำหรับสร้างไฟล์ตัวอย่าง กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต/CDN', false);
            return;
        }

        const dataSheetRows = [
            ['ยศ-คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ตำแหน่ง', 'เหล่า', 'แผนก'],
            ['น.อ.', 'สมชาย', 'ใจดี', 'นายทหารกำลังพล', 'ชย.', 'ฝธก.กวก.ชย.ทอ.'],
            ['จ.อ.', 'สมหญิง', 'รักงาน', 'เจ้าหน้าที่ธุรการ', 'สบ.', 'ผวก.กวก.ชย.ทอ.'],
            ['พนักงานราชการ', 'วิชัย', 'ตั้งใจ', 'พนักงานราชการ', 'ชย.', 'ผจง.กวก.ชย.ทอ.'],
            ['ลูกจ้างประจำ', 'วิภา', 'ขยันดี', 'ลูกจ้างประจำ', 'สบ.', 'ผตค.กวก.ชย.ทอ.']
        ];

        const instructionRows = [
            ['คำแนะนำการนำเข้าไฟล์กำลังพล'],
            ['1. ใช้ชีตแรกของไฟล์นี้เป็นแบบฟอร์มนำเข้าเท่านั้น'],
            ['2. ห้ามเปลี่ยนชื่อหัวคอลัมน์แถวแรก เพราะระบบอ่านตามชื่อหัวคอลัมน์'],
            ['3. คอลัมน์ที่ระบบต้องใช้: ยศ-คำนำหน้า, ชื่อ, นามสกุล, ตำแหน่ง, เหล่า, แผนก'],
            ['4. ถ้าชื่อและนามสกุลตรงกับข้อมูลเดิม ระบบจะถือว่าเป็นการอัปเดตข้อมูลเดิม'],
            ['5. ถ้าเป็นคนใหม่ ระบบจะเพิ่มกำลังพลรายการใหม่'],
            ['6. หลังกรอกข้อมูลจริงแล้ว สามารถลบแถวตัวอย่างออกได้'],
            [''],
            ['ตัวอย่างค่าแผนกที่ใช้ในระบบ'],
            ['ฝธก.กวก.ชย.ทอ.'],
            ['ฝธก.กอบ.กวก.ชย.ทอ.'],
            ['ผวก.กวก.ชย.ทอ.'],
            ['ผจง.กวก.ชย.ทอ.'],
            ['ผตค.กวก.ชย.ทอ.'],
            ['ผบผ.กอบ.กวก.ชย.ทอ.'],
            ['ผวคส.กอบ.กวก.ชย.ทอ.'],
            ['ผวร.กอบ.กวก.ชย.ทอ.'],
            ['ผวยธ.กอบ.กวก.ชย.ทอ.']
        ];

        const workbook = XLSX.utils.book_new();
        const dataSheet = XLSX.utils.aoa_to_sheet(dataSheetRows);
        dataSheet['!cols'] = [
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 30 },
            { wch: 12 },
            { wch: 32 }
        ];
        dataSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

        const instructionSheet = XLSX.utils.aoa_to_sheet(instructionRows);
        instructionSheet['!cols'] = [{ wch: 80 }];

        XLSX.utils.book_append_sheet(workbook, dataSheet, 'แบบฟอร์มนำเข้า');
        XLSX.utils.book_append_sheet(workbook, instructionSheet, 'คำแนะนำ');
        XLSX.writeFile(workbook, 'ตัวอย่างไฟล์นำเข้ากำลังพล.xlsx');
    } catch (error) {
        console.error('Error creating personnel import template:', error);
        showMessage('เกิดข้อผิดพลาดในการสร้างไฟล์ตัวอย่าง: ' + error.message, false);
    }
}

export function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            
            // แปลงข้อมูลให้ตรงกับฟอร์แมต Database
            const formattedData = json.map(row => ({
                rank: row['ยศ-คำนำหน้า'] || '', 
                first_name: row['ชื่อ'] || '', 
                last_name: row['นามสกุล'] || '',
                position: row['ตำแหน่ง'] || '', 
                specialty: row['เหล่า'] || '', 
                department: row['แผนก'] || ''
            })).filter(item => item.first_name && item.last_name); // กรองแถวที่ไม่มีชื่อออก

            if (formattedData.length === 0) {
                showMessage("ไม่พบข้อมูลที่ถูกต้องในไฟล์ Excel", false);
                return;
            }

            // ส่งไปตรวจสอบ (Preview) ก่อน
            const response = await sendRequest('preview_import_personnel', { personnel: formattedData });
            
            if (response.status === 'success') {
                pendingImportData = formattedData; // เก็บข้อมูลดิบรอไว้
                showImportPreviewModal(response.preview, response.summary); // แสดง Modal
            } else {
                showMessage(response.message, false);
            }

        } catch (error) {
            console.error("Error processing Excel file:", error);
            showMessage("เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel: " + error.message, false);
        } finally {
            if (window.excelImportInput) window.excelImportInput.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- Submission & Reporting Handlers ---

export function handleReviewStatus() {
    const rows = window.statusSubmissionListArea.querySelectorAll('tr');
    const reviewItems = [];
    let hasError = false;

    if (rows.length === 0) {
        showMessage('ไม่พบข้อมูลกำลังพลที่จะส่ง', false);
        return;
    }

    rows.forEach(row => {
        const statusSelect = row.querySelector('.status-select');
        if (statusSelect && statusSelect.value !== 'ไม่มี') {
            const startDate = row.querySelector('.start-date-input').value;
            const endDate = row.querySelector('.end-date-input').value;
            if (!startDate || !endDate) {
                showMessage('กรุณากรอกวันที่เริ่มต้นและสิ้นสุดสำหรับรายการที่เลือก', false);
                hasError = true; return;
            }
            reviewItems.push({
                personnel_id: row.dataset.personnelId,
                personnel_name: row.dataset.personnelName, 
                status: statusSelect.value,
                details: row.querySelector('.details-input').value,
                start_date: startDate, 
                end_date: endDate
            });
        }
    });

    if (hasError) return;

    if (reviewItems.length === 0) {
        window.reviewListArea.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">ยืนยันการส่งยอด: กำลังพลมาปฏิบัติงานครบถ้วน</td></tr>`;
    } else {
        window.reviewListArea.innerHTML = reviewItems.map(item => {
            const dateRange = formatThaiDateRangeArabic(item.start_date, item.end_date);
            return `<tr>
                        <td class="border-t px-4 py-2 ps-nowrap-name">${escapeHTML(item.personnel_name)}</td>
                        <td class="border-t px-4 py-2">${escapeHTML(item.status)}</td>
                        <td class="border-t px-4 py-2">${escapeHTML(item.details) || '-'}</td>
                        <td class="border-t px-4 py-2">${dateRange}</td>
                    </tr>`;
        }).join('');
    }

    window.submissionFormSection.classList.add('hidden');
    window.reviewReportSection.classList.remove('hidden');
}

export async function handleSubmitStatusReport() {
    const confirmBtn = document.getElementById('confirm-submit-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'กำลังส่ง...';
    }

    const rows = window.statusSubmissionListArea.querySelectorAll('tr');
    const reportItems = [];
    
    rows.forEach(row => {
        const statusSelect = row.querySelector('.status-select');
        if (statusSelect && statusSelect.value !== 'ไม่มี') {
            reportItems.push({
                personnel_id: row.dataset.personnelId, 
                personnel_name: row.dataset.personnelName,
                status: statusSelect.value, 
                details: row.querySelector('.details-input').value,
                start_date: row.querySelector('.start-date-input').value,
                end_date: row.querySelector('.end-date-input').value
            });
        }
    });

    let reportDepartment = window.currentUser.department;
    if (window.currentUser.role === 'admin') {
        const deptSelector = document.getElementById('admin-dept-selector');
        if (deptSelector) {
            reportDepartment = deptSelector.value;
        }
    }

    const report = {
        items: reportItems,
        department: reportDepartment
    };

    try {
        const response = await sendRequest('submit_status_report', { report });
        showMessage(response.message, response.status === 'success');
        if (response.status === 'success') {
            // Fix 35:
            // หลัง User ส่งยอดรายสัปดาห์สำเร็จ ต้องโหลดแท็บส่งยอดใหม่
            // เพื่อให้ backend ส่ง submission_status กลับมา และ UI แสดงกล่องสีเขียว "ส่งแล้ว" ทันที
            // เดิมเคยไปโหลด pane-report ซึ่งเป็นหน้ารายงานรวม ทำให้ User ไม่เห็นสถานะส่งแล้วในหน้าปัจจุบัน
            if (typeof window !== 'undefined') {
                window.editingReportData = null;
            }
            if (window.reviewReportSection) window.reviewReportSection.classList.add('hidden');

            if (window.currentUser.role === 'admin') {
                // Admin ส่งแทนแผนก: กลับมาโหลดฟอร์มส่งยอดใหม่ เพื่อเห็นสถานะแผนกที่เลือกเป็น "ส่งแล้ว"
                window.loadDataForPane('pane-submit-status');
            } else {
                // User ทั่วไป: โหลดฟอร์มของแผนกตัวเองใหม่ แล้ว renderStatusSubmissionForm จะแสดงกล่อง "ส่งแล้ว"
                window.loadDataForPane('pane-submit-status');
            }
        }
    } catch(error) {
        showMessage(error.message, false);
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'ยืนยันและส่งยอด';
        }
    }
}

export async function handleExportAndArchive() {
    const weekRangeText = document.getElementById('report-week-range')?.textContent.replace(/[()]/g, '').trim() || '';
    
    window.archiveConfirmModal.classList.remove('active');
    if (!window.currentWeeklyReports || window.currentWeeklyReports.length === 0) {
        showMessage('ไม่มีข้อมูลรายงานที่จะส่งออก', false);
        return;
    }
    
    exportSingleReportToExcel(window.currentWeeklyReports, `รายงานกำลังพล-${new Date().toISOString().split('T')[0]}.xlsx`, weekRangeText);
    
    try {
        const response = await sendRequest('archive_reports', { 
            reports: window.currentWeeklyReports,
            week_range: weekRangeText 
        });

        showMessage(response.message, response.status === 'success');
        if (response.status === 'success') {
            window.loadDataForPane('pane-report');
        }
    } catch(error) {
        showMessage(error.message, false);
    }
}

export function handleShowArchive() {
    const year = window.archiveYearSelect.value;
    const month = window.archiveMonthSelect.value;
    const archiveTitle = document.getElementById('archive-pane-title');

    if (!year || !month) {
        showMessage('กรุณาเลือกปีและเดือน', false);
        if (archiveTitle) archiveTitle.textContent = 'ประวัติการเก็บรายงานทั้งหมด';
        return;
    }

    const monthName = window.archiveMonthSelect.options[window.archiveMonthSelect.selectedIndex].text;
    if (archiveTitle) {
        archiveTitle.textContent = `ประวัติการเก็บรายงานทั้งหมด - ${monthName} ${year}`;
    }

    const reportsForMonth = window.allArchivedReports[year] ? window.allArchivedReports[year][month] : [];
    renderArchivedReports(reportsForMonth);
}

export function handleArchiveDownloadClick(e) {
    if (e.target.classList.contains('download-daily-archive-btn')) {
        const date = e.target.dataset.date;
        const year = window.archiveYearSelect.value;
        const month = window.archiveMonthSelect.value;
        if (!year || !month || !date) {
            showMessage('กรุณาเลือกปีและเดือนก่อนดาวน์โหลด', false);
            return;
        }

        const reportsForMonth = window.allArchivedReports[year] ? window.allArchivedReports[year][month] : [];
        
        if (!reportsForMonth || !Array.isArray(reportsForMonth)) {
            showMessage('เกิดข้อผิดพลาด: ไม่พบข้อมูลสำหรับเดือนที่เลือก', false);
            return;
        }

        const reportsToDownload = reportsForMonth.filter(r => r.date === date);
        
        if (reportsToDownload.length > 0) {
            exportSingleReportToExcel(reportsToDownload, `รายงานย้อนหลัง-${date}.xlsx`);
        } else {
            showMessage('ไม่พบข้อมูลรายงานที่จะดาวน์โหลดสำหรับวันนี้', false);
        }
    }
}

export async function handleHistoryEditClick(e) {
    const target = e.target;
    if (!target.classList.contains('edit-history-btn')) return;

    const reportId = target.dataset.id;
    if (!reportId) return;

    try {
        const res = await sendRequest('get_report_for_editing', { id: reportId });
        if (res.status === 'success' && res.report) {
            window.editingReportData = res.report;
            window.switchTab('tab-submit-status');
        } else {
            showMessage(res.message || 'ไม่สามารถดึงข้อมูลมาแก้ไขได้', false);
        }
    } catch (error) {
        showMessage(error.message, false);
    }
}

export function handleShowHistory() {
    const year = window.historyYearSelect.value;
    const month = window.historyMonthSelect.value;
    if (!year || !month) {
        showMessage('กรุณาเลือกปีและเดือน', false);
        return;
    }
    const reportsForMonth = window.allHistoryData[year] ? window.allHistoryData[year][month] : [];
    renderFilteredHistoryReports(reportsForMonth);
}



export async function handleWeeklyResetRoundClick(e) {
    const autoSubmitBtn = e.target.closest('#auto-submit-all-weekly-btn');
    if (autoSubmitBtn) {
        const weekRangeText = document.getElementById('report-week-range')?.textContent.replace(/[()]/g, '').trim() || 'รอบรายสัปดาห์ปัจจุบัน';
        const confirmText = `ยืนยันส่งยอดทุกแผนกอัตโนมัติสำหรับ ${weekRangeText} ?\n\nระบบจะเขียนทับรายงานรายสัปดาห์ที่แผนกต่าง ๆ ส่งไว้แล้วในรอบนี้ โดยดึงข้อมูลภารกิจต่อเนื่องของสัญญาบัตรมาใช้`;
        if (!confirm(confirmText)) return;

        const originalText = autoSubmitBtn.textContent;
        autoSubmitBtn.disabled = true;
        autoSubmitBtn.textContent = 'กำลังส่งยอด...';
        try {
            const res = await sendRequest('admin_auto_submit_all_weekly_reports', { overwrite: true });
            showMessage(res.message || 'ส่งยอดรายสัปดาห์อัตโนมัติเรียบร้อย', res.status === 'success');
            if (res.status === 'success') {
                window.editingReportData = null;
                if (window.loadDataForPane) window.loadDataForPane('pane-report');
            }
        } catch (error) {
            showMessage(error.message, false);
        } finally {
            autoSubmitBtn.disabled = false;
            autoSubmitBtn.textContent = originalText;
        }
        return;
    }

    const archiveBtn = e.target.closest('#export-archive-btn');
    if (archiveBtn) {
        if (archiveBtn.disabled) return;
        if (!window.currentWeeklyReports || window.currentWeeklyReports.length === 0) {
            showMessage('ไม่มีข้อมูลรายงานที่จะส่งออก', false);
            return;
        }
        if (window.archiveConfirmModal) {
            window.archiveConfirmModal.classList.add('active');
        }
        return;
    }

    const exportCurrentBtn = e.target.closest('#export-weekly-current-excel-btn');
    if (exportCurrentBtn) {
        if (!window.currentWeeklyReports || window.currentWeeklyReports.length === 0) {
            showMessage('ไม่มีข้อมูลรายงานที่จะส่งออก', false);
            return;
        }
        const weekRangeText = document.getElementById('report-week-range')?.textContent.replace(/[()]/g, '').trim() || '';
        exportSingleReportToExcel(window.currentWeeklyReports, `รายงานกำลังพล-${new Date().toISOString().split('T')[0]}.xlsx`, weekRangeText);
        return;
    }

    const resetBtn = e.target.closest('#weekly-reset-round-btn');
    if (!resetBtn) return;

    const defaultDate = resetBtn.dataset.defaultDate || new Date().toISOString().slice(0, 10);
    const startDate = prompt('ระบุวันที่เริ่มรอบรายสัปดาห์ใหม่ (รูปแบบ YYYY-MM-DD)', defaultDate);
    if (!startDate) return;

    const confirmText = 'การรีเซ็ตรอบรายสัปดาห์จะล้างรายงานที่แผนกส่งไว้ในรอบปัจจุบันทั้งหมด และให้ทุกแผนกส่งใหม่อีกครั้ง\n\nยืนยันรีเซ็ตรอบรายสัปดาห์หรือไม่?';
    if (!confirm(confirmText)) return;

    const originalText = resetBtn.textContent;
    resetBtn.disabled = true;
    resetBtn.textContent = 'กำลังรีเซ็ต...';

    try {
        const res = await sendRequest('reset_weekly_report_round', { start_date: startDate });
        showMessage(res.message || 'รีเซ็ตรอบรายสัปดาห์เรียบร้อย', res.status === 'success');
        if (res.status === 'success') {
            window.editingReportData = null;
            if (window.loadDataForPane) window.loadDataForPane('pane-report');
        }
    } catch (error) {
        showMessage(error.message, false);
    } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = originalText;
    }
}

export async function handleWeeklyReportEditClick(e) {
    const applyBtn = e.target.closest('.apply-weekly-latest-sync-btn');
    if (applyBtn) {
        const reportId = applyBtn.dataset.id;
        if (!reportId) return;
        const confirmed = confirm('อัปเดตรายงานรายสัปดาห์นี้จากข้อมูลภารกิจล่าสุดหรือไม่?\n\nระบบจะเขียนทับรายงานรายสัปดาห์ที่ยังไม่ถูกเก็บด้วยข้อมูลจากตารางภารกิจต่อเนื่องล่าสุด');
        if (!confirmed) return;

        const originalText = applyBtn.textContent;
        applyBtn.disabled = true;
        applyBtn.textContent = 'กำลังอัปเดต...';
        try {
            const res = await sendRequest('apply_weekly_latest_sync', { id: reportId });
            showMessage(res.message || 'อัปเดตข้อมูลล่าสุดแล้ว', res.status === 'success');
            if (res.status === 'success') {
                window.editingReportData = null;
                window.loadDataForPane('pane-report');
            }
        } catch (error) {
            showMessage(error.message, false);
        } finally {
            applyBtn.disabled = false;
            applyBtn.textContent = originalText;
        }
        return;
    }

    const target = e.target.closest('.edit-weekly-report-btn');
    if (!target) return;

    const reportId = target.dataset.id;
    if (!reportId) return;

    try {
        const res = await sendRequest('get_report_for_editing', { id: reportId });
        if (res.status === 'success' && res.report) {
            window.editingReportData = res.report;
            window.switchTab('tab-submit-status');
        } else {
            showMessage(res.message || 'ไม่สามารถดึงข้อมูลมาแก้ไขได้', false);
        }
    } catch (error) {
        showMessage(error.message, false);
    }
}

// *** Holiday Handlers ***
export async function renderHolidays(res) {
    const { holidays } = res;
    if (!window.holidayListContainer) return;
    window.holidayListContainer.innerHTML = '';

    if (!holidays || holidays.length === 0) {
        window.holidayListContainer.innerHTML = '<p class="text-center text-gray-500 p-4">ยังไม่มีวันหยุดที่กำหนดไว้</p>';
        return;
    }
    
    let holidayHTML = '<table class="min-w-full bg-white divide-y divide-gray-200">';
    holidayHTML += `<thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายละเอียด</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                        </tr>
                    </thead>`;
    holidayHTML += '<tbody class="bg-white divide-y divide-gray-200">';

    holidays.forEach(holiday => {
        const formattedDate = new Date(holiday.date + 'T00:00:00').toLocaleDateString('th-TH', {
            dateStyle: 'full'
        });
        holidayHTML += `<tr>
            <td class="px-6 py-4 whitespace-nowrap">${formattedDate}</td>
            <td class="px-6 py-4 whitespace-nowrap">${escapeHTML(holiday.description)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-date="${escapeHTML(holiday.date)}" class="delete-holiday-btn text-red-600 hover:text-red-900">ลบ</button>
            </td>
        </tr>`;
    });

    holidayHTML += '</tbody></table>';
    window.holidayListContainer.innerHTML = holidayHTML;
}

export async function handleAddHoliday(e) {
    e.preventDefault(); 
    const holidayDate = document.getElementById('holiday-date').value;
    const description = document.getElementById('holiday-description').value;
    
    if (!holidayDate || !description) {
        showMessage('กรุณากรอกข้อมูลให้ครบถ้วน', false);
        return;
    }
    
    try {
        const res = await sendRequest('add_holiday', { date: holidayDate, description });
        showMessage(res.message, res.status === 'success');
        if (res.status === 'success') {
            window.holidayForm.reset();
            if (window.holidayDatepicker) {
                window.holidayDatepicker.clear();
            }
            window.loadDataForPane('pane-holidays');
        }
    } catch (error) {
        showMessage(error.message, false);
    }
}

export async function handleDeleteHoliday(e) {
    if (!e.target.classList.contains('delete-holiday-btn')) return;
    
    const holidayDate = e.target.dataset.date;
    showConfirmModal('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบวันหยุดนี้ (${holidayDate})?`, async () => {
        try {
            const res = await sendRequest('delete_holiday', { date: holidayDate });
            showMessage(res.message, res.status === 'success');
            if (res.status === 'success') {
                window.loadDataForPane('pane-holidays');
            }
        } catch (error) {
            showMessage(error.message, false);
        }
    });
}

// --- Helper Functions (Local) ---

// ฟังก์ชันสร้างและแสดง Modal ตรวจสอบข้อมูลนำเข้า (ฉบับแก้ไข: ลบของเก่าทิ้งเพื่อป้องกัน Error)
function showImportPreviewModal(previewData, summary) {
    // 1. ลบ Modal เก่าทิ้งก่อนเสมอ (ป้องกันปัญหาโครงสร้าง HTML ไม่ตรงกัน)
    const existingModal = document.getElementById('import-preview-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // 2. แยกข้อมูลเป็น 2 กลุ่ม
    const newItems = previewData.filter(item => item.import_status === 'new');
    const updateItems = previewData.filter(item => item.import_status === 'update');

    // 3. ฟังก์ชันย่อยสร้างแถวตาราง
    const createTableRows = (items, colorClass) => {
        if (items.length === 0) return '<tr><td colspan="4" class="text-center py-4 text-gray-400">ไม่มีรายการ</td></tr>';
        return items.map((item, index) => `
            <tr class="hover:bg-gray-50 border-b last:border-b-0">
                <td class="py-2 px-4 text-sm text-gray-500">${index + 1}</td>
                <td class="py-2 px-4 text-sm font-medium text-gray-900 ps-nowrap-name">${escapeHTML(item.rank || '')} ${escapeHTML(item.first_name || '')} ${escapeHTML(item.last_name || '')}</td>
                <td class="py-2 px-4 text-sm text-gray-600">${escapeHTML(item.position || '')}</td>
                <td class="py-2 px-4 text-sm text-gray-600">${escapeHTML(item.department || '')}</td>
            </tr>
        `).join('');
    };

    // 4. สร้าง HTML ของ Modal ใหม่
    const modalHTML = `
        <div class="modal-content shadow-xl rounded-lg bg-white overflow-hidden" style="width: 900px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column;">
            
            <div class="modal-header bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
                <h2 class="text-xl font-bold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    ตรวจสอบข้อมูลนำเข้า
                </h2>
                <span class="close-btn text-gray-400 hover:text-white cursor-pointer text-2xl leading-none">&times;</span>
            </div>

            <div class="modal-body bg-gray-50 p-6 overflow-y-auto flex-grow">
                
                <div class="mb-6 bg-white rounded-lg shadow-sm border border-green-200 overflow-hidden">
                    <div class="bg-green-50 px-4 py-2 border-b border-green-200 flex justify-between items-center">
                        <h3 class="font-bold text-green-800 flex items-center gap-2">
                            <span class="bg-green-500 w-2 h-2 rounded-full inline-block"></span>
                            รายชื่อที่จะเพิ่มใหม่ (${newItems.length})
                        </h3>
                    </div>
                    <table class="min-w-full text-left">
                        <thead class="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th class="py-2 px-4 w-12 text-xs uppercase">#</th>
                                <th class="py-2 px-4 text-xs uppercase">ชื่อ-สกุล</th>
                                <th class="py-2 px-4 text-xs uppercase">ตำแหน่ง</th>
                                <th class="py-2 px-4 text-xs uppercase">สังกัด</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${createTableRows(newItems, 'green')}
                        </tbody>
                    </table>
                </div>

                <div class="bg-white rounded-lg shadow-sm border border-orange-200 overflow-hidden">
                    <div class="bg-orange-50 px-4 py-2 border-b border-orange-200 flex justify-between items-center">
                        <h3 class="font-bold text-orange-800 flex items-center gap-2">
                            <span class="bg-orange-500 w-2 h-2 rounded-full inline-block"></span>
                            รายชื่อที่จะอัปเดตข้อมูล (${updateItems.length})
                        </h3>
                        <span class="text-xs text-orange-600">* รายชื่อซ้ำกับในระบบ ข้อมูลยศ/ตำแหน่ง/สังกัด จะถูกอัปเดตตามไฟล์ Excel</span>
                    </div>
                    <table class="min-w-full text-left">
                        <thead class="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th class="py-2 px-4 w-12 text-xs uppercase">#</th>
                                <th class="py-2 px-4 text-xs uppercase">ชื่อ-สกุล</th>
                                <th class="py-2 px-4 text-xs uppercase">ตำแหน่งใหม่</th>
                                <th class="py-2 px-4 text-xs uppercase">สังกัดใหม่</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${createTableRows(updateItems, 'orange')}
                        </tbody>
                    </table>
                </div>

            </div>

            <div class="modal-footer bg-white p-4 border-t flex flex-col gap-4">
                
                <div class="flex justify-between items-center bg-blue-50 px-4 py-3 rounded border border-blue-100">
                    <div class="text-blue-900 font-medium">
                        สรุปรายการทั้งหมด: <span class="text-xl font-bold ml-1">${summary.total}</span> รายการ
                    </div>
                    <div class="flex gap-4 text-sm">
                        <span class="flex items-center gap-1 text-green-700"><span class="w-3 h-3 bg-green-500 rounded-full"></span> เพิ่มใหม่ ${summary.new}</span>
                        <span class="flex items-center gap-1 text-orange-700"><span class="w-3 h-3 bg-orange-500 rounded-full"></span> อัปเดต ${summary.update}</span>
                    </div>
                </div>

                <div class="flex justify-end gap-3">
                    <button id="btn-cancel-import" class="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded transition-colors">ยกเลิก</button>
                    <button id="btn-confirm-import" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow transition-colors flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        ยืนยันการนำเข้าข้อมูล
                    </button>
                </div>
            </div>
        </div>
    `;

    // 5. สร้าง Element ใหม่และนำไปแสดงผล
    const modal = document.createElement('div');
    modal.id = 'import-preview-modal';
    modal.className = 'modal';
    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);

    // 6. ผูก Event Handlers
    const closeAction = () => { modal.classList.remove('active'); pendingImportData = null; };
    modal.querySelector('.close-btn').onclick = closeAction;
    modal.querySelector('#btn-cancel-import').onclick = closeAction;

    modal.querySelector('#btn-confirm-import').onclick = async () => {
        if (!pendingImportData) return;
        const btn = modal.querySelector('#btn-confirm-import');
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> กำลังบันทึก...`;
        btn.disabled = true;

        try {
            const res = await sendRequest('import_personnel', { personnel: pendingImportData });
            if (res.status === 'success') {
                window.loadDataForPane('pane-personnel');
                showMessage(res.message, true);
                closeAction();
            } else {
                showMessage(res.message, false);
            }
        } catch (err) {
            showMessage(err.message, false);
        } finally {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    };

    // 7. แสดง Modal
    setTimeout(() => modal.classList.add('active'), 10);
}
// --- Database Backup Handlers ---
function formatFileSize(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatBackupDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return escapeHTML(String(isoString));
    return date.toLocaleString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

export function renderDatabaseBackups(res) {
    if (!window.backupListContainer) return;
    const backups = res.backups || [];
    if (backups.length === 0) {
        window.backupListContainer.innerHTML = '<p class="text-center text-gray-500 p-6">ยังไม่มีไฟล์สำรองฐานข้อมูล</p>';
        return;
    }

    let html = `<table class="min-w-full bg-white divide-y divide-gray-200">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่สร้าง</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อไฟล์</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ขนาด</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ดาวน์โหลด</th>
            </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">`;

    backups.forEach(backup => {
        html += `<tr>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${formatBackupDate(backup.created_at)}</td>
            <td class="px-4 py-3 text-sm font-mono text-gray-800 break-all">${escapeHTML(backup.filename || '')}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${formatFileSize(backup.size_bytes)}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <a href="${escapeHTML(backup.download_url || '#')}" target="_blank" class="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded">ดาวน์โหลด</a>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    window.backupListContainer.innerHTML = html;
}

export async function handleCreateDatabaseBackup() {
    if (!window.createBackupBtn) return;
    showConfirmModal(
        'ยืนยันการสำรองฐานข้อมูล',
        'ระบบจะสร้างไฟล์สำรองฐานข้อมูลปัจจุบันไว้ในโฟลเดอร์ backups และแสดงให้ดาวน์โหลด ต้องการดำเนินการต่อหรือไม่?',
        async () => {
            const originalText = window.createBackupBtn.textContent;
            window.createBackupBtn.disabled = true;
            window.createBackupBtn.textContent = 'กำลังสำรอง...';
            try {
                const res = await sendRequest('create_database_backup', { reason: 'manual' });
                showMessage(res.message || 'สำรองฐานข้อมูลสำเร็จ', res.status === 'success');
                if (res.status === 'success') {
                    renderDatabaseBackups({ backups: res.backups || [] });
                }
            } catch (error) {
                showMessage(error.message || 'สำรองฐานข้อมูลไม่สำเร็จ', false);
            } finally {
                window.createBackupBtn.disabled = false;
                window.createBackupBtn.textContent = originalText;
            }
        }
    );
}

// --- Online Users Handlers ---
function formatOnlineRelative(seconds) {
    if (seconds === null || seconds === undefined) return '-';
    const value = Number(seconds);
    if (value < 60) return `${value} วินาทีที่แล้ว`;
    const minutes = Math.floor(value / 60);
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    return `${Math.floor(hours / 24)} วันที่แล้ว`;
}

function onlineStatusBadge(status) {
    if (status === 'online') return '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">ออนไลน์</span>';
    if (status === 'idle') return '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">ไม่ได้ใช้งาน</span>';
    return '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">ออฟไลน์</span>';
}

function renderOnlineSummary(counts = {}) {
    if (!window.onlineUsersSummary) return;
    const cards = [
        { label: 'ออนไลน์', value: counts.online || 0, cls: 'bg-green-50 border-green-200 text-green-800' },
        { label: 'ไม่ได้ใช้งาน', value: counts.idle || 0, cls: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
        { label: 'ออฟไลน์', value: counts.offline || 0, cls: 'bg-gray-50 border-gray-200 text-gray-700' },
        { label: 'รวม session', value: counts.total || 0, cls: 'bg-blue-50 border-blue-200 text-blue-800' },
    ];
    window.onlineUsersSummary.innerHTML = cards.map(card => `
        <div class="border rounded-lg p-4 ${card.cls}">
            <div class="text-sm font-medium">${card.label}</div>
            <div class="text-2xl font-bold mt-1">${card.value}</div>
        </div>
    `).join('');
}

export function renderOnlineUsers(res) {
    if (!window.onlineUsersListArea) return;
    const users = res.users || [];
    renderOnlineSummary(res.counts || {});

    if (users.length === 0) {
        window.onlineUsersListArea.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500 py-6">ยังไม่มีข้อมูลผู้ใช้งานออนไลน์</td></tr>';
        return;
    }

    window.onlineUsersListArea.innerHTML = users.map(user => {
        const displayName = user.full_name ? `${user.username}<br><span class="text-xs text-gray-500">${user.full_name}</span>` : user.username;
        const roleText = user.role === 'admin' ? 'Admin' : 'User';
        const roleClass = user.role === 'admin' ? 'text-red-600 font-semibold' : 'text-gray-700';
        return `<tr>
            <td class="px-4 py-3 whitespace-nowrap">${onlineStatusBadge(user.status)}</td>
            <td class="px-4 py-3 font-mono text-sm ps-nowrap-cell">${displayName}</td>
            <td class="px-4 py-3 text-sm ps-nowrap-cell">${escapeHTML(user.department || '-')}</td>
            <td class="px-4 py-3 text-sm ${roleClass}">${roleText}</td>
            <td class="px-4 py-3 text-sm">${escapeHTML(user.current_page || '-')}</td>
            <td class="px-4 py-3 text-sm font-mono">${escapeHTML(user.ip_address || '-')}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${formatOnlineRelative(user.seconds_since_seen)}</td>
        </tr>`;
    }).join('');
}

export async function loadOnlineUsers(showLoading = false) {
    if (!window.onlineUsersListArea) return;
    if (showLoading) {
        window.onlineUsersListArea.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500 py-6">กำลังโหลดข้อมูล...</td></tr>';
    }
    try {
        const res = await sendRequest('get_online_users', {});
        if (res.status === 'success') {
            renderOnlineUsers(res);
        } else {
            showMessage(res.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้งานออนไลน์ได้', false);
        }
    } catch (error) {
        showMessage(error.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้งานออนไลน์ได้', false);
    }
}
