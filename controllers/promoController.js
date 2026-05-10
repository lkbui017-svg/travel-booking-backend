const { PromoCode } = require('../models');

/**
 * GET /api/admin/promos - Lấy danh sách mã giảm giá
 */
async function getAllPromos(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const promos = await PromoCode.findAndCountAll({
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      data: promos.rows,
      pagination: {
        total: promos.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(promos.count / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy danh sách mã giảm giá' });
  }
}

/**
 * POST /api/admin/promos - Tạo mã giảm giá mới
 */
async function createPromo(req, res) {
  try {
    const { code, discount_percentage, max_uses, expires_at } = req.body;

    if (!code || !discount_percentage || !expires_at) {
      return res.status(400).json({ message: 'Code, % giảm giá và ngày hết hạn là bắt buộc' });
    }

    const existingCode = await PromoCode.findOne({ where: { code: code.toUpperCase() } });
    if (existingCode) {
      return res.status(400).json({ message: 'Mã giảm giá đã tồn tại' });
    }

    const newPromo = await PromoCode.create({
      code: code.toUpperCase(),
      discount_percentage,
      max_uses: max_uses || 100,
      expires_at,
      is_active: true,
      current_uses: 0,
    });

    res.status(201).json({ message: 'Tạo mã giảm giá thành công', data: newPromo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo mã giảm giá' });
  }
}

/**
 * PUT /api/admin/promos/:id - Cập nhật trạng thái
 */
async function updatePromo(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const promo = await PromoCode.findByPk(id);
    if (!promo) {
      return res.status(404).json({ message: 'Mã không tồn tại' });
    }

    await promo.update({ is_active });
    res.json({ message: 'Cập nhật thành công', data: promo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật mã giảm giá' });
  }
}

/**
 * DELETE /api/admin/promos/:id - Xóa mã
 */
async function deletePromo(req, res) {
  try {
    const { id } = req.params;
    const promo = await PromoCode.findByPk(id);
    if (!promo) {
      return res.status(404).json({ message: 'Mã không tồn tại' });
    }

    await promo.destroy();
    res.json({ message: 'Xóa mã giảm giá thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi xóa mã giảm giá' });
  }
}

module.exports = {
  getAllPromos,
  createPromo,
  updatePromo,
  deletePromo,
};
