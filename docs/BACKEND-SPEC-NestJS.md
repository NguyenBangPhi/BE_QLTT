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
- **Config**: `@nestjs/config` (`.env` cho `DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, JWT_EXPIRES_IN, LOCK_OVERDUE_CRON, SEND_REMINDER_CRON, PORT, CORS_ORIGIN`).

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

**Pool bắt buộc bật `dateStrings: true`.** Toàn bộ nghiệp vụ dùng cột `DATE` (`NgayHenTra`, `NgayMuon`, `NgayCapThe`, `NgayHetHanThe`, `NgayTraThucTe`). Nếu để mysql2 dựng `Date` object, `JSON.stringify` sẽ đổi sang UTC và **lùi mất một ngày** với timezone `+07:00`: `2024-09-01` trả về thành `"2024-08-31T17:00:00.000Z"`. Sai lệch này đặc biệt nguy hiểm vì tiền phạt tính theo số ngày trễ hạn. Bật `dateStrings` thì API trả đúng `"2024-09-01"`, và Frontend không phải đoán timezone.

```ts
mysql.createPool({ ..., dateStrings: true })
```

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
| GET | `/api/auth/me` | Query lại DB (`NguoiDung JOIN VaiTro LEFT JOIN SinhVien`) → trả `MaNguoiDung, TenDangNhap, HoTen, Email, TrangThai, NgayTao, TenVaiTro` và nếu là sinh viên thì thêm `MaSV, Lop, Khoa, NgayCapThe, NgayHetHanThe, TrangThaiThe` | Đã login |
| GET | `/api/users` | Danh sách toàn bộ `NguoiDung` join `VaiTro` | Admin |
| PUT | `/api/users/:id/status` | body `{trangThai: 0|1}` → UPDATE `NguoiDung.TrangThai`. **Chặn Admin tự khóa chính mình** → 400 | Admin |
| GET | `/api/students` | Query params `keyword` (mã SV / họ tên / lớp), `trangThaiThe`. `SinhVien JOIN NguoiDung`, kèm cột tính toán `SoSachDangMuon` lấy từ `fn_CountBorrowedBooks(MaSV)` | Admin/Thủ thư |
| GET | `/api/students/:maSV` | Chi tiết một sinh viên, cùng shape với endpoint trên | Admin/Thủ thư, hoặc chính sinh viên đó |
| PUT | `/api/students/:id/card-status` | body `{trangThaiThe: 0|1}` → UPDATE `SinhVien.TrangThaiThe` | Admin |

`GET /api/auth/me` **không được trả thẳng payload JWT**. Màn "Trang cá nhân" của sinh viên cần thông tin thẻ thư viện (ngày cấp, ngày hết hạn, tình trạng) vốn nằm ở bảng `SinhVien`, không có trong token. Query lại DB cũng đảm bảo khi Admin khoá tài khoản hoặc đổi vai trò thì lần tải trang kế tiếp phản ánh đúng trạng thái thật.

**Vì sao phải chặn Admin tự khóa mình.** Chỉ Admin mới mở khóa được tài khoản. Nếu Admin cuối cùng tự đặt `TrangThai = 0`, `sp_Login` sẽ lọc bỏ tài khoản đó và **không còn đường nào đăng nhập lại để mở khóa** — phải vào thẳng database sửa tay. Đây là lỗi đã xảy ra thật trong lúc kiểm thử. Giao diện cũng khóa công tắc ở dòng của chính người đang đăng nhập, nhưng chốt chặn thật phải nằm ở Backend.

