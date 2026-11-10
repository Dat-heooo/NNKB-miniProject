const express = require('express');
const router = express.Router();
const sinhvienController = require('../controllers/sinhvien.controller.js');
const { checkPermission, PERMISSIONS } = require('../middlewares/rbac.middleware.js');

// [POST] /api/sinhvien - Tạo mới sinh viên (Quyền CREATE: admin, teacher)
router.post('/', checkPermission(PERMISSIONS.CREATE), sinhvienController.create);

// [GET] /api/sinhvien - Lấy danh sách sinh viên (Quyền READ: admin, teacher, student)
router.get('/', checkPermission(PERMISSIONS.READ), sinhvienController.findAll);

// [GET] /api/sinhvien/:id - Lấy chi tiết sinh viên (Quyền READ: admin, teacher, student)
router.get('/:id', checkPermission(PERMISSIONS.READ), sinhvienController.findOne);

// [PUT] /api/sinhvien/:id - Cập nhật sinh viên (Quyền UPDATE: admin, teacher)
router.put('/:id', checkPermission(PERMISSIONS.UPDATE), sinhvienController.update);

// [DELETE] /api/sinhvien/:id - Xóa sinh viên (Quyền DELETE: chỉ admin)
router.delete('/:id', checkPermission(PERMISSIONS.DELETE), sinhvienController.delete);

module.exports = router;
