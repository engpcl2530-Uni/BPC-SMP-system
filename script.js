const API_URL = "https://script.google.com/macros/s/AKfycbw6rd64-pGhm0m6F9_cOf4nf_7Daou3hqzx9LQCrstQdKJNxG8sLOtaeulIh6YMtD0FPw/exec"; 

let allSmpDataList = [];
let filteredDataList = [];
let currentDetailData = null;
let isEditingId = null; 
let myChart = null; 
let currentChartMode = 'presenter'; 
const ITEMS_PER_PAGE = 100;
let currentPage = 1;
let stepSortable = null; 

let mainImagesArray = []; 

window.onload = () => { 
  document.getElementById('loadingScreen').style.display = 'flex';
  loadSMPList(); 
  checkOfflineStatus(); 
  checkDraftsOnLoad(); 
};

// ======================== MODALS & TOASTS ========================
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

// ======================== UTILITIES ========================
function parseDateSafely(dateStr) {
    if (!dateStr) return new Date(0); 
    let str = dateStr.toString().trim();
    if (str.includes('-')) { 
        let d = new Date(str); 
        if (!isNaN(d.getTime())) return d; 
    }
    if (str.includes('/')) {
        let parts = str.split(' ')[0].split('/'); 
        if (parts.length === 3) {
            let p0 = parseInt(parts[0], 10); 
            let p1 = parseInt(parts[1], 10); 
            let p2 = parseInt(parts[2], 10);
            if (p2 < 100) p2 += 2000;
            return new Date(p2, p1 - 1, p0); 
        }
    }
    let fallback = new Date(str); 
    return isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

function toggleOtherInput(selElement, inputId) {
  let inputEl = document.getElementById(inputId);
  if(selElement.value === 'other') { 
      inputEl.style.display = 'block'; 
      inputEl.required = true; 
      inputEl.focus(); 
  } else { 
      inputEl.style.display = 'none'; 
      inputEl.required = false; 
      inputEl.value = ''; 
  }
}

function toggleOtherCheckbox(cbId, inputId) {
  let cb = document.getElementById(cbId); 
  let inputEl = document.getElementById(inputId);
  if(cb.checked) { 
      inputEl.style.display = 'block'; 
      inputEl.required = true; 
      inputEl.focus(); 
  } else { 
      inputEl.style.display = 'none'; 
      inputEl.required = false; 
      inputEl.value = ''; 
  }
}

// ======================== ID GENERATION ========================
function generateId(type, isDraft) {
    let prefix = 'GE';
    if(type.includes('เครื่องกล')) prefix = 'ME';
    else if(type.includes('ไฟฟ้า')) prefix = 'EE';
    
    if(isDraft) prefix = 'D' + prefix; // เติม D นำหน้าถ้าเป็นแบบร่าง
    let prefixStr = `BPC-${prefix}-`;
    let maxId = 0;
    
    if(isDraft) {
        let drafts = JSON.parse(localStorage.getItem('smp_multi_drafts') || '[]');
        for(let d of drafts) {
            if(d.id && d.id.startsWith(prefixStr)) {
                let num = parseInt(d.id.replace(prefixStr, ''), 10);
                if(!isNaN(num) && num > maxId) maxId = num;
            }
        }
    } else {
        for (let item of allSmpDataList) {
            if (item.smpId && item.smpId.startsWith(prefixStr)) {
                let num = parseInt(item.smpId.replace(prefixStr, ''), 10);
                if (!isNaN(num) && num > maxId) maxId = num;
            }
        }
    }
    return `${prefixStr}${String(maxId + 1).padStart(4, '0')}`;
}

// ======================== OFFLINE & SYNC ========================
window.addEventListener('online', checkOfflineStatus);
window.addEventListener('offline', checkOfflineStatus);

function checkOfflineStatus() {
  const isOffline = !navigator.onLine;
  document.getElementById('offlineBanner').style.display = isOffline ? 'block' : 'none';
  let queue = JSON.parse(localStorage.getItem('smp_offline_queue') || '[]');
  document.getElementById('btnSync').style.display = (navigator.onLine && queue.length > 0) ? 'flex' : 'none';
}

function syncOfflineData() {
  if(!navigator.onLine) { 
      showModal("ออฟไลน์", "ไม่มีการเชื่อมต่ออินเทอร์เน็ต", "cloud_off", "#E53E3E"); 
      return; 
  }
  let queue = JSON.parse(localStorage.getItem('smp_offline_queue') || '[]');
  if(queue.length === 0) return;
  
  document.getElementById('loadingScreen').style.display = 'flex';
  Promise.all(queue.map(p => fetch(API_URL, { method: 'POST', body: JSON.stringify(p) })))
    .then(() => { 
        showModal("สำเร็จ!", "ซิงค์ข้อมูลออฟไลน์สำเร็จ", "check_circle", "#38A169"); 
        localStorage.removeItem('smp_offline_queue'); 
        checkOfflineStatus(); 
        loadSMPList(); 
    })
    .catch(err => { 
        showModal("ผิดพลาด", "บางรายการซิงค์ไม่สำเร็จ กรุณาลองใหม่", "error", "#E53E3E"); 
    })
    .finally(() => { 
        document.getElementById('loadingScreen').style.display = 'none'; 
    });
}

// ======================== MULTI-DRAFT SYSTEM ========================
function saveDataAsDraft() {
    let smpTypeSelected = document.querySelector('input[name="smpTypeGrp"]:checked');
    let title = document.getElementById('f_title').value.trim();

    if(!smpTypeSelected || !title) {
        showModal("ข้อมูลไม่ครบ", "กรุณาระบุ 'ประเภท SMP' และ 'ชื่อเรื่อง' ก่อนบันทึกแบบร่าง", "warning", "#D69E2E");
        return;
    }

    let type = smpTypeSelected.value;
    if(type === 'อื่นๆ') { 
        let otherVal = document.getElementById('f_smpTypeOther'); 
        if(otherVal && otherVal.value.trim() !== '') type = otherVal.value.trim(); 
    }

    // ล็อกสถานะเป็นยังไม่เสร็จเสมอสำหรับแบบร่าง
    document.getElementById('f_status').value = 'Unfinished';

    let draftId = document.getElementById('f_draftId').value;
    if (!draftId) { 
        draftId = generateId(type, true); 
        document.getElementById('f_draftId').value = draftId; 
    }
    
    let draftData = collectFormData(); 
    let drafts = JSON.parse(localStorage.getItem('smp_multi_drafts') || '[]');
    let existingIndex = drafts.findIndex(d => d.id === draftId);
    let draftObj = { 
        id: draftId, 
        title: title, 
        time: new Date().toLocaleString('th-TH'), 
        data: draftData 
    };
    
    if (existingIndex >= 0) drafts[existingIndex] = draftObj;
    else drafts.push(draftObj);
    
    localStorage.setItem('smp_multi_drafts', JSON.stringify(drafts));
    
    showModal("บันทึกแบบร่างสำเร็จ", `แบบร่างรหัส ${draftId} ถูกบันทึกเรียบร้อยแล้ว`, "save_as", "var(--secondary)");
    showHome();
}

function checkDraftsOnLoad() {
    let drafts = JSON.parse(localStorage.getItem('smp_multi_drafts') || '[]');
    if(drafts.length > 0) {
        document.getElementById('draftCountBadge').innerText = drafts.length;
        document.getElementById('draftToast').style.display = 'flex';
    } else {
        document.getElementById('draftToast').style.display = 'none';
    }
}

function openDraftListModal() {
    let drafts = JSON.parse(localStorage.getItem('smp_multi_drafts') || '[]');
    let container = document.getElementById('draftListContainer');
    
    if(drafts.length === 0) { 
        container.innerHTML = '<p class="text-center text-muted">ไม่มีแบบร่างที่บันทึกไว้</p>'; 
    } else {
        let html = '';
        drafts.forEach(d => {
            html += `
            <div class="draft-item" onclick="loadDraftIntoForm('${d.id}')">
                <div>
                    <div class="draft-item-title">${d.title}</div>
                    <div class="draft-item-time"><span class="material-symbols-rounded" style="font-size:12px;">schedule</span> ${d.time}</div>
                </div>
                <button class="draft-del-btn" onclick="deleteDraft(event, '${d.id}')"><span class="material-symbols-rounded">delete</span></button>
            </div>`;
        });
        container.innerHTML = html;
    }
    document.getElementById('draftListModal').style.display = 'flex';
    document.getElementById('draftToast').style.display = 'none';
}

function deleteDraft(event, draftId) {
    event.stopPropagation(); // ไม่ให้คลิกทะลุไปโหลดฟอร์ม
    let drafts = JSON.parse(localStorage.getItem('smp_multi_drafts') || '[]');
    drafts = drafts.filter(d => d.id !== draftId);
    localStorage.setItem('smp_multi_drafts', JSON.stringify(drafts));
    
    openDraftListModal(); // รีเฟรชลิสต์
    checkDraftsOnLoad();
    
    // อัปเดตหน้า Dashboard ด้วย
    applyFilters(); 
}

function loadDraftIntoForm(draftId) {
    let drafts = JSON.parse(localStorage.getItem('smp_multi_drafts') || '[]');
    let draft = drafts.find(d => d.id === draftId);
    
    if(draft) {
        currentDetailData = { main: draft.data.formData, steps: draft.data.stepsData };
        document.getElementById('draftListModal').style.display = 'none';
        
        proceedToEdit(); // ปั้นฟอร์ม
        
        isEditingId = null; // ปลดล็อกว่าไม่ใช่การ Edit งานจริง
        document.getElementById('f_draftId').value = draft.id;
        document.getElementById('smpIdContainer').style.display = 'none'; 
        
        // ปลดล็อกชื่อและปุ่มร่าง
        document.getElementById('presenterCheckboxGrid').classList.remove('locked');
        document.getElementById('lockWarning').style.display = 'none';
        document.querySelector('.btn-draft').style.display = 'flex';
        document.getElementById('fabDraftBtn').style.display = 'flex';
        
        showModal('กู้คืนแบบร่างสำเร็จ', `โหลดเอกสาร "${draft.title}" แล้ว`, 'restore', 'var(--secondary)');
    }
}

// ======================== VIEW NAVIGATION ========================
function showHome() {
  document.querySelectorAll('.section-view').forEach(e => e.classList.remove('active'));
  document.getElementById('homeView').classList.add('active');
  document.getElementById('appTitle').innerText = "SMP System";
  document.getElementById('appSub').innerText = "ระบบจัดการเอกสารมาตรฐาน";
  document.getElementById('btnCloseView').style.display = 'none';
  
  if(allSmpDataList.length === 0) {
      loadSMPList(); 
  } else {
      applyFilters(); // อัปเดตลิสต์แบบร่างใหม่
      checkDraftsOnLoad();
  }
}

function showForm() {
  isEditingId = null; 
  document.getElementById('smpForm').reset();
  
  let pOther = document.getElementById('f_presenter_other'); if(pOther) pOther.style.display = 'none';
  let lOther = document.getElementById('f_line_other'); if(lOther) lOther.style.display = 'none';
  let fOther = document.getElementById('f_frequency_other'); if(fOther) fOther.style.display = 'none';
  
  document.getElementById('presenterCheckboxGrid').classList.remove('locked');
  document.getElementById('lockWarning').style.display = 'none';
  document.querySelector('.btn-draft').style.display = 'flex';
  document.getElementById('fabDraftBtn').style.display = 'flex';
  document.getElementById('smpIdContainer').style.display = 'none'; 
  
  mainImagesArray = []; 
  document.getElementById('mainImagePreview').innerHTML = ''; 
  document.getElementById('f_mainImageBase64').value = ''; 
  document.getElementById('f_mainImageOld').value = ''; 
  
  document.getElementById('stepsContainer').innerHTML = ''; 
  document.getElementById('f_draftId').value = ''; 
  
  document.querySelectorAll('.section-view').forEach(e => e.classList.remove('active'));
  document.getElementById('formView').classList.add('active');
  document.getElementById('appTitle').innerText = "สร้าง SMP ใหม่";
  document.getElementById('appSub').innerText = "กรอกรายละเอียดการปฏิบัติงาน";
  document.getElementById('btnCloseView').style.display = 'flex'; 
  
  document.querySelectorAll('#ppeBox .icon-checkbox').forEach(el => el.classList.remove('not-used'));
  document.querySelectorAll('#riskBox .icon-checkbox').forEach(el => el.classList.remove('not-used'));

  document.getElementById('f_status').value = "Unfinished"; // Default Unfinished

  generateLockedSteps(); 
  initSortable(); 
  window.scrollTo(0,0);
}

// ======================== SOP STEPS (DRAG & DROP / LOTO) ========================
function getStepCardHTML(isFirstStep = false, isMandatory = false, defaultName = "", defaultTime = "", defaultType = "", isLoto = false) {
  let deleteBtn = isMandatory ? '' : `<button type="button" style="background:#FFF5F5; color:#E53E3E; border:1px solid #FC8181; padding:4px 12px; border-radius:20px; cursor:pointer; font-weight:600; font-family:'Prompt'; font-size:12.5px; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s ease;" onmouseover="this.style.background='#E53E3E'; this.style.color='#FFF';" onmouseout="this.style.background='#FFF5F5'; this.style.color='#E53E3E';" onclick="this.closest('.step-card').remove(); updateStepNumbers();"><span class="material-symbols-rounded" style="font-size:16px;">delete</span> ลบ</button>`;
  let lotoClass = isLoto ? 'loto-step' : '';
  let dragClass = isFirstStep ? 'disabled' : ''; 
  let dragTitle = isFirstStep ? 'ขั้นตอนเริ่มต้น ห้ามย้ายตำแหน่ง' : 'กดค้างเพื่อลากเลื่อน';
  
  return `
    <div class="step-card ${lotoClass}">
      <span class="step-badge">ขั้นตอนที่ #</span>
      <div class="d-flex justify-content-between mb-3 align-items-center mt-2">
        <h6 class="m-0 fw-bold" style="color:var(--primary); display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-rounded drag-handle ${dragClass}" title="${dragTitle}">drag_indicator</span>
          รายละเอียดขั้นตอน
        </h6>
        <div style="display:flex; gap:8px;">
          <button type="button" style="background:#F0F7FF; color:var(--secondary); border:1px solid var(--secondary); padding:4px 12px; border-radius:20px; cursor:pointer; font-weight:600; font-family:'Prompt'; font-size:12.5px; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s ease;" onmouseover="this.style.background='var(--secondary)'; this.style.color='#FFF';" onmouseout="this.style.background='#F0F7FF'; this.style.color='var(--secondary)';" onclick="insertStepCard(this)">
            <span class="material-symbols-rounded" style="font-size:16px;">add_to_photos</span> แทรก
          </button>
          ${deleteBtn}
        </div>
      </div>
      <div class="mb-3">
        <label>รายละเอียดการทำงาน <span class="required-star">*</span></label>
        <input type="text" class="s-task" value="${defaultName}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>เวลา (นาที)</label>
          <input type="number" class="s-time" value="${defaultTime}" required>
        </div>
        <div class="form-group">
          <label>ประเภท <span class="required-star">*</span></label>
          <select class="s-type" required>
            <option value="">-- เลือก --</option>
            <option value="ความปลอดภัย" ${defaultType==='ความปลอดภัย'?'selected':''}>ความปลอดภัย</option>
            <option value="คุณภาพ" ${defaultType==='คุณภาพ'?'selected':''}>คุณภาพ</option>
            <option value="สิ่งแวดล้อม" ${defaultType==='สิ่งแวดล้อม'?'selected':''}>สิ่งแวดล้อม</option>
            <option value="การผลิต" ${defaultType==='การผลิต'?'selected':''}>การผลิต</option>
            <option value="ไม่มีประเภท" ${defaultType==='ไม่มีประเภท'?'selected':''}>ไม่มีประเภท</option>
          </select>
        </div>
      </div>
      <div class="mb-3">
        <label>คำอธิบายเพิ่มเติม</label>
        <textarea class="s-desc" rows="2"></textarea>
      </div>
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
}

function initSortable() {
    let el = document.getElementById('stepsContainer');
    if (stepSortable) stepSortable.destroy(); 
    stepSortable = Sortable.create(el, { 
        handle: '.drag-handle:not(.disabled)', // ป้องกันการลากขั้นตอนแรก
        animation: 150, 
        ghostClass: 'sortable-ghost', 
        onEnd: function () { updateStepNumbers(); } 
    });
}

function handleLotoChange(isRequired) {
    let container = document.getElementById('stepsContainer');
    let lotoCard = container.querySelector('.loto-step'); 
    
    if (!isRequired) { 
        if (lotoCard) lotoCard.remove(); 
    } else {
        if (!lotoCard) {
            let html = getStepCardHTML(false, true, "ทำการ shutdown m/c & Lockout/Tagout (LOTO)", "", "ความปลอดภัย", true);
            let cards = container.querySelectorAll('.step-card');
            if (cards.length >= 2) {
                cards[1].insertAdjacentHTML('afterend', html);
            } else {
                container.insertAdjacentHTML('beforeend', html);
            }
        }
    }
    updateStepNumbers(); 
}

function generateLockedSteps() {
  let html = "";
  html += getStepCardHTML(true, true, "อธิบายชิ้นส่วนประกอบย่อย แนบรูปว่าอะไร", "", "ไม่มีประเภท", false);
  html += getStepCardHTML(false, true, "การเตรียมเครื่องมืออุปกรณ์", "", "ไม่มีประเภท", false);
  html += getStepCardHTML(false, true, "ทำการ shutdown m/c & Lockout/Tagout (LOTO)", "", "ความปลอดภัย", true);
  
  document.getElementById('stepsContainer').insertAdjacentHTML('beforeend', html);
  updateStepNumbers();
}

function updateStepNumbers() {
  let cards = document.querySelectorAll('#stepsContainer .step-card');
  cards.forEach((card, index) => {
    let badge = card.querySelector('.step-badge');
    if (badge) badge.innerText = `ขั้นตอนที่ #${index + 1}`;
    card.id = `step_row_${index}`;
  });
}

