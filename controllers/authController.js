const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { User, Role, StaffGroup, Permission } = require('../models');
const googleClient = require('../config/google');
require('dotenv').config();

/**
 * Helper: Tạo JWT token với permissions
 */
async function createToken(user) {
  // Include role info
  const userWithRole = await user.getRole();
  
  // Lấy permissions dựa trên role
  let permissions = [];
  
  if (userWithRole.name === 'super_admin') {
    permissions = ['*'];
  } else if (userWithRole.name === 'admin') {
    // Admin có tất cả quyền trừ system.*
    const allPermissions = await Permission.findAll();
    permissions = allPermissions
      .map(p => p.action)
      .filter(action => !action.startsWith('system.'));
  } else if (userWithRole.name === 'staff' && user.staff_group_id) {
    // Staff: lấy permissions từ staff_group
    const staffGroup = await user.getStaffGroup({
      include: [{ model: Permission, through: { attributes: [] } }],
    });
    if (staffGroup) {
      permissions = staffGroup.Permissions.map(p => p.action);
    }
  }
  
  const tokenPayload = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: userWithRole.name,
    permissions,
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });

  return token;
}

/**
 * POST /api/auth/register - Đăng ký tài khoản khách hàng
 */
async function register(req, res) {
  try {
    const { email, password, full_name, phone } = req.body;

    // Validate input
    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Email, mật khẩu và họ tên là bắt buộc' });
    }

    // Kiểm tra email tồn tại
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được đăng ký' });
    }

    // Lấy role customer
    const customerRole = await Role.findOne({ where: { name: 'customer' } });

    // Tạo user
    const user = await User.create({
      email,
      password_hash: password,
      full_name,
      phone,
      role_id: customerRole.id,
    });

    const token = await createToken(user);

    res.status(201).json({
      message: 'Đăng ký thành công',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: 'customer',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi đăng ký tài khoản' });
  }
}

/**
 * POST /api/auth/login - Đăng nhập bằng email/password
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
    }

    const user = await User.findOne({
      where: { email },
      include: [
        { model: Role },
        { model: StaffGroup, include: [{ model: Permission, through: { attributes: [] } }] },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
    }

    if (!user.is_active) {
      return res.status(401).json({ message: 'Tài khoản đã bị khóa' });
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
    }

    const token = await createToken(user);

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.Role.name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi đăng nhập' });
  }
}

/**
 * POST /api/auth/google - Đăng nhập/đăng ký qua Google
 */
async function googleLogin(req, res) {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({ message: 'Token Google là bắt buộc' });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();

    if (!googleClientId) {
      console.error('LỖI: GOOGLE_CLIENT_ID chưa được cấu hình trong file .env của Backend');
      return res.status(500).json({ message: 'Lỗi cấu hình hệ thống (Google ID)' });
    }

    // Verify token với Google
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenId,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const full_name = payload.name;

    // Tìm hoặc tạo user
    let user = await User.findOne({
      where: { email },
      include: [
        { model: Role },
        { model: StaffGroup, include: [{ model: Permission, through: { attributes: [] } }] },
      ],
    });

    if (!user) {
      const customerRole = await Role.findOne({ where: { name: 'customer' } });
      user = await User.create({
        google_id: googleId,
        email,
        full_name,
        role_id: customerRole.id,
      });
      user.Role = customerRole;
    } else {
      // Update google_id nếu chưa có
      if (!user.google_id) {
        await user.update({ google_id: googleId });
      }
    }

    if (!user.is_active) {
      return res.status(401).json({ message: 'Tài khoản đã bị khóa' });
    }

    const token = await createToken(user);

    res.json({
      message: 'Đăng nhập Google thành công',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.Role.name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi đăng nhập Google' });
  }
}

/**
 * GET /api/auth/me - Lấy thông tin người dùng hiện tại
 */
async function getCurrentUser(req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Role },
        { model: StaffGroup },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        dob: user.dob,
        gender: user.gender,
        id_card: user.id_card,
        id_card_date: user.id_card_date,
        id_card_place: user.id_card_place,
        passport: user.passport,
        passport_date: user.passport_date,
        passport_expire: user.passport_expire,
        address: user.address,
        nationality: user.nationality,
        role: user.Role.name,
        staff_group: user.StaffGroup ? user.StaffGroup.name : null,
        permissions: req.user.permissions || [],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy thông tin người dùng' });
  }
}

/**
 * PUT /api/auth/profile - Cập nhật thông tin tài khoản
 */
async function updateProfile(req, res) {
  try {
    const { 
      full_name, phone, dob, gender, id_card, id_card_date, id_card_place, 
      passport, passport_date, passport_expire, address, nationality 
    } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    await user.update({
      full_name: full_name || user.full_name,
      phone: phone !== undefined ? phone : user.phone,
      dob: dob === '' ? null : (dob !== undefined ? dob : user.dob),
      gender: gender !== undefined ? gender : user.gender,
      id_card: id_card !== undefined ? id_card : user.id_card,
      id_card_date: id_card_date === '' ? null : (id_card_date !== undefined ? id_card_date : user.id_card_date),
      id_card_place: id_card_place !== undefined ? id_card_place : user.id_card_place,
      passport: passport !== undefined ? passport : user.passport,
      passport_date: passport_date === '' ? null : (passport_date !== undefined ? passport_date : user.passport_date),
      passport_expire: passport_expire === '' ? null : (passport_expire !== undefined ? passport_expire : user.passport_expire),
      address: address !== undefined ? address : user.address,
      nationality: nationality !== undefined ? nationality : user.nationality,
    });

    res.json({
      message: 'Cập nhật thông tin thành công',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        dob: user.dob,
        gender: user.gender,
        id_card: user.id_card,
        id_card_date: user.id_card_date,
        id_card_place: user.id_card_place,
        passport: user.passport,
        passport_date: user.passport_date,
        passport_expire: user.passport_expire,
        address: user.address,
        nationality: user.nationality,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật thông tin' });
  }
}

/**
 * PUT /api/auth/password - Đổi mật khẩu
 */
async function changePassword(req, res) {
  try {
    const { old_password, new_password } = req.body;
    
    if (!old_password || !new_password) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu cũ và mới' });
    }

    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    const isPasswordValid = await user.validatePassword(old_password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Mật khẩu cũ không chính xác' });
    }

    // Hash the new password before saving, since the model hook might not trigger on update properly if we do raw update
    // Wait, the hook is `beforeCreate` in User model, NOT `beforeUpdate`! 
    // We must hash it manually here.
    const hashed_password = await bcryptjs.hash(new_password, 10);
    await user.update({ password_hash: hashed_password });

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi đổi mật khẩu' });
  }
}

module.exports = {
  register,
  login,
  googleLogin,
  getCurrentUser,
  updateProfile,
  changePassword,
  createToken,
};
