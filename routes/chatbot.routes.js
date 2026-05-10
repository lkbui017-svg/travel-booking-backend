const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const chatbotController = require('../controllers/chatbotController');

/**
 * POST /api/chatbot/webhook - Fulfillment webhook for Dialogflow
 * No authentication required (called by Dialogflow/Google Assistant)
 */
router.post('/webhook', chatbotController.handleFulfillmentWebhook);

/**
 * POST /api/chatbot/message - Gửi tin nhắn
 */
router.post('/message', chatbotController.sendMessage);

/**
 * GET /api/chatbot/logs - Xem logs
 */
router.get('/logs', authenticate, authorize('chatbot.view'), chatbotController.getChatbotLogs);

/**
 * DELETE /api/chatbot/logs/:id - Xóa log
 */
router.delete('/logs/:id', authenticate, authorize('chatbot.delete'), chatbotController.deleteLog);

module.exports = router;
