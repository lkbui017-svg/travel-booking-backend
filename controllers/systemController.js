const { FunctionGroup, Permission, StaffGroup, StaffGroupPermission } = require('../models');

/**
 * GET /api/system/function-groups - Danh sách nhóm chức năng
 */
async function getFunctionGroups(req, res) {
  try {
    const groups = await FunctionGroup.findAll({
      include: [{ model: Permission }],
      order: [['id', 'ASC']],
    });

    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy danh sách nhóm chức năng' });
  }
}

/**
 * POST /api/system/function-groups - Tạo nhóm chức năng mới
 */
async function createFunctionGroup(req, res) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Tên nhóm là bắt buộc' });
    }

    const group = await FunctionGroup.create({ name, description });

    res.status(201).json({
      message: 'Nhóm chức năng được tạo thành công',
      data: group,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo nhóm chức năng' });
  }
}

/**
 * PUT /api/system/function-groups/:id - Cập nhật nhóm chức năng
 */
async function updateFunctionGroup(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const group = await FunctionGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({ message: 'Nhóm chức năng không tồn tại' });
    }

    await group.update({ name: name || group.name, description });

    res.json({
      message: 'Nhóm chức năng được cập nhật thành công',
      data: group,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật nhóm chức năng' });
  }
}

/**
 * DELETE /api/system/function-groups/:id - Xóa nhóm chức năng
 */
async function deleteFunctionGroup(req, res) {
  try {
    const { id } = req.params;

    const group = await FunctionGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({ message: 'Nhóm chức năng không tồn tại' });
    }

    // Delete permissions in this group first
    await Permission.destroy({ where: { function_group_id: id } });
    await group.destroy();

    res.json({ message: 'Nhóm chức năng được xóa thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi xóa nhóm chức năng' });
  }
}

/**
 * GET /api/system/permissions - Danh sách tất cả quyền
 */
async function getPermissions(req, res) {
  try {
    const permissions = await Permission.findAll({
      include: [{ model: FunctionGroup }],
      order: [['function_group_id', 'ASC']],
    });

    res.json(permissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy danh sách quyền' });
  }
}

/**
 * POST /api/system/permissions - Tạo quyền mới
 */
async function createPermission(req, res) {
  try {
    const { function_group_id, action, description } = req.body;

    if (!function_group_id || !action) {
      return res.status(400).json({ message: 'Nhóm chức năng và tên quyền là bắt buộc' });
    }

    const permission = await Permission.create({
      function_group_id,
      action,
      description,
    });

    res.status(201).json({
      message: 'Quyền được tạo thành công',
      data: permission,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo quyền' });
  }
}

/**
 * DELETE /api/system/permissions/:id - Xóa quyền
 */
async function deletePermission(req, res) {
  try {
    const { id } = req.params;

    const permission = await Permission.findByPk(id);
    if (!permission) {
      return res.status(404).json({ message: 'Quyền không tồn tại' });
    }

    // Delete from staff_group_permissions first
    await StaffGroupPermission.destroy({ where: { permission_id: id } });
    await permission.destroy();

    res.json({ message: 'Quyền được xóa thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi xóa quyền' });
  }
}

/**
 * GET /api/system/staff-groups - Danh sách nhóm nhân viên
 */
async function getStaffGroups(req, res) {
  try {
    const groups = await StaffGroup.findAll({
      include: [
        {
          model: Permission,
          through: { attributes: [] },
          attributes: ['id', 'action', 'description'],
        },
      ],
      order: [['id', 'ASC']],
    });

    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy danh sách nhóm nhân viên' });
  }
}

/**
 * POST /api/system/staff-groups - Tạo nhóm nhân viên
 */
async function createStaffGroup(req, res) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Tên nhóm là bắt buộc' });
    }

    const group = await StaffGroup.create({ name, description });

    res.status(201).json({
      message: 'Nhóm nhân viên được tạo thành công',
      data: group,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo nhóm nhân viên' });
  }
}

/**
 * PUT /api/system/staff-groups/:id - Cập nhật nhóm nhân viên
 */
async function updateStaffGroup(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const group = await StaffGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({ message: 'Nhóm nhân viên không tồn tại' });
    }

    await group.update({ name: name || group.name, description });

    res.json({
      message: 'Nhóm nhân viên được cập nhật thành công',
      data: group,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật nhóm nhân viên' });
  }
}

/**
 * DELETE /api/system/staff-groups/:id - Xóa nhóm nhân viên
 */
async function deleteStaffGroup(req, res) {
  try {
    const { id } = req.params;

    const group = await StaffGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({ message: 'Nhóm nhân viên không tồn tại' });
    }

    // Delete permissions assignment
    await StaffGroupPermission.destroy({ where: { staff_group_id: id } });
    await group.destroy();

    res.json({ message: 'Nhóm nhân viên được xóa thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi xóa nhóm nhân viên' });
  }
}

/**
 * POST /api/system/staff-groups/:id/permissions - Gán quyền cho nhóm
 * Body: { permission_ids: [1, 2, 3] }
 */
async function assignPermissionsToGroup(req, res) {
  try {
    const { id } = req.params;
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({ message: 'permission_ids phải là một mảng' });
    }

    const group = await StaffGroup.findByPk(id);
    if (!group) {
      return res.status(404).json({ message: 'Nhóm nhân viên không tồn tại' });
    }

    // Clear existing permissions
    await StaffGroupPermission.destroy({ where: { staff_group_id: id } });

    // Add new permissions
    const assignments = permission_ids.map(permission_id => ({
      staff_group_id: id,
      permission_id,
    }));

    await StaffGroupPermission.bulkCreate(assignments);

    res.json({ message: 'Quyền được gán thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi gán quyền cho nhóm' });
  }
}

module.exports = {
  getFunctionGroups,
  createFunctionGroup,
  updateFunctionGroup,
  deleteFunctionGroup,
  getPermissions,
  createPermission,
  deletePermission,
  getStaffGroups,
  createStaffGroup,
  updateStaffGroup,
  deleteStaffGroup,
  assignPermissionsToGroup,
};
