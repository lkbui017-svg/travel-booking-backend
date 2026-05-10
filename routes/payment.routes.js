const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const paymentController = require('../controllers/paymentController');

/**
 * POST /api/payment/create - Tạo giao dịch VNPAY
 */
router.post('/create', authenticate, paymentController.createPayment);

/**
 * GET /api/payment/vnpay-return - Xử lý kết quả từ VNPAY
 */
router.get('/vnpay-return', paymentController.handleVnpayReturn);

/**
 * GET /api/payment/status/:txnRef - Kiểm tra trạng thái
 */
router.get('/status/:txnRef', paymentController.getPaymentStatus);

module.exports = router;
