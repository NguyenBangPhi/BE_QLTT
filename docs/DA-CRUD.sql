USE QuanLyThuVien;

-- Dọn dẹp Functions cũ
DROP FUNCTION IF EXISTS fn_CountBorrowedBooks;
DROP FUNCTION IF EXISTS fn_CalculateFine;
DROP FUNCTION IF EXISTS fn_CheckCardStatus;

-- Dọn dẹp Triggers cũ
DROP TRIGGER IF EXISTS trg_CheckBookQuantity_Insert;
DROP TRIGGER IF EXISTS trg_AutoSyncStock;
DROP TRIGGER IF EXISTS trg_UpdateStock_AfterBorrow;
DROP TRIGGER IF EXISTS trg_UpdateStock_AfterReturn;
DROP TRIGGER IF EXISTS trg_AuditBook_Update;
DROP TRIGGER IF EXISTS trg_AuditBook_Delete;
DROP TRIGGER IF EXISTS trg_PreventDuplicateReturn;
DROP TRIGGER IF EXISTS trg_PreventDeleteBorrowedBook;

-- Dọn dẹp Stored Procedures cũ
DROP PROCEDURE IF EXISTS sp_Login;
DROP PROCEDURE IF EXISTS sp_AddBook;
DROP PROCEDURE IF EXISTS sp_SearchBooks;
DROP PROCEDURE IF EXISTS sp_BorrowBook;
DROP PROCEDURE IF EXISTS sp_ReturnBook;
DROP PROCEDURE IF EXISTS sp_GetBorrowHistory;
DROP PROCEDURE IF EXISTS sp_LockOverdueAccounts;
DROP PROCEDURE IF EXISTS sp_SendReminder;

DELIMITER //

-- ==============================================
-- 1. FUNCTIONS
-- ==============================================

CREATE FUNCTION fn_CountBorrowedBooks(p_MaSV VARCHAR(10)) 
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(ct.MaCTPM) INTO v_count
    FROM ChiTietPhieuMuon ct
    JOIN PhieuMuon pm ON ct.MaPhieuMuon = pm.MaPhieuMuon
    WHERE pm.MaSV = p_MaSV AND ct.TrangThai = 1;
    RETURN v_count;
END //

CREATE FUNCTION fn_CalculateFine(p_MaCTPM INT) 
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_TienPhat INT DEFAULT 0;
    DECLARE v_NgayHenTra DATE;
    DECLARE v_DonGia INT;
    
    SELECT NgayHenTra INTO v_NgayHenTra FROM ChiTietPhieuMuon WHERE MaCTPM = p_MaCTPM;
    SELECT CAST(GiaTri AS UNSIGNED) INTO v_DonGia FROM CauHinh WHERE TenCauHinh = 'TIEN_PHAT_MOT_NGAY';
    
    IF CURDATE() > v_NgayHenTra THEN
        SET v_TienPhat = DATEDIFF(CURDATE(), v_NgayHenTra) * v_DonGia;
    END IF;
    
    RETURN v_TienPhat;
END //

CREATE FUNCTION fn_CheckCardStatus(p_MaSV VARCHAR(10)) 
RETURNS BOOLEAN
READS SQL DATA
BEGIN
    DECLARE v_HopLe BOOLEAN DEFAULT 0;
    SELECT CASE 
        WHEN TrangThaiThe = 1 AND NgayHetHanThe >= CURDATE() THEN 1 
        ELSE 0 
    END INTO v_HopLe
    FROM SinhVien WHERE MaSV = p_MaSV;
    RETURN v_HopLe;
END //

-- ==============================================
-- 2. TRIGGERS
-- ==============================================

CREATE TRIGGER trg_CheckBookQuantity_Insert
BEFORE INSERT ON Sach
FOR EACH ROW
BEGIN
    IF NEW.SoLuongTong < 0 OR NEW.SoLuongTon < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số lượng sách không được phép âm.';
    END IF;
END //

CREATE TRIGGER trg_AutoSyncStock
BEFORE UPDATE ON Sach
FOR EACH ROW
BEGIN
    IF NEW.SoLuongTong != OLD.SoLuongTong THEN
        SET NEW.SoLuongTon = OLD.SoLuongTon + (NEW.SoLuongTong - OLD.SoLuongTong);
    END IF;
    IF NEW.SoLuongTong < 0 OR NEW.SoLuongTon < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số lượng sách không được phép âm.';
    END IF;
END //

