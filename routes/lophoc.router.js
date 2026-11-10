const express = require('express');
const router = express.Router();
const lophocController = require('../controllers/lophoc.controller.js');
const { checkPermission, PERMISSIONS } = require('../middlewares/rbac.middleware.js');

// [POST] /api/lophoc - Tạo mới lớp học (Quyền CREATE: admin, teacher)
router.post('/', checkPermission(PERMISSIONS.CREATE), lophocController.create);

// [GET] /api/lophoc - Lấy danh sách lớp học (Quyền READ: admin, teacher, student)
router.get('/', checkPermission(PERMISSIONS.READ), lophocController.findAll);

// [GET] /api/lophoc/:id - Lấy chi tiết lớp học (Quyền READ: admin, teacher, student)
router.get('/:id', checkPermission(PERMISSIONS.READ), lophocController.findOne);

// [PUT] /api/lophoc/:id - Cập nhật lớp học (Quyền UPDATE: admin, teacher)
router.put('/:id', checkPermission(PERMISSIONS.UPDATE), lophocController.update);

// [DELETE] /api/lophoc/:id - Xóa lớp học (Quyền DELETE: chỉ admin)
router.delete('/:id', checkPermission(PERMISSIONS.DELETE), lophocController.delete);

module.exports = router;
