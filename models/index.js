const sequelize = require('../config/db');
const Role = require('./Role');
const User = require('./User');
const FunctionGroup = require('./FunctionGroup');
const Permission = require('./Permission');
const StaffGroup = require('./StaffGroup');
const StaffGroupPermission = require('./StaffGroupPermission');
const Tour = require('./Tour');
const Booking = require('./Booking');
const Payment = require('./Payment');
const ChatbotLog = require('./ChatbotLog');
const AdminLog = require('./AdminLog');
const Blog = require('./Blog');
const PromoCode = require('./PromoCode');
const Ticket = require('./Ticket');
const TourStaff = require('./TourStaff');
const LiveLocation = require('./LiveLocation');

// Define associations
User.belongsTo(Role, { foreignKey: 'role_id' });
Role.hasMany(User, { foreignKey: 'role_id' });

User.belongsTo(StaffGroup, { foreignKey: 'staff_group_id', allowNull: true });
StaffGroup.hasMany(User, { foreignKey: 'staff_group_id' });

Permission.belongsTo(FunctionGroup, { foreignKey: 'function_group_id' });
FunctionGroup.hasMany(Permission, { foreignKey: 'function_group_id' });

StaffGroupPermission.belongsTo(StaffGroup, { foreignKey: 'staff_group_id' });
StaffGroup.hasMany(StaffGroupPermission, { foreignKey: 'staff_group_id' });

StaffGroupPermission.belongsTo(Permission, { foreignKey: 'permission_id' });
Permission.hasMany(StaffGroupPermission, { foreignKey: 'permission_id' });

StaffGroup.belongsToMany(Permission, {
  through: StaffGroupPermission,
  foreignKey: 'staff_group_id',
  otherKey: 'permission_id',
});
Permission.belongsToMany(StaffGroup, {
  through: StaffGroupPermission,
  foreignKey: 'permission_id',
  otherKey: 'staff_group_id',
});

Tour.belongsTo(User, { foreignKey: 'created_by', as: 'creator', allowNull: true });
User.hasMany(Tour, { foreignKey: 'created_by', as: 'toursCreated' });

Booking.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Booking, { foreignKey: 'user_id' });

Booking.belongsTo(Tour, { foreignKey: 'tour_id' });
Tour.hasMany(Booking, { foreignKey: 'tour_id' });

Payment.belongsTo(Booking, { foreignKey: 'booking_id' });
Booking.hasOne(Payment, { foreignKey: 'booking_id' });

ChatbotLog.belongsTo(User, { foreignKey: 'user_id', allowNull: true });
User.hasMany(ChatbotLog, { foreignKey: 'user_id' });

AdminLog.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(AdminLog, { foreignKey: 'user_id' });

Blog.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
User.hasMany(Blog, { foreignKey: 'author_id', as: 'blogs' });

Tour.belongsToMany(User, { through: TourStaff, as: 'assignedStaff', foreignKey: 'tour_id', otherKey: 'staff_id' });
User.belongsToMany(Tour, { through: TourStaff, as: 'assignedTours', foreignKey: 'staff_id', otherKey: 'tour_id' });

Booking.hasMany(Ticket, { foreignKey: 'booking_id' });
Ticket.belongsTo(Booking, { foreignKey: 'booking_id' });

module.exports = {
  sequelize,
  Role,
  User,
  FunctionGroup,
  Permission,
  StaffGroup,
  StaffGroupPermission,
  Tour,
  Booking,
  Payment,
  ChatbotLog,
  AdminLog,
  Blog,
  PromoCode,
  Ticket,
  TourStaff,
  LiveLocation,
};