CREATE TRIGGER trg_UpdateStock_AfterBorrow
AFTER INSERT ON ChiTietPhieuMuon
FOR EACH ROW
BEGIN
    UPDATE Sach SET SoLuongTon = SoLuongTon - 1 WHERE MaSach = NEW.MaSach;
END //

CREATE TRIGGER trg_UpdateStock_AfterReturn
AFTER UPDATE ON ChiTietPhieuMuon
FOR EACH ROW
BEGIN
    IF OLD.TrangThai = 1 AND NEW.TrangThai = 0 THEN
        UPDATE Sach SET SoLuongTon = SoLuongTon + 1 WHERE MaSach = NEW.MaSach;
    END IF;
END //

CREATE TRIGGER trg_AuditBook_Update
AFTER UPDATE ON Sach
FOR EACH ROW
BEGIN
    IF OLD.ISBN != NEW.ISBN OR OLD.TenSach != NEW.TenSach OR OLD.MaTacGia != NEW.MaTacGia OR OLD.MaTheLoai != NEW.MaTheLoai THEN
        INSERT INTO Log_HeThong (TenBang, HanhDong, MaBanGhi, NguoiThucHien, GiaTriCu, GiaTriMoi)
        VALUES ('Sach', 0, NEW.MaSach, IFNULL(@app_user, USER()), JSON_OBJECT('ISBN', OLD.ISBN, 'TenSach', OLD.TenSach), JSON_OBJECT('ISBN', NEW.ISBN, 'TenSach', NEW.TenSach));
    END IF;
END //

CREATE TRIGGER trg_AuditBook_Delete
AFTER DELETE ON Sach
FOR EACH ROW
BEGIN
    INSERT INTO Log_HeThong (TenBang, HanhDong, MaBanGhi, NguoiThucHien, GiaTriCu, GiaTriMoi)
    VALUES ('Sach', 1, OLD.MaSach, IFNULL(@app_user, USER()), JSON_OBJECT('ISBN', OLD.ISBN, 'TenSach', OLD.TenSach), NULL);
END //

CREATE TRIGGER trg_PreventDuplicateReturn
BEFORE UPDATE ON ChiTietPhieuMuon
FOR EACH ROW
BEGIN
    -- Sử dụng toán tử <=> (NULL-safe equal) để so sánh an toàn kể cả khi ngày trả thực tế là NULL
    IF OLD.TrangThai = 0 AND (NEW.TrangThai <> 0 OR OLD.MaSach <> NEW.MaSach OR NOT (OLD.NgayTraThucTe <=> NEW.NgayTraThucTe)) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Không được phép chỉnh sửa trạng thái, mã sách hoặc ngày trả của phiếu đã hoàn tất (chỉ được cập nhật Tiền phạt).';
    END IF;
END //

CREATE TRIGGER trg_PreventDeleteBorrowedBook
BEFORE DELETE ON Sach
FOR EACH ROW
BEGIN
    DECLARE v_DangMuon INT;
    SELECT COUNT(*) INTO v_DangMuon FROM ChiTietPhieuMuon WHERE MaSach = OLD.MaSach AND TrangThai = 1;
    IF v_DangMuon > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể xóa: Sách này hiện đang có sinh viên mượn.';
    END IF;
END //

-- ==============================================
-- 3. STORED PROCEDURES
-- ==============================================

CREATE PROCEDURE sp_Login(IN p_Username VARCHAR(50), IN p_Password CHAR(64))
BEGIN
    SELECT n.MaNguoiDung, n.TenDangNhap, n.HoTen, v.TenVaiTro, n.TrangThai, sv.MaSV
    FROM NguoiDung n
    JOIN VaiTro v ON n.MaVaiTro = v.MaVaiTro
    LEFT JOIN SinhVien sv ON n.MaNguoiDung = sv.MaNguoiDung
    WHERE n.TenDangNhap = p_Username AND n.MatKhau = p_Password AND n.TrangThai = 1;
END //

CREATE PROCEDURE sp_AddBook(
    IN p_ISBN VARCHAR(20), IN p_TenSach VARCHAR(255), 
    IN p_MaTacGia INT, IN p_MaTheLoai INT, 
    IN p_NhaXuatBan VARCHAR(100), IN p_NamXuatBan INT, IN p_SoLuong INT
)
BEGIN
    IF EXISTS (SELECT 1 FROM Sach WHERE ISBN = p_ISBN) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ISBN đã tồn tại trong hệ thống.';
    ELSE
        INSERT INTO Sach (ISBN, TenSach, MaTacGia, MaTheLoai, NhaXuatBan, NamXuatBan, SoLuongTong, SoLuongTon)
        VALUES (p_ISBN, p_TenSach, p_MaTacGia, p_MaTheLoai, p_NhaXuatBan, p_NamXuatBan, p_SoLuong, p_SoLuong);
    END IF;
