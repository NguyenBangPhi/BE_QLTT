USE QuanLyThuVien;

-- 1. Bảng CauHinh (9 dòng)
INSERT INTO CauHinh (TenCauHinh, GiaTri, MoTa) VALUES
('SO_SACH_TOI_DA', '3', 'Số lượng sách tối đa một sinh viên được mượn cùng lúc'),
('TIEN_PHAT_MOT_NGAY', '5000', 'Số tiền phạt cho mỗi ngày trễ hạn (VNĐ)'),
('NGUONG_KHOA_THE', '30', 'Số ngày quá hạn tối đa trước khi tự động khóa thẻ'),
('SO_NGAY_NHAC_TRUOC', '2', 'Số ngày trước hạn trả để tự động gửi thông báo'),
('SO_NGAY_MUON_TOI_DA', '14', 'Thời gian mượn tối đa cho một cuốn sách (ngày)'),
('PHI_LAM_THE_MOI', '50000', 'Phí cấp lại thẻ thư viện'),
('GIO_MO_CUA', '07:30', 'Giờ bắt đầu làm việc'),
('GIO_DONG_CUA', '17:30', 'Giờ kết thúc làm việc'),
('EMAIL_LIEN_HE', 'thuvien@daihoc.edu.vn', 'Email hỗ trợ thư viện');

-- 2. Bảng VaiTro (7 dòng)
INSERT INTO VaiTro (TenVaiTro) VALUES
('Admin'), ('Thủ thư'), ('Sinh viên'), 
('Giảng viên'), ('Nghiên cứu sinh'), ('Thực tập sinh'), ('Quản lý');

