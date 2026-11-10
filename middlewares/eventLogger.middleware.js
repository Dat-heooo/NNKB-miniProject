const dbLogger = require('../events/dbLogger.emitter');

/**
 * Middleware đăng ký và giải phóng EventEmitter listener cho từng HTTP Request
 * 
 * Mục đích:
 * 1. Gán req.requestId định danh request.
 * 2. Đăng ký listener để nhận các sự kiện CRUD phát sinh trong suốt vòng đời của request.
 * 3. Lắng nghe sự kiện 'finish' của response để removeListener ngay lập tức,
 *    tránh tích tụ listeners gây rò rỉ bộ nhớ (Memory Leak).
 */
const eventLoggerMiddleware = (req, res, next) => {
  const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Request-scoped listener: Chỉ xử lý sự kiện thuộc về request hiện tại
  const requestLogHandler = (logData) => {
    if (logData.requestId === req.requestId) {
      console.log(`📡 [REQ OBSERVER: ${req.requestId}] Đã nhận sự kiện [${logData.action}] trên bảng [${logData.table}]: ${logData.message || ''}`);
    }
  };

  // 1. Đăng ký listener vào EventEmitter
  dbLogger.on('db:action', requestLogHandler);

  // 2. HỦY ĐĂNG KÝ KHI RESPONSE HOÀN TẤT (Ngăn ngừa Memory Leak)
  res.on('finish', () => {
    dbLogger.removeListener('db:action', requestLogHandler);
    console.log(`🧹 [CLEANUP] Request ${req.requestId} kết thúc (Status ${res.statusCode}). Đã removeListener thành công. Số listeners còn lại: ${dbLogger.listenerCount('db:action')}`);
  });

  // Đảm bảo nếu kết nối bị đóng giữa chừng (client ngắt đột ngột) cũng giải phóng listener
  res.on('close', () => {
    dbLogger.removeListener('db:action', requestLogHandler);
  });

  next();
};

module.exports = eventLoggerMiddleware;
