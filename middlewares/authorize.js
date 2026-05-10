/**
 * Middleware để kiểm tra quyền
 * Sử dụng: authorize('permission1', 'permission2', ...)
 * super_admin luôn được phép
 * admin có tất cả quyền trừ system.*
 */
function authorize(...allowedPermissions) {
  return (req, res, next) => {
    try {
      // super_admin có toàn quyền
      if (req.user.role === 'super_admin') {
        return next();
      }

      // admin có tất cả quyền trừ system.*
      if (req.user.role === 'admin') {
        const systemPermissions = allowedPermissions.filter(p => p.startsWith('system.'));
        if (systemPermissions.length > 0) {
          return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
        }
        return next();
      }

      // Kiểm tra permissions của staff/customer
      const userPerms = req.user.permissions || [];
      const hasPermission = allowedPermissions.some(perm => userPerms.includes(perm) || userPerms.includes('*'));
      
      if (!hasPermission) {
        return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
      }

      next();
    } catch (err) {
      return res.status(403).json({ message: 'Lỗi kiểm tra quyền' });
    }
  };
}

module.exports = authorize;