function insertStepCard(btn) {
  let currentCard = btn.closest('.step-card');
  let html = getStepCardHTML(false, false, "", "", "", false);
  currentCard.insertAdjacentHTML('afterend', html);
  updateStepNumbers();
}

function addStepCard(isFirstStep = false, isMandatory = false, defaultName = "", defaultTime = "", defaultType = "", isLoto = false) {
  let html = getStepCardHTML(isFirstStep, isMandatory, defaultName, defaultTime, defaultType, isLoto);
  document.getElementById('stepsContainer').insertAdjacentHTML('beforeend', html);
  updateStepNumbers();
}

// ======================== EDIT & DUPLICATE ========================
function requestEditSMP() {
    if(!currentDetailData) return;
    
    if(currentDetailData.main.status === 'Finished' || !currentDetailData.main.status) {
        // งานเสร็จแล้ว ถามก่อนแก้ไข
        document.getElementById('confirmEditModal').style.display = 'flex';
    } else { 
        proceedToEdit(); 
    }
}

function proceedToEdit() {
  document.getElementById('confirmEditModal').style.display = 'none';
  try {
      let m = currentDetailData.main;
      isEditingId = m.smpId;

      document.querySelectorAll('.section-view').forEach(e => e.classList.remove('active'));
      document.getElementById('formView').classList.add('active');
      
      document.getElementById('appTitle').innerText = "แก้ไขเอกสาร";
      document.getElementById('appSub').innerText = m.smpId || "กำลังแก้ไข";
      document.getElementById('btnCloseView').style.display = 'flex';
      document.getElementById('smpForm').reset();

      // โชว์ ID ตอนโหมดแก้ไข และซ่อนปุ่ม Draft
      document.getElementById('smpIdContainer').style.display = 'block';
      document.getElementById('presenterCheckboxGrid').classList.add('locked');
      document.getElementById('lockWarning').style.display = 'block';
      document.querySelector('.btn-draft').style.display = 'none';
      document.getElementById('fabDraftBtn').style.display = 'none';

      document.getElementById('f_smpId').value = m.smpId || '';
      document.getElementById('f_title').value = m.title || '';
      document.getElementById('f_approver').value = m.approver || '';
      document.getElementById('f_machine').value = m.machine || '';
      document.getElementById('f_techCount').value = m.techCount || '';
      document.getElementById('f_techTime').value = m.techTime || '';
      document.getElementById('f_workTime').value = m.workTime || '';
      document.getElementById('f_downtime').value = m.downtime || '';
      document.getElementById('f_maintType').value = m.maintType || '';
      document.getElementById('f_status').value = m.status || 'Finished';

      // SMP Type
      let typeRadios = document.querySelectorAll('input[name="smpTypeGrp"]');
      let typeFound = false;
      typeRadios.forEach(r => { 
          if (String(m.smpType).includes(r.value)) { 
              r.checked = true; 
              typeFound = true; 
          } 
      });
      if (!typeFound && m.smpType) document.getElementById('t3').checked = true;

      // Presenters
      let presCbsElements = document.querySelectorAll('.pres-cb');
      presCbsElements.forEach(cb => cb.checked = false);
      document.getElementById('cbPresOther').checked = false;
      document.getElementById('f_presenter_other').style.display = 'none';
      if (m.presenter) {
          let presArr = String(m.presenter).split(',').map(p => p.trim());
          let others = [];
          presArr.forEach(p => {
              let matched = Array.from(presCbsElements).find(cb => cb.value === p);
              if (matched) matched.checked = true;
              else if (p && p !== 'null') others.push(p);
          });
          if (others.length > 0) {
              document.getElementById('cbPresOther').checked = true;
              let pOtherInput = document.getElementById('f_presenter_other');
              pOtherInput.style.display = 'block'; 
              pOtherInput.value = others.join(', ');
          }
      }

      // Line
      let lineSel = document.getElementById('f_line_sel'); 
      let lineOther = document.getElementById('f_line_other');
      if (Array.from(lineSel.options).some(o => o.value === String(m.line||''))) { 
          lineSel.value = m.line; 
          lineOther.style.display = 'none'; 
      } else if (m.line) { 
          lineSel.value = 'other'; 
          lineOther.style.display = 'block'; 
          lineOther.value = m.line; 
      }

      // Frequency
      let freqSel = document.getElementById('f_frequency_sel'); 
      let freqOther = document.getElementById('f_frequency_other');
      if (Array.from(freqSel.options).some(o => o.value === String(m.frequency||''))) { 
          freqSel.value = m.frequency; 
          freqOther.style.display = 'none'; 
      } else if (m.frequency) { 
          freqSel.value = 'other'; 
          freqOther.style.display = 'block'; 
          freqOther.value = m.frequency; 
      }

      // LOTO & Risk Assessed
      if(m.loto === 'ต้องการ') document.getElementById('loto_req').checked = true; 
      else if(m.loto === 'ไม่ต้องการ') document.getElementById('loto_not_req').checked = true;

      if(m.riskAssessed === 'ใช่') document.getElementById('risk_yes').checked = true;
      else if(m.riskAssessed === 'ไม่ใช่') document.getElementById('risk_no').checked = true;
      else if(m.riskAssessed === 'ไม่เกี่ยวข้อง') document.getElementById('risk_na').checked = true;

      // PPE & Risks
      document.querySelectorAll('#ppeBox .icon-checkbox').forEach(el => {
          let p = (m.ppe||[]).find(x => x.name === el.dataset.val);
          if (p && p.used) el.classList.remove('not-used'); else el.classList.add('not-used');
      });
      document.querySelectorAll('#riskBox .icon-checkbox').forEach(el => {
          let r = (m.risks||[]).find(x => x.name === el.dataset.val);
          if (r && r.risk) el.classList.remove('not-used'); else el.classList.add('not-used');
      });

      // Main Image
      mainImagesArray = [];
      let previewBox = document.getElementById('mainImagePreview'); 
      previewBox.innerHTML = '';
      if(m.mainImage) {
          try { 
              let parsed = JSON.parse(m.mainImage); 
              if(Array.isArray(parsed)) mainImagesArray = parsed; 
              else mainImagesArray = [m.mainImage]; 
          } catch(e) { mainImagesArray = [m.mainImage]; }
          document.getElementById('f_mainImageOld').value = JSON.stringify(mainImagesArray);
          renderMainImagePreview();
      }

      // Steps
      let sContainer = document.getElementById('stepsContainer'); 
      sContainer.innerHTML = '';
      
      (m.steps || currentDetailData.steps || []).forEach((s, idx) => {
          let isFirst = (idx === 0);
          let isMandatory = (idx < 2);
          let isLoto = s.stepName.includes('LOTO'); 
          if (isLoto) isMandatory = true; 
          
          addStepCard(isFirst, isMandatory, s.stepName, s.timeTaken, s.typeSymbol, isLoto);
          
          let cards = document.querySelectorAll('#stepsContainer .step-card');
          let card = cards[cards.length - 1]; 
          if(card) {
              card.querySelector('.s-desc').value = s.description || '';
              let fileInput = card.querySelector('.s-imgs');
              let imgArray = Array.isArray(s.images) ? s.images : (typeof s.images === 'string' && s.images !== "" ? [s.images] : []);
              if (imgArray.length > 0) {
                  fileInput.oldImages = JSON.stringify(imgArray);
                  renderStepImagePreview(fileInput); // โชว์รูปเก่าและปุ่มลบ
              }
          }
      });
      
      initSortable(); 
      window.scrollTo(0,0);
  } catch(e) { alert("เกิดข้อผิดพลาด:\n" + e.message); }
}

