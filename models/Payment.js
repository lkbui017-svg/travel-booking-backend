const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  vnpay_txn_ref: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  bank_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  response_code: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  transaction_no: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  pay_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('success', 'fail'),
    defaultValue: 'fail',
  },
}, {
  tableName: 'payments',
  timestamps: true,
});

module.exports = Payment;
