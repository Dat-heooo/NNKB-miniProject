/**
 * middlewares/rbac.middleware.js
 * Middleware Phân quyền Người dùng theo Vai trò (Role-Based Access Control - RBAC)
 * 
 * Hỗ trợ các quyền:
 * - READ   : Xem danh sách, xem chi tiết
 * - CREATE : Thêm mới tài nguyên
 * - UPDATE : Chỉnh sửa tài nguyên
 * - DELETE : Xóa tài nguyên
 */

// 1. Định nghĩa danh mục Quyền (Permissions)
const PERMISSIONS = {
  READ: 'READ',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
};

// 2. Định nghĩa Vai trò (Roles) và Ma trận Phân quyền tương ứng
const ROLE_PERMISSIONS = {
  admin: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
  teacher: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE],
  manager: [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE],
  student: [PERMISSIONS.READ],
  guest: [PERMISSIONS.READ]
};

// 3. Danh sách token mẫu (Mock Authentication) cho mục đích kiểm thử
const MOCK_TOKENS = {
  'token-admin': { id: 1, username: 'admin', role: 'admin', name: 'Quản trị viên Hệ thống' },
  'token-teacher': { id: 2, username: 'gv_nam', role: 'teacher', name: 'Giảng viên Nam' },
  'token-student': { id: 3, username: 'sv_mai', role: 'student', name: 'Sinh viên Mai' }
};

/**
 * Middleware kiểm tra quyền truy cập (Permission Checker)
 * @param {string} requiredPermission - Quyền yêu cầu: 'READ', 'CREATE', 'UPDATE', 'DELETE'
 */
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    let userRole = null;
    let currentUser = null;

    // --- BƯỚC 1: XÁC THỰC DANH TÍNH (AUTHENTICATION) ---
    // Cách 1: Qua Header Authorization: Bearer <token>
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (MOCK_TOKENS[token]) {
        currentUser = MOCK_TOKENS[token];
        userRole = currentUser.role;
      }
    }

    // Cách 2: Qua Header x-user-role (tiện lợi cho kiểm thử API trực tiếp qua Postman/curl)
    if (!userRole && req.headers['x-user-role']) {
      userRole = req.headers['x-user-role'].toLowerCase().trim();
      currentUser = { username: `user_${userRole}`, role: userRole, name: `Người dùng ${userRole}` };
    }

    // Nếu không có bất kỳ thông tin xác thực nào -> 401 Unauthorized
    if (!userRole) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu xác thực danh tính! Vui lòng cung cấp Header `x-user-role` (admin, teacher, student) hoặc `Authorization: Bearer <token>`.',
        hint: {
          supportedRoles: Object.keys(ROLE_PERMISSIONS),
          demoHeaders: [
            { 'x-user-role': 'admin' },
            { 'x-user-role': 'teacher' },
            { 'x-user-role': 'student' },
            { 'Authorization': 'Bearer token-admin' }
          ]
        }
      });
    }

    // Kiểm tra vai trò có nằm trong hệ thống hay không
    const userPermissions = ROLE_PERMISSIONS[userRole];
    if (!userPermissions) {
      return res.status(403).json({
        success: false,
        code: 'INVALID_ROLE',
        message: `Vai trò '${userRole}' không hợp lệ trong hệ thống!`,
        validRoles: Object.keys(ROLE_PERMISSIONS)
      });
    }

    // --- BƯỚC 2: KIỂM TRA PHÂN QUYỀN (AUTHORIZATION) ---
    const hasPermission = userPermissions.includes(requiredPermission);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `Truy cập bị từ chối! Vai trò '${userRole}' không có quyền '${requiredPermission}'.`,
        requiredPermission,
        userRole,
        yourPermissions: userPermissions
      });
    }

    // Gắn thông tin người dùng vào request để sử dụng ở các bước tiếp theo
    req.user = currentUser;
    next();
  };
};

module.exports = {
  checkPermission,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  MOCK_TOKENS
};