function duplicateCurrentSMP() {
    if(!currentDetailData) return;
    proceedToEdit(); 
    isEditingId = null; 
    document.getElementById('f_smpId').value = "สร้างอัตโนมัติเมื่อบันทึกจริง";
    document.getElementById('smpIdContainer').style.display = 'none';
    document.getElementById('f_title').value = currentDetailData.main.title + " (สำเนา)";
    document.getElementById('f_status').value = "Unfinished"; // ตั้งเป็น Unfinished ตอนก็อปปี้
    document.getElementById('appTitle').innerText = "คัดลอกเอกสารใหม่";
    document.getElementById('appSub').innerText = "จากเอกสาร #" + currentDetailData.main.smpId;
    
    // ปลดล็อกต่างๆ
    document.getElementById('presenterCheckboxGrid').classList.remove('locked');
    document.getElementById('lockWarning').style.display = 'none';
    document.querySelector('.btn-draft').style.display = 'flex';
    document.getElementById('fabDraftBtn').style.display = 'flex';
    showModal("คัดลอกสำเร็จ", "ข้อมูลถูกดึงมาที่ฟอร์มแล้ว กรุณาแก้ไขข้อมูลและกดบันทึกเพื่อสร้างใบใหม่", "content_copy", "#D69E2E");
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
          showModal('ลบสำเร็จ', 'เอกสารถูกลบเรียบร้อยแล้ว', 'check_circle', '#38A169'); 
          showHome(); 
      } else { 
          showModal('เกิดข้อผิดพลาด', res.message, 'error', '#E53E3E'); 
      }
    })
    .finally(() => { document.getElementById('loadingScreen').style.display = 'none'; });
}

