const { User, Role, StaffGroup, Permission } = require('../models');
const { createToken } = require('./authController');

/**
 * GET /api/admin/employees - Danh sách staff
 */
async function getEmployees(req, res) {
  try {
    const { page = 1, limit = 10, staff_group_id = null } = req.query;
    const offset = (page - 1) * limit;

    const where = { role_id: { [require('sequelize').Op.in]: [3] } }; // role_id = 3 is staff
    if (staff_group_id) where.staff_group_id = staff_group_id;

    const employees = await User.findAndCountAll({
      where,
      include: [
        { model: Role, attributes: ['name'] },
        { model: StaffGroup, attributes: ['id', 'name'] },
      ],
      offset: parseInt(offset),
      limit: parseInt(limit),
      attributes: { exclude: ['password_hash'] },
    });

    res.json({
      data: employees.rows,
      pagination: {
        total: employees.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(employees.count / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy danh sách nhân viên' });
  }
}

/**
 * POST /api/admin/employees - Thêm nhân viên (super_admin)
 */
async function createEmployee(req, res) {
  try {
    const { email, password, full_name, phone, employee_code, staff_group_id } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Email, mật khẩu và họ tên là bắt buộc' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    // Get staff role
    const staffRole = await Role.findOne({ where: { name: 'staff' } });

    const employee = await User.create({
      email,
      password_hash: password,
      full_name,
      phone,
      employee_code,
      staff_group_id,
      role_id: staffRole.id,
    });

    res.status(201).json({
      message: 'Nhân viên được thêm thành công',
      data: {
        ...employee.toJSON(),
        password_hash: undefined,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi thêm nhân viên' });
  }
}

/**
 * PUT /api/admin/employees/:id - Sửa nhân viên
 */
async function updateEmployee(req, res) {
  try {
    const { id } = req.params;
    const { full_name, phone, staff_group_id, is_active } = req.body;

    const employee = await User.findByPk(id);
    if (!employee) {
      return res.status(404).json({ message: 'Nhân viên không tồn tại' });
    }

    await employee.update({
      full_name: full_name || employee.full_name,
      phone: phone || employee.phone,
      staff_group_id: staff_group_id !== undefined ? staff_group_id : employee.staff_group_id,
      is_active: is_active !== undefined ? is_active : employee.is_active,
    });

    res.json({
      message: 'Nhân viên được cập nhật thành công',
      data: {
        ...employee.toJSON(),
        password_hash: undefined,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật nhân viên' });
  }
}

/**
 * GET /api/admin/customers - Danh sách khách hàng
 */
async function getCustomers(req, res) {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const { Op } = require('sequelize');

    const where = {
      role_id: { [Op.in]: [4, 5] }, // customer or guest
      email: { [Op.like]: `%${search}%` },
    };

    const customers = await User.findAndCountAll({
      where,
      include: [{ model: Role, attributes: ['name'] }],
      offset: parseInt(offset),
      limit: parseInt(limit),
      attributes: { exclude: ['password_hash'] },
    });

    res.json({
      data: customers.rows,
      pagination: {
        total: customers.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(customers.count / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy danh sách khách hàng' });
  }
}

module.exports = {
  getEmployees,
  createEmployee,
  updateEmployee,
  getCustomers,
};
