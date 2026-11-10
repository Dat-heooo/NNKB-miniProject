/**
 * tests/app.test.js
 * Bộ kiểm thử tự động toàn diện sử dụng Node.js Built-in Test Runner (node:test & node:assert)
 * Không cần cài thêm thư viện bên ngoài, chạy cực nhanh với: `node --test`
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../app');
const dbLogger = require('../events/dbLogger.emitter');
const { readDataWithCache, clearCache } = require('../utils/cacheReader');

let server;
let baseUrl;

before(async () => {
  // Khởi động HTTP server trên cổng ngẫu nhiên cho môi trường test
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[TEST RUNNER] Test server đang chạy tại: ${baseUrl}`);
      resolve();
    });
  });
});

after(async () => {
  // Dọn dẹp đóng server
  await new Promise((resolve) => server.close(resolve));
});

// Helper gửi request HTTP trả về { status, headers, body }
function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method,
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    if (body) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(url, reqOptions, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch {
          json = rawData;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ========================================================
// 1. KIỂM THỬ GIAO DIỆN TĨNH & API INFO
// ========================================================
describe('1. Static Frontend & Health Check', () => {
  test('GET / trả về mã 200 và nội dung HTML của CMS Dashboard', async () => {
    const res = await request('GET', '/');
    assert.equal(res.status, 200);
    assert.match(String(res.body), /CMS Dashboard - Quản Lý Sinh Viên/);
  });

  test('GET /api/info trả về trạng thái online của server', async () => {
    const res = await request('GET', '/api/info');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'online');
  });
});

// ========================================================
// 2. KIỂM THỬ PHÂN QUYỀN RBAC (401, 403, 200)
// ========================================================
describe('2. Phân Quyền RBAC Middleware', () => {
  test('Không gửi header xác thực -> 401 Unauthorized', async () => {
    const res = await request('GET', '/api/lophoc');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  test('Vai trò Student gọi GET /api/lophoc -> 200 OK (có quyền READ)', async () => {
    const res = await request('GET', '/api/lophoc?limit=2', { 'x-user-role': 'student' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('Vai trò Student gọi DELETE /api/lophoc/1 -> 403 Forbidden (không có quyền DELETE)', async () => {
    const res = await request('DELETE', '/api/lophoc/1', { 'x-user-role': 'student' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'FORBIDDEN');
    assert.equal(res.body.requiredPermission, 'DELETE');
  });

  test('Vai trò Teacher gọi DELETE /api/lophoc/1 -> 403 Forbidden (chỉ admin mới có quyền DELETE)', async () => {
    const res = await request('DELETE', '/api/lophoc/1', { 'x-user-role': 'teacher' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  test('Gửi Authorization: Bearer token-admin -> Xác thực thành công quyền Admin', async () => {
    const res = await request('GET', '/api/lophoc?limit=1', { 'Authorization': 'Bearer token-admin' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});

// ========================================================
// 3. KIỂM THỬ CRUD LỚP HỌC & SINH VIÊN
// ========================================================
describe('3. CRUD APIs (LopHoc & SinhVien)', () => {
  let createdClassId;
  let createdStudentId;

  test('POST /api/lophoc tạo mới lớp học (Quyền CREATE)', async () => {
    const newClass = {
      ma_lop: `TEST-${Date.now()}`,
      ten_lop: 'Lớp Tự Động Hóa Test',
      khoa: 'Công nghệ Thông tin',
      nien_khoa: '2024-2028'
    };

    const res = await request('POST', '/api/lophoc', { 'x-user-role': 'teacher' }, newClass);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    createdClassId = res.body.data.id;
  });

  test('PUT /api/lophoc/:id cập nhật lớp học (Quyền UPDATE)', async () => {
    assert.ok(createdClassId, 'Cần ID lớp học vừa tạo');
    const updateData = { ten_lop: 'Lớp Tự Động Hóa Test Đã Sửa' };
    const res = await request('PUT', `/api/lophoc/${createdClassId}`, { 'x-user-role': 'teacher' }, updateData);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.ten_lop, 'Lớp Tự Động Hóa Test Đã Sửa');
  });

  test('POST /api/sinhvien tạo mới sinh viên thuộc lớp trên', async () => {
    assert.ok(createdClassId, 'Cần ID lớp học vừa tạo');
    const newStudent = {
      ma_sv: `SVTEST${Date.now().toString().slice(-6)}`,
      ho_ten: 'Nguyễn Văn Test Auto',
      ngay_sinh: '2004-05-15',
      gioi_tinh: 'Nam',
      email: `test.${Date.now()}@student.edu.vn`,
      so_dien_thoai: '0988123456',
      dia_chi: 'Hà Nội',
      lop_id: createdClassId
    };

    const res = await request('POST', '/api/sinhvien', { 'x-user-role': 'teacher' }, newStudent);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    createdStudentId = res.body.data.id;
  });

  test('DELETE /api/sinhvien/:id xóa sinh viên (Quyền DELETE)', async () => {
    assert.ok(createdStudentId, 'Cần ID sinh viên');
    const res = await request('DELETE', `/api/sinhvien/${createdStudentId}`, { 'x-user-role': 'admin' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('DELETE /api/lophoc/:id xóa lớp học (Quyền DELETE)', async () => {
    assert.ok(createdClassId, 'Cần ID lớp học');
    const res = await request('DELETE', `/api/lophoc/${createdClassId}`, { 'x-user-role': 'admin' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});

// ========================================================
// 4. KIỂM THỬ CHƯƠNG 3: CHỐNG RÒ RỈ BỘ NHỚ (EVENT EMITTER)
// ========================================================
describe('4. EventEmitter & Ngăn ngừa Memory Leak', () => {
  test('Sau khi request hoàn tất, listenerCount không bị tích tụ (Zero Leak)', async () => {
    const initialCount = dbLogger.listenerCount('db:action');

    // Gửi 5 request liên tiếp
    for (let i = 0; i < 5; i++) {
      await request('GET', '/api/lophoc?limit=1', { 'x-user-role': 'student' });
    }

    // Kiểm tra listenerCount sau khi các response đã finish
    const finalCount = dbLogger.listenerCount('db:action');
    assert.equal(finalCount, initialCount, 'Số lượng listener sau khi response finish phải quay về đúng ban đầu, không được tích tụ!');
  });
});

// ========================================================
// 5. KIỂM THỬ CHƯƠNG 3: TRÁNH LỖI ZALGO (PROCESS.NEXTTICK)
// ========================================================
describe('5. Callback & Tránh lỗi Zalgo (cacheReader)', () => {
  test('Khi Cache Hit, callback PHẢI LUÔN chạy bất đồng bộ sau lời gọi hàm', (t, done) => {
    clearCache('test_zalgo_key');
    const trace = [];

    // Lần 1: Nạp dữ liệu vào cache
    readDataWithCache(
      'test_zalgo_key',
      (cb) => cb(null, { dummy: 'data' }),
      (err, data, isCached) => {
        assert.equal(isCached, false, 'Lần 1 phải là Cache Miss');

        // Lần 2: Cache Hit - Kiểm tra tính bất đồng bộ của process.nextTick()
        trace.push('1. Trước khi gọi hàm');

        readDataWithCache(
          'test_zalgo_key',
          null,
          (err2, data2, isCached2) => {
            assert.equal(isCached2, true, 'Lần 2 phải là Cache Hit');
            trace.push('3. Trong callback');

            // Khẳng định: Bước 2 (đồng bộ) phải chạy trước Bước 3 (callback)
            assert.deepEqual(trace, [
              '1. Trước khi gọi hàm',
              '2. Sau khi gọi hàm',
              '3. Trong callback'
            ], 'Callback khi Cache Hit phải luôn bất đồng bộ để tránh lỗi Zalgo!');

            done();
          }
        );

        trace.push('2. Sau khi gọi hàm');
      }
    );
  });
});
