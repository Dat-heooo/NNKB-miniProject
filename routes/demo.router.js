const express = require('express');
const router = express.Router();
const db = require('../models');
const { readDataWithCache, clearCache, getCacheInfo } = require('../utils/cacheReader');
const dbLogger = require('../events/dbLogger.emitter');

/**
 * [GET] /api/demo/cache-reader
 * Minh họa đọc dữ liệu có cache dùng Callback và process.nextTick() chống lỗi Zalgo.
 */
router.get('/cache-reader', (req, res) => {
  const cacheKey = req.query.key || 'lophoc_top5';
  const executionTrace = [];

  executionTrace.push('Bước 1: [Đồng bộ] Bắt đầu gọi readDataWithCache');

  readDataWithCache(
    cacheKey,
    // fetcherCallback: thực hiện khi cache miss
    (callback) => {
      executionTrace.push('Bước I/O: [Bất đồng bộ] Cache Miss -> Truy vấn PostgreSQL...');
      db.LopHoc.findAll({
        limit: 5,
        attributes: ['id', 'ma_lop', 'ten_lop', 'khoa', 'nien_khoa']
      })
        .then(classes => callback(null, classes))
        .catch(err => callback(err));
    },
    // callback chính nhận kết quả
    (err, data, isCached) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message || 'Lỗi khi đọc dữ liệu'
        });
      }

      executionTrace.push(`Bước 3: [Callback hoàn tất] isCached = ${isCached} (${isCached ? 'Cache Hit' : 'Cache Miss'})`);

      return res.status(200).json({
        success: true,
        message: isCached
          ? '🎯 Cache Hit: Dữ liệu lấy từ bộ nhớ đệm, callback được đẩy qua process.nextTick() đảm bảo 100% bất đồng bộ (tránh lỗi Zalgo).'
          : '⚡ Cache Miss: Dữ liệu truy vấn từ PostgreSQL và vừa được nạp vào cache.',
        isCached,
        zalgoProtected: true,
        executionOrderVerification: {
          note: 'Quan sát: Bước 2 (đồng bộ) LUÔN LUÔN chạy trước Bước 3 (callback), ngay cả khi có sẵn Cache.',
          trace: executionTrace
        },
        cacheKey,
        cacheInfo: getCacheInfo(),
        data
      });
    }
  );

  executionTrace.push('Bước 2: [Đồng bộ] Ngay sau lời gọi readDataWithCache');
});

/**
 * [DELETE] /api/demo/cache-reader
 * Xóa cache để thử nghiệm lại từ đầu
 */
router.delete('/cache-reader', (req, res) => {
  const { key } = req.query;
  clearCache(key);
  res.status(200).json({
    success: true,
    message: key ? `Đã xóa cache cho key '${key}'` : 'Đã xóa toàn bộ cache!',
    cacheInfo: getCacheInfo()
  });
});

/**
 * [GET] /api/demo/emitter-status
 * Kiểm tra trạng thái EventEmitter và xác thực không bị rò rỉ listener
 */
router.get('/emitter-status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Trạng thái EventEmitter (Observer Pattern)',
    emitterStats: {
      eventName: 'db:action',
      currentListenerCount: dbLogger.listenerCount('db:action'),
      maxListeners: dbLogger.getMaxListeners(),
      memoryLeakStatus: 'An toàn (Request-scoped listener được removeListener khi response finish)'
    }
  });
});

module.exports = router;