END //

CREATE PROCEDURE sp_SearchBooks(IN p_Keyword VARCHAR(255), IN p_MaTacGia INT, IN p_MaTheLoai INT)
BEGIN
    SET @sql = 'SELECT s.*, t.TenTacGia, tl.TenTheLoai FROM Sach s 
                JOIN TacGia t ON s.MaTacGia = t.MaTacGia 
                JOIN TheLoai tl ON s.MaTheLoai = tl.MaTheLoai WHERE 1=1';
                
    IF p_Keyword IS NOT NULL AND p_Keyword != '' THEN
        SET @sql = CONCAT(@sql, ' AND (s.TenSach LIKE ', QUOTE(CONCAT('%', p_Keyword, '%')), 
                          ' OR s.ISBN LIKE ', QUOTE(CONCAT('%', p_Keyword, '%')),
                          ' OR t.TenTacGia LIKE ', QUOTE(CONCAT('%', p_Keyword, '%')), ')');
    END IF;
    IF p_MaTacGia IS NOT NULL THEN
        SET @sql = CONCAT(@sql, ' AND s.MaTacGia = ', p_MaTacGia);
    END IF;
    IF p_MaTheLoai IS NOT NULL THEN
        SET @sql = CONCAT(@sql, ' AND s.MaTheLoai = ', p_MaTheLoai);
    END IF;

    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END //

CREATE PROCEDURE sp_BorrowBook(
    IN p_MaSV VARCHAR(10), IN p_MaThuThu INT, 
    IN p_JsonSach JSON, IN p_NgayHenTra DATE
)
BEGIN
    DECLARE v_MaPhieuMuon INT;
    DECLARE v_VaiTro INT;
    DECLARE v_SachHet INT DEFAULT 0;
    DECLARE v_MaxBooks INT;
    DECLARE v_CurrentBooks INT;
    DECLARE v_NewBooks INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN ROLLBACK; RESIGNAL; END;

    SELECT MaVaiTro INTO v_VaiTro FROM NguoiDung WHERE MaNguoiDung = p_MaThuThu;
    IF v_VaiTro NOT IN (1, 2) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người dùng không có quyền tạo phiếu mượn.';
    END IF;

    IF fn_CheckCardStatus(p_MaSV) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Thẻ sinh viên bị khóa hoặc đã hết hạn.';
    END IF;

    SELECT CAST(GiaTri AS UNSIGNED) INTO v_MaxBooks FROM CauHinh WHERE TenCauHinh = 'SO_SACH_TOI_DA';
    SET v_CurrentBooks = fn_CountBorrowedBooks(p_MaSV);
    SET v_NewBooks = JSON_LENGTH(p_JsonSach);
    IF (v_CurrentBooks + v_NewBooks) > v_MaxBooks THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sinh viên đã mượn vượt quá số lượng sách tối đa cho phép.';
    END IF;

    START TRANSACTION;
    
    -- Sửa lỗi ERROR 3569: Chỉ áp dụng FOR UPDATE lên bảng Sach (alias 's'), không khóa bảng ảo JSON_TABLE
    SELECT COUNT(*) INTO v_SachHet FROM Sach s
    JOIN JSON_TABLE(p_JsonSach, '$[*]' COLUMNS(MaSach INT PATH '$')) AS jt ON s.MaSach = jt.MaSach
    WHERE s.SoLuongTon < 1 FOR UPDATE OF s;
    
    IF v_SachHet > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Một hoặc nhiều sách trong danh sách đã hết tồn kho.';
    END IF;

    INSERT INTO PhieuMuon (MaSV, MaThuThu, NgayMuon) VALUES (p_MaSV, p_MaThuThu, CURDATE());
    SET v_MaPhieuMuon = LAST_INSERT_ID();

    INSERT INTO ChiTietPhieuMuon (MaPhieuMuon, MaSach, NgayHenTra)
    SELECT v_MaPhieuMuon, jt.MaSach, p_NgayHenTra
    FROM JSON_TABLE(p_JsonSach, '$[*]' COLUMNS(MaSach INT PATH '$')) AS jt;

    COMMIT;
END //

