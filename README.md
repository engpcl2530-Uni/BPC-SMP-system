# ⚙️ SMP Management System (Standard Maintenance Procedure)
> A comprehensive, mobile-first digital workflow system for industrial maintenance procedures. 
> ระบบจัดการและจัดเก็บเอกสารมาตรฐานการปฏิบัติงานซ่อมบำรุงรูปแบบดิจิทัล

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Bootstrap](https://img.shields.io/badge/bootstrap-%238511FA.svg?style=for-the-badge&logo=bootstrap&logoColor=white)
![Google Apps Script](https://img.shields.io/badge/google%20apps%20script-%234285F4.svg?style=for-the-badge&logo=google&logoColor=white)

---

## 📖 About The Project | เกี่ยวกับโครงการ

**[EN]**
This project was developed to revolutionize industrial maintenance documentation by transitioning from a traditional paper-based approach to a fully digital workflow. Designed specifically for engineers and technicians on the factory floor, the system features a mobile-first interface, offline capabilities, and dynamic data processing. It seamlessly connects with a Google Apps Script (GAS) backend, managing standard operating procedures (SOPs), safety compliance (PPE & LOTO), image processing, and real-time dashboard analytics.

**[TH]**
โปรเจกต์นี้ถูกพัฒนาขึ้นเพื่อยกระดับกระบวนการจัดการเอกสารงานซ่อมบำรุงอุตสาหกรรม จากรูปแบบกระดาษ (Paper-based) สู่ระบบดิจิทัลเต็มรูปแบบ (Digital Workflow) โดยออกแบบให้รองรับการใช้งานผ่านสมาร์ทโฟนและแท็บเล็ตสำหรับทีมวิศวกรและช่างหน้างานโดยเฉพาะ ระบบสามารถทำงานร่วมกับฐานข้อมูลผ่าน API ประมวลผลการจัดเรียงรูปภาพ ขั้นตอนการทำงาน มาตรฐานความปลอดภัย (PPE & LOTO) และดึงข้อมูลเชิงสถิติออกมาแสดงผลได้อย่างมีประสิทธิภาพ

---

## ✨ Key Features | ฟีเจอร์เด่น

*   📱 **Mobile-First UI/UX:** Responsive design optimized for tablets and mobile devices used in the production line. (ออกแบบหน้าจอให้เหมาะสมกับการถือแท็บเล็ตหรือมือถือทำงานหน้าเครื่องจักร)
*   📶 **Offline-to-Online Sync:** Local Storage Queue system allows users to log data without an internet connection and sync later. (รองรับการทำงานในจุดที่อินเทอร์เน็ตเข้าไม่ถึง และกดซิงค์ข้อมูลภายหลังได้)
*   📸 **Smart Image Management:** Dual-option image input (Camera/Gallery) with client-side image compression (converting to Base64) to save server bandwidth. (รองรับการอัปโหลดรูปภาพทั้งจากการเปิดกล้องและการเลือกจากอัลบั้ม พร้อมระบบบีบอัดภาพอัตโนมัติก่อนส่งขึ้นเซิร์ฟเวอร์)
*   📋 **Dynamic SOP Builder:** Interactive workflow builder allowing users to add, insert, and delete steps with automatic sequential renumbering. (ระบบจัดการขั้นตอนการปฏิบัติงานที่สามารถ เพิ่ม ลบ หรือ "แทรกขั้นตอนตรงกลาง" พร้อมรันหมายเลขลำดับใหม่อัตโนมัติ)
*   📊 **Analytics Dashboard:** Real-time data visualization using Chart.js to monitor technician performance, machine breakdowns, and production lines. (แดชบอร์ดสรุปภาพรวมและสถิติการปฏิบัติงานผ่านกราฟแบบ Real-time)
*   📑 **Excel (.xlsx) Export:** Integrated `ExcelJS` to generate and download formatted Excel reports, injecting Base64 images directly into exact spreadsheet cells. (ส่งออกรายงานพร้อมจัดฟอร์แมตความกว้างคอลัมน์ และแทรกรูปภาพลงเซลล์ใน Excel อัตโนมัติ)

---

## 🛠️ Tech Stack & Architecture | โครงสร้างสถาปัตยกรรม

*   **Frontend (หน้าบ้าน):** Vanilla JavaScript, HTML5, CSS3, Bootstrap 5
*   **Backend / API (หลังบ้าน):** Google Apps Script (GAS) 
*   **Database (ฐานข้อมูล):** Google Sheets
*   **Hosting:** GitHub Pages

### 📂 Project Structure (Separation of Concerns)
ระบบใช้โครงสร้างแบบแยกไฟล์ เพื่อความง่ายในการดูแลรักษา (Maintainability):
```text
├── index.html     # โครงสร้างหน้าเว็บ (UI Layout) เปรียบเสมือน "เสาและคานบ้าน"
├── style.css      # ไฟล์ตกแต่งความสวยงามและการจัดหน้า (CSS) เปรียบเสมือน "สีทาบ้าน"
├── script.js      # ลอจิกการทำงานและเชื่อมต่อ API (JavaScript) เปรียบเสมือน "ระบบไฟฟ้าและสมองกล"
├── README.md      # คู่มือและรายละเอียดโครงการสำหรับนักพัฒนา
├── Readme.txt     # คู่มือแนะนำโครงสร้างแบบเร่งด่วน สำหรับทีมงานที่มีพื้นฐาน GAS
└── /images        # โฟลเดอร์สำหรับเก็บไฟล์รูปภาพ Icon และ Logo คงที่

---

## 🧠 Core Functions Guide | คู่มือฟังก์ชันการทำงานเชิงลึก
The logic in script.js is modularized into the following key domains:
(โค้ดในไฟล์ script.js ถูกแบ่งการทำงานออกเป็นหมวดหมู่ดังนี้)

1. UI & State Management (การจัดการหน้าจอ)
showHome(), showForm(), showDetail(smpId): ควบคุมการสลับหน้าจอ (SPA - Single Page Application) โดยใช้การซ่อน/แสดง <div> แทนการโหลดหน้าเว็บใหม่ ทำให้แอปทำงานไวแบบไร้รอยต่อ

changeChartMode(mode): อัปเดตข้อมูลใน Chart.js แบบไดนามิกตามหมวดหมู่ที่ผู้ใช้เลือก (บุคคล, ไลน์, เครื่องจักร)

2. Dynamic SOP Steps (การจัดการขั้นตอนปฏิบัติงาน)
generateLockedSteps(): สร้างขั้นตอนบังคับอัตโนมัติเมื่อเริ่มฟอร์มใหม่

insertStepCard(btn) / addStepCard(): สร้าง Element ของ HTML (insertAdjacentHTML) เพื่อแทรกการ์ดขั้นตอนการทำงานใหม่

updateStepNumbers(): ฟังก์ชันที่คอยวนลูปนับหมายเลขขั้นตอน (.step-card) ใหม่ทั้งหมดทุกครั้งที่มีการแทรกหรือลบ เพื่อรักษาความถูกต้องของข้อมูล (Data Integrity)

3. Image Processing (การจัดการรูปภาพ)
compressFile(file): ใช้ HTML5 Canvas ในการย่อขนาดภาพ (สูงสุด 800px) และแปลงไฟล์เป็นข้อความ Base64 ก่อนส่งผ่าน API เพื่อลดภาระเซิร์ฟเวอร์

compressStepImages(input): รองรับการเลือกไฟล์แบบ Multiple ส่งเข้ากระบวนการบีบอัด และนำมาแสดงผลแบบ Real-time (Preview Gallery)

4. Data & API Routing (การจัดการข้อมูล)
applyFilters(): ระบบค้นหาและคัดกรองข้อมูล (ฝั่ง Client-side) ทำงานแบบ Multi-conditional (คัดกรองวันที่, ชื่อ, ไลน์, สถานะ พร้อมกัน)

editCurrentSMP(): โหลดข้อมูลจาก Google Sheet กลับเข้าฟอร์ม พร้อมระบบ Fail-safe ป้องกันแอปพัง (Crash) ในกรณีที่ข้อมูลจาก Database ถูกกรอกมาผิดประเภท (เช่น ตัวเลขปนข้อความ)

5. Document Export (การส่งออกเอกสาร)
downloadExcel(): ใช้ ExcelJS โหลดไฟล์ Template .xlsx มาอ่านบนเบราว์เซอร์ หยอดข้อมูลข้อความ และแปลง Base64 กลับเป็นไฟล์ภาพเพื่อแทรกลงพิกัดเซลล์ (Row/Column) ที่กำหนดอย่างแม่นยำ ก่อนสั่งเบราว์เซอร์ให้ดาวน์โหลดไฟล์

---

## ⚠️ Troubleshooting | การแก้ไขปัญหาเบื้องต้น
Deployment changes not reflecting (อัปเดตโค้ดใน GitHub แล้วแต่เว็บไม่เปลี่ยน)

Cause: เบราว์เซอร์ของแคช (Cache) ไฟล์ style.css หรือ script.js ตัวเก่าไว้

Solution: ในไฟล์ index.html ให้เปลี่ยนเลขเวอร์ชันที่ดึงไฟล์ เช่น เปลี่ยน <script src="script.js?v=1.0"></script> เป็น ?v=1.1 เพื่อบังคับให้โหลดไฟล์ใหม่

"Edit" button causes silent failure (กดแก้ไขแล้วหน้าเว็บค้าง/นิ่ง)

Cause: ข้อมูลใน Google Sheet บางช่องมีฟอร์แมตผิดปกติ (เช่น Array กลายเป็น String หรือเป็นตัวเลขเดี่ยวๆ)

Solution: ระบบมี try-catch ดักจับไว้แล้ว หากเกิดปัญหาจะมี Alert แจ้งบรรทัดที่ Error ให้เข้าไปตรวจสอบความถูกต้องของข้อมูลในแถวนั้นใน Google Sheet

API Connection Failure (ขึ้นแจ้งเตือนเชื่อมต่อฐานข้อมูลไม่ได้)

Solution: หากมีการแก้ไขโค้ดในฝั่ง Google Apps Script (Code.gs) ต้องกด New Deployment ทุกครั้ง และนำ URL ใหม่มาอัปเดตที่ตัวแปร const API_URL = "..." ในไฟล์ script.js

Mobile Camera Override (มือถือบังคับเปิดกล้อง เลือกรูปจากอัลบั้มไม่ได้)

Solution: ตรวจสอบใน index.html หรือ script.js ตรงปุ่ม <input type="file"> สำหรับเลือกอัลบั้ม ต้อง ไม่มี คำสั่ง capture="environment" ติดอยู่

---

## 🤖 AI Prompting Guide | คำแนะนำสำหรับการนำโค้ดไปพัฒนาต่อร่วมกับ AI
หากนำโค้ดชุดนี้ไปให้ AI ช่วยพัฒนาต่อ (เช่น ChatGPT, Gemini, Claude) ให้ใช้โครงสร้าง Prompt ดังนี้เพื่อผลลัพธ์ที่แม่นยำที่สุด:

1. Provide Architecture Context (การบรีฟบริบทเบื้องต้น):

"โปรเจกต์นี้เขียนด้วย Vanilla JS, HTML, CSS (Bootstrap 5) เป็น Frontend เชื่อมต่อ API กับ Google Apps Script (Backend) โครงสร้างแยกไฟล์แบบ SoC (index.html, style.css, script.js) มีการใช้ Chart.js และ ExcelJS"

2. Isolate the Code (ส่งโค้ดให้ AI ดูแบบเจาะจง ห้ามส่งรวมกันทีเดียว):

แก้หน้าตา/UI: ส่งแค่ index.html และส่วนที่เกี่ยวข้องใน style.css

แก้ระบบ/ลอจิก: ส่งแค่ script.js และระบุชื่อฟังก์ชันที่ต้องการแก้

3. Highly Effective Prompt Examples (ตัวอย่าง Prompt):

เพิ่มฟีเจอร์: "ใน script.js ฟังก์ชัน applyFilters() ช่วยเพิ่มตรรกะตัวกรอง 'กะการทำงาน' โดยจับคู่กับ <select id="filterShift"> ใน index.html ให้หน่อย"

แก้บั๊ก: "เมื่อรัน downloadExcel() ใน script.js ภาพของขั้นตอนที่ 3 วางผิดเซลล์ นี่คือโค้ดฟังก์ชันของฉัน ช่วยเช็คพิกัดของ ExcelJS ให้หน่อย"

---

### 👨‍💻 Author
Natthapon Kongthong (Junior / 최준재)
Undergraduate Student, Manufacturing System Engineering
School of Integrated Innovation and Technology, King Mongkut's Institute of Technology Ladkrabang (KMITL)

Developed during a Cooperative Education Engineering Internship at Unilever (Ladkrabang) - 2026.
Tel. : 095-009-8008 
Gmail : natthapon.kth@gmail.com
