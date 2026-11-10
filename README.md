# Hệ Thống Quản Lý Lớp Học & Sinh Viên (ExpressJS + PostgreSQL)
## Tích hợp Frontend CMS Dashboard, RBAC Authorization & Giám Sát Event / Cache

Dự án Fullstack hoàn chỉnh gồm **RESTful Backend (ExpressJS, Sequelize ORM, PostgreSQL 16)** và **Frontend CMS Dashboard (Bootstrap 5, Single Page Application)** với đầy đủ các tính năng CRUD, phân quyền người dùng và công cụ demo kiến thức Node.js nâng cao.

---

## 📁 Cấu Trúc Dự Án

```
miniProject/
├── config/
│   └── db.config.js               # Cấu hình kết nối PostgreSQL & connection pool
├── controllers/
│   ├── lophoc.controller.js        # Controller CRUD lophoc (phát sự kiện qua dbLogger)
│   └── sinhvien.controller.js      # Controller CRUD sinhvien (phát sự kiện qua dbLogger)
├── database/
│   └── init.sql                   # Schema 2 bảng (khóa ngoại CASCADE) + 50 mock data/bảng
├── events/
│   └── dbLogger.emitter.js        # [Chương 3] EventEmitter (Observer Pattern) phát log CRUD
├── middlewares/
│   ├── eventLogger.middleware.js   # [Chương 3] Đăng ký & hủy listener qua res.on('finish') chống Memory Leak
│   └── rbac.middleware.js          # [Phân quyền] Middleware kiểm tra quyền READ, CREATE, UPDATE, DELETE
├── models/
│   ├── index.js                   # Khởi tạo Sequelize & định nghĩa quan hệ 1 - N
│   ├── lophoc.model.js            # Model Sequelize cho bảng lophoc
│   └── sinhvien.model.js          # Model Sequelize cho bảng sinhvien
├── public/                        # [Frontend CMS Dashboard]
│   ├── css/
│   │   └── style.css              # Custom styling sidebar, table, toast, responsive
│   ├── js/
│   │   ├── api.js                 # API Client module (tự động gắn Role/Token)
│   │   └── app.js                 # DOM events, CRUD, Pagination, Filter, Modal logic
│   └── index.html                 # Giao diện chính CMS Dashboard Bootstrap 5
├── routes/
│   ├── demo.router.js             # [Chương 3] Demo CacheReader (tránh Zalgo) & Emitter status
│   ├── lophoc.router.js           # Định tuyến các endpoint cho lophoc (áp dụng RBAC)
│   └── sinhvien.router.js         # Định tuyến các endpoint cho sinhvien (áp dụng RBAC)
├── utils/
│   └── cacheReader.js             # [Chương 3] Đọc cache bằng Callback + process.nextTick() chống Zalgo
├── .env                           # Biến môi trường kết nối DB & Port
├── .env.example                   # Mẫu file cấu hình
├── .gitignore                     # Bỏ qua node_modules, log, .env
├── app.js                         # Entry point ExpressJS, phục vụ static public/
├── docker-compose.yml             # Cấu hình Docker chạy PostgreSQL 16
├── NGINX_LOG_GUIDE.md             # Hướng dẫn chi tiết NGINX Log, bash filter & GoAccess
├── package.json                   # Khai báo thư viện và script chạy
└── README.md                      # Tài liệu tổng quan dự án
```

---

## 🖥️ Tính Năng Giao Diện Frontend (CMS Dashboard)

Truy cập tại: **`http://localhost:3000`**

### 1. Thanh Chuyển Đổi Role (Role Switcher) Trên Navbar
- Cho phép chuyển đổi nhanh 3 vai trò:
  - **Admin**: Toàn quyền `READ`, `CREATE`, `UPDATE`, `DELETE`.
  - **Teacher / Manager**: Quyền `READ`, `CREATE`, `UPDATE` (không được xóa).
  - **Viewer / Student**: Chỉ có quyền `READ` (chỉ xem).
- Tự động lưu vào `localStorage`, hiển thị danh sách quyền tương ứng dạng Badge.
- **Switch "Cho phép test 403"**:
  - *Tắt (mặc định)*: Tự động làm mờ (dimming) và khóa các nút người dùng không có quyền.
  - *Bật*: Cho phép bấm vào các nút bị hạn chế quyền để kiểm thử thông báo lỗi `403 Forbidden` do Backend RBAC chặn và hiển thị Toast tương ứng.

### 2. Tab 1: Quản Lý Lớp Học
- Hiển thị danh sách lớp học: ID, Mã lớp, Tên lớp, Khoa, Niên khóa, **Số lượng sinh viên trực thuộc**.
- Thanh tìm kiếm theo từ khóa (mã lớp, tên lớp, khoa), phân trang linh hoạt (5, 10, 20, 50 dòng/trang).
- Modal Thêm mới / Cập nhật lớp học.
- Modal xác nhận trước khi xóa.

### 3. Tab 2: Quản Lý Sinh Viên
- Bảng danh sách 50+ sinh viên: ID, Mã SV, Họ tên, Email, **Tuổi (tự động tính từ ngày sinh)**, Giới tính, Tên lớp học, Số điện thoại, Địa chỉ.
- Bộ lọc nâng cao:
  - Ô tìm kiếm theo tên, email, mã sinh viên.
  - Dropdown lọc theo Lớp học (lấy dữ liệu động từ API `lophoc`).
  - Dropdown lọc theo Giới tính.
- Phân trang đầy đủ.
- Modal Thêm mới / Chỉnh sửa sinh viên với dropdown chọn Lớp học từ CSDL và validate định dạng email, ngày sinh hợp lệ.

### 4. Tab 3: Giám Sát Event & Cache (Kiến Thức Chương 3)
- **Kiểm thử CacheReader (Chống lỗi Zalgo)**:
  - Bấm gọi API test cache để xem thời gian phản hồi (ms), trạng thái Cache Hit / Cache Miss.
  - Hộp Trace hiển thị trực quan thứ tự thực thi: `Bước 1 (Đồng bộ) -> Bước 2 (Đồng bộ) -> Bước 3 (Callback qua process.nextTick())`.
  - Nút bấm Xóa Cache để kiểm thử lại từ đầu.
- **Kiểm tra EventEmitter & Chống Rò Rỉ Bộ Nhớ**:
  - Xem số lượng `activeListeners` thời gian thực.
  - Nút **"Stress Test (10 Reqs)"**: Gửi đồng thời 10 requests CRUD đến server để chứng minh `res.on('finish', () => removeListener(...))` dọn dẹp sạch sẽ listener, `activeListeners` không bao giờ bị tăng đột biến hay rò rỉ bộ nhớ.

### 5. Hệ Thống Toast Notifications
- Nổi góc trên bên phải màn hình.
- Màu xanh cho 200/201 (Thành công).
- Màu cam/vàng cho 403 (Bị chặn quyền bởi RBAC).
- Màu đỏ cho 401 (Chưa xác thực) và 400/500 (Lỗi dữ liệu / máy chủ).

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy

1. **Khởi động Docker**:
   ```bash
   docker compose up -d
   ```
2. **Cài đặt thư viện**:
   ```bash
   npm install
   ```
3. **Khởi động Server**:
   ```bash
   npm run dev
   # hoặc: npm start
   ```
4. **Mở trình duyệt**:
   Truy cập `http://localhost:3000` để trải nghiệm giao diện CMS Dashboard!
