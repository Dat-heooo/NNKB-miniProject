module.exports = (sequelize, DataTypes) => {
  const LopHoc = sequelize.define('LopHoc', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ma_lop: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Mã lớp không được để trống' }
      }
    },
    ten_lop: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Tên lớp không được để trống' }
      }
    },
    khoa: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Khoa không được để trống' }
      }
    },
    nien_khoa: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Niên khóa không được để trống' }
      }
    }
  }, {
    tableName: 'lophoc',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return LopHoc;
};
