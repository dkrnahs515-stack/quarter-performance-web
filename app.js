const STORAGE_KEY = "gsyouth-quarter-performance-v1";

const CATEGORY_ORDER = [
  "강서청소년회관 이용",
  "프로그램 개발 및 외부 공모사업 참여",
  "프로그램 이용현황",
  "학교 교육과정 지원사업",
  "특별 프로그램 운영현황",
  "동아리활동지원사업",
  "교육문화 프로그램 등록현황",
  "청소년아지트 월별 이용현황",
  "지출내역",
  "기타"
];

const els = {
  filterYear: document.querySelector("#filterYear"),
  filterQuarter: document.querySelector("#filterQuarter"),
  form: document.querySelector("#recordForm"),
  category: document.querySelector("#category"),
  validationList: document.querySelector("#validationList"),
  validationStatus: document.querySelector("#validationStatus"),
  recordsBody: document.querySelector("#recordsTable tbody"),
  summaryBody: document.querySelector("#summaryTable tbody"),
  editingLabel: document.querySelector("#editingLabel"),
  importJson: document.querySelector("#importJson"),
  kpiRecords: document.querySelector("#kpiRecords"),
  kpiSessions: document.querySelector("#kpiSessions"),
  kpiPeople: document.querySelector("#kpiPeople"),
  kpiIssues: document.querySelector("#kpiIssues")
};

const numberFields = ["sessions", "youthCount", "adultCount", "leaderCount", "reportedTotal", "revenue", "expense"];
let records = loadRecords();

init();

function init() {
  renderCategoryOptions();
  bindEvents();
  renderAll();
}

function renderCategoryOptions() {
  els.category.innerHTML = `<option value="">선택</option>` + CATEGORY_ORDER.map(c => `<option>${escapeHtml(c)}</option>`).join("");
}

function bindEvents() {
  els.form.addEventListener("submit", saveRecord);
  document.querySelector("#btnReset").addEventListener("click", resetForm);
  document.querySelector("#btnAutoTotal").addEventListener("click", () => {
    const total = getNum("youthCount") + getNum("adultCount") + getNum("leaderCount");
    document.querySelector("#reportedTotal").value = total;
  });
  document.querySelector("#btnSample").addEventListener("click", loadSample);
  document.querySelector("#btnPrint").addEventListener("click", () => window.print());
  document.querySelector("#btnExportCsv").addEventListener("click", exportCsv);
  document.querySelector("#btnExportJson").addEventListener("click", exportJson);
  document.querySelector("#btnClearAll").addEventListener("click", clearAll);
  els.importJson.addEventListener("change", importJson);
  els.filterYear.addEventListener("input", renderAll);
  els.filterQuarter.addEventListener("change", renderAll);
  ["youthCount", "adultCount", "leaderCount"].forEach(id => {
    document.querySelector(`#${id}`).addEventListener("input", () => {
      const reported = document.querySelector("#reportedTotal");
      if (!reported.value || Number(reported.value) === 0) {
        reported.value = getNum("youthCount") + getNum("adultCount") + getNum("leaderCount");
      }
    });
  });
}

function saveRecord(event) {
  event.preventDefault();
  const record = readForm();
  const issues = validateRecord(record, records.filter(r => r.id !== record.id));
  const hasError = issues.some(i => i.level === "error");
  if (hasError) {
    alert("오류가 있는 항목이 있습니다. 자체 검증 결과를 확인한 뒤 수정해 주세요.");
    renderValidation([record], records.filter(r => r.id !== record.id));
    return;
  }

  const index = records.findIndex(r => r.id === record.id);
  if (index >= 0) records[index] = record;
  else records.push(record);
  saveRecords();
  resetForm();
  renderAll();
}

function readForm() {
  const id = document.querySelector("#recordId").value || crypto.randomUUID();
  const record = {
    id,
    year: Number(els.filterYear.value),
    quarter: Number(els.filterQuarter.value),
    team: val("team"),
    category: val("category"),
    subCategory: val("subCategory"),
    programName: val("programName"),
    startDate: val("startDate"),
    endDate: val("endDate"),
    location: val("location"),
    target: val("target"),
    sessions: getNum("sessions"),
    youthCount: getNum("youthCount"),
    adultCount: getNum("adultCount"),
    leaderCount: getNum("leaderCount"),
    reportedTotal: getNum("reportedTotal"),
    revenue: getNum("revenue"),
    expense: getNum("expense"),
    manager: val("manager"),
    memo: val("memo"),
    updatedAt: new Date().toISOString()
  };
  return record;
}

