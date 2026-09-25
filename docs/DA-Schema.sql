DROP DATABASE IF EXISTS QuanLyThuVien;
CREATE DATABASE QuanLyThuVien
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE QuanLyThuVien;

SET NAMES utf8mb4;

CREATE TABLE CauHinh (
    TenCauHinh VARCHAR(50)  NOT NULL,
    GiaTri     VARCHAR(100) NOT NULL,
    MoTa       VARCHAR(255) NULL,
    PRIMARY KEY (TenCauHinh)
);

CREATE TABLE VaiTro (
    MaVaiTro  INT         NOT NULL AUTO_INCREMENT,
    TenVaiTro VARCHAR(50) NOT NULL,
    PRIMARY KEY (MaVaiTro),
    UNIQUE KEY uq_vaitro_ten (TenVaiTro)
);

CREATE TABLE NguoiDung (
    MaNguoiDung INT          NOT NULL AUTO_INCREMENT,
    TenDangNhap VARCHAR(50)  NOT NULL,
    MatKhau     CHAR(64)     NOT NULL,
    HoTen       VARCHAR(100) NOT NULL,
    Email       VARCHAR(100) NULL,
    MaVaiTro    INT          NOT NULL,
    TrangThai   BOOLEAN      NOT NULL DEFAULT 1 COMMENT '1: Hoạt động, 0: Khóa',
    NgayTao     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MaNguoiDung),
    UNIQUE KEY uq_nguoidung_tendangnhap (TenDangNhap),
    UNIQUE KEY uq_nguoidung_email (Email),
    CONSTRAINT fk_nguoidung_vaitro FOREIGN KEY (MaVaiTro) REFERENCES VaiTro (MaVaiTro)
);

CREATE TABLE SinhVien (
    MaSV          VARCHAR(10)  NOT NULL,
    MaNguoiDung   INT          NOT NULL,
    Lop           VARCHAR(20)  NULL,
    Khoa          VARCHAR(100) NULL,
    NgayCapThe    DATE         NOT NULL,
    NgayHetHanThe DATE         NOT NULL,
    TrangThaiThe  BOOLEAN      NOT NULL DEFAULT 1 COMMENT '1: ACTIVE, 0: LOCKED',
    PRIMARY KEY (MaSV),
    UNIQUE KEY uq_sinhvien_nguoidung (MaNguoiDung),
    CONSTRAINT fk_sinhvien_nguoidung FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung (MaNguoiDung)
);

CREATE TABLE TacGia (
    MaTacGia  INT          NOT NULL AUTO_INCREMENT,
    TenTacGia VARCHAR(100) NOT NULL,
    PRIMARY KEY (MaTacGia)
);

CREATE TABLE TheLoai (
    MaTheLoai  INT          NOT NULL AUTO_INCREMENT,
    TenTheLoai VARCHAR(100) NOT NULL,
    PRIMARY KEY (MaTheLoai),
    UNIQUE KEY uq_theloai_ten (TenTheLoai)
);

CREATE TABLE Sach (
    MaSach       INT          NOT NULL AUTO_INCREMENT,
    ISBN         VARCHAR(20)  NOT NULL,
    TenSach      VARCHAR(255) NOT NULL,
    MaTacGia     INT          NOT NULL,
    MaTheLoai    INT          NOT NULL,
    NhaXuatBan   VARCHAR(100) NULL,
    NamXuatBan   INT          NULL,
    SoLuongTong  INT          NOT NULL DEFAULT 0,
    SoLuongTon   INT          NOT NULL DEFAULT 0,
    NgayTao      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (MaSach),
    UNIQUE KEY uq_sach_isbn (ISBN),
    CONSTRAINT fk_sach_tacgia  FOREIGN KEY (MaTacGia)  REFERENCES TacGia (MaTacGia),
    CONSTRAINT fk_sach_theloai FOREIGN KEY (MaTheLoai) REFERENCES TheLoai (MaTheLoai)
);

