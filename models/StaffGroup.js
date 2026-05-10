const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StaffGroup = sequelize.define('StaffGroup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'staff_groups',
  timestamps: true,
});

module.exports = StaffGroup;