`GET /api/students` phục vụ hai màn hình: lập phiếu mượn (chọn sinh viên, xem thẻ còn hiệu lực và đã mượn mấy cuốn) và quản lý thẻ. `GET /api/users` không thay thế được vì chỉ dành cho Admin và **không `JOIN SinhVien` nên không trả `MaSV`**. Phần đếm số sách đang mượn phải gọi lại `fn_CountBorrowedBooks`, không tự viết `COUNT(*)`.

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
| PUT | `/api/borrow/fines/:id` | `:id` là `MaCTPM`. body `{tienPhat?, ghiChu?}` → `tienPhat` UPDATE `ChiTietPhieuMuon.TienPhat`; `ghiChu` UPDATE `PhieuMuon.GhiChu` của phiếu cha. Hai lệnh chạy trong cùng transaction (trigger `trg_PreventDuplicateReturn` tự chặn nếu cố đổi field khác ngoài TienPhat) | Admin/Thủ thư |
| GET | `/api/borrow` | Query params `maSV, keyword, trangThai (1 đang mượn / 0 đã trả), tuNgay, denNgay, page, limit`. JOIN `ChiTietPhieuMuon / PhieuMuon / Sach / SinhVien / NguoiDung`, **trả kèm `MaCTPM`**. `keyword` tìm trên họ tên, mã SV, tên sách và ISBN | Admin/Thủ thư |
| GET | `/api/borrow/history` | Sinh viên: lấy `maSV` từ JWT; Admin/Thủ thư: truyền query `?maSV=`. Gọi `sp_GetBorrowHistory(maSV)` | Sinh viên (chỉ của mình) / Admin / Thủ thư |

`jsonSach` gửi lên phải serialize thành chuỗi JSON hợp lệ trước khi bind vào param JSON của SP (`JSON_TABLE` bên trong SP parse lại).

**Ràng buộc bắt buộc ở DTO của `POST /api/borrow`** — thiếu thì dữ liệu rác lọt thẳng xuống database:

- `jsonSach` phải `@ArrayNotEmpty()` và `@IsInt({ each: true })`. `sp_BorrowBook` **không kiểm tra mảng rỗng**: gửi `[]` lên thì SP vẫn `INSERT` một dòng `PhieuMuon` rồi `INSERT ... SELECT` không ra dòng nào, tạo ra phiếu mượn rỗng không gắn với cuốn sách nào.
- `ngayHenTra` phải là ngày **trong tương lai**. SP nhận thẳng `p_NgayHenTra` mà không kiểm tra, nên phiếu lập với ngày quá khứ sẽ quá hạn ngay lúc tạo và `fn_CalculateFine` sinh ra tiền phạt vô lý. So sánh chuỗi `'YYYY-MM-DD'` với ngày hiện tại theo giờ máy chủ là đủ và tránh được lệch múi giờ.

Tương tự, `PUT /api/borrow/fines/:id` cần `@Min(0)` cho `tienPhat` (cột `INT` chấp nhận số âm) và `@MaxLength(255)` cho `ghiChu` (khớp `PhieuMuon.GhiChu VARCHAR(255)`).

**Vì sao cần `GET /api/borrow` bên cạnh `sp_GetBorrowHistory`.** Nghiệp vụ "cập nhật tiền phạt cho những sách đã trả" cần định danh dòng bằng `MaCTPM`, nhưng `vw_SachDangMuon` chỉ chứa `TrangThai = 1`, còn `sp_GetBorrowHistory` không `SELECT MaCTPM`. Không có endpoint này thì không có đường nào lấy được id của dòng đã trả. Đây là query thường, `sp_GetBorrowHistory` giữ nguyên và vẫn phục vụ màn lịch sử của sinh viên.

**Lưu ý về `ghiChu`:** bảng `ChiTietPhieuMuon` **không có cột `GhiChu`** — cột này nằm ở `PhieuMuon` (`DA-Schema.sql` dòng 87). Nên ghi chú gắn ở cấp phiếu mượn, không phải cấp từng cuốn sách. Muốn ghi chú riêng cho từng cuốn thì phải thêm cột vào `ChiTietPhieuMuon`, tức là sửa schema.

Response phân trang dùng chung một shape cho `/api/borrow` và `/api/logs`:

```json
{ "data": [ ... ], "total": 9, "page": 1, "limit": 50 }
```

