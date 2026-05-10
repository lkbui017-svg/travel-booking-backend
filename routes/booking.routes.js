const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const bookingController = require('../controllers/bookingController');

/**
 * POST /api/bookings/validate-promo - Xác thực mã giảm giá
 */
router.post('/validate-promo', authenticate, bookingController.validatePromoCode);

/**
 * POST /api/bookings - Khách hàng đặt tour
 */
router.post('/', authenticate, bookingController.createBooking);

/**
 * GET /api/bookings/my - Lịch sử booking của user
 */
router.get('/my', authenticate, bookingController.getMyBookings);

/**
 * GET /api/bookings - Xem tất cả booking (staff only)
 */
router.get('/', authenticate, authorize('booking.view'), bookingController.getAllBookings);

/**
 * GET /api/bookings/:id - Chi tiết booking
 */
router.get('/:id', authenticate, bookingController.getBookingDetail);

/**
 * PUT /api/bookings/:id/status - Cập nhật trạng thái
 */
router.put('/:id/status', authenticate, authorize('booking.update'), bookingController.updateBookingStatus);

/**
 * POST /api/bookings/:id/cancel - Khách tự hủy tour
 */
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);

module.exports = router;
