const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TourStaff = sequelize.define('TourStaff', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
}, {
  tableName: 'tour_staffs',
  timestamps: true,
});

module.exports = TourStaff;