function fillForm(record) {
  document.querySelector("#recordId").value = record.id;
  Object.entries(record).forEach(([key, value]) => {
    const input = document.querySelector(`#${key}`);
    if (input) input.value = value ?? "";
  });
  els.filterYear.value = record.year;
  els.filterQuarter.value = record.quarter;
  els.editingLabel.textContent = "수정 중";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  els.form.reset();
  document.querySelector("#recordId").value = "";
  document.querySelector("#sessions").value = 1;
  ["youthCount", "adultCount", "leaderCount", "reportedTotal", "revenue", "expense"].forEach(id => document.querySelector(`#${id}`).value = 0);
  els.editingLabel.textContent = "신규 입력";
}

function renderAll() {
  const filtered = getFilteredRecords();
  const allIssues = getAllIssues(filtered);
  renderKpis(filtered, allIssues);
  renderValidation(filtered);
  renderSummary(filtered);
  renderRecords(filtered);
}

function getFilteredRecords() {
  const year = Number(els.filterYear.value);
  const quarter = Number(els.filterQuarter.value);
  return [...records]
    .filter(r => Number(r.year) === year && Number(r.quarter) === quarter)
    .sort(compareRecords);
}

function compareRecords(a, b) {
  return categoryIndex(a.category) - categoryIndex(b.category)
    || String(a.team).localeCompare(String(b.team), "ko")
    || String(a.startDate).localeCompare(String(b.startDate))
    || String(a.programName).localeCompare(String(b.programName), "ko");
}

function categoryIndex(category) {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? 999 : index;
}

function renderKpis(list, issues) {
  els.kpiRecords.textContent = formatNumber(list.length);
  els.kpiSessions.textContent = formatNumber(sum(list, "sessions"));
  els.kpiPeople.textContent = formatNumber(list.reduce((acc, r) => acc + calcTotal(r), 0));
  els.kpiIssues.textContent = formatNumber(issues.length);
}

function renderValidation(list, extraList = []) {
  const target = extraList.length ? [...extraList, ...list] : list;
  const issues = getAllIssues(target);
  els.validationList.innerHTML = "";
  if (!issues.length) {
    els.validationStatus.textContent = "정상";
    els.validationStatus.style.color = "#059669";
    els.validationList.innerHTML = `<div class="validation-item"><strong>검증 완료</strong>현재 기준 분기의 오류가 없습니다.</div>`;
    return;
  }
  const errorCount = issues.filter(i => i.level === "error").length;
  els.validationStatus.textContent = errorCount ? `오류 ${errorCount}건` : `주의 ${issues.length}건`;
  els.validationStatus.style.color = errorCount ? "#dc2626" : "#d97706";
  els.validationList.innerHTML = issues.map(issue => `
    <div class="validation-item ${issue.level}">
      <strong>${issue.level === "error" ? "오류" : "주의"} · ${escapeHtml(issue.programName || "입력 중")}</strong>
      <span>${escapeHtml(issue.message)}</span>
    </div>
  `).join("");
}

function getAllIssues(list) {
  return list.flatMap((record, index) => validateRecord(record, list.filter((_, i) => i !== index)));
}

function validateRecord(record, others = []) {
  const issues = [];
  const required = [
    ["team", "팀명"], ["category", "대분류"], ["programName", "사업/프로그램명"], ["startDate", "시작일"]
  ];
  required.forEach(([key, label]) => {
    if (!record[key]) issues.push(issue("error", record, `${label}이(가) 비어 있습니다.`));
  });

  if (!CATEGORY_ORDER.includes(record.category)) {
    issues.push(issue("warn", record, "표준 카테고리에 없는 대분류입니다. 요약표에서 기타 순서로 정렬됩니다."));
  }

  const period = getQuarterPeriod(record.year, record.quarter);
  if (record.startDate && !isValidDate(record.startDate)) {
    issues.push(issue("error", record, "시작일 형식이 올바르지 않습니다."));
  }
  if (record.endDate && !isValidDate(record.endDate)) {
    issues.push(issue("error", record, "종료일 형식이 올바르지 않습니다."));
  }
  if (record.startDate && isValidDate(record.startDate)) {
    const start = toDate(record.startDate);
    if (start < period.start || start > period.end) {
      issues.push(issue("error", record, `${record.quarter}분기 범위를 벗어난 시작일입니다.`));
    }
  }
  if (record.endDate && record.startDate && isValidDate(record.startDate) && isValidDate(record.endDate)) {
    const start = toDate(record.startDate);
    const end = toDate(record.endDate);
    if (end < start) issues.push(issue("error", record, "종료일이 시작일보다 빠릅니다."));
    if (end < period.start || end > period.end) issues.push(issue("warn", record, `${record.quarter}분기 범위를 벗어난 종료일입니다.`));
  }

  numberFields.forEach(key => {
    if (Number.isNaN(Number(record[key]))) issues.push(issue("error", record, `${key} 값이 숫자가 아닙니다.`));
    if (Number(record[key]) < 0) issues.push(issue("error", record, `${key} 값은 음수로 입력할 수 없습니다.`));
  });
  if (record.sessions <= 0) issues.push(issue("error", record, "회기 수는 1 이상이어야 합니다."));

  const total = calcTotal(record);
  if (Number(record.reportedTotal) !== total) {
    issues.push(issue("error", record, `보고 총인원(${record.reportedTotal})과 대상별 합계(${total})가 일치하지 않습니다.`));
  }
  if (total === 0) issues.push(issue("warn", record, "총 참여인원이 0명입니다. 미운영 사업인지 확인해 주세요."));

  const duplicate = others.find(other =>
    other.id !== record.id &&
    normalize(other.team) === normalize(record.team) &&
    normalize(other.category) === normalize(record.category) &&
    normalize(other.programName) === normalize(record.programName) &&
    other.startDate === record.startDate
  );
  if (duplicate) issues.push(issue("warn", record, "팀·대분류·사업명·시작일이 같은 중복 실적이 있습니다."));

  return issues;
}

