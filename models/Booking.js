const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  departure_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  adults: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  children: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
    defaultValue: 'pending',
  },
  customer_info: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  payment_method: {
    type: DataTypes.ENUM('vnpay', 'cash'),
    defaultValue: 'vnpay',
  },
}, {
  tableName: 'bookings',
  timestamps: true,
});

module.exports = Booking;
