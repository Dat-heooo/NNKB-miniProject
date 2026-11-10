const Sequelize = require('sequelize');
const dbConfig = require('../config/db.config.js');

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  port: dbConfig.PORT,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  },
  logging: dbConfig.logging,
  define: {
    underscored: true
  }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Models
db.LopHoc = require('./lophoc.model.js')(sequelize, Sequelize.DataTypes);
db.SinhVien = require('./sinhvien.model.js')(sequelize, Sequelize.DataTypes);

// Quan hệ 1 - N (1 Lớp học có nhiều Sinh viên, 1 Sinh viên thuộc 1 Lớp học)
db.LopHoc.hasMany(db.SinhVien, {
  foreignKey: 'lop_id',
  as: 'sinhviens',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

db.SinhVien.belongsTo(db.LopHoc, {
  foreignKey: 'lop_id',
  as: 'lophoc',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

module.exports = db;