function issue(level, record, message) {
  return { level, id: record.id, programName: record.programName, message };
}

function renderSummary(list) {
  const map = new Map();
  CATEGORY_ORDER.forEach(category => map.set(category, {
    category, records: 0, sessions: 0, youth: 0, total: 0, revenue: 0, expense: 0
  }));

  list.forEach(r => {
    const key = CATEGORY_ORDER.includes(r.category) ? r.category : "기타";
    const row = map.get(key);
    row.records += 1;
    row.sessions += Number(r.sessions || 0);
    row.youth += Number(r.youthCount || 0);
    row.total += calcTotal(r);
    row.revenue += Number(r.revenue || 0);
    row.expense += Number(r.expense || 0);
  });

  const rows = [...map.values()].filter(r => r.records > 0);
  els.summaryBody.innerHTML = rows.length ? rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.category)}</td>
      <td class="mono">${formatNumber(r.records)}</td>
      <td class="mono">${formatNumber(r.sessions)}</td>
      <td class="mono">${formatNumber(r.youth)}</td>
      <td class="mono">${formatNumber(r.total)}</td>
      <td class="mono">${r.sessions ? (r.total / r.sessions).toFixed(1) : "0.0"}</td>
      <td class="mono">${formatMoney(r.revenue)}</td>
      <td class="mono">${formatMoney(r.expense)}</td>
    </tr>
  `).join("") : `<tr><td colspan="9"><div class="empty-state">요약할 실적이 없습니다.</div></td></tr>`;
}

function renderRecords(list) {
  if (!list.length) {
    els.recordsBody.innerHTML = `<tr><td colspan="15"><div class="empty-state">아직 입력된 실적이 없습니다.</div></td></tr>`;
    return;
  }

  els.recordsBody.innerHTML = list.map(record => {
    const issues = validateRecord(record, list.filter(r => r.id !== record.id));
    const hasError = issues.some(i => i.level === "error");
    const hasWarn = issues.some(i => i.level === "warn");
    const status = hasError ? badge("오류", "error") : hasWarn ? badge("주의", "warn") : badge("정상", "ok");
    const total = calcTotal(record);
    const avg = record.sessions ? (total / record.sessions).toFixed(1) : "0.0";
    return `
      <tr>
        <td>${status}</td>
        <td>${escapeHtml(record.team)}</td>
        <td>${escapeHtml(record.category)}</td>
        <td><strong>${escapeHtml(record.programName)}</strong><br><small>${escapeHtml(record.subCategory || "")}</small></td>
        <td class="mono">${formatPeriod(record.startDate, record.endDate)}</td>
        <td class="mono">${formatNumber(record.sessions)}</td>
        <td class="mono">${formatNumber(record.youthCount)}</td>
        <td class="mono">${formatNumber(record.adultCount)}</td>
        <td class="mono">${formatNumber(record.leaderCount)}</td>
        <td class="mono">${formatNumber(record.reportedTotal)}</td>
        <td class="mono">${formatNumber(total)}</td>
        <td class="mono">${avg}</td>
        <td class="mono">${formatMoney(record.revenue)}</td>
        <td class="mono">${formatMoney(record.expense)}</td>
        <td class="no-print">
          <div class="row-actions">
            <button class="ghost" onclick="editRecord('${record.id}')">수정</button>
            <button class="danger" onclick="deleteRecord('${record.id}')">삭제</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function badge(text, type) {
  return `<span class="badge ${type}">${text}</span>`;
}

window.editRecord = function(id) {
  const record = records.find(r => r.id === id);
  if (record) fillForm(record);
};

window.deleteRecord = function(id) {
  if (!confirm("해당 실적을 삭제할까요?")) return;
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderAll();
};

