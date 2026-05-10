const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  customer_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  customer_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  customer_age: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  customer_type: {
    type: DataTypes.ENUM('adult', 'child'),
    allowNull: false,
    defaultValue: 'adult',
  },
  is_checked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  check_in_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'tickets',
  timestamps: true,
});

module.exports = Ticket;
