const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const authenticate = require('../middlewares/auth');

// Public routes
router.get('/', blogController.getApprovedBlogs);
router.get('/:id', blogController.getBlogDetail); // Requires optional auth to view pending if author

// Customer routes
router.post('/', authenticate, blogController.createBlog);

// Admin routes
router.get('/admin/all', authenticate, blogController.getAllBlogsAdmin);
router.put('/admin/:id/status', authenticate, blogController.updateBlogStatus);

module.exports = router;
