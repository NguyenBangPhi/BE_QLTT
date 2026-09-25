# Đặc tả Backend — Website Quản Lý Thư Viện (NestJS + MySQL)

> File này dùng để giao cho một AI coding agent khác (Claude Code, Cursor, v.v.) "vibe code" ra toàn bộ Backend. Agent đó **phải đọc và bám sát** đặc tả này, không tự ý đổi tên bảng/cột/API.

---

## 0. Bối cảnh & Nguyên tắc bắt buộc

Database `QuanLyThuVien` (MySQL 8+) **đã có sẵn và đã hoàn chỉnh** — schema, dữ liệu mẫu, 6 Stored Procedures, 8 Triggers, 3 Functions, 2 Cursor (nằm trong 2 SP `sp_LockOverdueAccounts` / `sp_SendReminder`) đều đã viết xong (đính kèm 3 file: `DA-Schema.sql`, `DA-DATA.sql`, `DA-CRUD.sql`).

**Nguyên tắc cốt lõi:** gần như toàn bộ nghiệp vụ (validate, transaction, khóa dòng, tính tiền phạt, đồng bộ tồn kho, audit log) đã nằm trong SP/Trigger/Function ở tầng DB. Backend **KHÔNG được viết lại logic nghiệp vụ bằng TypeORM/business code** — Backend chỉ đóng vai trò:

1. Gọi đúng SP/Function bằng raw SQL (`CALL sp_x(...)`, `SELECT fn_x(...)`).
2. Bắt lỗi SQLSTATE do Trigger/SP ném ra (`45000`, `23000`) → convert thành HTTP response rõ ràng.
3. Xử lý Auth/JWT/phân quyền, validate input (DTO), format response, viết Swagger.
4. Chạy 2 cronjob gọi `sp_LockOverdueAccounts` và `sp_SendReminder`.

Vì vậy: **không dùng TypeORM entity + `.save()`/`.repository` cho các nghiệp vụ có SP tương ứng.** Dùng TypeORM (hoặc `mysql2` driver thuần) chỉ để chạy raw query/`CALL`. Các bảng danh mục đơn giản không có SP (TacGia, TheLoai, CauHinh) thì có thể dùng query builder bình thường.

---

## 1. Tech stack bắt buộc

- **NestJS** (mới nhất, dùng CLI `@nestjs/cli`)
- **MySQL 8+**, driver `mysql2`
- Kết nối DB qua `@nestjs/typeorm` + `typeorm` (dùng cho query runner / raw query và cho các bảng danh mục CRUD đơn giản) **hoặc** một `DatabaseService` tự viết bọc `mysql2/promise` connection pool — chọn 1 trong 2, nêu rõ trong README agent sinh ra.
- **Swagger**: `@nestjs/swagger` — bắt buộc phải expose `/api/docs`.
- **Auth**: `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt`, hash password đã có sẵn dạng SHA-256 hex trong dữ liệu mẫu (xem mục 4.1 — không tự đổi sang bcrypt trừ khi được yêu cầu).
- **Validation**: `class-validator` + `class-transformer`, bật `ValidationPipe` global (`whitelist: true`, `forbidNonWhitelisted: true`).
- **Cron**: `@nestjs/schedule`.
- **Config**: `@nestjs/config` (`.env` cho `DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, JWT_EXPIRES_IN, LOCK_OVERDUE_CRON, SEND_REMINDER_CRON`).

---

## 2. Cấu trúc thư mục đề xuất

```
src/
  main.ts                      # bootstrap, ValidationPipe, Swagger, CORS
  app.module.ts
  config/
  database/
    database.module.ts
    database.service.ts        # pool mysql2 + helper callProcedure(), callScalarFunction()
  common/
    filters/mysql-exception.filter.ts   # bắt SQLSTATE 45000/23000 -> HTTP 400
    decorators/roles.decorator.ts
    guards/jwt-auth.guard.ts
    guards/roles.guard.ts
    interceptors/...
  auth/
    auth.module.ts / auth.controller.ts / auth.service.ts
    strategies/jwt.strategy.ts
    dto/login.dto.ts
  users/            # NguoiDung, SinhVien (khóa/mở khóa tài khoản, thẻ)
  authors/          # TacGia (CRUD thường)
  genres/           # TheLoai (CRUD thường)
  books/            # Sach (sp_AddBook, sp_SearchBooks, update/delete)
  borrow/           # PhieuMuon, ChiTietPhieuMuon (sp_BorrowBook, sp_ReturnBook, sp_GetBorrowHistory)
  stats/            # vw_SachDangMuon, vw_SachQuaHan, CauHinh
  system/           # Log_HeThong, ThongBao, cronjobs (sp_LockOverdueAccounts, sp_SendReminder)
```

