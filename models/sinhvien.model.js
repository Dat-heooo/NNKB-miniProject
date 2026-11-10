module.exports = (sequelize, DataTypes) => {
  const SinhVien = sequelize.define('SinhVien', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ma_sv: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Mã sinh viên không được để trống' }
      }
    },
    ho_ten: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Họ tên không được để trống' }
      }
    },
    ngay_sinh: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: { msg: 'Ngày sinh không hợp lệ (định dạng YYYY-MM-DD)' }
      }
    },
    gioi_tinh: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: {
          args: [['Nam', 'Nữ', 'Khác']],
          msg: 'Giới tính phải là Nam, Nữ hoặc Khác'
        }
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: 'Email không đúng định dạng' }
      }
    },
    so_dien_thoai: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    dia_chi: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    lop_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lophoc',
        key: 'id'
      },
      validate: {
        notNull: { msg: 'Lớp học là bắt buộc' }
      }
    }
  }, {
    tableName: 'sinhvien',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return SinhVien;
};
