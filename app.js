require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models');

// Middleware & Routers
const eventLoggerMiddleware = require('./middlewares/eventLogger.middleware.js');
const lophocRouter = require('./routes/lophoc.router.js');
const sinhvienRouter = require('./routes/sinhvien.router.js');
const demoRouter = require('./routes/demo.router.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Middleware cơ bản
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Kiến thức Chương 3: Đăng ký Observer Middleware xử lý sự kiện & chống rò rỉ bộ nhớ (Memory Leak)
app.use(eventLoggerMiddleware);

// Phục vụ giao diện Frontend tĩnh từ thư mục public/
app.use(express.static('public'));

// Endpoint kiểm tra hoạt động server
app.get('/api/info', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Hệ thống Quản lý Lớp học & Sinh viên (ExpressJS + PostgreSQL + EventEmitter & Callbacks)',
    chapter3_features: {
      observer_pattern: 'events/dbLogger.emitter.js với res.on("finish", removeListener)',
      zalgo_safe_cache: '/api/demo/cache-reader'
    },
    documentation: {
      endpoints: {
        lophoc: '/api/lophoc',
        sinhvien: '/api/sinhvien',
        demo_cache_reader: '/api/demo/cache-reader',
        demo_emitter_status: '/api/demo/emitter-status'
      }
    }
  });
});

// Đăng ký Router
app.use('/api/lophoc', lophocRouter);
app.use('/api/sinhvien', sinhvienRouter);
app.use('/api/demo', demoRouter);

// Xử lý Route 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`
  });
});

// Middleware xử lý lỗi tập trung
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Lỗi máy chủ nội bộ!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Kết nối cơ sở dữ liệu và khởi động server
const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Đã kết nối cơ sở dữ liệu PostgreSQL thành công.');

    await db.sequelize.sync();
    console.log('✅ Sequelize models đã được đồng bộ.');

    app.listen(PORT, () => {
      console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Không thể kết nối tới cơ sở dữ liệu:', error.message);
    app.listen(PORT, () => {
      console.log(`⚠️ Server đang chạy ở chế độ dự phòng tại: http://localhost:${PORT}`);
    });
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
