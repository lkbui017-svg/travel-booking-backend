const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const adminController = require('../controllers/adminController');
const promoController = require('../controllers/promoController');

/**
 * GET /api/admin/employees - Danh sách nhân viên
 */
router.get('/employees', authenticate, authorize('admin.*'), adminController.getEmployees);

/**
 * POST /api/admin/employees - Thêm nhân viên
 */
router.post('/employees', authenticate, authorize('admin.*'), adminController.createEmployee);

/**
 * PUT /api/admin/employees/:id - Sửa nhân viên
 */
router.put('/employees/:id', authenticate, authorize('admin.*'), adminController.updateEmployee);

/**
 * GET /api/admin/customers - Danh sách khách hàng
 */
router.get('/customers', authenticate, authorize('customer.view'), adminController.getCustomers);

/**
 * Promo Codes Management
 */
router.get('/promos', authenticate, authorize('admin.*'), promoController.getAllPromos);
router.post('/promos', authenticate, authorize('admin.*'), promoController.createPromo);
router.put('/promos/:id', authenticate, authorize('admin.*'), promoController.updatePromo);
router.delete('/promos/:id', authenticate, authorize('admin.*'), promoController.deletePromo);

module.exports = router;
