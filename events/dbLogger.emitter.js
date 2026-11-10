const EventEmitter = require('events');

/**
 * DBLoggerEmitter kế thừa từ EventEmitter (Observer Pattern)
 * Dùng để phát sự kiện (emit) và lắng nghe sự kiện (listen)
 * cho mọi thao tác CRUD trong hệ thống.
 */
class DBLoggerEmitter extends EventEmitter {
  constructor() {
    super();
    // Giữ giới hạn listener mặc định hoặc điều chỉnh nếu cần
    this.setMaxListeners(50);
  }

  /**
   * Phương thức phát sự kiện thao tác Database
   * @param {Object} eventData
   * @param {string} eventData.requestId - Mã định danh request
   * @param {string} eventData.action - Tên thao tác: CREATE, READ, UPDATE, DELETE
   * @param {string} eventData.table - Tên bảng: lophoc, sinhvien
   * @param {Object} [eventData.data] - Dữ liệu liên quan
   * @param {string} [eventData.message] - Ghi chú hoặc thông điệp
   */
  logOperation(eventData) {
    const payload = {
      timestamp: new Date().toISOString(),
      ...eventData
    };
    this.emit('db:action', payload);
  }
}

// Khởi tạo singleton instance
const dbLogger = new DBLoggerEmitter();

// Listener hệ thống toàn cục (Global Observer) để ghi log tổng hợp
dbLogger.on('db:action', (payload) => {
  const { timestamp, action, table, requestId, message } = payload;
  console.log(`[GLOBAL AUDIT LOG] [${timestamp}] [Req: ${requestId || 'N/A'}] Action: ${action} | Table: ${table} | ${message || ''}`);
});

module.exports = dbLogger;