CREATE PROCEDURE sp_ReturnBook(IN p_MaCTPM INT)
BEGIN
    DECLARE v_TienPhat INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN ROLLBACK; RESIGNAL; END;
    
    SET v_TienPhat = fn_CalculateFine(p_MaCTPM);
    
    START TRANSACTION;
    UPDATE ChiTietPhieuMuon 
    SET NgayTraThucTe = CURDATE(), TienPhat = v_TienPhat, TrangThai = 0 
    WHERE MaCTPM = p_MaCTPM AND TrangThai = 1;
    
    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Thao tác thất bại: Phiếu không tồn tại hoặc sách này đã được trả.';
    END IF;
    
    COMMIT;
END //

CREATE PROCEDURE sp_GetBorrowHistory(IN p_MaSV VARCHAR(10))
BEGIN
    SELECT pm.MaPhieuMuon, pm.NgayMuon, s.TenSach, ct.NgayHenTra, ct.NgayTraThucTe, ct.TienPhat, ct.TrangThai
    FROM PhieuMuon pm
    JOIN ChiTietPhieuMuon ct ON pm.MaPhieuMuon = ct.MaPhieuMuon
    JOIN Sach s ON ct.MaSach = s.MaSach
    WHERE pm.MaSV = p_MaSV
    ORDER BY pm.NgayMuon DESC;
END //

-- ==============================================
-- 4. CURSORS (Bọc trong Stored Procedures)
-- ==============================================

CREATE PROCEDURE sp_LockOverdueAccounts()
BEGIN
    DECLARE v_MaSV VARCHAR(10);
    DECLARE v_NguongKhoa INT;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE cur_LockOverdueAccounts CURSOR FOR 
        SELECT DISTINCT pm.MaSV 
        FROM ChiTietPhieuMuon ct
        JOIN PhieuMuon pm ON ct.MaPhieuMuon = pm.MaPhieuMuon
        WHERE ct.TrangThai = 1 AND DATEDIFF(CURDATE(), ct.NgayHenTra) > v_NguongKhoa;
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    SELECT CAST(GiaTri AS UNSIGNED) INTO v_NguongKhoa FROM CauHinh WHERE TenCauHinh = 'NGUONG_KHOA_THE';
    
    OPEN cur_LockOverdueAccounts;
    read_loop: LOOP
        FETCH cur_LockOverdueAccounts INTO v_MaSV;
        IF done THEN LEAVE read_loop; END IF;
        
        UPDATE SinhVien SET TrangThaiThe = 0 WHERE MaSV = v_MaSV;
    END LOOP;
    CLOSE cur_LockOverdueAccounts;
END //

CREATE PROCEDURE sp_SendReminder()
BEGIN
    DECLARE v_MaSV VARCHAR(10);
    DECLARE v_MaCTPM INT;
    DECLARE v_TenSach VARCHAR(255);
    DECLARE v_NgayHenTra DATE;
    DECLARE v_SoNgayNhac INT;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE cur_SendReminder CURSOR FOR 
        SELECT pm.MaSV, ct.MaCTPM, s.TenSach, ct.NgayHenTra
        FROM ChiTietPhieuMuon ct
        JOIN PhieuMuon pm ON ct.MaPhieuMuon = pm.MaPhieuMuon
        JOIN Sach s ON ct.MaSach = s.MaSach
        LEFT JOIN ThongBao tb ON tb.MaCTPM = ct.MaCTPM
        WHERE ct.TrangThai = 1 
          AND DATEDIFF(ct.NgayHenTra, CURDATE()) <= v_SoNgayNhac
          AND DATEDIFF(ct.NgayHenTra, CURDATE()) >= 0
          AND tb.MaThongBao IS NULL;
          
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    SELECT CAST(GiaTri AS UNSIGNED) INTO v_SoNgayNhac FROM CauHinh WHERE TenCauHinh = 'SO_NGAY_NHAC_TRUOC';

    OPEN cur_SendReminder;
    read_loop: LOOP
        FETCH cur_SendReminder INTO v_MaSV, v_MaCTPM, v_TenSach, v_NgayHenTra;
        IF done THEN LEAVE read_loop; END IF;
        
        INSERT INTO ThongBao (MaSV, MaCTPM, NoiDung)
        VALUES (v_MaSV, v_MaCTPM, CONCAT('Sách "', v_TenSach, '" sẽ đến hạn trả vào ngày ', DATE_FORMAT(v_NgayHenTra, '%d/%m/%Y')));
    END LOOP;
    CLOSE cur_SendReminder;
END //

DELIMITER ;