---

## 3. Lớp `DatabaseService` — bắt buộc phải có 2 helper

```ts
// Gọi Stored Procedure không trả result set (INSERT/UPDATE logic bên trong SP)
async callProcedure(name: string, params: any[]): Promise<any>

// Gọi Stored Procedure CÓ trả result set (SELECT bên trong, vd sp_SearchBooks, sp_GetBorrowHistory, sp_Login)
async callProcedureWithResult<T>(name: string, params: any[]): Promise<T[]>

// Gọi scalar function, vd SELECT fn_CalculateFine(?) AS value
async callScalarFunction<T>(name: string, params: any[]): Promise<T>
```

Với `sp_AddBook`, `sp_BorrowBook`, `sp_ReturnBook`: SP có thể `SIGNAL SQLSTATE '45000'`. Driver `mysql2` sẽ throw error có field `sqlState` và `sqlMessage` — service KHÔNG tự catch ở đây, để bubble lên `MysqlExceptionFilter` toàn cục (xem mục 6).

Mỗi request cần set biến session trước khi thao tác trên bảng `Sach` để trigger audit ghi đúng người thực hiện:
```sql
SET @app_user = ?;   -- = username lấy từ JWT payload
```
→ Best practice: trong Interceptor hoặc đầu mỗi service method liên quan tới `books.update/delete`, chạy câu này trên **cùng connection** trước khi gọi UPDATE/DELETE (nghĩa là phải lấy 1 connection riêng từ pool cho request đó, không dùng pool.query() rời rạc — dùng `pool.getConnection()` rồi release sau).

---

## 4. Chi tiết từng module & mapping API

### 4.1 Auth & Users (Nhóm 1)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/api/auth/login` | body `{username, password}` → hash password (SHA-256 hex, so với cột `MatKhau CHAR(64)`) → gọi `sp_Login(username, passwordHash)`. SP tự lọc `TrangThai=1`. Nếu result rỗng → 401. Nếu có → tạo JWT chứa `{sub: MaNguoiDung, username, role: TenVaiTro, maSV}` | Public |
| GET | `/api/auth/me` | Trả thông tin user hiện tại từ JWT payload (có thể query lại DB để lấy data mới nhất) | Đã login |
| GET | `/api/users` | Danh sách toàn bộ `NguoiDung` join `VaiTro` | Admin |
| PUT | `/api/users/:id/status` | body `{trangThai: 0|1}` → UPDATE `NguoiDung.TrangThai` | Admin |
| PUT | `/api/students/:id/card-status` | body `{trangThaiThe: 0|1}` → UPDATE `SinhVien.TrangThaiThe` | Admin |

Password hash mẫu trong `DA-DATA.sql` là SHA-256 hex (`8d969eef...`) — dùng `crypto.createHash('sha256').update(password).digest('hex')`, **không đổi sang bcrypt** vì phải khớp dữ liệu mẫu đã seed sẵn.

JWT payload tối thiểu: `MaNguoiDung, TenDangNhap, TenVaiTro (role), MaSV (nullable)`. Role dùng để enforce `@Roles('Admin', 'Thủ thư', 'Sinh viên')` qua `RolesGuard`.

