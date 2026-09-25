# Website Quản Lý Thư Viện - Backend

Backend cho Website Quản Lý Thư Viện sử dụng NestJS và MySQL.
Dự án được xây dựng dựa trên Database có sẵn với toàn bộ logic nghiệp vụ (tính tiền phạt, đồng bộ tồn kho, audit log...) nằm trong Stored Procedure và Trigger của MySQL.

## 1. Yêu cầu hệ thống
- Node.js >= 18
- MySQL >= 8.0

## 2. Cài đặt và cấu hình

### Bước 1: Khởi tạo Database
Bạn cần import 3 file SQL theo thứ tự sau vào MySQL:
1. `DA-Schema.sql`: Khởi tạo bảng, view.
2. `DA-CRUD.sql`: Cập nhật Stored Procedure, Trigger, Function.
3. `DA-DATA.sql`: Import dữ liệu mẫu.

### Bước 2: Cài đặt dependencies
```bash
npm install
```

### Bước 3: Cấu hình biến môi trường
Tạo file `.env` ở thư mục gốc (hoặc sửa file `.env` đã có) với các biến:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=QuanLyThuVien
JWT_SECRET=super_secret_key
JWT_EXPIRES_IN=1d
LOCK_OVERDUE_CRON=0 30 0 * * *
SEND_REMINDER_CRON=0 30 7 * * *
PORT=3000
```

## 3. Chạy ứng dụng

```bash
# Chế độ phát triển
npm run start:dev

# Chế độ Production
npm run build
npm run start:prod
```

## 4. Swagger API Docs
Sau khi chạy ứng dụng, bạn có thể truy cập API docs tại:
👉 http://localhost:3000/api/docs

## 5. Danh sách tài khoản Test
Password chung cho mọi tài khoản trong dữ liệu mẫu là `123456` (hash SHA-256 hex).
- Admin: `admin01`
- Thủ thư: `thuthu01`
- Sinh viên: `sv001` -> `sv008`
