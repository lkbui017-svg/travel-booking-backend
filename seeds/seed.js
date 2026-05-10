require('dotenv').config();
const {
  sequelize,
  Role,
  FunctionGroup,
  Permission,
  StaffGroup,
  StaffGroupPermission,
  User,
  Tour,
} = require('../models');
const bcryptjs = require('bcryptjs');

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Disable foreign key checks to allow dropping tables
    await sequelize.query('SET FOREIGN_KEY_CHECKS=0;');
    
    // Drop all tables manually
    await sequelize.query('DROP TABLE IF EXISTS `bookings`;');
    await sequelize.query('DROP TABLE IF EXISTS `payments`;');
    await sequelize.query('DROP TABLE IF EXISTS `chatbot_logs`;');
    await sequelize.query('DROP TABLE IF EXISTS `admin_logs`;');
    await sequelize.query('DROP TABLE IF EXISTS `staff_group_permissions`;');
    await sequelize.query('DROP TABLE IF EXISTS `staff_groups`;');
    await sequelize.query('DROP TABLE IF EXISTS `permissions`;');
    await sequelize.query('DROP TABLE IF EXISTS `function_groups`;');
    await sequelize.query('DROP TABLE IF EXISTS `tours`;');
    await sequelize.query('DROP TABLE IF EXISTS `users`;');
    await sequelize.query('DROP TABLE IF EXISTS `roles`;');
    
    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS=1;');
    
    // Sync database
    await sequelize.sync({ force: false });
    console.log('✓ Database synchronized');

    // 1. Create Roles
    const roles = await Role.bulkCreate([
      { name: 'super_admin', description: 'Quản trị hệ thống' },
      { name: 'admin', description: 'Quản lý' },
      { name: 'staff', description: 'Nhân viên' },
      { name: 'customer', description: 'Khách hàng' },
      { name: 'guest', description: 'Khách vãng lai' },
    ]);
    console.log('✓ Created 5 roles');

    // 2. Create Function Groups
    const functionGroups = await FunctionGroup.bulkCreate([
      { name: 'Quản lý tour', description: 'Nhóm chức năng quản lý tour du lịch' },
      { name: 'Quản lý booking', description: 'Nhóm chức năng quản lý đặt tour' },
      { name: 'Quản lý khách hàng', description: 'Nhóm chức năng quản lý khách hàng' },
      { name: 'Báo cáo', description: 'Nhóm chức năng xem báo cáo' },
      { name: 'Chatbot', description: 'Nhóm chức năng quản lý chatbot' },
      { name: 'Hệ thống', description: 'Nhóm chức năng quản trị hệ thống' },
    ]);
    console.log('✓ Created 6 function groups');

    // 3. Create Permissions
    const permissions = await Permission.bulkCreate([
      // Tour permissions (function_group_id = 1)
      { function_group_id: 1, action: 'tour.view', description: 'Xem danh sách tour' },
      { function_group_id: 1, action: 'tour.create', description: 'Tạo tour mới' },
      { function_group_id: 1, action: 'tour.edit', description: 'Chỉnh sửa tour' },
      { function_group_id: 1, action: 'tour.delete', description: 'Xóa tour' },
      // Booking permissions (function_group_id = 2)
      { function_group_id: 2, action: 'booking.view', description: 'Xem danh sách booking' },
      { function_group_id: 2, action: 'booking.update', description: 'Cập nhật trạng thái booking' },
      { function_group_id: 2, action: 'booking.delete', description: 'Xóa booking' },
      // Customer permissions (function_group_id = 3)
      { function_group_id: 3, action: 'customer.view', description: 'Xem danh sách khách hàng' },
      { function_group_id: 3, action: 'customer.edit', description: 'Chỉnh sửa thông tin khách hàng' },
      { function_group_id: 3, action: 'customer.disable', description: 'Khóa tài khoản khách hàng' },
      // Report permissions (function_group_id = 4)
      { function_group_id: 4, action: 'report.view', description: 'Xem báo cáo' },
      { function_group_id: 4, action: 'report.export', description: 'Xuất báo cáo' },
      // Chatbot permissions (function_group_id = 5)
      { function_group_id: 5, action: 'chatbot.view', description: 'Xem chatbot logs' },
      { function_group_id: 5, action: 'chatbot.delete', description: 'Xóa chatbot logs' },
      // System permissions (function_group_id = 6)
      { function_group_id: 6, action: 'system.manage_permissions', description: 'Quản lý quyền hạn' },
      { function_group_id: 6, action: 'system.manage_users', description: 'Quản lý người dùng' },
      { function_group_id: 6, action: 'admin.*', description: 'Toàn bộ quyền quản lý' },
    ]);
    console.log('✓ Created 17 permissions');

    // 4. Create Staff Groups
    const staffGroups = await StaffGroup.bulkCreate([
      { name: 'Sales', description: 'Nhóm bán hàng' },
      { name: 'Operations', description: 'Nhóm điều hành' },
      { name: 'Support', description: 'Nhóm hỗ trợ' },
    ]);
    console.log('✓ Created 3 staff groups');

    // 5. Assign permissions to staff groups
    // Sales: tour.view, booking.view
    await StaffGroupPermission.bulkCreate([
      { staff_group_id: 1, permission_id: 1 }, // tour.view
      { staff_group_id: 1, permission_id: 5 }, // booking.view
      // Operations: tour.view, tour.create, tour.edit, booking.view, booking.update
      { staff_group_id: 2, permission_id: 1 }, // tour.view
      { staff_group_id: 2, permission_id: 2 }, // tour.create
      { staff_group_id: 2, permission_id: 3 }, // tour.edit
      { staff_group_id: 2, permission_id: 5 }, // booking.view
      { staff_group_id: 2, permission_id: 6 }, // booking.update
      // Support: chatbot.view, booking.view, customer.view
      { staff_group_id: 3, permission_id: 5 }, // booking.view
      { staff_group_id: 3, permission_id: 8 }, // customer.view
      { staff_group_id: 3, permission_id: 13 }, // chatbot.view
    ]);
    console.log('✓ Assigned permissions to staff groups');

    // 6. Create super_admin user
    const superAdmin = await User.create({
      email: 'superadmin@travel.com',
      password_hash: 'Admin@123',
      full_name: 'Super Admin',
      phone: '+84912345678',
      role_id: roles[0].id, // super_admin
      is_active: true,
    });
    console.log('✓ Created super_admin user (superadmin@travel.com / Admin@123)');

    // 7. Create admin user
    const admin = await User.create({
      email: 'admin@travel.com',
      password_hash: 'Admin@456',
      full_name: 'Administrator',
      phone: '+84987654321',
      role_id: roles[1].id, // admin
      is_active: true,
    });
    console.log('✓ Created admin user (admin@travel.com / Admin@456)');

    // 8. Create staff users
    const staff1 = await User.create({
      email: 'sales@travel.com',
      password_hash: 'Staff@123',
      full_name: 'Sales Staff',
      phone: '+84912111111',
      employee_code: 'EMP001',
      role_id: roles[2].id, // staff
      staff_group_id: staffGroups[0].id, // Sales
      is_active: true,
    });
    const staff2 = await User.create({
      email: 'ops@travel.com',
      password_hash: 'Staff@123',
      full_name: 'Operations Staff',
      phone: '+84912222222',
      employee_code: 'EMP002',
      role_id: roles[2].id, // staff
      staff_group_id: staffGroups[1].id, // Operations
      is_active: true,
    });
    const staff3 = await User.create({
      email: 'support@travel.com',
      password_hash: 'Staff@123',
      full_name: 'Support Staff',
      phone: '+84912333333',
      employee_code: 'EMP003',
      role_id: roles[2].id, // staff
      staff_group_id: staffGroups[2].id, // Support
      is_active: true,
    });
    console.log('✓ Created 3 staff users');

    // 9. Create customer users
    const customer1 = await User.create({
      email: 'customer1@travel.com',
      password_hash: 'Customer@123',
      full_name: 'Nguyễn Văn A',
      phone: '+84901111111',
      role_id: roles[3].id, // customer
      is_active: true,
    });
    const customer2 = await User.create({
      email: 'customer2@travel.com',
      password_hash: 'Customer@123',
      full_name: 'Trần Thị B',
      phone: '+84902222222',
      role_id: roles[3].id, // customer
      is_active: true,
    });
    console.log('✓ Created 2 customer users');

    // 10. Create sample tours
    const tours = await Tour.bulkCreate([
      {
        title: 'Tour Hà Nội - Hạ Long 3 Ngày',
        description: 'Khám phá thủ đô Hà Nội và vịnh Hạ Long tuyệt đẹp',
        itinerary: 'Ngày 1: Hà Nội - Hạ Long\nNgày 2: Hạ Long\nNgày 3: Hạ Long - Hà Nội',
        duration: 3,
        price_per_person: 8500000,
        max_slots: 30,
        image_url: 'https://picsum.photos/300/200?random=1',
        is_active: true,
        created_by: admin.id,
      },
      {
        title: 'Tour Đà Lạt City 2 Ngày',
        description: 'Thành phố ngàn hoa - điểm du lịch lý tưởng',
        itinerary: 'Ngày 1: Sài Gòn - Đà Lạt\nNgày 2: Đà Lạt - Sài Gòn',
        duration: 2,
        price_per_person: 4200000,
        max_slots: 25,
        image_url: 'https://picsum.photos/300/200?random=2',
        is_active: true,
        created_by: admin.id,
      },
      {
        title: 'Tour Phú Quốc 4 Ngày 3 Đêm',
        description: 'Đảo ngọc - thiên đường du lịch hè',
        itinerary: 'Ngày 1-4: Nghỉ dưỡng tại Phú Quốc, tham quan các điểm du lịch',
        duration: 4,
        price_per_person: 12000000,
        max_slots: 40,
        image_url: 'https://picsum.photos/300/200?random=3',
        is_active: true,
        created_by: admin.id,
      },
      {
        title: 'Tour Sa Pa 3 Ngày 2 Đêm',
        description: 'Chinh phục đỉnh Fansipan, ngắm bình minh trên mây',
        itinerary: 'Ngày 1: Hà Nội - Sa Pa\nNgày 2: Chinh phục Fansipan\nNgày 3: Sa Pa - Hà Nội',
        duration: 3,
        price_per_person: 7800000,
        max_slots: 20,
        image_url: 'https://picsum.photos/300/200?random=4',
        is_active: true,
        created_by: staff2.id,
      },
    ]);
    console.log('✓ Created 4 sample tours');

    console.log('\n✓✓✓ Database seeded successfully! ✓✓✓');
    console.log('\nTest Credentials:');
    console.log('  Super Admin: superadmin@travel.com / Admin@123');
    console.log('  Admin:       admin@travel.com / Admin@456');
    console.log('  Sales Staff: sales@travel.com / Staff@123');
    console.log('  Ops Staff:   ops@travel.com / Staff@123');
    console.log('  Support:     support@travel.com / Staff@123');
    console.log('  Customer 1:  customer1@travel.com / Customer@123');
    console.log('  Customer 2:  customer2@travel.com / Customer@123');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