### 4.2 Danh mục & Sách (Nhóm 2)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/authors` | CRUD `TacGia` — query thường, không có SP | Admin/Thủ thư (đọc: mọi role) |
| GET/POST/PUT/DELETE | `/api/genres` | CRUD `TheLoai` — tương tự | Admin/Thủ thư |
| GET | `/api/books` | Query params `keyword, maTacGia, maTheLoai` → gọi `sp_SearchBooks(keyword, maTacGia, maTheLoai)` | Public/mọi role đã login |
| GET | `/api/books/:id` | `SELECT ... FROM Sach JOIN TacGia JOIN TheLoai WHERE MaSach = ?` | mọi role |
| POST | `/api/books` | DTO đủ 7 field → `sp_AddBook(...)`. Bắt lỗi ISBN trùng (SIGNAL 45000) | Admin/Thủ thư |
| PUT | `/api/books/:id` | `SET @app_user = ?` rồi `UPDATE Sach SET ...`. Trigger `trg_AutoSyncStock` tự tính lại tồn kho nếu `SoLuongTong` đổi; trigger `trg_AuditBook_Update` tự ghi log | Admin/Thủ thư |
| DELETE | `/api/books/:id` | `SET @app_user = ?` rồi `DELETE FROM Sach WHERE MaSach = ?`. Bắt cả SQLSTATE 45000 (trigger `trg_PreventDeleteBorrowedBook`) và 23000 (FK còn tham chiếu ở log/lịch sử) → 400 | Admin |

Khi DELETE authors/genres mà còn sách tham chiếu → MySQL trả lỗi FK (`ER_ROW_IS_REFERENCED_2`, sqlState `23000`) → filter convert thành `400 { message: "Không thể xóa danh mục đang chứa sách" }`.

### 4.3 Mượn / Trả (Nhóm 3)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/api/borrow` | body `{maSV, jsonSach: number[], ngayHenTra}` → `sp_BorrowBook(maThuThu = từ JWT, maSV, JSON.stringify(jsonSach), ngayHenTra)`. Bắt các lỗi nghiệp vụ (thẻ khóa, vượt hạn mức, hết tồn kho) trả về message tiếng Việt gốc từ SP | Admin/Thủ thư |
| POST | `/api/return` | body `{maCTPM}` → `sp_ReturnBook(maCTPM)` | Admin/Thủ thư |
| PUT | `/api/borrow/fines/:id` | body `{tienPhat?, ghiChu?}` → UPDATE trực tiếp `ChiTietPhieuMuon` (trigger `trg_PreventDuplicateReturn` tự chặn nếu cố đổi field khác ngoài TienPhat) | Admin/Thủ thư |
| GET | `/api/borrow/history` | Sinh viên: lấy `maSV` từ JWT; Admin/Thủ thư: truyền query `?maSV=`. Gọi `sp_GetBorrowHistory(maSV)` | Sinh viên (chỉ của mình) / Admin / Thủ thư |

`jsonSach` gửi lên phải serialize thành chuỗi JSON hợp lệ trước khi bind vào param JSON của SP (`JSON_TABLE` bên trong SP parse lại).

### 4.4 Thống kê & Cấu hình (Nhóm 4)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/api/stats/borrowing` | `SELECT * FROM vw_SachDangMuon` | Admin/Thủ thư |
| GET | `/api/stats/overdue` | `SELECT * FROM vw_SachQuaHan` | Admin/Thủ thư |
| GET | `/api/configs` | `SELECT * FROM CauHinh` | Admin |
| PUT | `/api/configs/:key` | `UPDATE CauHinh SET GiaTri = ? WHERE TenCauHinh = ?` | Admin |

### 4.5 Hệ thống & Cronjob (Nhóm 5)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/api/logs` | `SELECT * FROM Log_HeThong ORDER BY ThoiGian DESC` (phân trang) | Admin |
| GET | `/api/notifications` | `SELECT * FROM ThongBao WHERE MaSV = ?` (MaSV từ JWT) | Sinh viên |
| PUT | `/api/notifications/:id/read` | `UPDATE ThongBao SET DaDoc = 1 WHERE MaThongBao = ?` | Sinh viên (chỉ của mình) |
| POST | `/api/system/lock-overdue` | `CALL sp_LockOverdueAccounts()` | Admin (+ cron nội bộ) |
| POST | `/api/system/send-reminders` | `CALL sp_SendReminder()` | Admin (+ cron nội bộ) |

**Cronjob** (dùng `@nestjs/schedule`, `@Cron()`):
- Chạy `sp_LockOverdueAccounts` — đề xuất mỗi ngày 1 lần (vd 00:30).
- Chạy `sp_SendReminder` — đề xuất mỗi ngày 1 lần vào đầu giờ hành chính (dùng `GIO_MO_CUA` từ `CauHinh` nếu muốn linh động, không bắt buộc).
- Lịch chạy nên đọc từ `.env` (cron expression) để dễ chỉnh khi demo.

