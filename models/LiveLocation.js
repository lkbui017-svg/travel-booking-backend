const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LiveLocation = sequelize.define('LiveLocation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tour_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  departure_date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_guide: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'live_locations',
  timestamps: true,
});

module.exports = LiveLocation;
