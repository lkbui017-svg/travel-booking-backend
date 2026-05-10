const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StaffGroupPermission = sequelize.define('StaffGroupPermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
}, {
  tableName: 'staff_group_permissions',
  timestamps: true,
});

module.exports = StaffGroupPermission;
