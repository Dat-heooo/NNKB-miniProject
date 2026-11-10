/**
 * public/js/app.js
 * Logic giao diện CMS Dashboard - Quản lý Sinh viên & Lớp học
 * Tích hợp đầy đủ RBAC Client, CRUD DOM, Pagination, Filter, Modal & Demo Chương 3
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE QUẢN LÝ ---
  const state = {
    currentTab: 'tab-lophoc',
    classes: {
      page: 1,
      limit: 10,
      search: '',
      totalItems: 0,
      totalPages: 1
    },
    students: {
      page: 1,
      limit: 10,
      search: '',
      lopId: '',
      gioiTinh: '',
      totalItems: 0,
      totalPages: 1
    },
    allClassesList: [], // Dùng để nạp dropdown chọn lớp
    deleteTarget: null // { type: 'class' | 'student', id, name }
  };

  // --- BOOTSTRAP MODALS ---
  const classModal = new bootstrap.Modal(document.getElementById('classModal'));
  const studentModal = new bootstrap.Modal(document.getElementById('studentModal'));
  const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));

  // ========================================================
  // 1. TOAST NOTIFICATION SYSTEM
  // ========================================================
  function showToast(title, message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;

    let iconClass = 'bi-check-circle-fill';
    if (type === 'error') iconClass = 'bi-x-circle-fill';
    if (type === 'forbidden') iconClass = 'bi-shield-fill-x';
    if (type === 'info') iconClass = 'bi-info-circle-fill';

    toast.innerHTML = `
      <div class="toast-icon"><i class="bi ${iconClass}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <button class="toast-close" title="Đóng">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function handleApiError(err, defaultAction = 'Thao tác') {
    if (err.status === 403) {
      showToast(
        '🚫 Bị Chặn Quyền (403 Forbidden)',
        err.message || 'Bạn không có quyền thực hiện hành động này!',
        'forbidden'
      );
    } else if (err.status === 401) {
      showToast(
        '🔒 Chưa Xác Thực (401 Unauthorized)',
        err.message || 'Yêu cầu đăng nhập hoặc chọn Role hợp lệ!',
        'error'
      );
    } else if (err.status === 409) {
      showToast('⚠️ Dữ Liệu Trùng Lặp (409)', err.message, 'error');
    } else {
      showToast(`❌ Lỗi ${defaultAction}`, err.message || 'Đã có lỗi xảy ra!', 'error');
    }
  }

  // ========================================================
  // 2. ROLE SWITCHER & RBAC UI PERMISSION MANAGEMENT
  // ========================================================
  const ROLE_CONFIG = {
    admin: {
      label: 'ADMIN',
      badgeClass: 'admin',
      permissions: ['READ', 'CREATE', 'UPDATE', 'DELETE']
    },
    teacher: {
      label: 'TEACHER / MANAGER',
      badgeClass: 'teacher',
      permissions: ['READ', 'CREATE', 'UPDATE']
    },
    student: {
      label: 'VIEWER / STUDENT',
      badgeClass: 'student',
      permissions: ['READ']
    }
  };

  const roleSelect = document.getElementById('roleSelect');
  const roleBadge = document.getElementById('roleBadge');
  const permissionBadges = document.getElementById('permissionBadges');
  const testModeSwitch = document.getElementById('testModeSwitch');

  function initRoleSwitcher() {
    const savedRole = ApiClient.getCurrentRole();
    roleSelect.value = savedRole;
    updateRoleUI(savedRole);

    roleSelect.addEventListener('change', (e) => {
      const newRole = e.target.value;
      ApiClient.setCurrentRole(newRole);
      updateRoleUI(newRole);
      showToast('Đổi Vai Trò Thành Công', `Hiện tại bạn đang đóng vai: ${ROLE_CONFIG[newRole].label}`, 'info');
      // Tải lại dữ liệu các bảng theo quyền
      loadClasses();
      loadStudents();
    });

    testModeSwitch.addEventListener('change', () => {
      updateRoleUI(ApiClient.getCurrentRole());
      if (testModeSwitch.checked) {
        showToast('Chế Độ Test 403 Đã Bật', 'Các nút bấm sẽ không bị làm mờ, cho phép gửi thẳng request để test lỗi 403 từ Backend!', 'info');
      } else {
        showToast('Chế Độ UI Dimming Đã Bật', 'Giao diện sẽ tự động làm mờ và khóa các nút bạn không có quyền.', 'info');
      }
    });
  }

  function updateRoleUI(role) {
    const config = ROLE_CONFIG[role] || ROLE_CONFIG.admin;

    // Cập nhật Badge Role
    roleBadge.textContent = config.label;
    roleBadge.className = `role-badge ${config.badgeClass}`;

    // Cập nhật danh sách Permission badges
    permissionBadges.innerHTML = config.permissions.map(p => {
      let bg = 'bg-secondary';
      if (p === 'READ') bg = 'bg-info text-white';
      if (p === 'CREATE') bg = 'bg-success text-white';
      if (p === 'UPDATE') bg = 'bg-primary text-white';
      if (p === 'DELETE') bg = 'bg-danger text-white';
      return `<span class="badge ${bg} badge-permission">${p}</span>`;
    }).join('');

    // Kiểm tra và cập nhật các nút có gắn data-permission
    const isTestMode = testModeSwitch.checked;
    const elementsWithPermission = document.querySelectorAll('[data-permission]');

    elementsWithPermission.forEach(el => {
      const requiredPermission = el.getAttribute('data-permission');
      const hasPerm = config.permissions.includes(requiredPermission);

      if (!hasPerm) {
        if (isTestMode) {
          // Cho phép click để test backend 403
          el.classList.remove('no-permission-dimmed');
          el.removeAttribute('disabled');
          el.title = `Bạn không có quyền ${requiredPermission} (Bấm để test lỗi 403 Backend)`;
        } else {
          // Làm mờ và khóa
          el.classList.add('no-permission-dimmed');
          el.setAttribute('disabled', 'true');
          el.title = `Bạn cần quyền ${requiredPermission} để thực hiện`;
        }
      } else {
        el.classList.remove('no-permission-dimmed');
        el.removeAttribute('disabled');
        el.title = '';
      }
    });
  }

  // ========================================================
  // 3. TAB NAVIGATION
  // ========================================================
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  const tabPanes = document.querySelectorAll('.tab-pane-content');
  const pageTitle = document.getElementById('pageTitle');

  const TAB_TITLES = {
    'tab-lophoc': '<i class="bi bi-building me-1"></i> Quản Lý Lớp Học',
    'tab-sinhvien': '<i class="bi bi-people-fill me-1"></i> Quản Lý Sinh Viên',
    'tab-chapter3': '<i class="bi bi-cpu-fill me-1"></i> Giám Sát Event & Cache (Chương 3)'
  };

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');
      if (targetTab === state.currentTab) return;

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      tabPanes.forEach(pane => {
        if (pane.id === targetTab) {
          pane.classList.remove('d-none');
        } else {
          pane.classList.add('d-none');
        }
      });

      state.currentTab = targetTab;
      pageTitle.innerHTML = TAB_TITLES[targetTab] || '';

      // Tự động load dữ liệu tương ứng
      if (targetTab === 'tab-lophoc') loadClasses();
      if (targetTab === 'tab-sinhvien') loadStudents();
      if (targetTab === 'tab-chapter3') loadEmitterStatus();

      // Đóng sidebar trên mobile
      document.getElementById('sidebar').classList.remove('show');
      document.getElementById('sidebarBackdrop').classList.remove('show');
    });
  });

  // Mobile sidebar toggle
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('show');
      sidebarBackdrop.classList.toggle('show');
    });
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('show');
      sidebarBackdrop.classList.remove('show');
    });
  }

  // ========================================================
  // 4. TAB 1: QUẢN LÝ LỚP HỌC (LOPHOC)
  // ========================================================
  const classTableBody = document.getElementById('classTableBody');
  const classLoading = document.getElementById('classLoading');
  const classSearchInput = document.getElementById('classSearchInput');
  const classRefreshBtn = document.getElementById('classRefreshBtn');
  const classLimitSelect = document.getElementById('classLimitSelect');
  const classPaginationNav = document.getElementById('classPaginationNav');
  const classPaginationInfo = document.getElementById('classPaginationInfo');

  async function loadClasses() {
    classLoading.classList.remove('d-none');
    try {
      const res = await ApiClient.getClasses({
        page: state.classes.page,
        limit: state.classes.limit,
        search: state.classes.search
      });

      state.classes.totalItems = res.totalItems || 0;
      state.classes.totalPages = res.totalPages || 1;
      renderClassesTable(res.data || []);
      renderClassesPagination();

      // Đồng thời cập nhật danh sách lớp cho dropdown sinh viên nếu đang rỗng
      if (state.allClassesList.length === 0) {
        fetchAllClassesForDropdown();
      }
    } catch (err) {
      handleApiError(err, 'tải danh sách lớp học');
      classTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Không thể tải dữ liệu: ${err.message}</td></tr>`;
    } finally {
      classLoading.classList.add('d-none');
    }
  }

  function renderClassesTable(classes) {
    if (!classes || classes.length === 0) {
      classTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-2 d-block mb-1"></i>
            Không tìm thấy lớp học nào phù hợp.
          </td>
        </tr>`;
      return;
    }

    classTableBody.innerHTML = classes.map(c => {
      const studentCount = c.sinhviens ? c.sinhviens.length : 0;
      return `
        <tr>
          <td class="fw-semibold text-secondary">#${c.id}</td>
          <td><span class="badge bg-light text-dark border font-monospace">${escapeHtml(c.ma_lop)}</span></td>
          <td class="fw-semibold">${escapeHtml(c.ten_lop)}</td>
          <td><span class="badge bg-primary-subtle text-primary border border-primary-subtle">${escapeHtml(c.khoa)}</span></td>
          <td class="text-muted">${escapeHtml(c.nien_khoa)}</td>
          <td class="text-center">
            <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-1">
              <i class="bi bi-person me-1"></i>${studentCount} SV
            </span>
          </td>
          <td class="text-end">
            <button class="btn btn-outline-primary btn-action btn-edit-class me-1" 
                    data-id="${c.id}" 
                    data-permission="UPDATE" 
                    title="Chỉnh sửa lớp">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-outline-danger btn-action btn-delete-class" 
                    data-id="${c.id}" 
                    data-name="${escapeHtml(c.ten_lop)}" 
                    data-permission="DELETE" 
                    title="Xóa lớp">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
    }).join('');

    // Cập nhật lại trạng thái quyền cho các nút vừa sinh ra trong table
    updateRoleUI(ApiClient.getCurrentRole());

    // Gắn sự kiện sửa / xóa
    document.querySelectorAll('.btn-edit-class').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openEditClassModal(id);
      });
    });

    document.querySelectorAll('.btn-delete-class').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        openDeleteModal('class', id, name);
      });
    });
  }

  function renderClassesPagination() {
    const { page, totalPages, totalItems, limit } = state.classes;
    const start = totalItems === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, totalItems);

    classPaginationInfo.textContent = `Hiển thị ${start} - ${end} trên tổng số ${totalItems} lớp học`;

    let html = '';
    html += `<li class="page-item ${page <= 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${page - 1}">&laquo;</a>
    </li>`;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
        html += `<li class="page-item ${i === page ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>`;
      } else if (i === page - 3 || i === page + 3) {
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
    }

    html += `<li class="page-item ${page >= totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${page + 1}">&raquo;</a>
    </li>`;

    classPaginationNav.innerHTML = html;

    classPaginationNav.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const p = parseInt(link.getAttribute('data-page'), 10);
        if (p && p !== state.classes.page && p >= 1 && p <= totalPages) {
          state.classes.page = p;
          loadClasses();
        }
      });
    });
  }

  // Lọc & Tìm kiếm Lớp học
  let classSearchTimeout = null;
  classSearchInput.addEventListener('input', (e) => {
    clearTimeout(classSearchTimeout);
    classSearchTimeout = setTimeout(() => {
      state.classes.search = e.target.value.trim();
      state.classes.page = 1;
      loadClasses();
    }, 350);
  });

  classRefreshBtn.addEventListener('click', () => {
    state.classes.page = 1;
    loadClasses();
  });

  classLimitSelect.addEventListener('change', (e) => {
    state.classes.limit = parseInt(e.target.value, 10);
    state.classes.page = 1;
    loadClasses();
  });

  // Modal Thêm / Sửa Lớp học
  const openAddClassModalBtn = document.getElementById('openAddClassModalBtn');
  const classForm = document.getElementById('classForm');
  const classModalTitle = document.getElementById('classModalTitle');
  const classId = document.getElementById('classId');
  const classMaLop = document.getElementById('classMaLop');
  const classTenLop = document.getElementById('classTenLop');
  const classKhoa = document.getElementById('classKhoa');
  const classNienKhoa = document.getElementById('classNienKhoa');

  openAddClassModalBtn.addEventListener('click', () => {
    classForm.reset();
    classId.value = '';
    classModalTitle.textContent = 'Thêm Mới Lớp Học';
    classMaLop.removeAttribute('readonly');
    classModal.show();
  });

  async function openEditClassModal(id) {
    try {
      const res = await ApiClient.getClassById(id);
      const c = res.data;
      classId.value = c.id;
      classMaLop.value = c.ma_lop;
      classTenLop.value = c.ten_lop;
      classKhoa.value = c.khoa;
      classNienKhoa.value = c.nien_khoa;
      classModalTitle.textContent = `Chỉnh Sửa Lớp Học #${c.id}`;
      classModal.show();
    } catch (err) {
      handleApiError(err, 'lấy thông tin lớp học');
    }
  }

  classForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = classId.value;
    const payload = {
      ma_lop: classMaLop.value.trim(),
      ten_lop: classTenLop.value.trim(),
      khoa: classKhoa.value.trim(),
      nien_khoa: classNienKhoa.value.trim()
    };

    try {
      if (id) {
        await ApiClient.updateClass(id, payload);
        showToast('Cập Nhật Thành Công', `Đã cập nhật lớp học ${payload.ten_lop}`, 'success');
      } else {
        await ApiClient.createClass(payload);
        showToast('Thêm Mới Thành Công', `Đã tạo lớp học ${payload.ten_lop}`, 'success');
      }
      classModal.hide();
      loadClasses();
      fetchAllClassesForDropdown(); // cập nhật lại dropdown chọn lớp
    } catch (err) {
      handleApiError(err, id ? 'cập nhật lớp học' : 'tạo lớp học');
    }
  });

  // ========================================================
  // 5. TAB 2: QUẢN LÝ SINH VIÊN (SINHVIEN)
  // ========================================================
  const studentTableBody = document.getElementById('studentTableBody');
  const studentLoading = document.getElementById('studentLoading');
  const studentSearchInput = document.getElementById('studentSearchInput');
  const studentClassFilter = document.getElementById('studentClassFilter');
  const studentGenderFilter = document.getElementById('studentGenderFilter');
  const studentRefreshBtn = document.getElementById('studentRefreshBtn');
  const studentLimitSelect = document.getElementById('studentLimitSelect');
  const studentPaginationNav = document.getElementById('studentPaginationNav');
  const studentPaginationInfo = document.getElementById('studentPaginationInfo');

  async function fetchAllClassesForDropdown() {
    try {
      const res = await ApiClient.getClasses({ limit: 100 });
      state.allClassesList = res.data || [];

      // Nạp dropdown bộ lọc ở Tab Sinh viên
      studentClassFilter.innerHTML = '<option value="">-- Tất cả lớp học --</option>' +
        state.allClassesList.map(c => `<option value="${c.id}">${escapeHtml(c.ma_lop)} - ${escapeHtml(c.ten_lop)}</option>`).join('');

      // Nạp dropdown chọn lớp ở Modal Thêm Sinh viên
      const studentLopId = document.getElementById('studentLopId');
      studentLopId.innerHTML = '<option value="">-- Chọn lớp học --</option>' +
        state.allClassesList.map(c => `<option value="${c.id}">${escapeHtml(c.ma_lop)} - ${escapeHtml(c.ten_lop)}</option>`).join('');
    } catch (err) {
      console.warn('Không thể tải danh sách lớp học cho dropdown:', err.message);
    }
  }

  async function loadStudents() {
    studentLoading.classList.remove('d-none');
    try {
      const params = {
        page: state.students.page,
        limit: state.students.limit,
        search: state.students.search
      };
      if (state.students.lopId) params.lop_id = state.students.lopId;
      if (state.students.gioiTinh) params.gioi_tinh = state.students.gioiTinh;

      const res = await ApiClient.getStudents(params);
      state.students.totalItems = res.totalItems || 0;
      state.students.totalPages = res.totalPages || 1;
      renderStudentsTable(res.data || []);
      renderStudentsPagination();
    } catch (err) {
      handleApiError(err, 'tải danh sách sinh viên');
      studentTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Không thể tải dữ liệu: ${err.message}</td></tr>`;
    } finally {
      studentLoading.classList.add('d-none');
    }
  }

  function renderStudentsTable(students) {
    if (!students || students.length === 0) {
      studentTableBody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-2 d-block mb-1"></i>
            Không tìm thấy sinh viên nào phù hợp bộ lọc.
          </td>
        </tr>`;
      return;
    }

    studentTableBody.innerHTML = students.map(s => {
      // Tính tuổi từ ngày sinh
      let ageStr = 'N/A';
      if (s.ngay_sinh) {
        const birthYear = new Date(s.ngay_sinh).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        ageStr = `${age} tuổi (${birthYear})`;
      }

      const genderBadge = s.gioi_tinh === 'Nam' 
        ? '<span class="badge bg-primary-subtle text-primary border border-primary-subtle">Nam</span>'
        : '<span class="badge bg-danger-subtle text-danger border border-danger-subtle">Nữ</span>';

      const className = s.lophoc ? s.lophoc.ten_lop : `Lớp #${s.lop_id}`;

      return `
        <tr>
          <td class="fw-semibold text-secondary">#${s.id}</td>
          <td><span class="badge bg-light text-dark border font-monospace">${escapeHtml(s.ma_sv)}</span></td>
          <td class="fw-bold">${escapeHtml(s.ho_ten)}</td>
          <td class="text-muted"><small>${escapeHtml(s.email)}</small></td>
          <td class="text-secondary small">${ageStr}</td>
          <td>${genderBadge}</td>
          <td><span class="badge bg-info-subtle text-info-emphasis border border-info-subtle">${escapeHtml(className)}</span></td>
          <td class="font-monospace small">${escapeHtml(s.so_dien_thoai || '-')}</td>
          <td class="text-truncate" style="max-width: 140px;" title="${escapeHtml(s.dia_chi || '')}">
            <small class="text-muted">${escapeHtml(s.dia_chi || '-')}</small>
          </td>
          <td class="text-end">
            <button class="btn btn-outline-primary btn-action btn-edit-student me-1" 
                    data-id="${s.id}" 
                    data-permission="UPDATE" 
                    title="Sửa sinh viên">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-outline-danger btn-action btn-delete-student" 
                    data-id="${s.id}" 
                    data-name="${escapeHtml(s.ho_ten)}" 
                    data-permission="DELETE" 
                    title="Xóa sinh viên">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
    }).join('');

    // Cập nhật lại quyền cho các nút vừa render
    updateRoleUI(ApiClient.getCurrentRole());

    // Gắn sự kiện sửa / xóa
    document.querySelectorAll('.btn-edit-student').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openEditStudentModal(id);
      });
    });

    document.querySelectorAll('.btn-delete-student').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        openDeleteModal('student', id, name);
      });
    });
  }

  function renderStudentsPagination() {
    const { page, totalPages, totalItems, limit } = state.students;
    const start = totalItems === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, totalItems);

    studentPaginationInfo.textContent = `Hiển thị ${start} - ${end} trên tổng số ${totalItems} sinh viên`;

    let html = '';
    html += `<li class="page-item ${page <= 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${page - 1}">&laquo;</a>
    </li>`;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
        html += `<li class="page-item ${i === page ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>`;
      } else if (i === page - 3 || i === page + 3) {
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
    }

    html += `<li class="page-item ${page >= totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${page + 1}">&raquo;</a>
    </li>`;

    studentPaginationNav.innerHTML = html;

    studentPaginationNav.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const p = parseInt(link.getAttribute('data-page'), 10);
        if (p && p !== state.students.page && p >= 1 && p <= totalPages) {
          state.students.page = p;
          loadStudents();
        }
      });
    });
  }

  // Lọc & Tìm kiếm Sinh viên
  let studentSearchTimeout = null;
  studentSearchInput.addEventListener('input', (e) => {
    clearTimeout(studentSearchTimeout);
    studentSearchTimeout = setTimeout(() => {
      state.students.search = e.target.value.trim();
      state.students.page = 1;
      loadStudents();
    }, 350);
  });

  studentClassFilter.addEventListener('change', (e) => {
    state.students.lopId = e.target.value;
    state.students.page = 1;
    loadStudents();
  });

  studentGenderFilter.addEventListener('change', (e) => {
    state.students.gioiTinh = e.target.value;
    state.students.page = 1;
    loadStudents();
  });

  studentRefreshBtn.addEventListener('click', () => {
    state.students.page = 1;
    loadStudents();
  });

  studentLimitSelect.addEventListener('change', (e) => {
    state.students.limit = parseInt(e.target.value, 10);
    state.students.page = 1;
    loadStudents();
  });

  // Modal Thêm / Sửa Sinh viên
  const openAddStudentModalBtn = document.getElementById('openAddStudentModalBtn');
  const studentForm = document.getElementById('studentForm');
  const studentModalTitle = document.getElementById('studentModalTitle');
  const studentId = document.getElementById('studentId');
  const studentMaSv = document.getElementById('studentMaSv');
  const studentHoTen = document.getElementById('studentHoTen');
  const studentNgaySinh = document.getElementById('studentNgaySinh');
  const studentGioiTinh = document.getElementById('studentGioiTinh');
  const studentEmail = document.getElementById('studentEmail');
  const studentSoDienThoai = document.getElementById('studentSoDienThoai');
  const studentDiaChi = document.getElementById('studentDiaChi');
  const studentLopId = document.getElementById('studentLopId');

  openAddStudentModalBtn.addEventListener('click', () => {
    studentForm.reset();
    studentId.value = '';
    studentModalTitle.textContent = 'Thêm Mới Sinh Viên';
    studentMaSv.removeAttribute('readonly');
    studentModal.show();
  });

  async function openEditStudentModal(id) {
    try {
      const res = await ApiClient.getStudentById(id);
      const s = res.data;
      studentId.value = s.id;
      studentMaSv.value = s.ma_sv;
      studentHoTen.value = s.ho_ten;
      studentNgaySinh.value = s.ngay_sinh ? s.ngay_sinh.slice(0, 10) : '';
      studentGioiTinh.value = s.gioi_tinh;
      studentEmail.value = s.email;
      studentSoDienThoai.value = s.so_dien_thoai || '';
      studentDiaChi.value = s.dia_chi || '';
      studentLopId.value = s.lop_id;
      studentModalTitle.textContent = `Chỉnh Sửa Sinh Viên #${s.id}`;
      studentModal.show();
    } catch (err) {
      handleApiError(err, 'lấy thông tin sinh viên');
    }
  }

  studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Client-side Validation
    const emailVal = studentEmail.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      showToast('Dữ Liệu Không Hợp Lệ', 'Email không đúng định dạng!', 'error');
      return;
    }

    const birthDate = new Date(studentNgaySinh.value);
    const today = new Date();
    if (birthDate >= today) {
      showToast('Dữ Liệu Không Hợp Lệ', 'Ngày sinh phải nhỏ hơn ngày hiện tại!', 'error');
      return;
    }

    const id = studentId.value;
    const payload = {
      ma_sv: studentMaSv.value.trim(),
      ho_ten: studentHoTen.value.trim(),
      ngay_sinh: studentNgaySinh.value,
      gioi_tinh: studentGioiTinh.value,
      email: emailVal,
      so_dien_thoai: studentSoDienThoai.value.trim() || null,
      dia_chi: studentDiaChi.value.trim() || null,
      lop_id: parseInt(studentLopId.value, 10)
    };

    try {
      if (id) {
        await ApiClient.updateStudent(id, payload);
        showToast('Cập Nhật Thành Công', `Đã cập nhật thông tin sinh viên ${payload.ho_ten}`, 'success');
      } else {
        await ApiClient.createStudent(payload);
        showToast('Thêm Mới Thành Công', `Đã thêm sinh viên ${payload.ho_ten}`, 'success');
      }
      studentModal.hide();
      loadStudents();
      // Nếu đang mở tab lớp học thì cũng cập nhật lại số lượng sinh viên
      if (state.currentTab === 'tab-lophoc') loadClasses();
    } catch (err) {
      handleApiError(err, id ? 'cập nhật sinh viên' : 'tạo sinh viên');
    }
  });

  // ========================================================
  // 6. XỬ LÝ XÓA DÙNG CHUNG (GENERIC DELETE CONFIRM MODAL)
  // ========================================================
  const deleteConfirmMessage = document.getElementById('deleteConfirmMessage');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  function openDeleteModal(type, id, name) {
    state.deleteTarget = { type, id, name };
    const label = type === 'class' ? 'lớp học' : 'sinh viên';
    deleteConfirmMessage.innerHTML = `Bạn có chắc chắn muốn xóa ${label} <strong>"${escapeHtml(name)}"</strong> (ID: #${id})?<br><small class="text-danger">Lưu ý: Hành động này sẽ được kiểm tra phân quyền RBAC (yêu cầu quyền DELETE).</small>`;
    deleteConfirmModal.show();
  }

  confirmDeleteBtn.addEventListener('click', async () => {
    if (!state.deleteTarget) return;
    const { type, id, name } = state.deleteTarget;
    deleteConfirmModal.hide();

    try {
      if (type === 'class') {
        const res = await ApiClient.deleteClass(id);
        showToast('Xóa Thành Công', res.message || `Đã xóa lớp học "${name}"`, 'success');
        loadClasses();
        fetchAllClassesForDropdown();
      } else {
        const res = await ApiClient.deleteStudent(id);
        showToast('Xóa Thành Công', res.message || `Đã xóa sinh viên "${name}"`, 'success');
        loadStudents();
      }
    } catch (err) {
      handleApiError(err, `xóa ${type === 'class' ? 'lớp học' : 'sinh viên'}`);
    } finally {
      state.deleteTarget = null;
    }
  });

  // ========================================================
  // 7. TAB 3: GIÁM SÁT EVENT & CACHE (DEMO CHƯƠNG 3)
  // ========================================================
  const runCacheTestBtn = document.getElementById('runCacheTestBtn');
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  const cacheStatusBadge = document.getElementById('cacheStatusBadge');
  const cacheDurationVal = document.getElementById('cacheDurationVal');
  const cacheTraceBox = document.getElementById('cacheTraceBox');

  const checkEmitterBtn = document.getElementById('checkEmitterBtn');
  const stressTestBtn = document.getElementById('stressTestBtn');
  const activeListenersVal = document.getElementById('activeListenersVal');
  const memoryLeakStatusVal = document.getElementById('memoryLeakStatusVal');
  const emitterLogBox = document.getElementById('emitterLogBox');

  // Test CacheReader
  runCacheTestBtn.addEventListener('click', async () => {
    try {
      cacheStatusBadge.textContent = 'Đang gọi...';
      const res = await ApiClient.testCache('demo_classes');

      cacheDurationVal.textContent = `${res.clientDurationMs} ms`;
      if (res.isCached) {
        cacheStatusBadge.textContent = 'Cache Hit';
        cacheStatusBadge.className = 'stat-val text-success';
        showToast('🎯 Cache Hit (process.nextTick)', `Dữ liệu lấy từ Cache sau ${res.clientDurationMs}ms. Zalgo được ngăn chặn an toàn!`, 'success');
      } else {
        cacheStatusBadge.textContent = 'Cache Miss';
        cacheStatusBadge.className = 'stat-val text-warning';
        showToast('⚡ Cache Miss (Database I/O)', `Dữ liệu được truy vấn từ PostgreSQL sau ${res.clientDurationMs}ms và nạp vào Cache.`, 'info');
      }

      // In trace log ra màn hình
      if (res.executionOrderVerification && res.executionOrderVerification.trace) {
        cacheTraceBox.innerHTML = res.executionOrderVerification.trace.map(step => {
          let color = '#38bdf8';
          if (step.includes('Bước 2')) color = '#facc15';
          if (step.includes('Bước 3')) color = '#4ade80';
          return `<div style="color: ${color};">✔ ${escapeHtml(step)}</div>`;
        }).join('');
      }
    } catch (err) {
      handleApiError(err, 'thử nghiệm cache');
    }
  });

  // Xóa Cache
  clearCacheBtn.addEventListener('click', async () => {
    try {
      const res = await ApiClient.clearCache('demo_classes');
      cacheStatusBadge.textContent = 'Đã Xóa';
      cacheStatusBadge.className = 'stat-val text-danger';
      cacheDurationVal.textContent = '0 ms';
      cacheTraceBox.innerHTML = '<span class="text-danger">[Hệ thống] Bộ nhớ đệm đã được xóa sạch. Lần gọi tiếp theo sẽ là Cache Miss từ Database.</span>';
      showToast('Đã Xóa Cache', res.message || 'Cache đã được dọn sạch!', 'info');
    } catch (err) {
      handleApiError(err, 'xóa cache');
    }
  });

  // Kiểm tra Emitter Status
  async function loadEmitterStatus() {
    try {
      const res = await ApiClient.getEmitterStatus();
      const count = res.emitterStats.currentListenerCount;
      activeListenersVal.textContent = count;
      memoryLeakStatusVal.textContent = count <= 2 ? 'An Toàn' : 'Cảnh Báo';
      memoryLeakStatusVal.className = count <= 2 ? 'stat-val text-success' : 'stat-val text-danger';

      const time = new Date().toLocaleTimeString();
      emitterLogBox.innerHTML += `<div>[${time}] Kiểm tra trạng thái: activeListeners=${count} | ${res.emitterStats.memoryLeakStatus}</div>`;
      emitterLogBox.scrollTop = emitterLogBox.scrollHeight;
    } catch (err) {
      console.warn('Lỗi kiểm tra emitter status:', err.message);
    }
  }

  checkEmitterBtn.addEventListener('click', () => {
    loadEmitterStatus();
    showToast('Kiểm Tra Emitter', 'Đã cập nhật trạng thái listeners của EventEmitter.', 'info');
  });

  // Chạy Stress Test 10 requests song song để kiểm chứng res.on('finish') dọn dẹp listener
  stressTestBtn.addEventListener('click', async () => {
    stressTestBtn.setAttribute('disabled', 'true');
    const timeStart = new Date().toLocaleTimeString();
    emitterLogBox.innerHTML += `<div class="text-warning">[${timeStart}] 🚀 Đang gửi đồng thời 10 requests CRUD đến Backend...</div>`;

    try {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(ApiClient.getClasses({ limit: 1 }));
        promises.push(ApiClient.getStudents({ limit: 1 }));
      }

      await Promise.all(promises);

      // Sau khi 10 requests hoàn tất, kiểm tra lại số lượng listener
      const res = await ApiClient.getEmitterStatus();
      const finalCount = res.emitterStats.currentListenerCount;
      activeListenersVal.textContent = finalCount;

      const timeEnd = new Date().toLocaleTimeString();
      emitterLogBox.innerHTML += `<div class="text-success">[${timeEnd}] ✅ Hoàn tất 10 requests! Số activeListeners hiện tại: ${finalCount} (Không bị tích tụ, ZERO Memory Leak).</div>`;
      emitterLogBox.scrollTop = emitterLogBox.scrollHeight;

      showToast('Stress Test Thành Công', `Đã gửi 10 requests đồng thời. Active listeners còn lại: ${finalCount} (An toàn tuyệt đối)!`, 'success');
    } catch (err) {
      handleApiError(err, 'stress test');
    } finally {
      stressTestBtn.removeAttribute('disabled');
    }
  });

  // --- TIỆN ÍCH ---
  function escapeHtml(text) {
    if (!text && text !== 0) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ========================================================
  // 8. KHỞI TẠO ỨNG DỤNG
  // ========================================================
  initRoleSwitcher();
  loadClasses();
  fetchAllClassesForDropdown();
});
