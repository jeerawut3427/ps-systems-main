// utils.js
// Contains helper and utility functions for data formatting and export.

// --- Helper Functions ---

function toThaiNumerals(n) {
    if (n === null || n === undefined) return '';
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return n.toString().replace(/[0-9]/g, d => thaiDigits[parseInt(d)]);
}

function getThaiHeaderDate(date) {
    const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const d = new Date(date);
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear() + 543;
    return `${toThaiNumerals(day)} ${month} ${toThaiNumerals(year)}`;
}

export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// --- Fix 43: Master status list based on ทอ.กพ.025 ---
export const TAF025_STATUS_GROUPS = [
    {
        label: 'ปกติ / อยู่ปฏิบัติงาน',
        options: [
            { value: 'ปฏิบัติงานในหน่วย', label: 'ปฏิบัติงานในหน่วย', adminOnly: true },
        ]
    },
    {
        label: 'ราชการ / ภารกิจ / ศึกษา',
        options: [
            { value: 'ราชการ', label: 'ราชการ' },
            { value: 'คุมงาน', label: 'คุมงาน' },
            { value: 'ศึกษา', label: 'ศึกษา' },
            { value: 'อบรม/ฝึก', label: 'อบรม/ฝึก' },
            { value: 'ช่วยราชการ', label: 'ช่วยราชการ' },
        ]
    },
    {
        label: 'ลา / ป่วย',
        options: [
            { value: 'ป่วยที่ รพ.', label: 'ป่วยที่ รพ.' },
            { value: 'ลาป่วยนอก รพ.', label: 'ลาป่วยนอก รพ.' },
            { value: 'ลากิจ', label: 'ลากิจ' },
            { value: 'ลาพักผ่อน', label: 'ลาพักผ่อน' },
            { value: 'ลาพักเกษียณอายุราชการ', label: 'ลาพักเกษียณอายุราชการ' },
            { value: 'ลาคลอด', label: 'ลาคลอด' },
            { value: 'ลาช่วยภรรยาเลี้ยงดูบุตร', label: 'ลาช่วยภรรยาเลี้ยงดูบุตร' },
            { value: 'ลาอุปสมบท', label: 'ลาอุปสมบท' },
            { value: 'ประกอบพิธีทางศาสนาอิสลาม', label: 'ประกอบพิธีทางศาสนาอิสลาม' },
        ]
    },
    {
        label: 'สถานะพิเศษ / จำหน่ายยอด',
        options: [
            { value: 'โทษ', label: 'โทษ', adminOnly: true },
            { value: 'ขาด', label: 'ขาด', adminOnly: true },
            { value: 'หนี', label: 'หนี', adminOnly: true },
            { value: 'ต้องโทษคดีอาญา', label: 'ต้องโทษคดีอาญา', adminOnly: true },
            { value: 'เสียชีวิต', label: 'เสียชีวิต', adminOnly: true },
            { value: 'สาบสูญ', label: 'สาบสูญ', adminOnly: true },
            { value: 'สรก.และพักราชการ', label: 'สรก.และพักราชการ', adminOnly: true },
            { value: 'เกษียณอายุราชการ', label: 'เกษียณอายุราชการ', adminOnly: true },
        ]
    },
    {
        label: 'ส่วนขึ้นสมทบ',
        options: [
            { value: 'ส่วนขึ้นสมทบ', label: 'ส่วนขึ้นสมทบ', adminOnly: true },
        ]
    },
];