function showDetail(smpId) {
  document.querySelectorAll('.section-view').forEach(e => e.classList.remove('active'));
  document.getElementById('detailView').classList.add('active');
  document.getElementById('appTitle').innerText = "เอกสาร: " + smpId;
  document.getElementById('appSub').innerText = "รายละเอียดและขั้นตอน";
  document.getElementById('btnCloseView').style.display = 'flex'; 
  document.getElementById('docContent').innerHTML = ``;
  document.getElementById('loadingScreen').style.display = 'flex'; 
  document.getElementById('editLockBanner').style.display = 'none'; 

  fetch(API_URL + "?action=getDetails&smpId=" + smpId)
    .then(res => res.json())
    .then(data => {
        if(Date.now() - parseDateSafely(data.main.date).getTime() < 300000) { 
            document.getElementById('editLockBanner').style.display = 'flex'; 
        }
        renderDetail(data);
    })
    .catch(err => console.error(err))
    .finally(() => { document.getElementById('loadingScreen').style.display = 'none'; });
}

// ======================== DASHBOARD & LISTING ========================
function loadSMPList() {
  document.getElementById('loadingScreen').style.display = 'flex';
  fetch(API_URL + "?action=getList")
    .then(res => res.json())
    .then(data => { 
        allSmpDataList = data; 
        populateFilterDropdowns(data); 
        applyFilters(); 
    })
    .catch(err => { 
        document.getElementById('smpListContainer').innerHTML = `<p class="text-center text-danger">เชื่อมต่อฐานข้อมูลไม่ได้</p>`; 
    })
    .finally(() => { document.getElementById('loadingScreen').style.display = 'none'; });
}

