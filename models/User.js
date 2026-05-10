const { DataTypes } = require('sequelize');
const bcryptjs = require('bcryptjs');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  google_id: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  employee_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  dob: { type: DataTypes.DATEONLY, allowNull: true },
  gender: { type: DataTypes.STRING(20), allowNull: true },
  id_card: { type: DataTypes.STRING(50), allowNull: true },
  id_card_date: { type: DataTypes.DATEONLY, allowNull: true },
  id_card_place: { type: DataTypes.STRING(255), allowNull: true },
  passport: { type: DataTypes.STRING(50), allowNull: true },
  passport_date: { type: DataTypes.DATEONLY, allowNull: true },
  passport_expire: { type: DataTypes.DATEONLY, allowNull: true },
  address: { type: DataTypes.STRING(255), allowNull: true },
  nationality: { type: DataTypes.STRING(50), allowNull: true },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcryptjs.hash(user.password_hash, 10);
      }
    },
  },
});

User.prototype.validatePassword = async function(password) {
  return bcryptjs.compare(password, this.password_hash);
};

module.exports = User;
