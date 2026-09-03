const API_URL = "https://script.google.com/macros/s/AKfycbw6rd64-pGhm0m6F9_cOf4nf_7Daou3hqzx9LQCrstQdKJNxG8sLOtaeulIh6YMtD0FPw/exec"; 

let allSmpDataList = [];
let filteredDataList = [];
let currentDetailData = null;
let stepCounter = -1;
let isEditingId = null; 
let myChart = null; 
let currentChartMode = 'presenter'; 
const ITEMS_PER_PAGE = 100;
let currentPage = 1;

window.onload = () => { 
  document.getElementById('loadingScreen').style.display = 'flex';
  loadSMPList(); 
  checkOfflineStatus(); 
};

function showModal(title, message, iconName, color) {
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('modalTitle').style.color = color;
  document.getElementById('modalMessage').innerText = message;
  document.getElementById('modalIcon').innerText = iconName;
  document.getElementById('modalIcon').style.color = color;
  document.getElementById('customModal').style.display = 'flex';
}

function closeModal() { document.getElementById('customModal').style.display = 'none'; }
function closeConfirmModal() { document.getElementById('confirmModal').style.display = 'none'; }

function parseDateSafely(dateStr) {
    if (!dateStr) return new Date(0); 
    let str = dateStr.toString().trim();
    if (str.includes('-')) { let d = new Date(str); if (!isNaN(d.getTime())) return d; }
    if (str.includes('/')) {
        let parts = str.split(' ')[0].split('/'); 
        if (parts.length === 3) {
            let p0 = parseInt(parts[0], 10); let p1 = parseInt(parts[1], 10); let p2 = parseInt(parts[2], 10);
            if (p2 < 100) p2 += 2000;
            return new Date(p2, p1 - 1, p0); 
        }
    }
    let fallback = new Date(str); return isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

function toggleOtherInput(selElement, inputId) {
  let inputEl = document.getElementById(inputId);
  if(selElement.value === 'other') { inputEl.style.display = 'block'; inputEl.required = true; inputEl.focus(); } 
  else { inputEl.style.display = 'none'; inputEl.required = false; inputEl.value = ''; }
}
function toggleOtherCheckbox(cbId, inputId) {
  let cb = document.getElementById(cbId); let inputEl = document.getElementById(inputId);
  if(cb.checked) { inputEl.style.display = 'block'; inputEl.required = true; inputEl.focus(); } 
  else { inputEl.style.display = 'none'; inputEl.required = false; inputEl.value = ''; }
}

function updateSmpIdPrefix(prefix) {
  if(isEditingId) return; 

  let maxId = 0;
  let prefixStr = `BPC-${prefix}-`;
  for (let item of allSmpDataList) {
      if (item.smpId && item.smpId.startsWith(prefixStr)) {
          let numPart = item.smpId.replace(prefixStr, '');
          let num = parseInt(numPart, 10);
          if (!isNaN(num) && num > maxId) { maxId = num; }
      }
  }
  let nextNum = maxId + 1;
  document.getElementById('f_smpId').value = `${prefixStr}${String(nextNum).padStart(4, '0')}`;
}

window.addEventListener('online', checkOfflineStatus);
window.addEventListener('offline', checkOfflineStatus);

function checkOfflineStatus() {
  const isOffline = !navigator.onLine;
  document.getElementById('offlineBanner').style.display = isOffline ? 'block' : 'none';
  let queue = JSON.parse(localStorage.getItem('smp_offline_queue') || '[]');
  if(navigator.onLine && queue.length > 0) { document.getElementById('btnSync').style.display = 'flex'; } 
  else { document.getElementById('btnSync').style.display = 'none'; }
}

function syncOfflineData() {
  if(!navigator.onLine) { showModal("ออฟไลน์", "ไม่มีการเชื่อมต่ออินเทอร์เน็ต", "cloud_off", "#E53E3E"); return; }
  let queue = JSON.parse(localStorage.getItem('smp_offline_queue') || '[]');
  if(queue.length === 0) return;
  document.getElementById('loadingScreen').style.display = 'flex';
  Promise.all(queue.map(p => fetch(API_URL, { method: 'POST', body: JSON.stringify(p) })))
    .then(() => { 
        showModal("สำเร็จ!", "ซิงค์ข้อมูลออฟไลน์สำเร็จ", "check_circle", "#38A169"); 
        localStorage.removeItem('smp_offline_queue'); checkOfflineStatus(); loadSMPList(); 
    })
    .catch(err => { showModal("ผิดพลาด", "บางรายการซิงค์ไม่สำเร็จ กรุณาลองใหม่ภายหลัง", "error", "#E53E3E"); })
    .finally(() => { document.getElementById('loadingScreen').style.display = 'none'; });
}

document.getElementById('smpForm').addEventListener('input', () => { if(!isEditingId) saveDraft(); });
document.getElementById('smpForm').addEventListener('change', () => { if(!isEditingId) saveDraft(); });

function saveDraft() {
  let draft = { title: document.getElementById('f_title').value, time: new Date().toLocaleTimeString('th-TH') };
  localStorage.setItem('smp_draft', JSON.stringify(draft));
  let t = document.getElementById('draftToast');
  document.getElementById('draftTime').innerText = draft.time;
  t.style.display = 'flex';
}

function loadDraft() {
  showModal('กู้คืนข้อมูลสำเร็จ', 'ระบบได้โหลดข้อมูลร่างของคุณกลับมาแล้ว', 'restore', 'var(--secondary)');
  document.getElementById('draftToast').style.display = 'none';
}

function showHome() {
  document.querySelectorAll('.section-view').forEach(e => e.classList.remove('active'));
  document.getElementById('homeView').classList.add('active');
  document.getElementById('appTitle').innerText = "SMP System";
  document.getElementById('appSub').innerText = "ระบบจัดการเอกสารมาตรฐาน";
  if(document.getElementById('btnCloseView')) document.getElementById('btnCloseView').style.display = 'none';
  if(allSmpDataList.length === 0) loadSMPList();
}

function showForm() {
  isEditingId = null; 
  document.getElementById('smpForm').reset();
  
  let pOther = document.getElementById('f_presenter_other'); if(pOther) pOther.style.display = 'none';
  let lOther = document.getElementById('f_line_other'); if(lOther) lOther.style.display = 'none';
  let fOther = document.getElementById('f_frequency_other'); if(fOther) fOther.style.display = 'none';
  
  document.getElementById('mainImagePreview').innerHTML = ''; 
  document.getElementById('f_mainImageOld').value = ''; 
  document.getElementById('stepsContainer').innerHTML = '';
  
  document.querySelectorAll('.section-view').forEach(e => e.classList.remove('active'));
  document.getElementById('formView').classList.add('active');
  document.getElementById('appTitle').innerText = "สร้าง SMP ใหม่";
  document.getElementById('appSub').innerText = "กรอกรายละเอียดการปฏิบัติงาน";
  if(document.getElementById('btnCloseView')) document.getElementById('btnCloseView').style.display = 'flex'; 
  
  document.querySelectorAll('#ppeBox .icon-checkbox').forEach(el => el.classList.remove('not-used'));
  document.querySelectorAll('#riskBox .icon-checkbox').forEach(el => el.classList.remove('not-used'));

  if(allSmpDataList.length > 0) {
    document.getElementById('f_smpId').value = "กรุณาเลือกประเภท SMP...";
  } else {
    document.getElementById('f_smpId').value = "กรุณารอโหลดข้อมูลสักครู่...";
  }

  stepCounter = -1; 
  generateLockedSteps(); 
  
  let saved = localStorage.getItem('smp_draft');
  if(saved) {
     let d = JSON.parse(saved);
     let t = document.getElementById('draftToast');
     if(t) { t.style.display = 'flex'; document.getElementById('draftTime').innerText = d.time; }
  }
  window.scrollTo(0,0);
}

function generateLockedSteps() {
  addStepCard(true, "อธิบายชิ้นส่วนประกอบย่อย แนบรูปว่าอะไร", 0, "คุณภาพ");
  addStepCard(true, "การเตรียมเครื่องมืออุปกรณ์", 0, "คุณภาพ");
  addStepCard(true, "ทำการ shutdown m/c & Lockout/Tagout (LOTO)", 0, "ความปลอดภัย");
}

function updateStepNumbers() {
  let cards = document.querySelectorAll('#stepsContainer .step-card');
  cards.forEach((card, index) => {
    let badge = card.querySelector('.step-badge');
    if (badge) {
      badge.innerText = `ขั้นตอนที่ #${index}`;
    }
    card.id = `step_row_${index}`;
  });
  stepCounter = cards.length - 1;
}

function insertStepCard(btn) {
  let currentCard = btn.closest('.step-card');
  
  const html = `
    <div class="step-card">
      <span class="step-badge">ขั้นตอนที่ #</span>
      <div class="d-flex justify-content-between mb-3 align-items-center mt-2">
        <h6 class="m-0 fw-bold" style="color:var(--primary);">รายละเอียดขั้นตอน</h6>
        <div style="display:flex; gap:8px;">
          <button type="button" style="background:#F0F7FF; color:var(--secondary); border:1px solid var(--secondary); padding:4px 12px; border-radius:20px; cursor:pointer; font-weight:600; font-family:'Prompt'; font-size:12.5px; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s ease;" onmouseover="this.style.background='var(--secondary)'; this.style.color='#FFF';" onmouseout="this.style.background='#F0F7FF'; this.style.color='var(--secondary)';" onclick="insertStepCard(this)">
            <span class="material-symbols-rounded" style="font-size:16px;">add_to_photos</span> แทรกด้านล่าง
          </button>
          <button type="button" style="background:#FFF5F5; color:#E53E3E; border:1px solid #FC8181; padding:4px 12px; border-radius:20px; cursor:pointer; font-weight:600; font-family:'Prompt'; font-size:12.5px; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s ease;" onmouseover="this.style.background='#E53E3E'; this.style.color='#FFF';" onmouseout="this.style.background='#FFF5F5'; this.style.color='#E53E3E';" onclick="this.closest('.step-card').remove(); updateStepNumbers();">
            <span class="material-symbols-rounded" style="font-size:16px;">delete</span> ลบ
          </button>
        </div>
      </div>
      
      <div class="mb-3">
        <label>รายละเอียดการทำงาน <span class="required-star">*</span></label>
        <input type="text" class="s-task" value="" required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>เวลา (นาที)</label>
          <input type="number" class="s-time" value="" required>
        </div>
        <div class="form-group">
          <label>ประเภท <span class="required-star">*</span></label>
          <select class="s-type" required>
            <option value="">-- เลือก --</option>
            <option value="ความปลอดภัย">ความปลอดภัย</option>
            <option value="คุณภาพ">คุณภาพ</option>
            <option value="สิ่งแวดล้อม">สิ่งแวดล้อม</option>
            <option value="การผลิต">การผลิต</option>
          </select>
        </div>
      </div>
      <div class="mb-3"><label>คำอธิบายเพิ่มเติม</label><textarea class="s-desc" rows="2"></textarea></div>
      <div>
        <label><span class="material-symbols-rounded" style="font-size:18px; vertical-align:text-bottom;">image</span> ภาพถ่าย / สเก็ตช์</label>
        <div style="display:flex; gap:10px; margin-bottom:5px;">
            <label style="flex:1; background:#FFF; border:1px dashed var(--secondary); padding:8px; border-radius:8px; text-align:center; cursor:pointer; font-size:12px; font-weight:600; color:var(--secondary);">
                <span class="material-symbols-rounded" style="font-size:16px; vertical-align:text-bottom;">photo_camera</span> ถ่ายรูปใหม่
                <input type="file" accept="image/*" capture="environment" onchange="compressStepImages(this)" style="display:none;">
            </label>
            <label style="flex:1; background:#FFF; border:1px dashed var(--secondary); padding:8px; border-radius:8px; text-align:center; cursor:pointer; font-size:12px; font-weight:600; color:var(--secondary);">
                <span class="material-symbols-rounded" style="font-size:16px; vertical-align:text-bottom;">photo_library</span> จากอัลบั้ม
                <input type="file" accept="image/*" multiple onchange="compressStepImages(this)" style="display:none;">
            </label>
        </div>
        <input type="hidden" class="s-imgs">
        <div class="gallery-preview"></div>
      </div>
    </div>`;
    
  currentCard.insertAdjacentHTML('afterend', html);
  updateStepNumbers();
}

function addStepCard(isLocked = false, defaultName = "", defaultTime = "", defaultType = "") {
  stepCounter++;
  let stepIndex = stepCounter; 
  
  let lockAttr = isLocked ? 'readonly style="background:#F1F5F9;"' : 'required';
  let lockSelAttr = isLocked ? 'disabled style="background:#F1F5F9;"' : 'required';
  let hiddenInputs = isLocked ? `<input type="hidden" class="s-type-hidden" value="${defaultType}">` : '';

  let buttonsHtml = '';
  if (!isLocked) {
     buttonsHtml = `
        <div style="display:flex; gap:8px;">
          <button type="button" style="background:#F0F7FF; color:var(--secondary); border:1px solid var(--secondary); padding:4px 12px; border-radius:20px; cursor:pointer; font-weight:600; font-family:'Prompt'; font-size:12.5px; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s ease;" onmouseover="this.style.background='var(--secondary)'; this.style.color='#FFF';" onmouseout="this.style.background='#F0F7FF'; this.style.color='var(--secondary)';" onclick="insertStepCard(this)">
            <span class="material-symbols-rounded" style="font-size:16px;">add_to_photos</span> แทรกด้านล่าง
          </button>
          <button type="button" style="background:#FFF5F5; color:#E53E3E; border:1px solid #FC8181; padding:4px 12px; border-radius:20px; cursor:pointer; font-weight:600; font-family:'Prompt'; font-size:12.5px; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s ease;" onmouseover="this.style.background='#E53E3E'; this.style.color='#FFF';" onmouseout="this.style.background='#FFF5F5'; this.style.color='#E53E3E';" onclick="this.closest('.step-card').remove(); updateStepNumbers();">
            <span class="material-symbols-rounded" style="font-size:16px;">delete</span> ลบ
          </button>
        </div>
     `;
  } else if (stepIndex === 2) {
     buttonsHtml = `
        <button type="button" style="background:#F0F7FF; color:var(--secondary); border:1px solid var(--secondary); padding:4px 12px; border-radius:20px; cursor:pointer; font-weight:600; font-family:'Prompt'; font-size:12.5px; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s ease;" onmouseover="this.style.background='var(--secondary)'; this.style.color='#FFF';" onmouseout="this.style.background='#F0F7FF'; this.style.color='var(--secondary)';" onclick="insertStepCard(this)">
          <span class="material-symbols-rounded" style="font-size:16px;">add_to_photos</span> แทรกด้านล่าง
        </button>
     `;
  }

  const html = `
    <div class="step-card" id="step_row_${stepIndex}">
      <span class="step-badge">ขั้นตอนที่ #${stepIndex}</span>
      <div class="d-flex justify-content-between mb-3 align-items-center mt-2">
        <h6 class="m-0 fw-bold" style="color:var(--primary);">รายละเอียดขั้นตอน</h6>
        <div>${buttonsHtml}</div>
      </div>
      
      <div class="mb-3">
        <label>รายละเอียดการทำงาน <span class="required-star">*</span></label>
        <input type="text" class="s-task" value="${defaultName}" ${lockAttr}>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>เวลา (นาที)</label>
          <input type="number" class="s-time" value="${defaultTime}" ${lockAttr} style="${isLocked?'text-align:center; font-weight:bold;':''}">
        </div>
        <div class="form-group">
          <label>ประเภท <span class="required-star">*</span></label>
          ${hiddenInputs}
          <select class="s-type" ${lockSelAttr}>
            <option value="">-- เลือก --</option>
            <option value="ความปลอดภัย" ${defaultType==='ความปลอดภัย'?'selected':''}>ความปลอดภัย</option>
            <option value="คุณภาพ" ${defaultType==='คุณภาพ'?'selected':''}>คุณภาพ</option>
            <option value="สิ่งแวดล้อม" ${defaultType==='สิ่งแวดล้อม'?'selected':''}>สิ่งแวดล้อม</option>
            <option value="การผลิต" ${defaultType==='การผลิต'?'selected':''}>การผลิต</option>
          </select>
        </div>
      </div>
      <div class="mb-3"><label>คำอธิบายเพิ่มเติม</label><textarea class="s-desc" rows="2"></textarea></div>
      <div>
        <label><span class="material-symbols-rounded" style="font-size:18px; vertical-align:text-bottom;">image</span> ภาพถ่าย / สเก็ตช์</label>
        <div style="display:flex; gap:10px; margin-bottom:5px;">
            <label style="flex:1; background:#FFF; border:1px dashed var(--secondary); padding:8px; border-radius:8px; text-align:center; cursor:pointer; font-size:12px; font-weight:600; color:var(--secondary);">
                <span class="material-symbols-rounded" style="font-size:16px; vertical-align:text-bottom;">photo_camera</span> ถ่ายรูปใหม่
                <input type="file" accept="image/*" capture="environment" onchange="compressStepImages(this)" style="display:none;">
            </label>
            <label style="flex:1; background:#FFF; border:1px dashed var(--secondary); padding:8px; border-radius:8px; text-align:center; cursor:pointer; font-size:12px; font-weight:600; color:var(--secondary);">
                <span class="material-symbols-rounded" style="font-size:16px; vertical-align:text-bottom;">photo_library</span> จากอัลบั้ม
                <input type="file" accept="image/*" multiple onchange="compressStepImages(this)" style="display:none;">
            </label>
        </div>
        <input type="hidden" class="s-imgs">
        <div class="gallery-preview"></div>
      </div>
    </div>`;
  document.getElementById('stepsContainer').insertAdjacentHTML('beforeend', html);
}

function editCurrentSMP() { 
  try {
      if(!currentDetailData || !currentDetailData.main) {
          alert("ไม่พบข้อมูลสำหรับการแก้ไข กรุณาลองโหลดหน้าเว็บใหม่อีกครั้ง");
          return;
      }
      let m = currentDetailData.main;
      isEditingId = m.smpId;

      document.querySelectorAll('.section-view').forEach(e => e.classList.remove('active'));
      document.getElementById('formView').classList.add('active');
      
      let titleEl = document.getElementById('appTitle');
      if(titleEl) titleEl.innerText = "แก้ไขเอกสาร";
      let subEl = document.getElementById('appSub');
      if(subEl) subEl.innerText = m.smpId || "กำลังแก้ไข";
      let closeBtn = document.getElementById('btnCloseView');
      if(closeBtn) closeBtn.style.display = 'flex';

      let formEl = document.getElementById('smpForm');
      if(formEl) formEl.reset();

      if(document.getElementById('f_smpId')) document.getElementById('f_smpId').value = m.smpId || '';
      if(document.getElementById('f_title')) document.getElementById('f_title').value = m.title || '';
      if(document.getElementById('f_approver')) document.getElementById('f_approver').value = m.approver || '';
      if(document.getElementById('f_machine')) document.getElementById('f_machine').value = m.machine || '';
      if(document.getElementById('f_techCount')) document.getElementById('f_techCount').value = m.techCount || '';
      if(document.getElementById('f_techTime')) document.getElementById('f_techTime').value = m.techTime || '';
      if(document.getElementById('f_workTime')) document.getElementById('f_workTime').value = m.workTime || '';
      if(document.getElementById('f_downtime')) document.getElementById('f_downtime').value = m.downtime || '';
      if(document.getElementById('f_maintType')) document.getElementById('f_maintType').value = m.maintType || '';

      let typeRadios = document.querySelectorAll('input[name="smpTypeGrp"]');
      let typeFound = false;
      let currentSmpType = String(m.smpType || ''); 
      typeRadios.forEach(r => { 
          if (currentSmpType.includes(r.value)) { 
              r.checked = true; 
              typeFound = true; 
          } 
      });
      let t3 = document.getElementById('t3');
      if (!typeFound && currentSmpType && t3) {
          t3.checked = true;
      }

      let presCbsElements = document.querySelectorAll('.pres-cb');
      presCbsElements.forEach(cb => cb.checked = false);
      let cbOther = document.getElementById('cbPresOther'); 
      if(cbOther) cbOther.checked = false;
      let pOtherInput = document.getElementById('f_presenter_other'); 
      if(pOtherInput) pOtherInput.style.display = 'none';
      
      if (m.presenter) {
          let presArr = String(m.presenter).split(',').map(p => p.trim());
          let presCbs = Array.from(presCbsElements);
          let others = [];
          presArr.forEach(p => {
              let matched = presCbs.find(cb => cb.value === p);
              if (matched) matched.checked = true;
              else if (p && p !== 'null' && p !== 'undefined') others.push(p);
          });
          if (others.length > 0) {
              if(cbOther) cbOther.checked = true;
              if(pOtherInput) { pOtherInput.style.display = 'block'; pOtherInput.value = others.join(', '); }
          }
      }

      let lineSel = document.getElementById('f_line_sel');
      let lineOtherInput = document.getElementById('f_line_other');
      if (lineSel) {
          let currentLine = String(m.line || '');
          let lineFound = Array.from(lineSel.options).some(o => o.value === currentLine);
          if (lineFound && currentLine) { 
              lineSel.value = currentLine; 
              if (lineOtherInput) lineOtherInput.style.display = 'none'; 
          } else if (currentLine) { 
              lineSel.value = 'other'; 
              if (lineOtherInput) { lineOtherInput.style.display = 'block'; lineOtherInput.value = currentLine; }
          }
      }

      let freqSel = document.getElementById('f_frequency_sel');
      let freqOtherInput = document.getElementById('f_frequency_other');
      if (freqSel) {
          let currentFreq = String(m.frequency || '');
          let freqFound = Array.from(freqSel.options).some(o => o.value === currentFreq);
          if (freqFound && currentFreq) { 
              freqSel.value = currentFreq; 
              if (freqOtherInput) freqOtherInput.style.display = 'none'; 
          } else if (currentFreq) { 
              freqSel.value = 'other'; 
              if (freqOtherInput) { freqOtherInput.style.display = 'block'; freqOtherInput.value = currentFreq; }
          }
      }

      if(m.loto === 'ต้องการ') { let l = document.getElementById('loto_req'); if(l) l.checked = true; }
      else if(m.loto === 'ไม่ต้องการ') { let l = document.getElementById('loto_not_req'); if(l) l.checked = true; }

      if(m.riskAssessed === 'ใช่') { let r = document.getElementById('risk_yes'); if(r) r.checked = true; }
      else if(m.riskAssessed === 'ไม่ใช่') { let r = document.getElementById('risk_no'); if(r) r.checked = true; }
      else if(m.riskAssessed === 'ไม่เกี่ยวข้อง') { let r = document.getElementById('risk_na'); if(r) r.checked = true; }

      let ppeArray = Array.isArray(m.ppe) ? m.ppe : [];
      document.querySelectorAll('#ppeBox .icon-checkbox').forEach(el => {
          if (ppeArray.length === 0) { el.classList.add('not-used'); return; }
          let ppeData = ppeArray.find(p => p.name === el.dataset.val);
          if (ppeData && ppeData.used) el.classList.remove('not-used');
          else el.classList.add('not-used');
      });

      let riskArray = Array.isArray(m.risks) ? m.risks : [];
      document.querySelectorAll('#riskBox .icon-checkbox').forEach(el => {
          if (riskArray.length === 0) { el.classList.add('not-used'); return; }
          let riskData = riskArray.find(r => r.name === el.dataset.val);
          if (riskData && riskData.risk) el.classList.remove('not-used');
          else el.classList.add('not-used');
      });

      let mainBase64Input = document.getElementById('f_mainImageBase64');
      if(mainBase64Input) mainBase64Input.value = ''; 
      let mainOldInput = document.getElementById('f_mainImageOld');
      if(mainOldInput) mainOldInput.value = m.mainImage || ''; 
      
      let previewBox = document.getElementById('mainImagePreview');
      if(previewBox) {
          if(m.mainImage) previewBox.innerHTML = `<img src="${m.mainImage}">`;
          else previewBox.innerHTML = '';
      }

      let sContainer = document.getElementById('stepsContainer');
      if(sContainer) {
          sContainer.innerHTML = '';
          stepCounter = -1;
          let stepsList = Array.isArray(currentDetailData.steps) ? currentDetailData.steps : [];
          
          stepsList.forEach((s) => {
              let isLocked = (s.stepNo <= 2);
              addStepCard(isLocked, s.stepName, s.timeTaken, s.typeSymbol);
              
              let card = document.getElementById('step_row_' + stepCounter); 
              if(card) {
                  let descInput = card.querySelector('.s-desc');
                  if(descInput) descInput.value = s.description || '';
                  
                  let fileInput = card.querySelector('.s-imgs');
                  let gal = card.querySelector('.gallery-preview');
                  
                  if(s.images && fileInput && gal) {
                      let imgArray = Array.isArray(s.images) ? s.images : (typeof s.images === 'string' ? [s.images] : []);
                      if (imgArray.length > 0) {
                          fileInput.oldImages = JSON.stringify(imgArray);
                          let imgHtml = imgArray.map(url => `<img src="${url}">`).join('');
                          gal.innerHTML = imgHtml;
                      }
                  }
              }
          });
      }
      
      window.scrollTo(0,0);
      
  } catch(e) {
      console.error("Error populating edit form:", e);
      alert("เกิดข้อผิดพลาดในการเปิดหน้าแก้ไข กรุณาแจ้งผู้ดูแลระบบ:\n" + e.message);
  }
}

function deleteCurrentSMP() { 
  if(!currentDetailData) return;
  document.getElementById('confirmMessage').innerText = `คุณต้องการลบเอกสารรหัส #${currentDetailData.main.smpId} ใช่หรือไม่?`;
  document.getElementById('confirmModal').style.display = 'flex';
}

function executeDelete() {
  let smpId = currentDetailData.main.smpId;
  document.getElementById('confirmModal').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'flex';
  
  fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', smpId: smpId }) })
    .then(res => res.json())
    .then(res => {
      if(res.status === 'success'){
        showModal('ลบสำเร็จ', 'เอกสาร ' + smpId + ' ถูกลบเรียบร้อยแล้ว', 'check_circle', '#38A169');
        showHome();
      } else {
        showModal('เกิดข้อผิดพลาด', res.message, 'error', '#E53E3E');
      }
    })
    .catch(err => showModal('ข้อผิดพลาดเครือข่าย', 'ระบบไม่สามารถเชื่อมต่อได้: ' + err, 'cloud_off', '#E53E3E'))
    .finally(() => { document.getElementById('loadingScreen').style.display = 'none'; });
}

function showDetail(smpId) {
  document.querySelectorAll('.section-view').forEach(e => e.classList.remove('active'));
  document.getElementById('detailView').classList.add('active');
  document.getElementById('appTitle').innerText = "เอกสาร: " + smpId;
  document.getElementById('appSub').innerText = "รายละเอียดและขั้นตอน";
  if(document.getElementById('btnCloseView')) document.getElementById('btnCloseView').style.display = 'flex'; 
  
  document.getElementById('docContent').innerHTML = ``;
  document.getElementById('loadingScreen').style.display = 'flex';
  
  fetch(API_URL + "?action=getDetails&smpId=" + smpId)
    .then(res => res.json())
    .then(data => renderDetail(data))
    .catch(err => console.error(err))
    .finally(() => { document.getElementById('loadingScreen').style.display = 'none'; });
}

function loadSMPList() {
  document.getElementById('loadingScreen').style.display = 'flex';
  fetch(API_URL + "?action=getList")
    .then(res => res.json())
    .then(data => { 
      allSmpDataList = data; 
      populateFilterDropdowns(data);
      applyFilters(); 
    })
    .catch(err => { document.getElementById('smpListContainer').innerHTML = `<p class="text-center" style="color:#E53E3E;">เชื่อมต่อฐานข้อมูลไม่ได้</p>`; })
    .finally(() => { document.getElementById('loadingScreen').style.display = 'none'; });
}

function populateFilterDropdowns(data) {
  let presenters = new Set();
  let lines = new Set();
  data.forEach(item => {
    if(item.presenter) { String(item.presenter).split(',').forEach(p => presenters.add(p.trim())); }
    if(item.line) lines.add(String(item.line));
  });

  let pSel = document.getElementById('filterPresenter');
  pSel.innerHTML = '<option value="">-- ผู้จัดทำทั้งหมด --</option>';
  [...presenters].sort().forEach(p => { if(p) pSel.innerHTML += `<option value="${p}">${p}</option>`; });

  let lSel = document.getElementById('filterLine');
  lSel.innerHTML = '<option value="">-- ไลน์ทั้งหมด --</option>';
  [...lines].sort().forEach(l => { lSel.innerHTML += `<option value="${l}">${l}</option>`; });
}

function setQuickFilter(type) {
  document.querySelectorAll('.btn-quick').forEach(b => b.classList.remove('active')); event.target.classList.add('active');
  let today = new Date();
  let fs = document.getElementById('fStart'); let fe = document.getElementById('fEnd');
  
  if(type==='all'){ fs.value = ''; fe.value = ''; }
  else if(type==='today'){ fs.value = today.toISOString().split('T')[0]; fe.value = today.toISOString().split('T')[0]; }
  else if(type==='week'){ 
    let first = today.getDate() - today.getDay() + 1; 
    let firstDay = new Date(today.setDate(first)); 
    fs.value = firstDay.toISOString().split('T')[0]; 
    fe.value = new Date().toISOString().split('T')[0]; 
  }
  else if(type==='month'){ 
    let firstDay = new Date(today.getFullYear(), today.getMonth(), 1); 
    fs.value = firstDay.toISOString().split('T')[0]; 
    fe.value = new Date().toISOString().split('T')[0]; 
  }
  applyFilters();
}

function applyFilters() {
  let kw = document.getElementById('filterSearch').value.toLowerCase();
  let presenter = document.getElementById('filterPresenter').value;
  let line = document.getElementById('filterLine').value;
  let type = document.getElementById('filterType').value;
  let fsVal = document.getElementById('fStart').value ? parseDateSafely(document.getElementById('fStart').value).setHours(0,0,0,0) : null;
  let feVal = document.getElementById('fEnd').value ? parseDateSafely(document.getElementById('fEnd').value).setHours(23,59,59,999) : null;
  
  filteredDataList = allSmpDataList.filter(o => {
    let matchKw = o.smpId.toLowerCase().includes(kw) || o.title.toLowerCase().includes(kw) || (o.machine && o.machine.toLowerCase().includes(kw));
    
    let matchP = presenter === "" || (o.presenter && String(o.presenter).includes(presenter));
    let matchL = line === "" || String(o.line) === line;
    let matchT = type === "" || (o.type && String(o.type).includes(type));
    
    let jDate = parseDateSafely(o.date).getTime();
    let matchD = true;
    if(fsVal && jDate < fsVal) matchD = false;
    if(feVal && jDate > feVal) matchD = false;

    return matchKw && matchP && matchL && matchT && matchD;
  });

  currentPage = 1;
  renderPaginatedList();
  drawDashboardChart(filteredDataList);
}

function renderPaginatedList() {
  let container = document.getElementById('smpListContainer');
  let btnMore = document.getElementById('btnLoadMore');
  
  if(filteredDataList.length === 0) { 
    container.innerHTML = '<p class="text-center mt-4 text-muted">ไม่พบข้อมูล SMP</p>'; 
    btnMore.style.display = 'none';
    return; 
  }

  let startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  let endIndex = startIndex + ITEMS_PER_PAGE;
  let itemsToShow = filteredDataList.slice(startIndex, endIndex);

  let html = '';
  if(currentPage === 1) html += `<p style="font-size:13.5px; color:var(--text-muted); margin-bottom:10px; font-weight:500;">พบทั้งหมด <b>${filteredDataList.length}</b> รายการ</p><div class="row">`;

  itemsToShow.forEach(item => {
    let tIcon = item.type.includes('EE') || item.type.includes('ไฟฟ้า') ? 'bolt' : (item.type.includes('ME') || item.type.includes('เครื่องกล') ? 'settings' : 'build');
    html += `
    <div class="col-md-6 col-lg-4">
      <div class="report-card" onclick="showDetail('${item.smpId}')">
        <div class="report-card-head">
           <div class="report-card-title">#${item.smpId}</div>
           <div class="badge-chip"><span class="material-symbols-rounded" style="font-size:16px;">${tIcon}</span> ${item.type}</div>
        </div>
        <p class="report-detail" style="font-weight:600; color:var(--primary);">เรื่อง: ${item.title}</p>
        <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
           <span class="badge-chip" style="background:#EDF2F7; color:#4A5568;"><span class="material-symbols-rounded" style="font-size:14px;">person</span> ${item.presenter || '-'}</span>
           <span class="badge-chip" style="background:#EDF2F7; color:#4A5568;"><span class="material-symbols-rounded" style="font-size:14px;">precision_manufacturing</span> ${item.line || '-'}</span>
           <span class="badge-chip" style="background:#EDF2F7; color:#4A5568;"><span class="material-symbols-rounded" style="font-size:14px;">calendar_today</span> ${item.date.split(' ')[0]}</span>
        </div>
      </div>
    </div>`;
  });

  if(currentPage === 1) { html += `</div>`; container.innerHTML = html; } 
  else { let rowDiv = container.querySelector('.row'); if(rowDiv) rowDiv.insertAdjacentHTML('beforeend', html); }

  let loadedCount = Math.min(endIndex, filteredDataList.length);
  document.getElementById('countLoaded').innerText = loadedCount;
  document.getElementById('countTotal').innerText = filteredDataList.length;

  if(loadedCount >= filteredDataList.length) { btnMore.style.display = 'none'; } 
  else { btnMore.style.display = 'inline-block'; }
}

function loadMoreData() { currentPage++; renderPaginatedList(); }

function changeChartMode(mode) {
  currentChartMode = mode;
  let descText = "";
  if(mode === 'presenter') descText = "จำนวนเอกสาร SMP ที่จัดทำแยกตามรายบุคคล (Top 10)";
  if(mode === 'machine') descText = "จำนวนเอกสาร SMP แยกตามเครื่องจักร (Top 10)";
  if(mode === 'line') descText = "จำนวนเอกสาร SMP แยกตามแผนก/ไลน์ (Top 10)";
  document.getElementById('chartDescText').innerText = descText;
  drawDashboardChart(filteredDataList);
}

function drawDashboardChart(dataList) {
  document.getElementById('dashboardCard').style.display = 'block';
  let counts = {};
  
  dataList.forEach(d => {
    if(currentChartMode === 'presenter') {
      if(d.presenter) {
        let ps = String(d.presenter).split(',').map(p => p.trim());
        ps.forEach(p => { if(p) counts[p] = (counts[p] || 0) + 1; });
      } else { counts['ไม่ระบุ'] = (counts['ไม่ระบุ'] || 0) + 1; }
    } 
    else if (currentChartMode === 'line') {
      let l = d.line || 'ไม่ระบุ';
      counts[l] = (counts[l] || 0) + 1;
    }
    else if (currentChartMode === 'machine') {
      let m = d.machine || 'ไม่ระบุ';
      if(String(m).trim() === '') m = 'ไม่ระบุ';
      counts[m] = (counts[m] || 0) + 1;
    }
  });

  let sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10);
  let labels = sorted.map(x => x[0]);
  let values = sorted.map(x => x[1]);

  let chartColor = currentChartMode === 'presenter' ? '#00A5D9' : (currentChartMode === 'line' ? '#38A169' : '#D69E2E');

  const ctx = document.getElementById('smpChart').getContext('2d');
  if(myChart) { myChart.destroy(); } 
  
  myChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: [{ label: 'จำนวนเอกสาร', data: values, backgroundColor: chartColor, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });
}