function populateFilterDropdowns(data) {
  let presenters = new Set(); let lines = new Set();
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
  document.querySelectorAll('.btn-quick').forEach(b => b.classList.remove('active')); 
  event.target.classList.add('active');
  
  let today = new Date(); 
  let fs = document.getElementById('fStart'); 
  let fe = document.getElementById('fEnd');
  
  if(type==='all'){ fs.value = ''; fe.value = ''; }
  else if(type==='today'){ fs.value = today.toISOString().split('T')[0]; fe.value = today.toISOString().split('T')[0]; }
  else if(type==='week'){ 
      let firstDay = new Date(today.setDate(today.getDate() - today.getDay() + 1)); 
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
  let statusFilter = document.getElementById('filterStatus').value; 
  let fsVal = document.getElementById('fStart').value ? parseDateSafely(document.getElementById('fStart').value).setHours(0,0,0,0) : null;
  let feVal = document.getElementById('fEnd').value ? parseDateSafely(document.getElementById('fEnd').value).setHours(23,59,59,999) : null;
  
  // โหลดแบบร่าง Local เข้ามารวม
  let localDrafts = JSON.parse(localStorage.getItem('smp_multi_drafts') || '[]');
  let draftItems = localDrafts.map(d => ({
      smpId: d.id, 
      title: d.data.formData.title, 
      type: d.data.formData.smpType, 
      presenter: d.data.formData.presenter,
      line: d.data.formData.line, 
      machine: d.data.formData.machine, 
      date: d.time,
      status: 'Draft', 
      isDraft: true
  }));

  let combinedData = [...draftItems, ...allSmpDataList];

  filteredDataList = combinedData.filter(o => {
    let matchKw = o.smpId.toLowerCase().includes(kw) || o.title.toLowerCase().includes(kw) || (o.machine && o.machine.toLowerCase().includes(kw));
    let matchP = presenter === "" || (o.presenter && String(o.presenter).includes(presenter));
    let matchL = line === "" || String(o.line) === line;
    let matchT = type === "" || (o.type && String(o.type).includes(type));
    let jDate = parseDateSafely(o.date).getTime(); 
    let matchD = true;
    if(fsVal && jDate < fsVal) matchD = false; 
    if(feVal && jDate > feVal) matchD = false;

    // กรองสถานะ
    let matchStatus = true;
    if(statusFilter === 'Draft') matchStatus = o.isDraft;
    else if(statusFilter === 'Finished') matchStatus = (!o.isDraft && (!o.status || o.status === 'Finished'));
    else if(statusFilter === 'Unfinished') matchStatus = (!o.isDraft && o.status === 'Unfinished');

    return matchKw && matchP && matchL && matchT && matchD && matchStatus;
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
    let tIcon = (item.type || '').includes('EE') || (item.type || '').includes('ไฟฟ้า') ? 'bolt' : ((item.type || '').includes('ME') || (item.type || '').includes('เครื่องกล') ? 'settings' : 'build');
    
    let cardClass = 'card-type-ge';
    if((item.type || '').includes('เครื่องกล')) cardClass = 'card-type-me';
    else if((item.type || '').includes('ไฟฟ้า')) cardClass = 'card-type-ee';
    
    let statusBadge = (!item.status || item.status === 'Finished') ? `<span class="badge-status-finish">Finished</span>` : `<span class="badge-status-unfinish">Unfinished</span>`;
    
    if(item.isDraft) {
        cardClass = 'card-type-draft';
        statusBadge = `<span class="badge-status-unfinish" style="background:#EDF2F7; color:#718096; border-color:#CBD5E0;">📝 แบบร่าง</span>`;
    }

    let clickAction = item.isDraft ? `loadDraftIntoForm('${item.smpId}')` : `showDetail('${item.smpId}')`;

    html += `
    <div class="col-md-6 col-lg-4">
      <div class="report-card ${cardClass}" onclick="${clickAction}">
        <div class="report-card-head">
           <div class="report-card-title">${item.smpId}</div>
           <div>${statusBadge}</div>
        </div>
        <p class="report-detail" style="font-weight:600; color:var(--primary);">เรื่อง: ${item.title}</p>
        <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
           <span class="badge-chip"><span class="material-symbols-rounded" style="font-size:14px;">${tIcon}</span> ${item.type || '-'}</span>
           <span class="badge-chip" style="background:#EDF2F7; color:#4A5568;"><span class="material-symbols-rounded" style="font-size:14px;">person</span> ${item.presenter || '-'}</span>
           <span class="badge-chip" style="background:#EDF2F7; color:#4A5568;"><span class="material-symbols-rounded" style="font-size:14px;">calendar_today</span> ${item.date.split(' ')[0]}</span>
        </div>
      </div>
    </div>`;
  });

  if(currentPage === 1) { 
      html += `</div>`; 
      container.innerHTML = html; 
  } else { 
      let rowDiv = container.querySelector('.row'); 
      if(rowDiv) rowDiv.insertAdjacentHTML('beforeend', html); 
  }

  let loadedCount = Math.min(endIndex, filteredDataList.length);
  document.getElementById('countLoaded').innerText = loadedCount; 
  document.getElementById('countTotal').innerText = filteredDataList.length;
  btnMore.style.display = (loadedCount >= filteredDataList.length) ? 'none' : 'inline-block';
}

function loadMoreData() { currentPage++; renderPaginatedList(); }

function changeChartMode(mode) { currentChartMode = mode; drawDashboardChart(filteredDataList); }

function drawDashboardChart(dataList) {
  document.getElementById('dashboardCard').style.display = 'block';
  let counts = {};
  
  dataList.forEach(d => {
    if(d.isDraft) return; // 🔴 ตัดแบบร่างออกจากการนับแผนภูมิ
    if(currentChartMode === 'presenter') {
      if(d.presenter) { 
          String(d.presenter).split(',').map(p => p.trim()).forEach(p => { 
              if(p) counts[p] = (counts[p] || 0) + 1; 
          }); 
      } else { 
          counts['ไม่ระบุ'] = (counts['ไม่ระบุ'] || 0) + 1; 
      }
    } else if (currentChartMode === 'line') { 
        counts[d.line || 'ไม่ระบุ'] = (counts[d.line || 'ไม่ระบุ'] || 0) + 1; 
    }
  });
  
  let sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10);
  let chartColor = currentChartMode === 'presenter' ? '#00A5D9' : '#38A169';
  const ctx = document.getElementById('smpChart').getContext('2d');
  
  if(myChart) myChart.destroy(); 
  
  myChart = new Chart(ctx, { 
      type: 'bar', 
      data: { 
          labels: sorted.map(x=>x[0]), 
          datasets: [{ label: 'จำนวนเอกสาร', data: sorted.map(x=>x[1]), backgroundColor: chartColor, borderRadius: 6 }] 
      }, 
      options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { display: false } }, 
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } 
      } 
  });
}