CREATE TABLE PhieuMuon (
    MaPhieuMuon INT          NOT NULL AUTO_INCREMENT,
    MaSV        VARCHAR(10)  NOT NULL,
    MaThuThu    INT          NOT NULL,
    NgayMuon    DATE         NOT NULL,
    GhiChu      VARCHAR(255) NULL,
    PRIMARY KEY (MaPhieuMuon),
    CONSTRAINT fk_phieumuon_sv     FOREIGN KEY (MaSV)     REFERENCES SinhVien (MaSV),
    CONSTRAINT fk_phieumuon_thuthu FOREIGN KEY (MaThuThu) REFERENCES NguoiDung (MaNguoiDung)
);

CREATE TABLE ChiTietPhieuMuon (
    MaCTPM        INT          NOT NULL AUTO_INCREMENT,
    MaPhieuMuon   INT          NOT NULL,
    MaSach        INT          NOT NULL,
    NgayHenTra    DATE         NOT NULL,
    NgayTraThucTe DATE         NULL,
    TienPhat      INT          NOT NULL DEFAULT 0,
    TrangThai     BOOLEAN      NOT NULL DEFAULT 1 COMMENT '1: Đang mượn, 0: Đã trả',
    PRIMARY KEY (MaCTPM),
    CONSTRAINT fk_ctpm_phieumuon FOREIGN KEY (MaPhieuMuon) REFERENCES PhieuMuon (MaPhieuMuon),
    CONSTRAINT fk_ctpm_sach      FOREIGN KEY (MaSach)      REFERENCES Sach (MaSach)
);

CREATE TABLE Log_HeThong (
    MaLog         BIGINT       NOT NULL AUTO_INCREMENT,
    TenBang       VARCHAR(50)  NOT NULL,
    HanhDong      BOOLEAN      NOT NULL COMMENT '0: UPDATE, 1: DELETE',
    MaBanGhi      INT          NOT NULL,
    NguoiThucHien VARCHAR(100) NULL,
    ThoiGian      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    GiaTriCu      JSON         NULL,
    GiaTriMoi     JSON         NULL,
    PRIMARY KEY (MaLog)
);

CREATE TABLE ThongBao (
    MaThongBao INT          NOT NULL AUTO_INCREMENT,
    MaSV       VARCHAR(10)  NOT NULL,
    MaCTPM     INT          NULL,
    NoiDung    VARCHAR(500) NOT NULL,
    NgayTao    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    DaDoc      BOOLEAN      NOT NULL DEFAULT 0 COMMENT '1: Đã đọc, 0: Chưa đọc',
    PRIMARY KEY (MaThongBao),
    CONSTRAINT fk_thongbao_sv   FOREIGN KEY (MaSV)   REFERENCES SinhVien (MaSV),
    CONSTRAINT fk_thongbao_ctpm FOREIGN KEY (MaCTPM) REFERENCES ChiTietPhieuMuon (MaCTPM)
);

CREATE VIEW vw_SachDangMuon AS
SELECT ct.MaCTPM,
       pm.MaPhieuMuon,
       sv.MaSV,
       nd.HoTen        AS TenSinhVien,
       s.MaSach,
       s.ISBN,
       s.TenSach,
       pm.NgayMuon,
       ct.NgayHenTra,
       GREATEST(DATEDIFF(CURDATE(), ct.NgayHenTra), 0) AS SoNgayQuaHan
FROM ChiTietPhieuMuon ct
JOIN PhieuMuon pm ON pm.MaPhieuMuon = ct.MaPhieuMuon
JOIN SinhVien  sv ON sv.MaSV        = pm.MaSV
JOIN NguoiDung nd ON nd.MaNguoiDung = sv.MaNguoiDung
JOIN Sach      s  ON s.MaSach       = ct.MaSach
WHERE ct.TrangThai = 1;

CREATE VIEW vw_SachQuaHan AS
SELECT *
FROM vw_SachDangMuon
WHERE SoNgayQuaHan > 0;