### 4.4 Thống kê & Cấu hình (Nhóm 4)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/api/stats/borrowing` | `SELECT * FROM vw_SachDangMuon` | Admin/Thủ thư |
| GET | `/api/stats/overdue` | `SELECT * FROM vw_SachQuaHan` | Admin/Thủ thư |
| GET | `/api/configs` | `SELECT * FROM CauHinh` | Admin/Thủ thư |
| PUT | `/api/configs/:key` | `UPDATE CauHinh SET GiaTri = ? WHERE TenCauHinh = ?` | Admin |

Quyền **đọc** cấu hình mở cho cả Thủ thư vì màn quầy mượn trả cần `SO_NGAY_MUON_TOI_DA` để gợi ý ngày hẹn trả và `TIEN_PHAT_MOT_NGAY` để hiển thị tiền phạt dự kiến. Không có hai giá trị này thì Frontend phải ghi cứng số, và khi Admin đổi tham số thì Thủ thư nhìn thấy số sai. Quyền **cập nhật** vẫn chỉ Admin, đúng như đặc tả gốc (đặc tả chỉ giới hạn hành động *"Cập nhật các quy định thư viện"*).

### 4.5 Hệ thống & Cronjob (Nhóm 5)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/api/health` | Ping DB bằng `SELECT 1`. Trả `{status, database}`, lỗi kết nối → 503. Phục vụ healthcheck của Docker | Public |
| GET | `/api/logs` | `SELECT * FROM Log_HeThong ORDER BY ThoiGian DESC, MaLog DESC` + `COUNT(*)`. Trả `{data, total, page, limit}` để Frontend phân trang được | Admin |
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
- `error.sqlState === '23000'` → `400 Bad Request`, **tra tên ràng buộc để ra câu thông báo cụ thể** (xem bên dưới).
- Lỗi JWT hết hạn/invalid → `401`.
- Không tìm thấy record → `404`.
- Còn lại → `500`, log lỗi đầy đủ ra console/logger, không leak chi tiết SQL ra response.

Response lỗi format thống nhất:
```json
{ "statusCode": 400, "message": "Không thể xóa: Sách này hiện đang có sinh viên mượn.", "error": "Bad Request" }
```

### 5.1 Chi tiết hoá lỗi SQLSTATE 23000

`23000` gộp chung nhiều tình huống rất khác nhau, nên **không được trả một câu chung chung** kiểu *"vi phạm khóa ngoại"* — người dùng sẽ không hiểu phải làm gì. Phân nhánh theo `error.code`:

| `error.code` | Tình huống | Cách xử lý |
|---|---|---|
| `ER_DUP_ENTRY` | Thêm bản ghi trùng khóa duy nhất | Tra tên ràng buộc `uq_*` trong `sqlMessage` |
| `ER_ROW_IS_REFERENCED_2` | Xóa bản ghi cha khi còn bản ghi con | Tra tên ràng buộc `fk_*` trong `sqlMessage` |
| `ER_NO_REFERENCED_ROW_2` | Thêm/sửa trỏ tới bản ghi cha không tồn tại | *"Dữ liệu tham chiếu không tồn tại..."* |

MySQL nhúng tên ràng buộc vào `sqlMessage`, ví dụ `CONSTRAINT \`fk_sach_tacgia\` FOREIGN KEY ...`. Dò tên này rồi tra bảng ánh xạ để ra đúng câu, ví dụ `fk_sach_tacgia` → *"Không thể xóa tác giả này vì vẫn còn sách thuộc về tác giả."* Cần phủ đủ 10 ràng buộc `fk_*` và 6 ràng buộc `uq_*` trong `DA-Schema.sql`.

Lưu ý `uq_theloai_ten` và `uq_sach_isbn` cũng ném `23000`: thêm thể loại trùng tên mà báo *"vi phạm khóa ngoại"* là sai hoàn toàn về mặt ngữ nghĩa.

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

---

## 10. Môi trường chạy bằng Docker

