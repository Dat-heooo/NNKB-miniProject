/**
 * public/js/api.js
 * Module API Client tập trung - Tự động gắn Role / Token xác thực vào mọi request
 */

const API_BASE = '/api';

class ApiClient {
  /**
   * Lấy Role hiện tại từ localStorage (mặc định là 'admin')
   */
  static getCurrentRole() {
    return localStorage.getItem('currentRole') || 'admin';
  }

  /**
   * Lưu Role vào localStorage
   */
  static setCurrentRole(role) {
    localStorage.setItem('currentRole', role);
  }

  /**
   * Helper gửi request với Header phân quyền tự động
   */
  static async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const role = this.getCurrentRole();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-user-role': role,
      'Authorization': `Bearer token-${role}`,
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || `Lỗi HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.warn(`[API ERROR] ${options.method || 'GET'} ${url} ->`, err.status || 500, err.message);
      throw err;
    }
  }

  // --- API LỚP HỌC (LOPHOC) ---
  static async getClasses(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/lophoc${query ? `?${query}` : ''}`);
  }

  static async getClassById(id) {
    return this.request(`/lophoc/${id}`);
  }

  static async createClass(classData) {
    return this.request('/lophoc', {
      method: 'POST',
      body: JSON.stringify(classData)
    });
  }

  static async updateClass(id, classData) {
    return this.request(`/lophoc/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classData)
    });
  }

  static async deleteClass(id) {
    return this.request(`/lophoc/${id}`, {
      method: 'DELETE'
    });
  }

  // --- API SINH VIÊN (SINHVIEN) ---
  static async getStudents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sinhvien${query ? `?${query}` : ''}`);
  }

  static async getStudentById(id) {
    return this.request(`/sinhvien/${id}`);
  }

  static async createStudent(studentData) {
    return this.request('/sinhvien', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
  }

  static async updateStudent(id, studentData) {
    return this.request(`/sinhvien/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    });
  }

  static async deleteStudent(id) {
    return this.request(`/sinhvien/${id}`, {
      method: 'DELETE'
    });
  }

  // --- API DEMO CHƯƠNG 3 (CACHE & EVENTS) ---
  static async testCache(key = 'demo_classes') {
    const start = performance.now();
    const data = await this.request(`/demo/cache-reader?key=${encodeURIComponent(key)}`);
    const duration = Math.round(performance.now() - start);
    return { ...data, clientDurationMs: duration };
  }

  static async clearCache(key = 'demo_classes') {
    return this.request(`/demo/cache-reader?key=${encodeURIComponent(key)}`, {
      method: 'DELETE'
    });
  }

  static async getEmitterStatus() {
    return this.request('/demo/emitter-status');
  }
}

window.ApiClient = ApiClient;