-- 3. Bảng NguoiDung (Giữ nguyên 10 người dùng)
INSERT INTO NguoiDung (TenDangNhap, MatKhau, HoTen, Email, MaVaiTro, TrangThai) VALUES
('admin01', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Nguyễn Văn Quản Trị', 'admin01@daihoc.edu.vn', 1, 1),
('thuthu01', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Lê Ngọc Thu', 'thuthu01@daihoc.edu.vn', 2, 1),
('sv001', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Đinh Hữu Phước', 'sv001@daihoc.edu.vn', 3, 1),
('sv002', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Lý Tấn Đạt', 'sv002@daihoc.edu.vn', 3, 1),
('sv003', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Bùi Thị Lan', 'sv003@daihoc.edu.vn', 3, 1),
('sv004', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Nguyễn Hữu Trí', 'sv004@daihoc.edu.vn', 3, 1),
('sv005', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Trần Văn Thái', 'sv005@daihoc.edu.vn', 3, 1),
('sv006', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Lê Thị Ái', 'sv006@daihoc.edu.vn', 3, 0),
('sv007', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Phạm Quốc Bảo', 'sv007@daihoc.edu.vn', 3, 1),
('sv008', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Hoàng Minh Đức', 'sv008@daihoc.edu.vn', 3, 1);

-- 4. Bảng SinhVien
INSERT INTO SinhVien (MaSV, MaNguoiDung, Lop, Khoa, NgayCapThe, NgayHetHanThe, TrangThaiThe) VALUES
('SV001', 3, 'CNTT1', 'CNTT', '2024-09-01', '2028-09-01', 1),
('SV002', 4, 'CNTT2', 'CNTT', '2024-09-01', '2028-09-01', 1),
('SV003', 5, 'KTDN1', 'Kinh Tế', '2024-09-01', '2028-09-01', 1),
('SV004', 6, 'KTDN2', 'Kinh Tế', '2024-09-01', '2028-09-01', 1),
('SV005', 7, 'NNA1', 'Ngoại Ngữ', '2024-09-01', '2028-09-01', 1),
('SV006', 8, 'NNA2', 'Ngoại Ngữ', '2024-09-01', '2028-09-01', 0),
('SV007', 9, 'DTVT1', 'Điện Tử', '2024-09-01', '2028-09-01', 1),
('SV008', 10, 'DTVT2', 'Điện Tử', '2024-09-01', '2028-09-01', 1);

-- 5. Bảng TacGia (9 dòng)
INSERT INTO TacGia (TenTacGia) VALUES
('Nam Cao'), ('Nguyễn Nhật Ánh'), ('J.K. Rowling'), ('Phạm Hữu Khang'), ('Nguyễn Văn Tiến'),
('George R.R. Martin'), ('Haruki Murakami'), ('Keigo Higashino'), ('Dan Brown');

-- 6. Bảng TheLoai (8 dòng)
INSERT INTO TheLoai (TenTheLoai) VALUES
('Văn học'), ('Tiểu thuyết'), ('Công nghệ thông tin'), ('Kinh tế'),
('Khoa học viễn tưởng'), ('Trinh thám'), ('Lịch sử'), ('Tâm lý học');

-- 7. Bảng Sach (9 dòng)
INSERT INTO Sach (ISBN, TenSach, MaTacGia, MaTheLoai, NhaXuatBan, NamXuatBan, SoLuongTong, SoLuongTon) VALUES
('978-1', 'Chí Phèo', 1, 1, 'NXB Văn Học', 2010, 10, 10),
('978-2', 'Mắt Biếc', 2, 2, 'NXB Trẻ', 2015, 20, 20),
('978-3', 'Harry Potter', 3, 2, 'NXB Trẻ', 2000, 30, 30),
('978-4', 'Lập trình C++', 4, 3, 'NXB Giáo Dục', 2020, 15, 15),
('978-5', 'Kinh Tế Vĩ Mô', 5, 4, 'NXB Kinh Tế', 2019, 10, 10),
('978-6', 'Trò Chơi Vương Quyền', 6, 2, 'NXB Tổng Hợp', 2016, 8, 8),
('978-7', 'Rừng Na Uy', 7, 2, 'NXB Hội Nhà Văn', 2018, 12, 12),
('978-8', 'Phía Sau Nghi Can X', 8, 6, 'NXB Nhã Nam', 2019, 15, 15),
('978-9', 'Mật Mã Da Vinci', 9, 6, 'NXB Thời Đại', 2008, 10, 10);

-- 8. Bảng PhieuMuon (7 dòng)
INSERT INTO PhieuMuon (MaPhieuMuon, MaSV, MaThuThu, NgayMuon) VALUES
(1, 'SV001', 2, DATE_SUB(CURDATE(), INTERVAL 40 DAY)), 
(2, 'SV002', 2, DATE_SUB(CURDATE(), INTERVAL 13 DAY)), 
(3, 'SV003', 2, DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
(4, 'SV004', 2, DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
(5, 'SV005', 2, DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
(6, 'SV007', 2, CURDATE()),
(7, 'SV008', 2, DATE_SUB(CURDATE(), INTERVAL 1 DAY));

-- 9. Bảng ChiTietPhieuMuon (9 dòng)
INSERT INTO ChiTietPhieuMuon (MaPhieuMuon, MaSach, NgayHenTra, NgayTraThucTe, TrangThai) VALUES
(1, 1, DATE_SUB(CURDATE(), INTERVAL 35 DAY), NULL, 1),
(2, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), NULL, 1),
(3, 4, DATE_ADD(CURDATE(), INTERVAL 9 DAY), NULL, 1),
(3, 5, DATE_ADD(CURDATE(), INTERVAL 9 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), 0),
(4, 6, DATE_ADD(CURDATE(), INTERVAL 12 DAY), NULL, 1),
(5, 7, DATE_ADD(CURDATE(), INTERVAL 4 DAY), NULL, 1),
(6, 8, DATE_ADD(CURDATE(), INTERVAL 14 DAY), NULL, 1),
(7, 9, DATE_ADD(CURDATE(), INTERVAL 13 DAY), NULL, 1),
(2, 3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), 0);

-- 10. Bảng ThongBao (4 dòng mới)
INSERT INTO ThongBao (MaSV, MaCTPM, NoiDung, DaDoc) VALUES
('SV001', 1, 'CẢNH BÁO: Sách "Chí Phèo" đã quá hạn 35 ngày. Thẻ của bạn sẽ bị khóa tự động.', 0),
('SV003', 4, 'Cảm ơn bạn đã hoàn trả cuốn "Kinh Tế Vĩ Mô" đúng thời hạn.', 1),
('SV002', 2, 'Sách "Mắt Biếc" của bạn sẽ đến hạn trả vào ngày mai. Vui lòng sắp xếp thời gian trả sách.', 0),
('SV008', NULL, 'Chào mừng bạn đến với Thư viện Đại học. Vui lòng đổi mật khẩu để bảo mật tài khoản.', 1);

-- 11. Bảng Log_HeThong (4 dòng mới)
INSERT INTO Log_HeThong (TenBang, HanhDong, MaBanGhi, NguoiThucHien, GiaTriCu, GiaTriMoi) VALUES
('Sach', 0, 2, 'admin01', '{"ISBN": "978-2", "TenSach": "Mắt Biếc Cũ"}', '{"ISBN": "978-2", "TenSach": "Mắt Biếc"}'),
('Sach', 1, 99, 'thuthu01', '{"ISBN": "978-99", "TenSach": "Sách Hỏng Cần Hủy"}', NULL),
('CauHinh', 0, 0, 'admin01', '{"TenCauHinh": "SO_SACH_TOI_DA", "GiaTri": "2"}', '{"TenCauHinh": "SO_SACH_TOI_DA", "GiaTri": "3"}'),
('SinhVien', 0, 6, 'admin01', '{"MaSV": "SV006", "TrangThaiThe": 1}', '{"MaSV": "SV006", "TrangThaiThe": 0}');

-- 12. ĐỒNG BỘ TỒN KHO THỰC TẾ TRONG BẢNG SÁCH
SET SQL_SAFE_UPDATES = 0;

UPDATE Sach s 
SET SoLuongTon = SoLuongTong - (
    SELECT COUNT(*) 
    FROM ChiTietPhieuMuon ct 
    WHERE ct.MaSach = s.MaSach AND ct.TrangThai = 1
);

SET SQL_SAFE_UPDATES = 1;