// ======================== IMAGE COMPRESSION & GALLERY ========================
async function compressFile(file) {
  return new Promise((resolve) => {
    let reader = new FileReader();
    reader.onload = e => {
      let img = new Image();
      img.onload = () => {
        let canvas = document.createElement('canvas');
        let MAX_W = 1000; 
        let scale = img.width > MAX_W ? MAX_W / img.width : 1;
        canvas.width = img.width * scale; 
        canvas.height = img.height * scale;
        let ctx = canvas.getContext('2d'); 
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6)); 
      }; 
      img.src = e.target.result;
    }; 
    reader.readAsDataURL(file);
  });
}

async function compressMainImage(input) {
  if(input.files.length > 0) {
      if(mainImagesArray.length + input.files.length > 5) { 
          alert("เพิ่มรูปได้สูงสุด 5 รูปครับ"); return; 
      }
      document.getElementById('mainImagePreview').innerHTML = '<span class="text-muted small">กำลังโหลด...</span>';
      let files = Array.from(input.files).slice(0, 5);
      for(let f of files) { 
          let b64 = await compressFile(f); 
          mainImagesArray.push(b64); 
      }
      renderMainImagePreview();
  }
}

function renderMainImagePreview() {
    let preview = document.getElementById('mainImagePreview'); 
    preview.innerHTML = '';
    mainImagesArray.forEach((b64, idx) => {
        preview.innerHTML += `
        <div style="position:relative; display:inline-block; margin:5px;">
            <img src="${b64}">
            <button type="button" class="btn-remove-img" onclick="removeMainImage(${idx})">
                <span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle;">delete</span> ลบ
            </button>
        </div>`;
    });
    document.getElementById('f_mainImageBase64').value = JSON.stringify(mainImagesArray);
}

function removeMainImage(index) { 
    mainImagesArray.splice(index, 1); 
    renderMainImagePreview(); 
}

// 🔴 การจัดการรูปภาพในสเต็ป SOP
async function compressStepImages(fileInput) {
  const card = fileInput.closest('.step-card');
  const storageInput = card.querySelector('.s-imgs');
  if(!storageInput.compressedArray) storageInput.compressedArray = [];
  
  let files = Array.from(fileInput.files).slice(0, 5);
  if(storageInput.compressedArray.length + files.length > 5) { 
      alert("แนบรูปได้สูงสุด 5 ภาพต่อขั้นตอนครับ"); 
      return; 
  }
  
  for(let f of files) { 
      let b64 = await compressFile(f); 
      storageInput.compressedArray.push(b64); 
  }
  
  renderStepImagePreview(storageInput); 
  fileInput.value = ""; 
}

function renderStepImagePreview(storageInput) {
    const card = storageInput.closest('.step-card');
    const previewBox = card.querySelector('.gallery-preview');
    previewBox.innerHTML = '';
    
    let oldArr = storageInput.oldImages ? JSON.parse(storageInput.oldImages) : [];
    oldArr.forEach((url, idx) => {
        previewBox.innerHTML += `
        <div style="position:relative; display:inline-block; margin:5px;">
            <img src="${url}">
            <button type="button" class="btn-remove-img" onclick="removeOldStepImage(this, ${idx})">
                <span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle;">delete</span> ลบ
            </button>
        </div>`;
    });

    let newArr = storageInput.compressedArray || [];
    newArr.forEach((b64, idx) => {
        previewBox.innerHTML += `
        <div style="position:relative; display:inline-block; margin:5px;">
            <img src="${b64}">
            <button type="button" class="btn-remove-img" onclick="removeNewStepImage(this, ${idx})">
                <span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle;">delete</span> ลบ
            </button>
        </div>`;
    });
}

function removeNewStepImage(btn, idx) {
    const storageInput = btn.closest('.step-card').querySelector('.s-imgs');
    storageInput.compressedArray.splice(idx, 1);
    renderStepImagePreview(storageInput);
}

function removeOldStepImage(btn, idx) {
    const storageInput = btn.closest('.step-card').querySelector('.s-imgs');
    let oldArr = JSON.parse(storageInput.oldImages);
    oldArr.splice(idx, 1);
    storageInput.oldImages = JSON.stringify(oldArr);
    renderStepImagePreview(storageInput);
}

// ======================== SUBMISSION & DATA COLLECTION ========================
function verifyBeforeSubmit() {
    let form = document.getElementById('smpForm');
    if (!form.reportValidity()) return; 
    document.getElementById('confirmSaveModal').style.display = 'flex';
}

function collectFormData() {
  let smpTypeSelected = document.querySelector('input[name="smpTypeGrp"]:checked');
  let finalSmpType = smpTypeSelected ? smpTypeSelected.value : '';
  if(finalSmpType === 'อื่นๆ') { 
      let otherVal = document.getElementById('f_smpTypeOther'); 
      if(otherVal && otherVal.value.trim() !== '') finalSmpType = otherVal.value.trim(); 
  }

  let presArray = []; 
  document.querySelectorAll('.pres-cb:checked').forEach(cb => presArray.push(cb.value));
  let cbOther = document.getElementById('cbPresOther'); 
  let presOther = document.getElementById('f_presenter_other');
  if(cbOther && cbOther.checked && presOther && presOther.value.trim() !== "") {
      presArray.push(presOther.value.trim());
  }

  let lineSel = document.getElementById('f_line_sel'); 
  let lineOther = document.getElementById('f_line_other');
  let line = (lineSel && lineSel.value === 'other') ? (lineOther ? lineOther.value : '') : (lineSel ? lineSel.value : '');
  
  let freqSel = document.getElementById('f_frequency_sel'); 
  let freqOther = document.getElementById('f_frequency_other');
  let freq = (freqSel && freqSel.value === 'other') ? (freqOther ? freqOther.value : '') : (freqSel ? freqSel.value : '');

  let lotoReq = document.querySelector('input[name="r_loto"]:checked'); 
  let riskReq = document.querySelector('input[name="r_riskAssessed"]:checked');

  let formData = {
    title: document.getElementById('f_title').value, 
    smpId: document.getElementById('f_smpId').value, 
    presenter: presArray.join(', '), 
    approver: document.getElementById('f_approver').value,
    line: line, 
    machine: document.getElementById('f_machine').value, 
    smpType: finalSmpType, 
    status: document.getElementById('f_status').value, 
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
    let badge = card.querySelector('.step-badge'); 
    let stepIdxStr = badge ? badge.innerText.replace('ขั้นตอนที่ #', '') : '0';
    
    stepsData.push({ 
        stepNo: parseInt(stepIdxStr), 
        stepName: card.querySelector('.s-task').value, 
        timeTaken: card.querySelector('.s-time').value, 
        typeSymbol: sType ? sType.value : '', 
        description: card.querySelector('.s-desc').value, 
        images: fileInput.compressedArray || [], 
        oldImages: fileInput.oldImages ? JSON.parse(fileInput.oldImages) : [] 
    });
  });

  return { action: isEditingId ? 'update' : 'insert', formData: formData, stepsData: stepsData };
}