`docker-compose.yml` nằm ở thư mục cha của repo, dựng 4 service: `mysql`, `api`, `web` (Frontend) và `adminer`. Chạy `docker compose up -d` là có đủ, không cần cài Node hay MySQL lên máy.

Bốn điểm bắt buộc khi cấu hình MySQL, đều đã gặp lỗi thật trong lúc dựng:

1. **Thứ tự nạp file SQL.** Entrypoint của MySQL chạy các file trong `/docker-entrypoint-initdb.d/` theo **thứ tự alphabet**. Tên gốc `DA-CRUD` → `DA-DATA` → `DA-Schema` cho ra thứ tự sai hoàn toàn. Compose đổi tên lúc mount thành `01-schema.sql`, `02-crud.sql`, `03-data.sql` — không đổi tên file gốc trong `docs/`.

2. **Charset của client khi nạp file.** `DA-CRUD.sql` và `DA-DATA.sql` không có dòng `SET NAMES utf8mb4;` (chỉ `DA-Schema.sql` có), mà entrypoint chạy **mỗi file bằng một tiến trình `mysql` riêng** nên `SET NAMES` không lan sang file khác. Client mặc định latin1 sẽ mã hoá hai lần toàn bộ tiếng Việt lúc `INSERT`: `"Chí Phèo"` lưu thành `"ChÃ­ PhÃ¨o"`.
   Lỗi này rất khó phát hiện vì đọc lại bằng chính client đó thì vẫn hiện đúng — chỉ lộ ra khi xem qua ứng dụng, hoặc chạy `SELECT HEX(TenSach) FROM Sach WHERE MaSach = 1;` (kết quả đúng là `4368C3AD205068C3A86F`).
   Cách xử lý hiện tại: build một image MySQL riêng chỉ để thêm file cấu hình đặt `default-character-set = utf8mb4` cho nhóm `[client]`. Hai cách khác đều không dùng được — mount thẳng file `.cnf` thì bind-mount trên Windows cho quyền 0777 và MySQL từ chối đọc file cấu hình world-writable; còn cờ `--skip-character-set-client-handshake` đã bị gỡ khỏi MySQL 8.4.

3. **Múi giờ.** Phải đặt `--default-time-zone=+07:00`. Không có thì `CURDATE()` chạy theo UTC, làm `fn_CalculateFine` tính sai số ngày trễ và dữ liệu mẫu (`DATE_SUB(CURDATE(), INTERVAL 40 DAY)`) lệch ngày.

4. **Seed chỉ chạy một lần.** Các file init chỉ được thực thi khi volume còn rỗng. Muốn dựng lại từ đầu phải `docker compose down -v` rồi `up` lại.

---

## 11. Những chỗ dễ sai khi bảo trì

Tổng hợp các bẫy đã gặp thật, ghi lại để người sau không mất thời gian dò lại:

| Chỗ | Bẫy |
|---|---|
| `dateStrings` của pool | Tắt đi là mọi cột `DATE` lùi một ngày khi ra JSON, kéo theo tiền phạt sai — xem mục 3 |
| Nạp file SQL | Client charset latin1 làm hỏng toàn bộ tiếng Việt mà nhìn bằng mắt không phát hiện được — xem mục 10 |
| `SQLSTATE 23000` | Gộp cả lỗi khóa ngoại lẫn trùng khóa duy nhất, phải phân nhánh theo `error.code` — xem mục 5.1 |
| `PUT /api/users/:id/status` | Không chặn Admin tự khóa mình thì mất quyền quản trị vĩnh viễn — xem mục 4.1 |
| `POST /api/borrow` | `sp_BorrowBook` không kiểm tra mảng sách rỗng và không kiểm tra ngày hẹn trả — xem mục 4.3 |
| `affectedRows` | MySQL trả `0` cả khi bản ghi tồn tại nhưng giá trị không đổi, đừng dùng để kết luận "không tìm thấy" |
| `package-lock.json` | Đang lệch với `package.json`, `npm ci` thất bại — chạy `npm install` rồi commit lại lock file |
