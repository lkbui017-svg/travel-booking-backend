const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChatbotLog = sequelize.define('ChatbotLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  session_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  message_in: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  message_out: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'chatbot_logs',
  timestamps: true,
});

module.exports = ChatbotLog;