function executeSubmitSMP() {
  document.getElementById('confirmSaveModal').style.display = 'none';
  let payload = collectFormData();
  
  if(!payload.formData.presenter) { 
      showModal("ข้อมูลไม่ครบ", "กรุณาเลือกผู้จัดทำอย่างน้อย 1 คน", "warning", "#D69E2E"); 
      return; 
  }
  
  // 🔴 ถ้าสร้างใหม่ ให้เจ็นรหัส ID จริงๆ ณ วินาทีนี้
  if(!isEditingId) { 
      payload.formData.smpId = generateId(payload.formData.smpType, false); 
  }

  document.getElementById('loadingScreen').style.display = 'flex';
  
  fetch(API_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify(payload) 
  })
  .then(async res => JSON.parse(await res.text()))
  .then(res => {
    if(res.status === 'success'){
      // ลบออกจาก Multi-Drafts
      let currentDraftId = document.getElementById('f_draftId').value;
      if (currentDraftId) {
          let drafts = JSON.parse(localStorage.getItem('smp_multi_drafts') || '[]');
          localStorage.setItem('smp_multi_drafts', JSON.stringify(drafts.filter(d => d.id !== currentDraftId)));
      }
      showModal('บันทึกสำเร็จ!', 'บันทึกข้อมูลรหัส: ' + res.smpId + ' เรียบร้อยแล้ว', 'check_circle', '#38A169');
      showHome();
    } else { 
        showModal('เกิดข้อผิดพลาด', res.message, 'error', '#E53E3E'); 
    }
  })
  .catch(err => {
      showModal('ข้อผิดพลาดเครือข่าย', err.message, 'cloud_off', '#E53E3E');
  })
  .finally(() => { 
      document.getElementById('loadingScreen').style.display = 'none'; 
  });
}