export const TAF025_STATUS_COLUMNS = [
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

export function normalizeTaf025Status(status) {
    const raw = (status || '').toString().trim();
    const compact = raw.replace(/\s+/g, '');
    if (!compact || ['ไม่มี', 'ปกติ', 'ว่าง', 'ปฏิบัติงานปกติ'].includes(compact)) return 'ปฏิบัติงานในหน่วย';
    if (compact.includes('ปฏิบัติงานในหน่วย')) return 'ปฏิบัติงานในหน่วย';
    if (compact.includes('ลาพักเกษียณ') || compact.includes('พักเกษียณ')) return 'ลาพักเกษียณอายุราชการ';
    if (compact.includes('เกษียณ')) return 'เกษียณอายุราชการ';
    if (compact.includes('ส่วนขึ้นสมทบ')) return 'ส่วนขึ้นสมทบ';
    if (compact.includes('สรก') || compact.includes('พักราชการ')) return 'สรก.และพักราชการ';
    if (compact.includes('ต้องโทษ')) return 'ต้องโทษคดีอาญา';
    if (compact.includes('เสียชีวิต')) return 'เสียชีวิต';
    if (compact.includes('สาบสูญ')) return 'สาบสูญ';
    if (compact === 'โทษ' || compact.includes('ถูกโทษ')) return 'โทษ';
    if (compact.includes('ขาด')) return 'ขาด';
    if (compact.includes('หนี')) return 'หนี';
    if (compact.includes('ช่วยราชการ')) return 'ช่วยราชการ';
    if (compact.includes('คุมงาน') || compact.includes('ควบคุมงาน')) return 'คุมงาน';
    if (compact.includes('ราชการ')) return 'ราชการ';
    if (compact.includes('ศึกษา')) return 'ศึกษา';
    if (compact.includes('อบรม') || compact.includes('ฝึก') || compact.includes('สัมมนา')) return 'อบรม/ฝึก';
    if (compact.includes('ป่วยที่รพ') || compact.includes('ป่วยที่โรงพยาบาล')) return 'ป่วยที่ รพ.';
    if (compact.includes('ลาป่วย') || compact === 'ป่วย') return 'ลาป่วยนอก รพ.';
    if (compact.includes('ลากิจ')) return 'ลากิจ';
    if (compact.includes('ลาพักผ่อน') || compact === 'พักผ่อน') return 'ลาพักผ่อน';
    if (compact.includes('ลาคลอด')) return 'ลาคลอด';
    if (compact.includes('ช่วยภรรยา')) return 'ลาช่วยภรรยาเลี้ยงดูบุตร';
    if (compact.includes('อุปสมบท')) return 'ลาอุปสมบท';
    if (compact.includes('อิสลาม')) return 'ประกอบพิธีทางศาสนาอิสลาม';
    return raw;
}

export function buildTaf025StatusOptionsHtml({ includeNone = true, isAdmin = false, selected = '' } = {}) {
    const current = normalizeTaf025Status(selected || '');
    let html = includeNone ? '<option value="ไม่มี">ปฏิบัติงานในหน่วย / ไม่มีภารกิจ</option>' : '<option value="">ทั้งหมด</option>';
    for (const group of TAF025_STATUS_GROUPS) {
        const options = group.options.filter(opt => (isAdmin || !opt.adminOnly) && !(includeNone && opt.value === 'ปฏิบัติงานในหน่วย'));
        if (!options.length) continue;
        html += `<optgroup label="${escapeHTML(group.label)}">`;
        for (const opt of options) {
            const selectedAttr = current === opt.value ? ' selected' : '';
            html += `<option value="${escapeHTML(opt.value)}"${selectedAttr}>${escapeHTML(opt.label)}</option>`;
        }
        html += '</optgroup>';
    }
    return html;
}

// --- Arabic Numeral Formatters (for UI Display) ---

export function formatThaiDateArabic(isoDate) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const thaiMonthsAbbr = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const year = date.getFullYear() + 543;
    const month = thaiMonthsAbbr[date.getMonth()];
    const day = date.getDate();
    return `${day} ${month}${String(year).slice(-2)}`;
}

