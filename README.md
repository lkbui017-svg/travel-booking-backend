# Travel Booking Backend

Node.js/Express API backend cho Website Đặt Tour Du Lịch.

## Cài đặt

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình .env
Sao chép file `.env` và điền các thông tin cần thiết:
- Database credentials
- JWT secret
- Google OAuth credentials
- VNPAY merchant code
- Email credentials (Gmail App Password)

### 3. Khởi động database
Sử dụng Laragon:
1. Mở HeidiSQL
2. Tạo database `travel_db` với charset `utf8mb4`

### 4. Seed database
```bash
npm run seed
```

Lệnh này sẽ tạo:
- 5 roles (super_admin, admin, staff, customer, guest)
- 6 function groups
- 17 permissions
- 3 staff groups
- 6 users (1 super_admin, 1 admin, 3 staff, 2 customers)
- 4 sample tours

**Test Credentials:**
- Super Admin: `superadmin@travel.com` / `Admin@123`
- Admin: `admin@travel.com` / `Admin@456`
- Staff: `sales@travel.com`, `ops@travel.com`, `support@travel.com` / `Staff@123`
- Customer: `customer1@travel.com`, `customer2@travel.com` / `Customer@123`

### 5. Khởi động server
```bash
npm run dev
```

Server sẽ chạy trên `http://localhost:5000`

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Đăng ký tài khoản
- `POST /login` - Đăng nhập email/password
- `POST /google` - Đăng nhập Google
- `GET /me` - Lấy thông tin người dùng hiện tại

### Tours (`/api/tours`)
- `GET /` - Danh sách tour (phân trang, tìm kiếm)
- `GET /:id` - Chi tiết tour
- `POST /` - Tạo tour (quyền: tour.create)
- `PUT /:id` - Cập nhật tour (quyền: tour.edit)
- `DELETE /:id` - Xóa tour (quyền: tour.delete)

### Bookings (`/api/bookings`)
- `POST /` - Tạo booking (yêu cầu đăng nhập)
- `GET /my` - Lịch sử booking cá nhân
- `GET /` - Xem tất cả booking (quyền: booking.view)
- `GET /:id` - Chi tiết booking
- `PUT /:id/status` - Cập nhật trạng thái (quyền: booking.update)

### Payment (`/api/payment`)
- `POST /create` - Tạo giao dịch VNPAY
- `GET /vnpay-return` - Xử lý callback từ VNPAY
- `GET /status/:txnRef` - Kiểm tra trạng thái giao dịch

### Chatbot (`/api/chatbot`)
- `POST /message` - Gửi tin nhắn chatbot
- `GET /logs` - Xem chatbot logs (quyền: chatbot.view)
- `DELETE /logs/:id` - Xóa log (quyền: chatbot.delete)

### Admin (`/api/admin`)
- `GET /employees` - Danh sách nhân viên
- `POST /employees` - Thêm nhân viên
- `PUT /employees/:id` - Cập nhật nhân viên
- `GET /customers` - Danh sách khách hàng

### System (Super Admin) (`/api/system`)
- `GET /function-groups` - Nhóm chức năng
- `POST /function-groups` - Tạo nhóm chức năng
- `PUT /function-groups/:id` - Cập nhật nhóm chức năng
- `DELETE /function-groups/:id` - Xóa nhóm chức năng
- `GET /permissions` - Danh sách quyền
- `POST /permissions` - Tạo quyền mới
- `DELETE /permissions/:id` - Xóa quyền
- `GET /staff-groups` - Danh sách nhóm nhân viên
- `POST /staff-groups` - Tạo nhóm nhân viên
- `PUT /staff-groups/:id` - Cập nhật nhóm nhân viên
- `DELETE /staff-groups/:id` - Xóa nhóm nhân viên
- `POST /staff-groups/:id/permissions` - Gán quyền cho nhóm

## Cấu trúc thư mục

```
backend/
├── config/              # Các file cấu hình
│   ├── db.js           # Kết nối Sequelize
│   ├── google.js       # Google OAuth
│   ├── vnpay.js        # VNPAY config
│   ├── mailer.js       # Email SMTP
│   └── dialogflow.js   # Dialogflow config
├── models/             # Sequelize models
├── controllers/        # Business logic
├── middlewares/        # Express middlewares
├── routes/             # API routes
├── seeds/              # Database seed
├── .env                # Environment variables
├── server.js           # Main entry point
└── package.json
```

## Phân quyền

### Roles
- **super_admin**: Toàn quyền, quản lý hệ thống
- **admin**: Quản lý nội dung, người dùng (trừ phân quyền)
- **staff**: Quyền giới hạn theo nhóm (Sales, Operations, Support)
- **customer**: Quyền đặt tour, xem lịch sử cá nhân
- **guest**: Không có quyền truy cập API

### Permission System
- Mỗi role/staff_group có một danh sách quyền (permissions)
- JWT token chứa danh sách quyền của user
- Middleware `authorize()` kiểm tra quyền trước khi thực thi controller
- Super admin lúc nào cũng được phép

## Bảo mật

- Mật khẩu mã hóa bcryptjs (salt rounds 10)
- JWT token với thời hạn 24 giờ
- CORS chỉ cho phép frontend URL
- Validate input bằng express-validator
- Xác minh chữ ký VNPAY trước khi cập nhật

## Troubleshooting

### Lỗi kết nối database
- Kiểm tra Laragon MySQL đang chạy
- Kiểm tra thông tin DB trong .env
- Tạo database `travel_db` nếu chưa có

### Lỗi email không gửi được
- Dùng Gmail App Password, không phải mật khẩu tài khoản
- Bật "Less secure app access" nếu cần

### Lỗi VNPAY
- Dùng sandbox VNPAY để test
- Kiểm tra VNPAY_TMNCODE và VNPAY_HASHSECRET

## Liên hệ & Hỗ trợ

Nếu có vấn đề, vui lòng kiểm tra logs server hoặc tạo issue.
