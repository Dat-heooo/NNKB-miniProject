const db = require('../models');
const dbLogger = require('../events/dbLogger.emitter');
const LopHoc = db.LopHoc;
const SinhVien = db.SinhVien;
const { Op } = db.Sequelize;

// Tạo mới Lớp học
exports.create = async (req, res) => {
  try {
    const { ma_lop, ten_lop, khoa, nien_khoa } = req.body;

    if (!ma_lop || !ten_lop || !khoa || !nien_khoa) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: ma_lop, ten_lop, khoa, nien_khoa'
      });
    }

    // Kiểm tra trùng mã lớp
    const existing = await LopHoc.findOne({ where: { ma_lop } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Mã lớp '${ma_lop}' đã tồn tại!`
      });
    }

    const newLop = await LopHoc.create({ ma_lop, ten_lop, khoa, nien_khoa });

    // Phát sự kiện qua EventEmitter (Observer Pattern)
    dbLogger.logOperation({
      requestId: req.requestId,
      action: 'CREATE',
      table: 'lophoc',
      data: { id: newLop.id, ma_lop: newLop.ma_lop },
      message: `Tạo mới thành công lớp học id=${newLop.id}, mã=${newLop.ma_lop}`
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo lớp học thành công!',
      data: newLop
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã xảy ra lỗi khi tạo lớp học.'
    });
  }
};

// Lấy danh sách tất cả Lớp học (có tìm kiếm, lọc, phân trang)
exports.findAll = async (req, res) => {
  try {
    const { search, khoa, page, limit } = req.query;
    const condition = {};

    if (search) {
      condition[Op.or] = [
        { ma_lop: { [Op.iLike]: `%${search}%` } },
        { ten_lop: { [Op.iLike]: `%${search}%` } },
        { khoa: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (khoa) {
      condition.khoa = khoa;
    }

    const options = {
      where: condition,
      include: [
        {
          model: SinhVien,
          as: 'sinhviens',
          attributes: ['id']
        }
      ],
      distinct: true,
      order: [['id', 'ASC']]
    };

    let result;
    if (limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10);
      options.offset = (pageNum - 1) * limitNum;
      options.limit = limitNum;

      const { count, rows } = await LopHoc.findAndCountAll(options);
      result = {
        totalItems: count,
        totalPages: Math.ceil(count / limitNum),
        currentPage: pageNum,
        data: rows
      };
    } else {
      const classes = await LopHoc.findAll(options);
      result = {
        totalItems: classes.length,
        data: classes
      };
    }

    // Phát sự kiện READ_ALL
    dbLogger.logOperation({
      requestId: req.requestId,
      action: 'READ_ALL',
      table: 'lophoc',
      message: `Đọc danh sách lớp học: ${result.totalItems} kết quả (search='${search || ''}')`
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã xảy ra lỗi khi lấy danh sách lớp học.'
    });
  }
};

// Lấy chi tiết một Lớp học theo ID kèm danh sách sinh viên
exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const lop = await LopHoc.findByPk(id, {
      include: [
        {
          model: SinhVien,
          as: 'sinhviens',
          attributes: ['id', 'ma_sv', 'ho_ten', 'ngay_sinh', 'gioi_tinh', 'email', 'so_dien_thoai', 'dia_chi']
        }
      ]
    });

    if (!lop) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy lớp học với id = ${id}`
      });
    }

    // Phát sự kiện READ_ONE
    dbLogger.logOperation({
      requestId: req.requestId,
      action: 'READ_ONE',
      table: 'lophoc',
      data: { id: lop.id, ma_lop: lop.ma_lop },
      message: `Đọc chi tiết lớp học id=${lop.id} kèm ${lop.sinhviens ? lop.sinhviens.length : 0} sinh viên`
    });

    return res.status(200).json({
      success: true,
      data: lop
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã xảy ra lỗi khi tìm lớp học.'
    });
  }
};

// Cập nhật thông tin Lớp học theo ID
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { ma_lop, ten_lop, khoa, nien_khoa } = req.body;

    const lop = await LopHoc.findByPk(id);
    if (!lop) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy lớp học với id = ${id}`
      });
    }

    // Nếu thay đổi ma_lop, kiểm tra trùng
    if (ma_lop && ma_lop !== lop.ma_lop) {
      const existing = await LopHoc.findOne({ where: { ma_lop } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Mã lớp '${ma_lop}' đã tồn tại!`
        });
      }
    }

    await lop.update({ ma_lop, ten_lop, khoa, nien_khoa });

    // Phát sự kiện UPDATE
    dbLogger.logOperation({
      requestId: req.requestId,
      action: 'UPDATE',
      table: 'lophoc',
      data: { id: lop.id, ma_lop: lop.ma_lop },
      message: `Cập nhật thành công lớp học id=${lop.id}`
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật lớp học thành công!',
      data: lop
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã xảy ra lỗi khi cập nhật lớp học.'
    });
  }
};

// Xóa Lớp học theo ID
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const lop = await LopHoc.findByPk(id);

    if (!lop) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy lớp học với id = ${id}`
      });
    }

    const deletedData = { id: lop.id, ma_lop: lop.ma_lop };
    await lop.destroy();

    // Phát sự kiện DELETE
    dbLogger.logOperation({
      requestId: req.requestId,
      action: 'DELETE',
      table: 'lophoc',
      data: deletedData,
      message: `Đã xóa lớp học id=${id}, mã=${deletedData.ma_lop}`
    });

    return res.status(200).json({
      success: true,
      message: `Đã xóa lớp học id = ${id} thành công!`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã xảy ra lỗi khi xóa lớp học.'
    });
  }
};