export function formatThaiDateRangeArabic(startDateIso, endDateIso) {
    if (!startDateIso || !endDateIso) return 'N/A';
    
    const thaiMonthsAbbr = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const startDate = new Date(startDateIso);
    const endDate = new Date(endDateIso);

    if (startDate.getTime() === endDate.getTime()) {
        return formatThaiDateArabic(startDateIso);
    }

    const startDay = startDate.getDate();
    const startMonthAbbr = thaiMonthsAbbr[startDate.getMonth()];
    const startYearBE = startDate.getFullYear() + 543;

    const endDay = endDate.getDate();
    const endMonthAbbr = thaiMonthsAbbr[endDate.getMonth()];
    const endYearBE = endDate.getFullYear() + 543;

    if (startYearBE !== endYearBE) {
        return `${startDay} ${startMonthAbbr}${String(startYearBE).slice(-2)} - ${endDay} ${endMonthAbbr}${String(endYearBE).slice(-2)}`;
    }

    if (startDate.getMonth() !== endDate.getMonth()) {
        return `${startDay} ${startMonthAbbr} - ${endDay} ${endMonthAbbr}${String(endYearBE).slice(-2)}`;
    }

    return `${startDay} - ${endDay} ${startMonthAbbr}${String(endYearBE).slice(-2)}`;
}


// --- Thai Numeral Formatters (for Excel Export) ---

function formatThaiDateThai(isoDate) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const thaiMonthsAbbr = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const year = date.getFullYear() + 543;
    const month = thaiMonthsAbbr[date.getMonth()];
    const day = date.getDate();
    return `${toThaiNumerals(day)} ${month}${toThaiNumerals(String(year).slice(-2))}`;
}

function formatThaiDateRangeThai(startDateIso, endDateIso) {
    if (!startDateIso || !endDateIso) return 'N/A';
    
    const thaiMonthsAbbr = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const startDate = new Date(startDateIso);
    const endDate = new Date(endDateIso);

    if (startDate.getTime() === endDate.getTime()) {
        return formatThaiDateThai(startDateIso);
    }

    const startDay = startDate.getDate();
    const startMonthAbbr = thaiMonthsAbbr[startDate.getMonth()];
    const startYearBE = startDate.getFullYear() + 543;

    const endDay = endDate.getDate();
    const endMonthAbbr = thaiMonthsAbbr[endDate.getMonth()];
    const endYearBE = endDate.getFullYear() + 543;

    if (startYearBE !== endYearBE) {
        return `${toThaiNumerals(startDay)} ${startMonthAbbr}${toThaiNumerals(String(startYearBE).slice(-2))} - ${toThaiNumerals(endDay)} ${endMonthAbbr}${toThaiNumerals(String(endYearBE).slice(-2))}`;
    }

    if (startDate.getMonth() !== endDate.getMonth()) {
        return `${toThaiNumerals(startDay)} ${startMonthAbbr} - ${toThaiNumerals(endDay)} ${endMonthAbbr}${toThaiNumerals(String(endYearBE).slice(-2))}`;
    }

    return `${toThaiNumerals(startDay)} - ${toThaiNumerals(endDay)} ${startMonthAbbr}${toThaiNumerals(String(endYearBE).slice(-2))}`;
}