---

## 5. Xử lý lỗi tập trung (bắt buộc)

Viết 1 `ExceptionFilter` toàn cục bắt lỗi từ `mysql2`:

- `error.sqlState === '45000'` → `400 Bad Request`, `message: error.sqlMessage` (giữ nguyên tiếng Việt từ SIGNAL trong SP/Trigger).
- `error.sqlState === '23000'` → `400 Bad Request`, message tùy ngữ cảnh (khóa ngoại vi phạm).
- Lỗi JWT hết hạn/invalid → `401`.
- Không tìm thấy record → `404`.
- Còn lại → `500`, log lỗi đầy đủ ra console/logger, không leak chi tiết SQL ra response.

Response lỗi format thống nhất:
```json
{ "statusCode": 400, "message": "Không thể xóa: Sách này hiện đang có sinh viên mượn.", "error": "Bad Request" }
```

---

## 6. Phân quyền (Roles)

3 role trong bảng `VaiTro`: `Admin`, `Thủ thư`, `Sinh viên` (bảng có sẵn cả `Giảng viên`, `Nghiên cứu sinh`... nhưng nghiệp vụ hiện tại chỉ xử lý 3 role trên — 4 role còn lại tạm coi như không có quyền đặc biệt, mặc định chỉ đọc công khai).

- `@Roles('Admin')` — decorator custom, đọc metadata, kết hợp `RolesGuard` so với `role` trong JWT payload.
- Route không gắn `@Roles()` nhưng có `@UseGuards(JwtAuthGuard)` → chỉ cần đăng nhập, không phân biệt role.
- Sinh viên chỉ được xem **của chính mình** (lịch sử mượn, thông báo) — so `maSV` trong JWT với param, nếu không khớp và role không phải Admin/Thủ thư → `403`.

---

## 7. Swagger

- Bật tại `/api/docs`, dùng `DocumentBuilder` đặt title "Library Management API", mô tả ngắn, version `1.0`.
- Bật `addBearerAuth()` cho JWT.
- Mỗi DTO decorate `@ApiProperty()`; mỗi controller method có `@ApiOperation`, `@ApiResponse` (ít nhất 200/400/401).
- Group theo tag đúng 5 nhóm ở mục 4 (`@ApiTags('Auth & Users')`, v.v.) để FE dễ tra.

---

## 8. Việc AI thực hiện cần làm theo thứ tự

1. Khởi tạo project NestJS, cài đặt toàn bộ dependency ở mục 1.
2. Setup `DatabaseModule`/`DatabaseService` (pool `mysql2`, helper `callProcedure`/`callProcedureWithResult`/`callScalarFunction`, và cơ chế lấy connection riêng cho các thao tác cần `SET @app_user`).
3. Setup `ValidationPipe`, `MysqlExceptionFilter` global, Swagger, CORS (cho phép origin của FE) trong `main.ts`.
4. Module `auth`: strategy JWT, guard, login gọi `sp_Login`, hash SHA-256.
5. Lần lượt từng module còn lại theo đúng bảng API ở mục 4 — mỗi module có DTO validate đầy đủ, Swagger decorator đầy đủ.
6. Module `system`: cronjob 2 job, endpoint chạy tay cho Admin.
7. Viết `README.md` ngắn: cách chạy (`npm run start:dev`), biến môi trường cần thiết, cách import 3 file SQL gốc để tạo DB trước khi chạy BE.
8. Test nhanh bằng Swagger UI toàn bộ luồng: login → search sách → borrow → return → xem log/thống kê.

**Không được:** đổi tên bảng/cột, đổi tên SP/Trigger/Function, viết lại logic nghiệp vụ (tính tiền phạt, check hạn mức, khóa dòng...) bằng code Node — toàn bộ đã có sẵn trong DB, Backend chỉ gọi và bọc lỗi.

---

## 9. File đính kèm cần cung cấp cho AI khi bắt đầu code

- `DA-Schema.sql` (cấu trúc bảng + view)
- `DA-DATA.sql` (dữ liệu mẫu để test)
- `DA-CRUD.sql` (toàn bộ SP/Trigger/Function)
- File đặc tả API gốc (nội dung đã được đưa vào mục 4 ở trên)
