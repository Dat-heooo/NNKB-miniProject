-- ========================================================
-- Script khởi tạo cơ sở dữ liệu và mock data
-- Database: my_database
-- Hệ quản trị: PostgreSQL 16
-- ========================================================

-- Xóa bảng cũ nếu tồn tại (theo thứ tự khóa ngoại)
DROP TABLE IF EXISTS sinhvien CASCADE;
DROP TABLE IF EXISTS lophoc CASCADE;

-- Tạo bảng lophoc
CREATE TABLE lophoc (
    id SERIAL PRIMARY KEY,
    ma_lop VARCHAR(20) UNIQUE NOT NULL,
    ten_lop VARCHAR(100) NOT NULL,
    khoa VARCHAR(100) NOT NULL,
    nien_khoa VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tạo bảng sinhvien (khóa ngoại tham chiếu tới lophoc.id)
CREATE TABLE sinhvien (
    id SERIAL PRIMARY KEY,
    ma_sv VARCHAR(20) UNIQUE NOT NULL,
    ho_ten VARCHAR(100) NOT NULL,
    ngay_sinh DATE NOT NULL,
    gioi_tinh VARCHAR(10) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    so_dien_thoai VARCHAR(20),
    dia_chi VARCHAR(255),
    lop_id INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sinhvien_lophoc FOREIGN KEY (lop_id) REFERENCES lophoc(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Tạo chỉ mục (index) tối ưu truy vấn
CREATE INDEX idx_sinhvien_lop_id ON sinhvien(lop_id);
CREATE INDEX idx_lophoc_ma_lop ON lophoc(ma_lop);
CREATE INDEX idx_sinhvien_ma_sv ON sinhvien(ma_sv);

-- ========================================================
-- CHÈN 50 DÒNG MOCK DATA CHO BẢNG LOPHOC
-- ========================================================
INSERT INTO lophoc (id, ma_lop, ten_lop, khoa, nien_khoa) VALUES
(1, 'CNTT-K21A', 'Công nghệ Thông tin 1 - Khóa 21', 'Công nghệ Thông tin', '2021-2025'),
(2, 'CNTT-K21B', 'Công nghệ Thông tin 2 - Khóa 21', 'Công nghệ Thông tin', '2021-2025'),
(3, 'CNTT-K21C', 'Công nghệ Thông tin 3 - Khóa 21', 'Công nghệ Thông tin', '2021-2025'),
(4, 'CNTT-K22A', 'Công nghệ Thông tin 1 - Khóa 22', 'Công nghệ Thông tin', '2022-2026'),
(5, 'CNTT-K22B', 'Công nghệ Thông tin 2 - Khóa 22', 'Công nghệ Thông tin', '2022-2026'),
(6, 'CNTT-K22C', 'Công nghệ Thông tin 3 - Khóa 22', 'Công nghệ Thông tin', '2022-2026'),
(7, 'CNTT-K23A', 'Công nghệ Thông tin 1 - Khóa 23', 'Công nghệ Thông tin', '2023-2027'),
(8, 'CNTT-K23B', 'Công nghệ Thông tin 2 - Khóa 23', 'Công nghệ Thông tin', '2023-2027'),
(9, 'CNTT-K23C', 'Công nghệ Thông tin 3 - Khóa 23', 'Công nghệ Thông tin', '2023-2027'),
(10, 'CNTT-K24A', 'Công nghệ Thông tin 1 - Khóa 24', 'Công nghệ Thông tin', '2024-2028'),
(11, 'CNTT-K24B', 'Công nghệ Thông tin 2 - Khóa 24', 'Công nghệ Thông tin', '2024-2028'),
(12, 'CNTT-K24C', 'Công nghệ Thông tin 3 - Khóa 24', 'Công nghệ Thông tin', '2024-2028'),
(13, 'KTPM-K21A', 'Kỹ thuật Phần mềm 1 - Khóa 21', 'Kỹ thuật Phần mềm', '2021-2025'),
(14, 'KTPM-K21B', 'Kỹ thuật Phần mềm 2 - Khóa 21', 'Kỹ thuật Phần mềm', '2021-2025'),
(15, 'KTPM-K22A', 'Kỹ thuật Phần mềm 1 - Khóa 22', 'Kỹ thuật Phần mềm', '2022-2026'),
(16, 'KTPM-K22B', 'Kỹ thuật Phần mềm 2 - Khóa 22', 'Kỹ thuật Phần mềm', '2022-2026'),
(17, 'KTPM-K23A', 'Kỹ thuật Phần mềm 1 - Khóa 23', 'Kỹ thuật Phần mềm', '2023-2027'),
(18, 'KTPM-K23B', 'Kỹ thuật Phần mềm 2 - Khóa 23', 'Kỹ thuật Phần mềm', '2023-2027'),
(19, 'KTPM-K24A', 'Kỹ thuật Phần mềm 1 - Khóa 24', 'Kỹ thuật Phần mềm', '2024-2028'),
(20, 'KTPM-K24B', 'Kỹ thuật Phần mềm 2 - Khóa 24', 'Kỹ thuật Phần mềm', '2024-2028'),
(21, 'KHMT-K21A', 'Khoa học Máy tính 1 - Khóa 21', 'Khoa học Máy tính', '2021-2025'),
(22, 'KHMT-K22A', 'Khoa học Máy tính 1 - Khóa 22', 'Khoa học Máy tính', '2022-2026'),
(23, 'KHMT-K22B', 'Khoa học Máy tính 2 - Khóa 22', 'Khoa học Máy tính', '2022-2026'),
(24, 'KHMT-K23A', 'Khoa học Máy tính 1 - Khóa 23', 'Khoa học Máy tính', '2023-2027'),
(25, 'KHMT-K23B', 'Khoa học Máy tính 2 - Khóa 23', 'Khoa học Máy tính', '2023-2027'),
(26, 'KHMT-K24A', 'Khoa học Máy tính 1 - Khóa 24', 'Khoa học Máy tính', '2024-2028'),
(27, 'ATTT-K21A', 'An toàn Thông tin 1 - Khóa 21', 'An toàn Thông tin', '2021-2025'),
(28, 'ATTT-K22A', 'An toàn Thông tin 1 - Khóa 22', 'An toàn Thông tin', '2022-2026'),
(29, 'ATTT-K22B', 'An toàn Thông tin 2 - Khóa 22', 'An toàn Thông tin', '2022-2026'),
(30, 'ATTT-K23A', 'An toàn Thông tin 1 - Khóa 23', 'An toàn Thông tin', '2023-2027'),
(31, 'ATTT-K23B', 'An toàn Thông tin 2 - Khóa 23', 'An toàn Thông tin', '2023-2027'),
(32, 'ATTT-K24A', 'An toàn Thông tin 1 - Khóa 24', 'An toàn Thông tin', '2024-2028'),
(33, 'HTTT-K21A', 'Hệ thống Thông tin 1 - Khóa 21', 'Hệ thống Thông tin', '2021-2025'),
(34, 'HTTT-K22A', 'Hệ thống Thông tin 1 - Khóa 22', 'Hệ thống Thông tin', '2022-2026'),
(35, 'HTTT-K22B', 'Hệ thống Thông tin 2 - Khóa 22', 'Hệ thống Thông tin', '2022-2026'),
(36, 'HTTT-K23A', 'Hệ thống Thông tin 1 - Khóa 23', 'Hệ thống Thông tin', '2023-2027'),
(37, 'HTTT-K23B', 'Hệ thống Thông tin 2 - Khóa 23', 'Hệ thống Thông tin', '2023-2027'),
(38, 'HTTT-K24A', 'Hệ thống Thông tin 1 - Khóa 24', 'Hệ thống Thông tin', '2024-2028'),
(39, 'DTVT-K21A', 'Điện tử Viễn thông 1 - Khóa 21', 'Điện tử Viễn thông', '2021-2025'),
(40, 'DTVT-K22A', 'Điện tử Viễn thông 1 - Khóa 22', 'Điện tử Viễn thông', '2022-2026'),
(41, 'DTVT-K23A', 'Điện tử Viễn thông 1 - Khóa 23', 'Điện tử Viễn thông', '2023-2027'),
(42, 'DTVT-K24A', 'Điện tử Viễn thông 1 - Khóa 24', 'Điện tử Viễn thông', '2024-2028'),
(43, 'QTKD-K21A', 'Quản trị Kinh doanh 1 - Khóa 21', 'Quản trị Kinh doanh', '2021-2025'),
(44, 'QTKD-K22A', 'Quản trị Kinh doanh 1 - Khóa 22', 'Quản trị Kinh doanh', '2022-2026'),
(45, 'QTKD-K23A', 'Quản trị Kinh doanh 1 - Khóa 23', 'Quản trị Kinh doanh', '2023-2027'),
(46, 'QTKD-K24A', 'Quản trị Kinh doanh 1 - Khóa 24', 'Quản trị Kinh doanh', '2024-2028'),
(47, 'TMDT-K21A', 'Thương mại Điện tử 1 - Khóa 21', 'Thương mại Điện tử', '2021-2025'),
(48, 'TMDT-K22A', 'Thương mại Điện tử 1 - Khóa 22', 'Thương mại Điện tử', '2022-2026'),
(49, 'TMDT-K23A', 'Thương mại Điện tử 1 - Khóa 23', 'Thương mại Điện tử', '2023-2027'),
(50, 'TMDT-K24A', 'Thương mại Điện tử 1 - Khóa 24', 'Thương mại Điện tử', '2024-2028');

-- Cập nhật sequence id cho lophoc
SELECT setval('lophoc_id_seq', (SELECT MAX(id) FROM lophoc));

-- ========================================================
-- CHÈN 50 DÒNG MOCK DATA CHO BẢNG SINHVIEN
-- ========================================================
INSERT INTO sinhvien (id, ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, so_dien_thoai, dia_chi, lop_id) VALUES
(1, 'SV2023001', 'Nguyễn Văn An', '2003-03-15', 'Nam', 'sinhvien001@student.university.edu.vn', '09100137', 'Số 12 Chùa Bộc, Đống Đa, Hà Nội', 1),
(2, 'SV2023002', 'Trần Thị Bích', '2003-05-22', 'Nữ', 'sinhvien002@student.university.edu.vn', '09100274', 'Số 45 Cầu Giấy, Cầu Giấy, Hà Nội', 2),
(3, 'SV2023003', 'Lê Hoàng Cường', '2002-11-10', 'Nam', 'sinhvien003@student.university.edu.vn', '09100411', 'Số 88 Nguyễn Trãi, Thanh Xuân, Hà Nội', 3),
(4, 'SV2023004', 'Phạm Diệu Linh', '2003-08-19', 'Nữ', 'sinhvien004@student.university.edu.vn', '09100548', 'Số 102 Giải Phóng, Hai Bà Trưng, Hà Nội', 4),
(5, 'SV2023005', 'Vũ Minh Đức', '2002-04-05', 'Nam', 'sinhvien005@student.university.edu.vn', '09100685', 'Số 76 Kim Mã, Ba Đình, Hà Nội', 5),
(6, 'SV2023006', 'Hoàng Gia Hân', '2003-12-01', 'Nữ', 'sinhvien006@student.university.edu.vn', '09100822', 'Số 234 Hoàng Hoa Thám, Tây Hồ, Hà Nội', 6),
(7, 'SV2023007', 'Đỗ Tuấn Kiệt', '2002-09-14', 'Nam', 'sinhvien007@student.university.edu.vn', '09100959', 'Số 56 Nguyễn Văn Cừ, Long Biên, Hà Nội', 7),
(8, 'SV2023008', 'Bùi Thị Mai Lan', '2003-07-28', 'Nữ', 'sinhvien008@student.university.edu.vn', '09101096', 'Số 15 Quang Trung, Hà Đông, Hà Nội', 8),
(9, 'SV2023009', 'Đặng Quốc Nam', '2002-02-18', 'Nam', 'sinhvien009@student.university.edu.vn', '09101233', 'Số 91 Đại Cồ Việt, Hai Bà Trưng, Hà Nội', 9),
(10, 'SV2023010', 'Ngô Bảo Ngọc', '2004-01-25', 'Nữ', 'sinhvien010@student.university.edu.vn', '09101370', 'Số 33 Trần Phú, Hà Đông, Hà Nội', 10),
(11, 'SV2023011', 'Dương Hữu Phúc', '2003-06-30', 'Nam', 'sinhvien011@student.university.edu.vn', '09101507', 'Số 78 Láng Hạ, Đống Đa, Hà Nội', 11),
(12, 'SV2023012', 'Lý Thùy Quỳnh', '2003-10-12', 'Nữ', 'sinhvien012@student.university.edu.vn', '09101644', 'Số 112 Xã Đàn, Đống Đa, Hà Nội', 12),
(13, 'SV2023013', 'Đoàn Nhật Sang', '2002-08-03', 'Nam', 'sinhvien013@student.university.edu.vn', '09101781', 'Số 67 Tây Sơn, Đống Đa, Hà Nội', 13),
(14, 'SV2023014', 'Võ Phương Thảo', '2003-03-27', 'Nữ', 'sinhvien014@student.university.edu.vn', '09101918', 'Số 205 Xuân Thủy, Cầu Giấy, Hà Nội', 14),
(15, 'SV2023015', 'Phan Minh Trí', '2002-12-15', 'Nam', 'sinhvien015@student.university.edu.vn', '09102055', 'Số 41 Phạm Văn Đồng, Bắc Từ Liêm, Hà Nội', 15),
(16, 'SV2023016', 'Hồ Khánh Vy', '2004-05-19', 'Nữ', 'sinhvien016@student.university.edu.vn', '09102192', 'Số 89 Hoàng Quốc Việt, Cầu Giấy, Hà Nội', 16),
(17, 'SV2023017', 'Trịnh Thế Vũ', '2003-09-08', 'Nam', 'sinhvien017@student.university.edu.vn', '09102329', 'Số 14 Lê Văn Lương, Thanh Xuân, Hà Nội', 17),
(18, 'SV2023018', 'Mai Hải Yến', '2003-02-14', 'Nữ', 'sinhvien018@student.university.edu.vn', '09102466', 'Số 62 Tôn Đức Thắng, Đống Đa, Hà Nội', 18),
(19, 'SV2023019', 'Cao Đình Bảo', '2002-07-21', 'Nam', 'sinhvien019@student.university.edu.vn', '09102603', 'Số 180 Trường Chinh, Đống Đa, Hà Nội', 19),
(20, 'SV2023020', 'Lâm Ánh Dương', '2004-04-02', 'Nữ', 'sinhvien020@student.university.edu.vn', '09102740', 'Số 53 Bạch Mai, Hai Bà Trưng, Hà Nội', 20),
(21, 'SV2023021', 'Đinh Tiến Đạt', '2003-11-23', 'Nam', 'sinhvien021@student.university.edu.vn', '09102877', 'Số 29 Võ Chí Công, Tây Hồ, Hà Nội', 21),
(22, 'SV2023022', 'Tạ Thúy Hằng', '2003-01-11', 'Nữ', 'sinhvien022@student.university.edu.vn', '09103014', 'Số 84 Định Công, Hoàng Mai, Hà Nội', 22),
(23, 'SV2023023', 'Lương Quang Huy', '2002-10-09', 'Nam', 'sinhvien023@student.university.edu.vn', '09103151', 'Số 175 Tây Sơn, Đống Đa, Hà Nội', 23),
(24, 'SV2023024', 'Châu Mỹ Kim', '2004-09-17', 'Nữ', 'sinhvien024@student.university.edu.vn', '09103288', 'Số 310 Minh Khai, Hai Bà Trưng, Hà Nội', 24),
(25, 'SV2023025', 'Khổng Minh Long', '2003-04-18', 'Nam', 'sinhvien025@student.university.edu.vn', '09103425', 'Số 95 Nguyễn Khang, Cầu Giấy, Hà Nội', 25),
(26, 'SV2023026', 'Hà Kiều My', '2003-08-05', 'Nữ', 'sinhvien026@student.university.edu.vn', '09103562', 'Số 48 Lạc Long Quân, Cầu Giấy, Hà Nội', 26),
(27, 'SV2023027', 'Tô Thành Nam', '2002-06-13', 'Nam', 'sinhvien027@student.university.edu.vn', '09103699', 'Số 130 Đội Cấn, Ba Đình, Hà Nội', 27),
(28, 'SV2023028', 'Vương Thanh Nga', '2003-12-29', 'Nữ', 'sinhvien028@student.university.edu.vn', '09103836', 'Số 72 Trần Duy Hưng, Cầu Giấy, Hà Nội', 28),
(29, 'SV2023029', 'Quách Hùng Phong', '2002-05-04', 'Nam', 'sinhvien029@student.university.edu.vn', '09103973', 'Số 63 Thái Hà, Đống Đa, Hà Nội', 29),
(30, 'SV2023030', 'Nghiêm Thùy Trang', '2004-03-21', 'Nữ', 'sinhvien030@student.university.edu.vn', '09104110', 'Số 122 Khâm Thiên, Đống Đa, Hà Nội', 30),
(31, 'SV2023031', 'Lưu Trọng Tấn', '2003-07-07', 'Nam', 'sinhvien031@student.university.edu.vn', '09104247', 'Số 19 Lê Thánh Tông, Hoàn Kiếm, Hà Nội', 31),
(32, 'SV2023032', 'Thái Ngọc Ánh', '2004-02-16', 'Nữ', 'sinhvien032@student.university.edu.vn', '09104384', 'Số 203 Bà Triệu, Hai Bà Trưng, Hà Nội', 32),
(33, 'SV2023033', 'Trương Văn Chung', '2002-01-20', 'Nam', 'sinhvien033@student.university.edu.vn', '09104521', 'Số 87 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội', 33),
(34, 'SV2023034', 'Tạ Minh Duyên', '2003-10-31', 'Nữ', 'sinhvien034@student.university.edu.vn', '09104658', 'Số 40 Phố Huế, Hoàn Kiếm, Hà Nội', 34),
(35, 'SV2023035', 'Bạch Quang Hải', '2002-11-26', 'Nam', 'sinhvien035@student.university.edu.vn', '09104795', 'Số 115 Hàng Bông, Hoàn Kiếm, Hà Nội', 35),
(36, 'SV2023036', 'Đoàn Thu Hương', '2003-06-14', 'Nữ', 'sinhvien036@student.university.edu.vn', '09104932', 'Số 58 Quán Thánh, Ba Đình, Hà Nội', 36),
(37, 'SV2023037', 'Giáp Văn Khang', '2002-03-09', 'Nam', 'sinhvien037@student.university.edu.vn', '09105069', 'Số 27 Thụy Khuê, Tây Hồ, Hà Nội', 37),
(38, 'SV2023038', 'Kim Tuyết Mai', '2004-08-24', 'Nữ', 'sinhvien038@student.university.edu.vn', '09105206', 'Số 164 Kim Ngưu, Hai Bà Trưng, Hà Nội', 38),
(39, 'SV2023039', 'Mạc Đăng Nguyên', '2003-05-11', 'Nam', 'sinhvien039@student.university.edu.vn', '09105343', 'Số 83 Giảng Võ, Ba Đình, Hà Nội', 39),
(40, 'SV2023040', 'Phùng Bích Phượng', '2003-11-04', 'Nữ', 'sinhvien040@student.university.edu.vn', '09105480', 'Số 152 Lê Duẩn, Đống Đa, Hà Nội', 40),
(41, 'SV2023041', 'Sầm Văn Quân', '2002-09-27', 'Nam', 'sinhvien041@student.university.edu.vn', '09105617', 'Số 36 Nguyễn Chí Thanh, Đống Đa, Hà Nội', 41),
(42, 'SV2023042', 'Thân Thị Sen', '2004-07-15', 'Nữ', 'sinhvien042@student.university.edu.vn', '09105754', 'Số 98 Hoàng Văn Thái, Thanh Xuân, Hà Nội', 42),
(43, 'SV2023043', 'Uông Thái Sơn', '2002-12-08', 'Nam', 'sinhvien043@student.university.edu.vn', '09105891', 'Số 69 Vương Thừa Vũ, Thanh Xuân, Hà Nội', 43),
(44, 'SV2023044', 'Vi Hồng Thắm', '2003-04-29', 'Nữ', 'sinhvien044@student.university.edu.vn', '09106028', 'Số 141 Nguyễn Tuân, Thanh Xuân, Hà Nội', 44),
(45, 'SV2023045', 'Xa Văn Thắng', '2003-01-03', 'Nam', 'sinhvien045@student.university.edu.vn', '09106165', 'Số 52 Vũ Trọng Phụng, Thanh Xuân, Hà Nội', 45),
(46, 'SV2023046', 'Yên Mỹ Uyên', '2004-10-18', 'Nữ', 'sinhvien046@student.university.edu.vn', '09106302', 'Số 220 Khuất Duy Tiến, Thanh Xuân, Hà Nội', 46),
(47, 'SV2023047', 'Ân Khắc Việt', '2002-08-22', 'Nam', 'sinhvien047@student.university.edu.vn', '09106439', 'Số 31 Lê Văn Thiêm, Thanh Xuân, Hà Nội', 47),
(48, 'SV2023048', 'Chu Bảo Xuyên', '2003-09-19', 'Nữ', 'sinhvien048@student.university.edu.vn', '09106576', 'Số 64 Nguyễn Thị Định, Cầu Giấy, Hà Nội', 48),
(49, 'SV2023049', 'La Vĩnh Xương', '2002-06-06', 'Nam', 'sinhvien049@student.university.edu.vn', '09106713', 'Số 117 Trung Kính, Cầu Giấy, Hà Nội', 49),
(50, 'SV2023050', 'Ông Cẩm Nhung', '2004-12-12', 'Nữ', 'sinhvien050@student.university.edu.vn', '09106850', 'Số 208 Yên Hòa, Cầu Giấy, Hà Nội', 50);

-- Cập nhật sequence id cho sinhvien
SELECT setval('sinhvien_id_seq', (SELECT MAX(id) FROM sinhvien));
