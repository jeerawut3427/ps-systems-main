// activity.js
// ส่ง heartbeat เพื่อบันทึกผู้ใช้งานออนไลน์ และแจ้งเตือน Admin เมื่อมีผู้ใช้ login
(function () {
    const HEARTBEAT_INTERVAL_MS = 30 * 1000;
    const LOGIN_NOTIFICATION_INTERVAL_MS = 15 * 1000;
    const LOGIN_NOTIFICATION_STORAGE_KEY = 'ps_last_login_notification_id';

    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch (e) {
            return null;
        }
    }

    function hasLoggedInUser() {
        return !!getCurrentUser();
    }

    function isAdminUser() {
        const user = getCurrentUser();
        return !!user && user.role === 'admin';
    }

    function getActiveTabText() {
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab && activeTab.textContent) {
            return activeTab.textContent.replace(/\s+/g, ' ').trim();
        }
        return '';
    }

    function getCurrentPageName() {
        const path = window.location.pathname || '';
        const params = new URLSearchParams(window.location.search || '');
        const view = params.get('view');

        if (path.includes('daily')) {
            const tab = getActiveTabText();
            return tab ? `รายวัน - ${tab}` : 'ระบบส่งยอดประจำวัน';
        }
        if (path.includes('personnel_status')) return 'ตรวจสอบรายชื่อและทดสอบระบบ';
        if (path.includes('selection')) return 'หน้าเลือกระบบ';
        if (path.includes('main')) {
            if (view === 'personnel') return 'จัดการกำลังพล';
            if (view === 'users') return 'จัดการผู้ใช้';
            if (view === 'holidays') return 'จัดการวันหยุด';
            if (view === 'backups') return 'สำรองฐานข้อมูล';
            if (view === 'active_statuses') return 'สถานะกำลังพล';
            if (view === 'my_personnel') return 'ข้อมูลกำลังพลแผนก';
            const tab = getActiveTabText();
            return tab ? `รายสัปดาห์ - ${tab}` : 'ระบบส่งยอดประจำสัปดาห์';
        }
        return document.title || path || 'ไม่ระบุหน้า';
    }

    async function callApi(action, payload) {
        const response = await fetch('/api', {
            method: 'POST',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload: payload || {} })
        });
        return response.json();
    }

    async function sendHeartbeat() {
        if (!hasLoggedInUser()) return;
        try {
            await callApi('update_user_activity', { current_page: getCurrentPageName() });
        } catch (e) {
            // ไม่แสดง error ให้ผู้ใช้ เพราะเป็นระบบติดตามสถานะเสริม ไม่ใช่งานหลัก
            console.warn('activity heartbeat failed', e);
        }
    }

    function ensureToastContainer() {
        let container = document.getElementById('admin-login-toast-container');
        if (container) return container;

        container = document.createElement('div');
        container.id = 'admin-login-toast-container';
        container.className = 'fixed top-4 right-4 z-[9999] space-y-3 w-full max-w-sm pointer-events-none';
        document.body.appendChild(container);
        return container;
    }

    function formatThaiTime(isoString) {
        if (!isoString) return '';
        try {
            return new Date(isoString).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (e) {
            return '';
        }
    }

    function showLoginToast(event) {
        const container = ensureToastContainer();
        const displayName = event.full_name || event.username || 'ผู้ใช้';
        const department = event.department || '-';
        const ipAddress = event.ip_address || '-';
        const loginTime = formatThaiTime(event.created_at);

        const toast = document.createElement('div');
        toast.className = [
            'pointer-events-auto overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10 border-l-4 border-green-500',
            'transform transition-all duration-300 ease-out translate-x-4 opacity-0'
        ].join(' ');
        toast.innerHTML = `
            <div class="p-4">
                <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">✓</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-3">
                            <p class="text-sm font-bold text-gray-900">มีผู้ใช้งานเข้าสู่ระบบ</p>
                            <button type="button" class="login-toast-close text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
                        </div>
                        <p class="mt-1 text-sm text-gray-800 truncate">${escapeHtml(displayName)} <span class="text-gray-500">(${escapeHtml(event.username || '')})</span></p>
                        <p class="mt-1 text-xs text-gray-600">แผนก: ${escapeHtml(department)} | IP: ${escapeHtml(ipAddress)}</p>
                        ${loginTime ? `<p class="mt-1 text-xs text-gray-500">เวลา: ${escapeHtml(loginTime)}</p>` : ''}
                    </div>
                </div>
            </div>
        `;

        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-4', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        });

        const close = () => {
            toast.classList.add('translate-x-4', 'opacity-0');
            window.setTimeout(() => toast.remove(), 300);
        };
        const closeBtn = toast.querySelector('.login-toast-close');
        if (closeBtn) closeBtn.addEventListener('click', close);
        window.setTimeout(close, 8000);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function pollLoginNotifications() {
        if (!isAdminUser()) return;

        const storedId = localStorage.getItem(LOGIN_NOTIFICATION_STORAGE_KEY);
        const hasBaseline = storedId !== null && storedId !== '';
        const payload = hasBaseline
            ? { after_id: Number(storedId) || 0 }
            : { initialize: true };

        try {
            const result = await callApi('get_login_notifications', payload);
            if (!result || result.status !== 'success') return;

            const events = Array.isArray(result.events) ? result.events : [];
            events.forEach(showLoginToast);

            if (result.latest_id !== undefined && result.latest_id !== null) {
                localStorage.setItem(LOGIN_NOTIFICATION_STORAGE_KEY, String(result.latest_id));
            }
        } catch (e) {
            console.warn('login notification polling failed', e);
        }
    }

    function startLoginNotificationPolling() {
        if (!isAdminUser()) return;
        pollLoginNotifications();
        window.setInterval(pollLoginNotifications, LOGIN_NOTIFICATION_INTERVAL_MS);
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!hasLoggedInUser()) return;
        sendHeartbeat();
        window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                sendHeartbeat();
                pollLoginNotifications();
            }
        });
        startLoginNotificationPolling();
    });
})();
