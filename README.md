# BSI Stock - Inventory Management Application

แอปพลิเคชันสำหรับจัดการคลังสินค้า พัฒนาด้วย React 18, Vite และออกแบบด้วย Vanilla CSS (CSS Variables) โทนสีเข้ม (Dark Theme) ทำให้ดูทันสมัยและเป็นมืออาชีพ

## ฟีเจอร์หลัก
1. **ระบบจัดการสินค้า**: เพิ่ม แก้ไข ลบ ค้นหา และกรองสินค้าตามหมวดหมู่
2. **ระบบจัดการไซส์**: รองรับสินค้าที่มีหลายไซส์ (เช่น เสื้อผ้า, รองเท้า) พร้อมนับสต็อกรวมอัตโนมัติ
3. **ระบบบาร์โค้ด**: 
   - สร้างบาร์โค้ด (CODE128) และดาวน์โหลดเป็นไฟล์ PNG
   - สแกนบาร์โค้ดผ่านกล้องอุปกรณ์มือถือหรือกล้องเว็บแคม
4. **แดชบอร์ดสรุปผล**: แสดงภาพรวมสต็อกรายวัน สินค้าคงเหลือ สินค้าที่ต้องสั่งซื้อด่วน และกราฟสัดส่วนสินค้า
5. **ระบบแจ้งเตือน**: แจ้งเตือน (Notification Bell) เมื่อสินค้าใกล้หมด พร้อมการตั้งค่า Threshold ส่วนกลาง หรือแยกตามสินค้า

## สถาปัตยกรรม (Architecture)
โค้ดถูกแบ่งออกเป็น 5 เลเยอร์อย่างเป็นระเบียบ ทำให้ง่ายต่อการดูแลรักษา:
- `components/`: UI Component แยกตามหน้า (Layout, Products, Barcode, Dashboard, Common)
- `hooks/`: Custom React Hooks ควบคุม Logic แยกออกจาก UI
- `context/`: จัดการ Global State ด้วย React Context + LocalStorage เพื่อให้ข้อมูลคงอยู่เสมอ
- `utils/`: รวม Pure function เช่น formatter, validator, generator
- `pages/`: หน้าหลักสำหรับ Routing นำ Component ต่างๆ มาประกอบกัน

## การติดตั้งและรันโปรเจกต์

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. รันโหมด development
npm run dev

# 3. Build สำหรับ production
npm run build
```

## เทคโนโลยีที่ใช้
- **Core**: React 18, React Router v6, Vite
- **Styling**: Vanilla CSS, Design tokens ด้วย CSS Variables
- **Barcode Tools**: `jsbarcode`, `html5-qrcode`
- **Charts**: `chart.js`, `react-chartjs-2`
- **Icons**: `lucide-react`