export function exportSingleReportToExcel(reports, fileName, weekRangeText) {
    const dataForExport = [];
    let allItems = [];
    reports.forEach(report => {
        allItems = allItems.concat(report.items);
    });

    // --- START: Added sorting logic ---
    // Define the desired rank order from highest to lowest.
    const RANK_ORDER = [
        'น.อ.(พ)', 'น.อ.(พ).หญิง', 'น.อ.หม่อมหลวง', 'น.อ.', 'น.อ.หญิง',
        'น.ท.', 'น.ท.หญิง', 'น.ต.', 'น.ต.หญิง',
        'ร.อ.', 'ร.อ.หญิง', 'ร.ท.', 'ร.ท.หญิง', 'ร.ต.', 'ร.ต.หญิง',
        'พ.อ.อ.(พ)', 'พ.อ.อ.หญิง(พ)', 'พ.อ.อ.', 'พ.อ.อ.หญิง', 'พ.อ.ท.', 'พ.อ.ท.หญิง',
        'พ.อ.ต.', 'พ.อ.ต.หญิง', 'จ.อ.', 'จ.อ.หญิง', 'จ.ท.', 'จ.ท.หญิง',
        'จ.ต.', 'จ.ต.หญิง', 'นาย', 'นาง', 'นางสาว'
    ];

    // Sort the allItems array based on the rank.
    allItems.sort((a, b) => {
        const rankA = a.personnel_name.split(' ')[0];
        const rankB = b.personnel_name.split(' ')[0];
        const indexA = RANK_ORDER.indexOf(rankA);
        const indexB = RANK_ORDER.indexOf(rankB);

        // If a rank is not in our list, treat it as lowest priority.
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        // Compare the ranks based on their position in RANK_ORDER.
        return indexA - indexB;
    });
    // --- END: Added sorting logic ---

    allItems.forEach((item, index) => {
        const nameParts = item.personnel_name.split(' ');
        const rank = nameParts.length > 0 ? nameParts[0] : '';
        const firstName = nameParts.length > 1 ? nameParts[1] : '';
        const lastName = nameParts.length > 2 ? nameParts.slice(2).join(' ') : '';
        
        const fullName = `${firstName}  ${lastName}`;
        const dateRange = formatThaiDateRangeThai(item.start_date, item.end_date);
        
    let combinedDetails = toThaiNumerals(item.status);
    if (item.details) {
    combinedDetails += ` ${toThaiNumerals(item.details)}`;
}
        combinedDetails += ` (${dateRange})`;

        dataForExport.push({
            'ลำดับ': toThaiNumerals(index + 1),
            'ยศ': rank,
            'ชื่อ-สกุล': fullName,
            'สภาพการณ์หรือการเปลี่ยนแปลง': combinedDetails,
            'หมายเหตุ': ''
        });
    });

    let dateRangeString;
    if (weekRangeText) {
        dateRangeString = `ระหว่างวันที่ ${weekRangeText.replace(/[()]/g, '').trim()}`;
    } else {
        const allDates = reports.map(r => new Date(r.date));
        if (allDates.length > 0) {
            const minDate = new Date(Math.min.apply(null, allDates));
            const maxDate = new Date(Math.max.apply(null, allDates));
            if (minDate.getTime() === maxDate.getTime()) {
                dateRangeString = `ประจำวันที่ ${getThaiHeaderDate(minDate)}`;
            } else {
                dateRangeString = `ระหว่างวันที่ ${getThaiHeaderDate(minDate)} ถึง ${getThaiHeaderDate(maxDate)}`;
            }
        } else {
            dateRangeString = "ไม่ระบุช่วงวันที่";
        }
    }

    const wb = XLSX.utils.book_new();
    const ws_data = [
        ["บัญชีรายชื่อ น.สัญญาบัตรที่ไปราชการ, คุมงาน, ศึกษา, ลากิจ และลาพักผ่อน ประจำสัปดาห์ของ กวก.ชย.ทอ."],
        [dateRangeString],
        ["ลำดับ", "ยศ", "ชื่อ-สกุล", "สภาพการณ์หรือการเปลี่ยนแปลง", "หมายเหตุ"]
    ];

    dataForExport.forEach(row => {
        ws_data.push([
            row['ลำดับ'],
            row['ยศ'],
            row['ชื่อ-สกุล'],
            row['สภาพการณ์หรือการเปลี่ยนแปลง'],
            row['หมายเหตุ']
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // A1-E1
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }  // A2-E2
    ];

    ws['!cols'] = [
        { wch: 10 }, // ลำดับ
        { wch: 20 }, // ยศ
        { wch: 40 }, // ชื่อ-สกุล
        { wch: 60 }, // สภาพการณ์หรือการเปลี่ยนแปลง
        { wch: 20 }  // หมายเหตุ
    ];

    XLSX.utils.book_append_sheet(wb, ws, "รายงาน");
    XLSX.writeFile(wb, fileName || "รายงาน.xlsx");
}