async function compressFile(file) {
  return new Promise((resolve) => {
    let reader = new FileReader();
    reader.onload = e => {
      let img = new Image();
      img.onload = () => {
        let canvas = document.createElement('canvas');
        let MAX_W = 800; let scale = img.width > MAX_W ? MAX_W / img.width : 1;
        canvas.width = img.width * scale; canvas.height = img.height * scale;
        let ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6)); 
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function compressMainImage(input) {
  if(input.files.length > 0) {
    const b64 = await compressFile(input.files[0]);
    let base64Input = document.getElementById('f_mainImageBase64');
    if(base64Input) base64Input.value = b64;
    let preview = document.getElementById('mainImagePreview');
    if(preview) preview.innerHTML = `<img src="${b64}">`;
  }
}

async function compressStepImages(fileInput) {
  const card = fileInput.closest('.step-card');
  const storageInput = card.querySelector('.s-imgs');
  const previewBox = card.querySelector('.gallery-preview');

  if(previewBox) previewBox.innerHTML = '<span class="text-muted small">กำลังบีบอัด...</span>';
  
  storageInput.compressedArray = [];
  let files = Array.from(fileInput.files).slice(0, 10);
  for(let f of files) { 
      let b64 = await compressFile(f); 
      storageInput.compressedArray.push(b64); 
  }
  
  if(previewBox) {
      previewBox.innerHTML = '';
      storageInput.compressedArray.forEach(b64 => { previewBox.innerHTML += `<img src="${b64}">`; });
  }
}

document.getElementById('smpForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  let smpTypeSelected = document.querySelector('input[name="smpTypeGrp"]:checked');
  if(!smpTypeSelected) { showModal("ข้อมูลไม่ครบ", "กรุณาเลือกประเภท SMP ด้วยครับ", "warning", "#D69E2E"); return; }
  let finalSmpType = smpTypeSelected.value;
  if(finalSmpType === 'อื่นๆ') { 
    let otherVal = document.getElementById('f_smpTypeOther'); 
    if(otherVal && otherVal.value.trim() !== '') finalSmpType = otherVal.value.trim(); 
  }

  let presArray = []; 
  document.querySelectorAll('.pres-cb:checked').forEach(cb => presArray.push(cb.value));
  let cbOther = document.getElementById('cbPresOther');
  let presOther = document.getElementById('f_presenter_other');
  if(cbOther && cbOther.checked && presOther) {
      if(presOther.value.trim() !== "") presArray.push(presOther.value.trim());
  }
  if(presArray.length === 0) { showModal("ข้อมูลไม่ครบ", "กรุณาเลือกหรือระบุผู้จัดทำอย่างน้อย 1 คน", "warning", "#D69E2E"); return; }
  let presenter = presArray.join(', ');

  let lineSel = document.getElementById('f_line_sel');
  let lineOther = document.getElementById('f_line_other');
  let line = (lineSel && lineSel.value === 'other') ? (lineOther ? lineOther.value : '') : (lineSel ? lineSel.value : '');
  
  let freqSel = document.getElementById('f_frequency_sel');
  let freqOther = document.getElementById('f_frequency_other');
  let freq = (freqSel && freqSel.value === 'other') ? (freqOther ? freqOther.value : '') : (freqSel ? freqSel.value : '');

  document.getElementById('loadingScreen').style.display = 'flex';
  
  let payloadAction = isEditingId ? 'update' : 'insert';
  let lotoReq = document.querySelector('input[name="r_loto"]:checked');
  let riskReq = document.querySelector('input[name="r_riskAssessed"]:checked');

  let formData = {
    title: document.getElementById('f_title').value, 
    smpId: document.getElementById('f_smpId').value,
    presenter: presenter, 
    approver: document.getElementById('f_approver').value,
    line: line, 
    machine: document.getElementById('f_machine').value,
    smpType: finalSmpType, 
    techCount: document.getElementById('f_techCount').value,
    techTime: document.getElementById('f_techTime').value, 
    maintType: document.getElementById('f_maintType').value,
    workTime: document.getElementById('f_workTime').value, 
    downtime: document.getElementById('f_downtime').value,
    frequency: freq, 
    mainImage: document.getElementById('f_mainImageBase64').value,
    oldMainImage: document.getElementById('f_mainImageOld') ? document.getElementById('f_mainImageOld').value : '', 
    ppe: Array.from(document.querySelectorAll('#ppeBox .icon-checkbox')).map(el => ({name: el.dataset.val, used: !el.classList.contains('not-used')})),
    risks: Array.from(document.querySelectorAll('#riskBox .icon-checkbox')).map(el => ({name: el.dataset.val, risk: !el.classList.contains('not-used')})),
    loto: lotoReq ? lotoReq.value : '', 
    riskAssessed: riskReq ? riskReq.value : ''
  };

  let stepsData = [];
  document.querySelectorAll('.step-card').forEach((card) => {
    let fileInput = card.querySelector('.s-imgs');
    let sType = card.querySelector('.s-type');
    let sTypeHidden = card.querySelector('.s-type-hidden');
    let typeSymbol = (sType && sType.disabled && sTypeHidden) ? sTypeHidden.value : (sType ? sType.value : '');
    let badge = card.querySelector('.step-badge');
    let stepIdxStr = badge ? badge.innerText.replace('ขั้นตอนที่ #', '') : '0';
    
    stepsData.push({
      stepNo: parseInt(stepIdxStr),
      stepName: card.querySelector('.s-task').value, 
      timeTaken: card.querySelector('.s-time').value,
      typeSymbol: typeSymbol, 
      description: card.querySelector('.s-desc').value, 
      images: fileInput.compressedArray || [],
      oldImages: fileInput.oldImages ? JSON.parse(fileInput.oldImages) : [] 
    });
  });

  let finalPayload = { action: payloadAction, formData: formData, stepsData: stepsData };

  fetch(API_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(finalPayload) 
  })
  .then(async res => {
      const text = await res.text();
      try {
          return JSON.parse(text);
      } catch(e) {
          console.error("เซิร์ฟเวอร์ตอบกลับมาเป็น:", text); 
          throw new Error("เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (โปรดตรวจสอบการ Deploy หรือสิทธิ์บน Google Apps Script)");
      }
  })
  .then(res => {
    if(res.status === 'success'){
      showModal('บันทึกสำเร็จ!', 'บันทึกข้อมูลรหัส: ' + res.smpId + ' เรียบร้อยแล้ว', 'check_circle', '#38A169');
      localStorage.removeItem('smp_draft');
      let t = document.getElementById('draftToast'); if(t) t.style.display = 'none';
      showHome();
    } else { showModal('เกิดข้อผิดพลาด', res.message, 'error', '#E53E3E'); }
  })
  .catch(err => showModal('ข้อผิดพลาดเครือข่าย', err.message || 'การเชื่อมต่อล้มเหลว', 'cloud_off', '#E53E3E'))
  .finally(() => { document.getElementById('loadingScreen').style.display = 'none'; });
});

function getPPEIcon(name) {
  switch(name) {
    case 'ถุงมือ': return 'images/ppe_gloves.png'; case 'หมวกนิรภัย': return 'images/ppe_helmet.png'; 
    case 'หน้ากาก': return 'images/ppe_mask.png'; case 'กันตกจากที่สูง': return 'images/ppe_harness.png'; 
    case 'แว่นตา': return 'images/ppe_glasses.png'; case 'ที่อุดหู': return 'images/ppe_headphone.png';
    case 'รองเท้าเซฟตี้': return 'images/ppe_foot.png'; case 'เสื้อสะท้อนแสง': return 'images/ppe_vis_cloth.png';
    default: return '';                   
  }
}

function getRiskIcon(name) {
  switch(name) {
    case 'จุดหนีบ': return 'images/risk_gear.png'; case 'อุปกรณ์เครื่องมือ': return 'images/risk_wrech.png'; 
    case 'ยกด้วยมือ': return 'images/risk_heavyobject.png'; case 'ทำงานที่สูง': return 'images/risk_highground.png'; 
    case 'สารเคมี': return 'images/risk_chmisrty.png'; case 'เสียงดัง': return 'images/risk_loudnoise.png';  
    case 'รถโฟล์คลิฟต์': return 'images/risk_car.png';           
    default: return '';                    
  }
}

function renderDetail(data) {
  currentDetailData = data;
  let m = data.main;
  
  let ppeHtml = m.ppe.filter(p => p.used).map(p => `
    <div style="display:flex; flex-direction:column; align-items:center; width:65px;">
      <img src="${getPPEIcon(p.name)}" style="width:50px; height:50px; object-fit:contain;">
      <span style="font-size:11px; text-align:center; font-weight:600; color:var(--text-muted); margin-top:5px;">${p.name}</span>
    </div>
  `).join('') || '<span class="text-muted small">ไม่มีการระบุ PPE</span>';

  let riskHtml = m.risks.filter(r => r.risk).map(r => `
    <div style="display:flex; flex-direction:column; align-items:center; width:65px;">
      <img src="${getRiskIcon(r.name)}" style="width:50px; height:50px; object-fit:contain;">
      <span style="font-size:11px; text-align:center; font-weight:600; color:var(--text-muted); margin-top:5px;">${r.name}</span>
    </div>
  `).join('') || '<span class="text-muted small">ไม่มีความเสี่ยง</span>';

  let html = `
    <div style="padding:25px; border-bottom:1px solid #E2E8F0; background:#F8FAFC;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h3 style="margin:0 0 5px 0; color:var(--primary); font-weight:700;">#${m.smpId}</h3>
          <p style="margin:0; font-size:15px; font-weight:600;">${m.title}</p>
        </div>
        <img src="images/logo.png" style="height:40px; object-fit:contain;" onerror="this.style.display='none'">
      </div>
    </div>
    
    <div style="padding:25px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px; font-size:14px;">
        <div><span style="color:var(--text-muted); font-size:12px;">ประเภท SMP</span><br><b style="color:var(--secondary);">${m.smpType}</b></div>
        <div><span style="color:var(--text-muted); font-size:12px;">วันที่อัปเดต</span><br><b>${(m.date||'').split(' ')[0]}</b></div>
        <div><span style="color:var(--text-muted); font-size:12px;">ผู้จัดทำ (ช่าง)</span><br><b>${m.presenter}</b></div>
        <div><span style="color:var(--text-muted); font-size:12px;">ผู้อนุมัติ</span><br><b>${m.approver || '-'}</b></div>
        <div><span style="color:var(--text-muted); font-size:12px;">ไลน์การผลิต</span><br><b>${m.line || '-'}</b></div>
        <div><span style="color:var(--text-muted); font-size:12px;">เครื่องจักร</span><br><b>${m.machine || '-'}</b></div>
      </div>

      <div style="background:#FFF5F5; border:1px solid #FC8181; border-radius:12px; padding:15px; margin-bottom:20px;">
        <div style="color:#E53E3E; font-weight:700; font-size:14px; margin-bottom:10px;"><span class="material-symbols-rounded" style="vertical-align:bottom; font-size:18px;">warning</span> อุปกรณ์ความปลอดภัย & ความเสี่ยง</div>
        <p style="font-size:12px; margin:0 0 5px 0; font-weight:600;">PPE ที่ใช้งาน:</p>
        <div style="display:flex; flex-wrap:wrap; gap:15px; margin-bottom:15px;">${ppeHtml}</div>
        <p style="font-size:12px; margin:0 0 5px 0; font-weight:600;">ความเสี่ยงในงาน:</p>
        <div style="display:flex; flex-wrap:wrap; gap:15px;">${riskHtml}</div>
      </div>

      ${m.mainImage ? `<div style="text-align:center; margin-bottom:25px;"><img src="${m.mainImage}" style="max-height:250px; border-radius:12px; box-shadow:var(--shadow-sm); border:1px solid var(--border);"></div>` : ''}

      <div style="color:var(--primary); font-weight:700; font-size:15px; margin-bottom:10px; border-bottom:2px solid var(--secondary); padding-bottom:5px;">ขั้นตอนการปฏิบัติงาน (SOP)</div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13.5px;">
          <thead><tr style="background:#F1F5F9; color:var(--text-muted); text-align:left;">
            <th style="padding:10px; border-radius:8px 0 0 8px;">#</th>
            <th style="padding:10px;">ขั้นตอน</th>
            <th style="padding:10px;">ประเภท</th>
            <th style="padding:10px; min-width:200px;">รายละเอียด</th>
            <th style="padding:10px; border-radius:0 8px 8px 0;">รูปภาพแนบ</th>
          </tr></thead>
          <tbody>
  `;

  data.steps.forEach((s, idx) => {
    let bCol = "#4A5568"; let bBg = "#EDF2F7";
    if(s.typeSymbol.includes('ความปลอดภัย')) { bCol = "#E53E3E"; bBg = "#FFF5F5"; }
    else if(s.typeSymbol.includes('คุณภาพ')) { bCol = "#005EB8"; bBg = "#EBF8FF"; }
    else if(s.typeSymbol.includes('สิ่งแวดล้อม')) { bCol = "#38A169"; bBg = "#F0FFF4"; }

    let imgs = s.images.map(url => `<a href="${url}" target="_blank"><img src="${url}" style="height:60px; border-radius:6px; border:1px solid var(--border); margin-top:5px; margin-right:5px;"></a>`).join('');
    
    html += `<tr style="border-bottom:1px solid var(--border);">
             <td style="padding:12px 10px; font-weight:bold; color:var(--text-muted); vertical-align:top;">${s.stepNo}</td>
             <td style="padding:12px 10px; font-weight:600; vertical-align:top;">${s.stepName}</td>
             <td style="padding:12px 10px; vertical-align:top;"><span style="background:${bBg}; color:${bCol}; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap;">${s.typeSymbol}</span></td>
             <td style="padding:12px 10px; vertical-align:top;"><div style="white-space:pre-wrap; color:var(--text-muted);">${s.description}</div></td>
             <td style="padding:12px 10px; vertical-align:top;"><div style="display:flex; flex-wrap:wrap; gap:5px;">${imgs}</div></td>
             </tr>`;
  });

  html += `</tbody></table></div></div>`;
  document.getElementById('docContent').innerHTML = html;
}

async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

async function downloadExcel() {
  if(!currentDetailData) return;
  let m = currentDetailData.main;

  const btn = document.getElementById('btnDownloadExcel');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> กำลังสร้าง Excel...';
  btn.disabled = true;

  try {
    const response = await fetch('SMP-Template.xlsx');
    if (!response.ok) throw new Error("ไม่พบไฟล์ Template 'SMP-Template.xlsx'");
    const arrayBuffer = await response.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const firstSheetName = workbook.worksheets[0].name; 
    const worksheet = workbook.getWorksheet(firstSheetName);

    worksheet.getCell('N2').value = "ชื่อเรื่อง: " + m.title;
    worksheet.getCell('E3').value = m.line; 
    worksheet.getCell('E4').value = m.machine; 
    worksheet.getCell('R3').value = m.smpId;
    worksheet.getCell('Y3').value = m.presenter;
    worksheet.getCell('AJ3').value = m.approver || ''; 
    worksheet.getCell('AN4').value = m.date.split(' ')[0];

    worksheet.getCell('S6').value = m.techCount || '';
    worksheet.getCell('W6').value = m.techTime || '';
    worksheet.getCell('Z6').value = m.maintType;
    worksheet.getCell('AD6').value = m.workTime || '';
    worksheet.getCell('AI6').value = m.downtime || ''; 
    worksheet.getCell('AO6').value = m.frequency || ''; 

    let checkBase64 = await fetchImageAsBase64('images/check.png');
    let checkId = null;
    if(checkBase64) { checkId = workbook.addImage({ base64: checkBase64, extension: 'png' }); }
    function placeCheck(col, row) { if(checkId) worksheet.addImage(checkId, { tl: { col: col, row: row }, ext: { width: 30, height: 30 } }); }

    if ((m.smpType||'').includes('เครื่องกล')) placeCheck(8.5, 5.5); 
    if ((m.smpType||'').includes('ไฟฟ้า')) placeCheck(14.2, 5.5); 

    if (m.loto === 'ต้องการ') placeCheck(22.2, 11.2); 
    else placeCheck(22.2, 13.5); 

    if (m.riskAssessed === 'ใช่') placeCheck(41, 10.2); 
    else if (m.riskAssessed === 'ไม่ใช่') placeCheck(41, 12.2); 
    else placeCheck(41, 14.2); 

    let crossBase64 = await fetchImageAsBase64('images/cross.png');
    if (crossBase64) {
      let crossId = workbook.addImage({ base64: crossBase64, extension: 'png' });
      
      const ppeCrossCoords = {
        'ถุงมือ': { col: 5.15, row: 10.5 }, 'หมวกนิรภัย': { col: 7.0, row: 10.5 },
        'หน้ากาก': { col: 8.91, row: 10.5 }, 'กันตกจากที่สูง': { col: 10, row: 10.5 },
        'แว่นตา': { col: 11.55, row: 10.5 }, 'ที่อุดหู': { col: 13.9, row: 10.5 },
        'รองเท้าเซฟตี้': { col: 15.1, row: 10.5 }, 'เสื้อสะท้อนแสง': { col: 16.5, row: 10.5 }
      };

      const riskCrossCoords = {
        'รถโฟล์คลิฟต์': { col: 23.5, row: 10.2 }, 'จุดหนีบ': { col: 25.2, row: 10.2 },       
        'อุปกรณ์เครื่องมือ': { col: 27.3, row: 10.2 }, 'ยกด้วยมือ': { col: 29.5, row: 10.2 },
        'ทำงานที่สูง': { col: 31.5, row: 10.2 }, 'สารเคมี': { col: 34.2, row: 10.2 },        
        'เสียงดัง': { col: 35.82, row: 10.2 }        
      };

      m.ppe.forEach(p => { 
        if (!p.used && ppeCrossCoords[p.name]) { worksheet.addImage(crossId, { tl: { col: ppeCrossCoords[p.name].col, row: ppeCrossCoords[p.name].row }, ext: { width: 56, height: 75 } }); } 
      });

      m.risks.forEach(r => { 
        if (!r.risk && riskCrossCoords[r.name]) { worksheet.addImage(crossId, { tl: { col: riskCrossCoords[r.name].col, row: riskCrossCoords[r.name].row }, ext: { width: 45, height: 45 } }); } 
      });
    }

    if (m.mainImage) {
      const mainBase64 = await fetchImageAsBase64(m.mainImage);
      if (mainBase64) {
        const mainImgId = workbook.addImage({ base64: mainBase64, extension: 'png' });
        worksheet.addImage(mainImgId, { tl: { col: 14, row: 7.5 }, ext: { width: 650, height: 350 } });
      }
    }

    const getStyle = (cellStr) => { let cell = worksheet.getCell(cellStr); return { val: cell.value || '', font: cell.font || {} }; };
    const symSafe = getStyle('M16'); const symQual = getStyle('Q16'); const symEnv  = getStyle('T16'); const symProd = getStyle('W16');
    const stepRows = [17, 23, 29, 35, 41, 47, 53, 59, 65, 71]; 
    
    for (let i = 0; i < currentDetailData.steps.length; i++) {
      let s = currentDetailData.steps[i];
      if (i >= stepRows.length) break; 
      let r = stepRows[i]; 
      
      worksheet.getCell('B' + r).value = s.stepNo; 
      worksheet.getCell('C' + r).value = s.stepName;
      worksheet.getCell('J' + r).value = s.timeTaken || ''; 
      worksheet.getCell('M' + r).value = s.description;

      let targetSym = symSafe;
      if((s.typeSymbol||'').includes('ความปลอดภัย')) { targetSym = symSafe; }
      else if((s.typeSymbol||'').includes('คุณภาพ')) { targetSym = symQual; }
      else if((s.typeSymbol||'').includes('สิ่งแวดล้อม')) { targetSym = symEnv; }
      else if((s.typeSymbol||'').includes('การผลิต')) { targetSym = symProd; }
      
      const cellK = worksheet.getCell('K' + r);
      cellK.value = targetSym.val; cellK.font = targetSym.font;
      if(targetSym.fill) { cellK.fill = targetSym.fill; }
      cellK.alignment = { horizontal: 'center', vertical: 'middle' };
      
      if (s.images && s.images.length > 0) {
        for(let imgIndex = 0; imgIndex < s.images.length; imgIndex++) {
          const stepImgBase64 = await fetchImageAsBase64(s.images[imgIndex]); 
          if (stepImgBase64) {
            const stepImgId = workbook.addImage({ base64: stepImgBase64, extension: 'png' });
            let colsPerRow = 4; let cIndex = imgIndex % colsPerRow; let rIndex = Math.floor(imgIndex / colsPerRow); 
            worksheet.addImage(stepImgId, { tl: { col: 27.5 + (cIndex * 3.5), row: (r - 1) + 0.5 + (rIndex * 3.0) }, ext: { width: 120, height: 80 } });
          }
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `SMP_${m.smpId}.xlsx`; 
    document.body.appendChild(link); link.click(); document.body.removeChild(link);

  } catch (error) {
    console.error(error); showModal("ระบบแจ้ง Error", error.message, "error", "#E53E3E");
  } finally {
    btn.innerHTML = originalText; btn.disabled = false;
  }
}
</script>
