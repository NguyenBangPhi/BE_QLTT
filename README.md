# Website Quản Lý Thư Viện - Backend

Backend cho Website Quản Lý Thư Viện sử dụng NestJS và MySQL.
Dự án được xây dựng dựa trên Database có sẵn với toàn bộ logic nghiệp vụ (tính tiền phạt, đồng bộ tồn kho, audit log...) nằm trong Stored Procedure và Trigger của MySQL.

## 1. Cách A — chạy bằng Docker

Không cần cài Node hay MySQL lên máy. File `docker-compose.yml` nằm ở thư mục cha, điều phối cả MySQL, Backend và Frontend:

```bash
cd ..            # tới thư mục chứa BE_QLTT và FE_QLTT
cp .env.example .env
docker compose up -d
```

API chạy ở `http://localhost:3000`, Swagger ở `http://localhost:3000/api/docs`.

Database được khởi tạo tự động từ 3 file trong `docs/` — không phải import tay. Muốn dựng lại từ đầu: `docker compose down -v && docker compose up -d`.

Đặc tả API đầy đủ: `docs/BACKEND-SPEC-NestJS.md`.

## 2. Cách B — chạy trực tiếp trên máy

### Yêu cầu
- Node.js >= 18
- MySQL >= 8.0

### Bước 1: Khởi tạo Database
Import 3 file SQL theo đúng thứ tự sau vào MySQL:
1. `docs/DA-Schema.sql`: Khởi tạo bảng, view.
2. `docs/DA-CRUD.sql`: Cập nhật Stored Procedure, Trigger, Function.
3. `docs/DA-DATA.sql`: Import dữ liệu mẫu.

### Bước 2: Cài đặt dependencies
```bash
npm install
```

> Dùng `npm install`, **không dùng `npm ci`**. File `package-lock.json` hiện không đồng bộ với `package.json` nên `npm ci` sẽ báo `Missing: typescript@5.9.3 from lock file`. Sau khi chạy `npm install` một lần, nên commit lại `package-lock.json` để sửa hẳn.

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
CORS_ORIGIN=http://localhost:3001
```

`CORS_ORIGIN` là danh sách origin của Frontend, phân tách bằng dấu phẩy. Bỏ trống thì cho phép mọi origin.

### Bước 4: Chạy ứng dụng

```bash
# Chế độ phát triển
npm run start:dev

# Chế độ Production
npm run build
npm run start:prod
```

## 3. Swagger API Docs
Sau khi chạy ứng dụng, bạn có thể truy cập API docs tại:
👉 http://localhost:3000/api/docs

## 4. Danh sách tài khoản Test
Password chung cho mọi tài khoản trong dữ liệu mẫu là `123456` (hash SHA-256 hex).
- Admin: `admin01`
- Thủ thư: `thuthu01`
- Sinh viên: `sv001` -> `sv008`
