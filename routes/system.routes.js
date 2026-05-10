const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const systemController = require('../controllers/systemController');

/**
 * Function Groups
 */
router.get('/function-groups', authenticate, authorize('system.manage_permissions'), systemController.getFunctionGroups);
router.post('/function-groups', authenticate, authorize('system.manage_permissions'), systemController.createFunctionGroup);
router.put('/function-groups/:id', authenticate, authorize('system.manage_permissions'), systemController.updateFunctionGroup);
router.delete('/function-groups/:id', authenticate, authorize('system.manage_permissions'), systemController.deleteFunctionGroup);

/**
 * Permissions
 */
router.get('/permissions', authenticate, authorize('system.manage_permissions'), systemController.getPermissions);
router.post('/permissions', authenticate, authorize('system.manage_permissions'), systemController.createPermission);
router.delete('/permissions/:id', authenticate, authorize('system.manage_permissions'), systemController.deletePermission);

/**
 * Staff Groups
 */
router.get('/staff-groups', authenticate, authorize('system.manage_permissions'), systemController.getStaffGroups);
router.post('/staff-groups', authenticate, authorize('system.manage_permissions'), systemController.createStaffGroup);
router.put('/staff-groups/:id', authenticate, authorize('system.manage_permissions'), systemController.updateStaffGroup);
router.delete('/staff-groups/:id', authenticate, authorize('system.manage_permissions'), systemController.deleteStaffGroup);

/**
 * Assign permissions to staff groups
 */
router.post('/staff-groups/:id/permissions', authenticate, authorize('system.manage_permissions'), systemController.assignPermissionsToGroup);

module.exports = router;
