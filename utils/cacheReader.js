/**
 * utils/cacheReader.js
 * Minh họa kiến thức Chương 3: Callbacks & Tránh lỗi Zalgo (Unleashing Zalgo)
 * 
 * Khái niệm:
 * - Một hàm bất đồng bộ phải LUÔN LUÔN bất đồng bộ trong 100% trường hợp.
 * - Nếu một hàm khi Cache Hit lại gọi callback() đồng bộ ngay lập tức, nhưng khi Cache Miss
 *   lại gọi callback() bất đồng bộ (sau khi query I/O), thì hàm đó mắc lỗi "Releasing Zalgo".
 * - Lỗi Zalgo làm đảo lộn thứ tự thực thi mã ngoài dự kiến (race conditions).
 * 
 * Giải pháp chuẩn Node.js:
 * - Khi có Cache Hit, bọc lời gọi callback bên trong `process.nextTick(() => callback(...))`
 *   để hoãn việc thực thi callback sang đầu hàng đợi microtask, đảm bảo đồng nhất bất đồng bộ.
 */

const cache = new Map();

/**
 * Đọc dữ liệu có Cache sử dụng Callback Pattern chuẩn Node.js (err, data, isCached)
 * 
 * @param {string} key - Khóa cache
 * @param {Function} fetcherCallback - Hàm bất đồng bộ nạp dữ liệu khi cache miss: (callback) => void
 * @param {Function} callback - Callback chuẩn nhận (err, data, isCached)
 */
function readDataWithCache(key, fetcherCallback, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Callback phải là một hàm (Function)');
  }

  // 1. TRƯỜNG HỢP CACHE HIT
  if (cache.has(key)) {
    const cachedData = cache.get(key);

    // ⚠️ NẾU LÀM THẾ NÀY LÀ MẮC LỖI ZALGO (ĐỒNG BỘ NGUY HIỂM):
    // return callback(null, cachedData, true);

    // ✅ GIẢI PHÁP CHUẨN: Sử dụng process.nextTick() để đảm bảo 100% bất đồng bộ
    process.nextTick(() => {
      callback(null, cachedData, true);
    });
    return;
  }

  // 2. TRƯỜNG HỢP CACHE MISS (Chưa có trong cache, cần lấy từ DB/I/O)
  if (typeof fetcherCallback !== 'function') {
    return process.nextTick(() => {
      callback(new Error('fetcherCallback không hợp lệ khi cache miss'));
    });
  }

  // Gọi fetcher bất đồng bộ
  fetcherCallback((err, freshData) => {
    if (err) {
      return callback(err);
    }

    // Lưu vào bộ nhớ đệm
    cache.set(key, freshData);

    // Trả về dữ liệu tươi mới (isCached = false)
    callback(null, freshData, false);
  });
}

/**
 * Xóa cache theo key hoặc toàn bộ cache
 * @param {string} [key]
 */
function clearCache(key) {
  if (key) {
    return cache.delete(key);
  }
  cache.clear();
  return true;
}

/**
 * Lấy danh sách keys và kích thước cache hiện tại
 */
function getCacheInfo() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

module.exports = {
  readDataWithCache,
  clearCache,
  getCacheInfo
};
