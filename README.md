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

*   **Frontend:** Vanilla JavaScript, HTML5, CSS3
*   **UI Framework:** Bootstrap 5, Google Material Symbols
*   **Backend / API:** Google Apps Script (GAS) 
*   **Database:** Google Sheets
*   **Libraries:** 
    *   `Chart.js` (Data Visualization)
    *   `ExcelJS` (XLSX Document Generation)
*   **Hosting:** GitHub Pages

### 📂 Project Structure (Separation of Concerns)
```text
├── index.html     # Main application structure (UI Layout)
├── style.css      # Styling, animations, and responsive rules
├── script.js      # Core logic, state management, and API fetching
├── README.md      # Project documentation
└── /images        # Directory for static assets, icons, and logos