function loadSample() {
  if (records.length && !confirm("기존 데이터에 예시 데이터를 추가할까요?")) return;
  const sample = [
    {
      id: crypto.randomUUID(), year: 2026, quarter: 1, team: "청소년사업팀", category: "프로그램 이용현황", subCategory: "스마트 체육관",
      programName: "출발 재미짐", startDate: "2026-03-12", endDate: "2026-03-12", location: "스마트 체육관", target: "초등 청소년",
      sessions: 1, youthCount: 14, adultCount: 0, leaderCount: 2, reportedTotal: 16, revenue: 84000, expense: 0, manager: "담당자", memo: "학교 연계 체험 활동", updatedAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(), year: 2026, quarter: 1, team: "교육문화팀", category: "교육문화 프로그램 등록현황", subCategory: "정기강좌",
      programName: "겨울방학특강", startDate: "2026-01-08", endDate: "2026-02-28", location: "강서청소년회관", target: "청소년 및 지역주민",
      sessions: 32, youthCount: 210, adultCount: 95, leaderCount: 8, reportedTotal: 313, revenue: 0, expense: 0, manager: "담당자", memo: "강좌별 합산", updatedAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(), year: 2026, quarter: 1, team: "청소년아지트", category: "청소년아지트 월별 이용현황", subCategory: "이용현황",
      programName: "청소년아지트 1호점 운영", startDate: "2026-03-01", endDate: "2026-03-31", location: "청소년아지트 1호점", target: "지역 청소년",
      sessions: 20, youthCount: 420, adultCount: 0, leaderCount: 20, reportedTotal: 440, revenue: 0, expense: 0, manager: "담당자", memo: "월별 이용 집계", updatedAt: new Date().toISOString()
    }
  ];
  records = [...records, ...sample];
  saveRecords();
  els.filterYear.value = 2026;
  els.filterQuarter.value = 1;
  renderAll();
}

function exportCsv() {
  const list = getFilteredRecords();
  const headers = ["연도", "분기", "팀", "대분류", "세부유형", "사업명", "시작일", "종료일", "장소", "대상", "회기", "청소년", "성인", "지도자", "보고총인원", "계산총인원", "평균인원", "수입", "지출", "담당자", "비고"];
  const rows = list.map(r => [
    r.year, `${r.quarter}분기`, r.team, r.category, r.subCategory, r.programName, r.startDate, r.endDate,
    r.location, r.target, r.sessions, r.youthCount, r.adultCount, r.leaderCount, r.reportedTotal, calcTotal(r),
    r.sessions ? (calcTotal(r) / r.sessions).toFixed(1) : "0.0", r.revenue, r.expense, r.manager, r.memo
  ]);
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\n");
  downloadBlob(`quarter-performance-${els.filterYear.value}-Q${els.filterQuarter.value}.csv`, "text/csv;charset=utf-8", "\uFEFF" + csv);
}

function exportJson() {
  const payload = {
    app: "gsyouth-quarter-performance",
    version: 1,
    exportedAt: new Date().toISOString(),
    records
  };
  downloadBlob(`quarter-performance-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json", JSON.stringify(payload, null, 2));
}

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const imported = Array.isArray(payload) ? payload : payload.records;
      if (!Array.isArray(imported)) throw new Error("records 배열이 없습니다.");
      records = imported.map(r => ({ ...r, id: r.id || crypto.randomUUID() }));
      saveRecords();
      renderAll();
      alert("JSON 데이터를 불러왔습니다.");
    } catch (err) {
      alert(`불러오기 실패: ${err.message}`);
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function clearAll() {
  if (!confirm("모든 실적 데이터를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
  records = [];
  saveRecords();
  resetForm();
  renderAll();
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getQuarterPeriod(year, quarter) {
  const startMonth = (Number(quarter) - 1) * 3;
  return {
    start: new Date(Number(year), startMonth, 1),
    end: new Date(Number(year), startMonth + 3, 0, 23, 59, 59, 999)
  };
}

function toDate(value) {
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const date = toDate(value);
  return !Number.isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
}

function calcTotal(record) {
  return Number(record.youthCount || 0) + Number(record.adultCount || 0) + Number(record.leaderCount || 0);
}

function sum(list, key) {
  return list.reduce((acc, item) => acc + Number(item[key] || 0), 0);
}

function val(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function getNum(id) {
  return Number(document.querySelector(`#${id}`).value || 0);
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function formatMoney(value) {
  return `${formatNumber(value)}원`;
}

function formatPeriod(start, end) {
  if (!end || start === end) return escapeHtml(start || "-");
  return `${escapeHtml(start)} ~ ${escapeHtml(end)}`;
}

function csvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

function downloadBlob(filename, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