// ======================== RENDER DETAILS ========================
function renderDetail(data) {
  currentDetailData = data; 
  let m = data.main;
  
  let ppeHtml = m.ppe.filter(p => p.used).map(p => `<div style="display:flex; flex-direction:column; align-items:center; width:65px;"><img src="${getPPEIcon(p.name)}" style="width:50px; height:50px; object-fit:contain;"><span style="font-size:11px; text-align:center; font-weight:600; color:var(--text-muted); margin-top:5px;">${p.name}</span></div>`).join('') || '<span class="text-muted small">ไม่มีการระบุ PPE</span>';
  let riskHtml = m.risks.filter(r => r.risk).map(r => `<div style="display:flex; flex-direction:column; align-items:center; width:65px;"><img src="${getRiskIcon(r.name)}" style="width:50px; height:50px; object-fit:contain;"><span style="font-size:11px; text-align:center; font-weight:600; color:var(--text-muted); margin-top:5px;">${r.name}</span></div>`).join('') || '<span class="text-muted small">ไม่มีความเสี่ยง</span>';

  let statusBadge = (!m.status || m.status === 'Finished') ? `<span class="badge-status-finish">Finished (พร้อมใช้งาน)</span>` : `<span class="badge-status-unfinish">Unfinished (ยังไม่สมบูรณ์)</span>`;

  let mainImgHtml = '';
  if (m.mainImage) {
      try {
          let parsed = JSON.parse(m.mainImage);
          if (Array.isArray(parsed)) {
              mainImgHtml = parsed.map(url => `<img src="${url}" style="max-height:200px; border-radius:10px; border:1px solid var(--border); box-shadow:var(--shadow-sm); margin:5px;">`).join('');
          } else { 
              mainImgHtml = `<img src="${m.mainImage}" style="max-height:250px; border-radius:12px; box-shadow:var(--shadow-sm); border:1px solid var(--border);">`; 
          }
      } catch(e) { 
          mainImgHtml = `<img src="${m.mainImage}" style="max-height:250px; border-radius:12px; box-shadow:var(--shadow-sm); border:1px solid var(--border);">`; 
      }
  }

  let html = `
    <div style="padding:25px; border-bottom:1px solid #E2E8F0; background:#F8FAFC;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div><h3 style="margin:0 0 5px 0; color:var(--primary); font-weight:700;">#${m.smpId}</h3><p style="margin:0; font-size:15px; font-weight:600;">${m.title}</p><div style="margin-top:8px;">${statusBadge}</div></div>
        <img src="images/logo.png" style="height:40px; object-fit:contain;" onerror="this.style.display='none'">
      </div>
    </div>
    
    <div style="padding:25px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px; font-size:14px;">
        <div><span style="color:var(--text-muted); font-size:12px;">ประเภท SMP</span><br><b style="color:var(--secondary);">${m.smpType}</b></div><div><span style="color:var(--text-muted); font-size:12px;">วันที่อัปเดต</span><br><b>${(m.date||'').split(' ')[0]}</b></div><div><span style="color:var(--text-muted); font-size:12px;">ผู้จัดทำ (ช่าง)</span><br><b>${m.presenter}</b></div><div><span style="color:var(--text-muted); font-size:12px;">ผู้อนุมัติ</span><br><b>${m.approver || '-'}</b></div><div><span style="color:var(--text-muted); font-size:12px;">ไลน์การผลิต</span><br><b>${m.line || '-'}</b></div><div><span style="color:var(--text-muted); font-size:12px;">เครื่องจักร</span><br><b>${m.machine || '-'}</b></div>
      </div>

      <div style="background:#FFF5F5; border:1px solid #FC8181; border-radius:12px; padding:15px; margin-bottom:20px;">
        <div style="color:#E53E3E; font-weight:700; font-size:14px; margin-bottom:10px;"><span class="material-symbols-rounded" style="vertical-align:bottom; font-size:18px;">warning</span> อุปกรณ์ความปลอดภัย & ความเสี่ยง</div>
        <p style="font-size:12px; margin:0 0 5px 0; font-weight:600;">PPE ที่ใช้งาน:</p><div style="display:flex; flex-wrap:wrap; gap:15px; margin-bottom:15px;">${ppeHtml}</div>
        <p style="font-size:12px; margin:0 0 5px 0; font-weight:600;">ความเสี่ยงในงาน:</p><div style="display:flex; flex-wrap:wrap; gap:15px;">${riskHtml}</div>
      </div>
      <div style="text-align:center; margin-bottom:25px;">${mainImgHtml}</div>

      <div style="color:var(--primary); font-weight:700; font-size:15px; margin-bottom:10px; border-bottom:2px solid var(--secondary); padding-bottom:5px;">ขั้นตอนการปฏิบัติงาน (SOP)</div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13.5px;">
          <thead>
            <tr style="background:#F1F5F9; color:var(--text-muted); text-align:left;">
              <th style="padding:10px; border-radius:8px 0 0 8px;">#</th>
              <th style="padding:10px;">ขั้นตอน</th>
              <th style="padding:10px;">ประเภท</th>
              <th style="padding:10px; min-width:200px;">รายละเอียด</th>
              <th style="padding:10px; border-radius:0 8px 8px 0;">รูปภาพแนบ</th>
            </tr>
          </thead>
          <tbody>
  `;

  data.steps.forEach(s => {
    let bCol = "#4A5568"; let bBg = "#EDF2F7";
    if(s.typeSymbol.includes('ความปลอดภัย')) { bCol = "#E53E3E"; bBg = "#FFF5F5"; }
    else if(s.typeSymbol.includes('คุณภาพ')) { bCol = "#005EB8"; bBg = "#EBF8FF"; }
    else if(s.typeSymbol.includes('สิ่งแวดล้อม')) { bCol = "#38A169"; bBg = "#F0FFF4"; }

    let imgs = s.images.map(url => `<a href="${url}" target="_blank"><img src="${url}" style="height:60px; border-radius:6px; border:1px solid var(--border); margin-top:5px; margin-right:5px;"></a>`).join('');
    
    html += `
             <tr style="border-bottom:1px solid var(--border);">
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

function getPPEIcon(n){ 
    switch(n){ 
        case 'ถุงมือ': return 'images/ppe_gloves.png';
        case 'หมวกนิรภัย': return 'images/ppe_helmet.png';
        case 'หน้ากาก': return 'images/ppe_mask.png';
        case 'กันตกจากที่สูง': return 'images/ppe_harness.png';
        case 'แว่นตา': return 'images/ppe_glasses.png';
        case 'ที่อุดหู': return 'images/ppe_headphone.png';
        case 'รองเท้าเซฟตี้': return 'images/ppe_foot.png';
        case 'เสื้อสะท้อนแสง': return 'images/ppe_vis_cloth.png';
        default: return '';
    } 
}

function getRiskIcon(n){ 
    switch(n){ 
        case 'จุดหนีบ': return 'images/risk_gear.png';
        case 'อุปกรณ์เครื่องมือ': return 'images/risk_wrech.png';
        case 'ยกด้วยมือ': return 'images/risk_heavyobject.png';
        case 'ทำงานที่สูง': return 'images/risk_highground.png';
        case 'สารเคมี': return 'images/risk_chmisrty.png';
        case 'เสียงดัง': return 'images/risk_loudnoise.png';
        case 'รถโฟล์คลิฟต์': return 'images/risk_car.png';
        default: return '';
    } 
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
  } catch(e) { 
      return null; 
  }
}

async function downloadExcel() {
  if(!currentDetailData) return; 
  let m = currentDetailData.main;
  
  const btn = document.getElementById('btnDownloadExcel'); 
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> กำลังสร้าง Excel...'; 
  btn.disabled = true;

  try {
    const response = await fetch('SMP-Template.xlsx');
    if (!response.ok) throw new Error("ไม่พบไฟล์ Template");
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook(); 
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.getWorksheet(workbook.worksheets[0].name);

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
    let checkId = checkBase64 ? workbook.addImage({ base64: checkBase64, extension: 'png' }) : null;
    function placeCheck(c, r) { 
        if(checkId) worksheet.addImage(checkId, { tl: { col: c, row: r }, ext: { width: 30, height: 30 } }); 
    }

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
      const ppeC = {'ถุงมือ':{col:5.15,row:10.5},'หมวกนิรภัย':{col:7.0,row:10.5},'หน้ากาก':{col:8.91,row:10.5},'กันตกจากที่สูง':{col:10,row:10.5},'แว่นตา':{col:11.55,row:10.5},'ที่อุดหู':{col:13.9,row:10.5},'รองเท้าเซฟตี้':{col:15.1,row:10.5},'เสื้อสะท้อนแสง':{col:16.5,row:10.5}};
      const riskC = {'รถโฟล์คลิฟต์':{col:23.5,row:10.2},'จุดหนีบ':{col:25.2,row:10.2},'อุปกรณ์เครื่องมือ':{col:27.3,row:10.2},'ยกด้วยมือ':{col:29.5,row:10.2},'ทำงานที่สูง':{col:31.5,row:10.2},'สารเคมี':{col:34.2,row:10.2},'เสียงดัง':{col:35.82,row:10.2}};
      
      m.ppe.forEach(p => { 
          if (!p.used && ppeC[p.name]) { 
              worksheet.addImage(crossId, { tl: { col: ppeC[p.name].col, row: ppeC[p.name].row }, ext: { width: 56, height: 75 } }); 
          } 
      });
      
      m.risks.forEach(r => { 
          if (!r.risk && riskC[r.name]) { 
              worksheet.addImage(crossId, { tl: { col: riskC[r.name].col, row: riskC[r.name].row }, ext: { width: 45, height: 45 } }); 
          } 
      });
    }

    if (m.mainImage) {
      let firstImgStr = "";
      try { 
          let parsed = JSON.parse(m.mainImage); 
          if(Array.isArray(parsed) && parsed.length>0) firstImgStr = parsed[0]; 
          else firstImgStr = m.mainImage; 
      } catch(e) { 
          firstImgStr = m.mainImage; 
      }
      
      if(firstImgStr) {
          const mainBase64 = await fetchImageAsBase64(firstImgStr);
          if (mainBase64) {
              const mainImgId = workbook.addImage({ base64: mainBase64, extension: 'png' });
              worksheet.addImage(mainImgId, { tl: { col: 14, row: 7.5 }, ext: { width: 650, height: 350 } });
          }
      }
    }

    const getStyle = (cellStr) => { 
        let cell = worksheet.getCell(cellStr); 
        return { val: cell.value || '', font: cell.font || {} }; 
    };
    
    const symSafe = getStyle('M16'); 
    const symQual = getStyle('Q16'); 
    const symEnv  = getStyle('T16'); 
    const symProd = getStyle('W16');
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
      if((s.typeSymbol||'').includes('ความปลอดภัย')) targetSym = symSafe; 
      else if((s.typeSymbol||'').includes('คุณภาพ')) targetSym = symQual; 
      else if((s.typeSymbol||'').includes('สิ่งแวดล้อม')) targetSym = symEnv; 
      else if((s.typeSymbol||'').includes('การผลิต')) targetSym = symProd;
      
      const cellK = worksheet.getCell('K' + r); 
      cellK.value = targetSym.val; 
      cellK.font = targetSym.font; 
      if(targetSym.fill) cellK.fill = targetSym.fill; 
      cellK.alignment = { horizontal: 'center', vertical: 'middle' };
      
      if (s.images && s.images.length > 0) {
        for(let imgIndex = 0; imgIndex < Math.min(s.images.length, 4); imgIndex++) {
          const stepImgBase64 = await fetchImageAsBase64(s.images[imgIndex]); 
          if (stepImgBase64) {
            const stepImgId = workbook.addImage({ base64: stepImgBase64, extension: 'png' });
            worksheet.addImage(stepImgId, { 
                tl: { col: 27.5 + (imgIndex * 3.5), row: (r - 1) + 0.5 }, 
                ext: { width: 120, height: 80 } 
            });
          }
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer(); 
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement("a"); 
    link.href = URL.createObjectURL(blob); 
    link.download = `SMP_${m.smpId}.xlsx`; 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);

  } catch (error) { 
      console.error(error); 
      showModal("ระบบแจ้ง Error", error.message, "error", "#E53E3E"); 
  } finally { 
      btn.innerHTML = originalText; 
      btn.disabled = false; 
  }
}
