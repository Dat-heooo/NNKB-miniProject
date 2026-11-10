const db = require('../models');
const dbLogger = require('../events/dbLogger.emitter');
const SinhVien = db.SinhVien;
const LopHoc = db.LopHoc;
const { Op } = db.Sequelize;

// Tạo mới Sinh viên
exports.create = async (req, res) => {
  try {
    const { ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, so_dien_thoai, dia_chi, lop_id } = req.body;

    if (!ma_sv || !ho_ten || !ngay_sinh || !gioi_tinh || !email || !lop_id) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, lop_id'
      });
    }

    // Kiểm tra lớp học tồn tại
    const lop = await LopHoc.findByPk(lop_id);
    if (!lop) {
      return res.status(404).json({
        success: false,
        message: `Lớp học với lop_id = ${lop_id} không tồn tại!`
      });
    }

    // Kiểm tra trùng mã sinh viên hoặc email
    const existing = await SinhVien.findOne({
      where: {
        [Op.or]: [{ ma_sv }, { email }]
      }
    });

    if (existing) {
      const duplicateField = existing.ma_sv === ma_sv ? 'Mã sinh viên' : 'Email';
      return res.status(409).json({
        success: false,
        message: `${duplicateField} đã được sử dụng!`
      });
    }

    const newSV = await SinhVien.create({
      ma_sv,
      ho_ten,
      ngay_sinh,
      gioi_tinh,
      email,
      so_dien_thoai,
      dia_chi,
      lop_id
    });

    // Lấy lại kèm thông tin lớp
    const result = await SinhVien.findByPk(newSV.id, {
      include: [{ model: LopHoc, as: 'lophoc', attributes: ['id', 'ma_lop', 'ten_lop', 'khoa', 'nien_khoa'] }]
    });

    // Phát sự kiện CREATE
    dbLogger.logOperation({
      requestId: req.requestId,
      action: 'CREATE',
      table: 'sinhvien',
      data: { id: newSV.id, ma_sv: newSV.ma_sv, ho_ten: newSV.ho_ten },
      message: `Tạo mới sinh viên id=${newSV.id}, mã=${newSV.ma_sv}, tên='${newSV.ho_ten}'`
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo sinh viên thành công!',
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã xảy ra lỗi khi tạo sinh viên.'
    });
  }
};

// Lấy danh sách tất cả Sinh viên (có tìm kiếm, lọc theo lớp, giới tính, phân trang)
exports.findAll = async (req, res) => {
  try {
    const { search, lop_id, gioi_tinh, page, limit } = req.query;
    const condition = {};

    if (search) {
      condition[Op.or] = [
        { ma_sv: { [Op.iLike]: `%${search}%` } },
        { ho_ten: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { so_dien_thoai: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (lop_id) {
      condition.lop_id = lop_id;
    }

    if (gioi_tinh) {
      condition.gioi_tinh = gioi_tinh;
    }

    const options = {
      where: condition,
      include: [
        {
          model: LopHoc,
          as: 'lophoc',
          attributes: ['id', 'ma_lop', 'ten_lop', 'khoa', 'nien_khoa']
        }
      ],
      order: [['id', 'ASC']]
    };

    let result;
    if (limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10);
      options.offset = (pageNum - 1) * limitNum;
      options.limit = limitNum;

      const { count, rows } = await SinhVien.findAndCountAll(options);
      result = {
        totalItems: count,
        totalPages: Math.ceil(count / limitNum),
        currentPage: pageNum,
        data: rows
      };
    } else {
      const students = await SinhVien.findAll(options);
      result = {
        totalItems: students.length,
        data: students
      };
    }

    // Phát sự kiện READ_ALL
    dbLogger.logOperation({
      requestId: req.requestId,
      action: 'READ_ALL',
      table: 'sinhvien',
      message: `Đọc danh sách sinh viên: ${result.totalItems} kết quả`
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã xảy ra lỗi khi lấy danh sách sinh viên.'
    });
  }
};

// Lấy chi tiết một Sinh viên theo ID kèm thông tin Lớp học
exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await SinhVien.findByPk(id, {
      include: [
        {
          model: LopHoc,
          as: 'lophoc',
          attributes: ['id', 'ma_lop', 'ten_lop', 'khoa', 'nien_khoa']
        }
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy sinh viên với id = ${id}`
      });
    }

    // Phát sự kiện READ_ONE
    dbLogger.logOperation({
      requestId: req.requestId,
      action: 'READ_ONE',
      table: 'sinhvien',
      data: { id: student.id, ma_sv: student.ma_sv },
      message: `Đọc chi tiết sinh viên id=${student.id}, mã=${student.ma_sv}`
    });

    return res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã xảy ra lỗi khi tìm sinh viên.'
    });
  }
};

// Cập nhật thông tin Sinh viên theo ID
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, so_dien_thoai, dia_chi, lop_id } = req.body;

    const student = await SinhVien.findByPk(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy sinh viên với id = ${id}`
      });
    }

    // Nếu cập nhật lop_id, kiểm tra xem lớp có tồn tại không
    if (lop_id && lop_id !== student.lop_id) {
      const lop = await LopHoc.findByPk(lop_id);
      if (!lop) {
        return res.status(404).json({
          success: false,
          message: `Lớp học với lop_id = ${lop_id} không tồn tại!`
        });
      }
    }

    // Nếu thay đổi ma_sv hoặc email, kiểm tra trùng lặp với sinh viên khác
    if (ma_sv && ma_sv !== student.ma_sv) {
      const duplicateMa = await SinhVien.findOne({ where: { ma_sv, id: { [Op.ne]: id } } });
      if (duplicateMa) {
        return res.status(409).json({
          success: false,
          message: `Mã sinh viên '${ma_sv}' đã được sử dụng!`
        });
      }
    }

    if (email && email !== student.email) {
      const duplicateEmail = await SinhVien.findOne({ where: { email, id: { [Op.ne]: id } } });
      if (duplicateEmail) {
        return res.status(409).json({
          success: false,
          message: `Email '${email}' đã được sử dụng!`
        });
      }
    }

    await student.update({
      ma_sv,
      ho_ten,
      ngay_sinh,
      gioi_tinh,
      email,
      so_dien_thoai,
      dia_chi,
      lop_id
    });

    const updated = await SinhVien.findByPk(id, {
      include: [{ model: LopHoc, as: 'lophoc', attributes: ['id', 'ma_lop', 'ten_lop', 'khoa', 'nien_khoa'] }]
    });

    // Phát sự kiện UPDATE
    dbLogger.logOperation({
      requestId: req.requestId,
      action: 'UPDATE',
      table: 'sinhvien',
      data: { id: student.id, ma_sv: student.ma_sv },
      message: `Cập nhật thành công sinh viên id=${student.id}`
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật sinh viên thành công!',
      data: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã xảy ra lỗi khi cập nhật sinh viên.'
    });
  }
};

// Xóa Sinh viên theo ID
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await SinhVien.findByPk(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy sinh viên với id = ${id}`
      });
    }

    const deletedData = { id: student.id, ma_sv: student.ma_sv, ho_ten: student.ho_ten };
    await student.destroy();

    // Phát sự kiện DELETE
    dbLogger.logOperation({
      requestId: req.requestId,
      action: 'DELETE',
      table: 'sinhvien',
      data: deletedData,
      message: `Đã xóa sinh viên id=${id}, mã=${deletedData.ma_sv}`
    });

    return res.status(200).json({
      success: true,
      message: `Đã xóa sinh viên id = ${id} thành công!`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã xảy ra lỗi khi xóa sinh viên.'
    });
  }
};
