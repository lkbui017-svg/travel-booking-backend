const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FunctionGroup = sequelize.define('FunctionGroup', {
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
  tableName: 'function_groups',
  timestamps: true,
});

module.exports = FunctionGroup;
