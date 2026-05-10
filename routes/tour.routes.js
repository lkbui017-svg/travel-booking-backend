const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const tourController = require('../controllers/tourController');

/**
 * GET /api/tours - Danh sách tour
 */
router.get('/', tourController.getTours);

/**
 * GET /api/tours/employee/assigned - Lấy danh sách tour được phân công (cho nhân viên)
 */
router.get('/employee/assigned', authenticate, tourController.getAssignedTours);

/**
 * GET /api/tours/:id - Chi tiết tour
 */
router.get('/:id', tourController.getTourDetail);

/**
 * POST /api/tours - Tạo tour mới
 */
router.post('/', authenticate, authorize('tour.create'), tourController.createTour);

/**
 * PUT /api/tours/:id - Cập nhật tour
 */
router.put('/:id', authenticate, authorize('tour.edit'), tourController.updateTour);

/**
 * DELETE /api/tours/:id - Xóa tour
 */
router.delete('/:id', authenticate, authorize('tour.delete'), tourController.deleteTour);

/**
 * POST /api/tours/:id/assign - Phân công nhân viên
 */
router.post('/:id/assign', authenticate, authorize('tour.edit'), tourController.assignStaff);

/**
 * GET /api/tours/:id/tickets - Lấy danh sách vé/hành khách (admin/staff)
 */
router.get('/:id/tickets', authenticate, tourController.getTourTickets);
router.put('/tickets/:ticketId/check', authenticate, tourController.checkInTicket);

// Live Location Sharing
router.post('/:id/location', authenticate, tourController.updateLocation);
router.get('/:id/location', authenticate, tourController.getLocations);
router.post('/:id/location/end', authenticate, authorize(['admin', 'super_admin', 'staff']), tourController.endTourSession);

module.exports = router;
