const { Blog, User } = require('../models');

/**
 * GET /api/blogs - Get all approved blogs
 */
async function getApprovedBlogs(req, res) {
  try {
    const blogs = await Blog.findAll({
      where: { status: 'approved' },
      include: [{ model: User, as: 'author', attributes: ['full_name'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(blogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải danh sách blog' });
  }
}

/**
 * GET /api/blogs/:id - Get blog details
 */
async function getBlogDetail(req, res) {
  try {
    const { id } = req.params;
    const blog = await Blog.findByPk(id, {
      include: [{ model: User, as: 'author', attributes: ['full_name'] }],
    });

    if (!blog) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    // Only allow viewing if approved, or if user is author/admin
    if (blog.status !== 'approved') {
      if (!req.user || (req.user.id !== blog.author_id && !['admin', 'super_admin'].includes(req.user.role))) {
        return res.status(403).json({ message: 'Bài viết đang chờ duyệt' });
      }
    }

    res.json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải chi tiết blog' });
  }
}

/**
 * POST /api/blogs - Customer creates a blog (pending status)
 */
async function createBlog(req, res) {
  try {
    const { title, summary, content, category, image_url } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Tiêu đề và nội dung là bắt buộc' });
    }

    const newBlog = await Blog.create({
      title,
      summary,
      content,
      category: category || 'Cẩm nang',
      image_url,
      status: 'pending', // Luôn chờ duyệt
      author_id: req.user.id,
    });

    res.status(201).json({
      message: 'Bài viết đã được gửi và đang chờ Admin xét duyệt!',
      data: newBlog,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo bài viết' });
  }
}

/**
 * GET /api/blogs/admin/all - Get all blogs for Admin
 */
async function getAllBlogsAdmin(req, res) {
  try {
    const blogs = await Blog.findAll({
      include: [{ model: User, as: 'author', attributes: ['full_name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(blogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải danh sách blog cho Admin' });
  }
}

/**
 * PUT /api/blogs/admin/:id/status - Admin approve/reject
 */
async function updateBlogStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const blog = await Blog.findByPk(id);
    if (!blog) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    await blog.update({ status });

    res.json({ message: `Bài viết đã được ${status === 'approved' ? 'duyệt' : 'từ chối'}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái bài viết' });
  }
}

module.exports = {
  getApprovedBlogs,
  getBlogDetail,
  createBlog,
  getAllBlogsAdmin,
  updateBlogStatus,
};
