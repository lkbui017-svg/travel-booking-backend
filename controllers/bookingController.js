const { Booking, Tour, User, PromoCode, Ticket } = require('../models');
const { Op } = require('sequelize');
const transporter = require('../config/mailer');
const { generateTicketPDF } = require('../utils/pdfGenerator');

/**
 * POST /api/bookings - Tạo đơn đặt tour
 * Tự động set user_id = req.user.id
 */
async function createBooking(req, res) {
  try {
    const { tour_id, departure_date, adults, children, customer_info, payment_method, promo_code } = req.body;

    if (!tour_id || !departure_date || !adults) {
      return res.status(400).json({ message: 'tour_id, ngày khởi hành và số người lớn là bắt buộc' });
    }

    // Chuyển tour_id sang số nguyên để tránh lỗi kiểu dữ liệu
    const tourId = parseInt(tour_id);

    if (isNaN(tourId)) {
      return res.status(400).json({ message: 'ID tour không hợp lệ' });
    }

    // Kiểm tra tour
    const tour = await Tour.findByPk(tourId);

    if (!tour) {
      return res.status(404).json({ message: `Không thể đặt tour: ID ${tourId} không tồn tại` });
    }

    if (!tour.is_active) {
      return res.status(400).json({ message: 'Tour này hiện không khả dụng để đặt chỗ' });
    }

    // Kiểm tra số chỗ còn trống
    const bookedAdults = await Booking.sum('adults', {
      where: {
        tour_id: tourId,
        departure_date,
        status: { [Op.ne]: 'cancelled' },
      },
    }) || 0;

    const bookedChildren = await Booking.sum('children', {
      where: {
        tour_id: tourId,
        departure_date,
        status: { [Op.ne]: 'cancelled' },
      },
    }) || 0;

    const adultsCount = parseInt(adults) || 0;
    const childrenCount = parseInt(children) || 0;

    if (adultsCount <= 0) {
      return res.status(400).json({ message: 'Số lượng người lớn phải lớn hơn 0' });
    }

    const totalPersons = adultsCount + childrenCount;

    if ((bookedAdults + bookedChildren) + totalPersons > tour.max_slots) {
      return res.status(400).json({ message: 'Không đủ chỗ trống cho tour này' });
    }

    // Tính giá
    let total_price = totalPersons * tour.price_per_person;
    let appliedPromo = null;

    if (promo_code) {
      const promo = await PromoCode.findOne({ 
        where: { 
          code: promo_code, 
          is_active: true,
          expires_at: { [Op.gt]: new Date() },
          current_uses: { [Op.lt]: sequelize.col('max_uses') } 
        } 
      });

      // Bỏ qua lỗi discount, chỉ tính nếu hợp lệ (đã check valid trước đó ở FE)
      if (promo) {
        appliedPromo = promo;
        const discountAmount = (total_price * promo.discount_percentage) / 100;
        total_price -= discountAmount;
      }
    }

    const booking = await Booking.create({
      user_id: req.user.id,
      tour_id: tourId,
      departure_date,
      adults: adultsCount,
      children: childrenCount,
      total_price,
      status: 'pending',
      customer_info,
      payment_method: payment_method || 'vnpay',
    });

    // Tạo vé cho từng hành khách
    if (customer_info && customer_info.length > 0) {
      const ticketsData = customer_info.map(info => ({
        booking_id: booking.id,
        customer_name: info.fullName,
        customer_phone: info.phone || null,
        customer_age: info.age || null,
        customer_type: info.type || 'adult',
        is_checked: false
      }));
      await Ticket.bulkCreate(ticketsData);
    }

    if (payment_method === 'cash') {
      const fullBooking = await Booking.findByPk(booking.id, {
        include: [{ model: User }, { model: Tour }]
      });

      try {
        const pdfBuffer = await generateTicketPDF(fullBooking);
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: fullBooking.User.email,
          subject: 'Xác nhận đặt tour (Thanh toán trực tiếp)',
          html: `
            <h2>Xác nhận đặt tour thành công</h2>
            <p>Chào ${fullBooking.User.full_name || fullBooking.User.email},</p>
            <p>Đơn đặt tour của bạn đã được ghi nhận. Vui lòng thanh toán trực tiếp tại văn phòng để hoàn tất đơn hàng và đảm bảo chỗ của bạn.</p>
            <p>Mã booking: <strong>${fullBooking.id}</strong></p>
            <p>Tên tour: ${fullBooking.Tour.title}</p>
            <p>Tổng tiền: ${Number(fullBooking.total_price).toLocaleString('vi-VN')} VND</p>
            <p>Vé điện tử đính kèm theo email này.</p>
          `,
          attachments: [{
            filename: `E-Ticket-${booking.id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          }]
        });
      } catch (err) {
        console.error('Email error:', err);
      }
    }

    // Tăng số lần sử dụng mã nếu có
    if (appliedPromo) {
      await appliedPromo.increment('current_uses');
    }

    res.status(201).json({
      message: 'Booking được tạo thành công',
      data: {
        ...booking.toJSON(),
        tour_title: tour.title // Trả thêm thông tin để FE hiển thị thông báo đẹp hơn
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo booking' });
  }
}

/**
 * GET /api/bookings/my - Lịch sử đặt tour của khách hàng
 */
async function getMyBookings(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const bookings = await Booking.findAndCountAll({
      where: { user_id: req.user.id },
      include: [
        { model: Tour, attributes: ['id', 'title', 'price_per_person'] },
        { model: Ticket }
      ],
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      data: bookings.rows,
      pagination: {
        total: bookings.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(bookings.count / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy lịch sử booking' });
  }
}

/**
 * GET /api/bookings - Xem tất cả booking (quyền booking.view)
 */
async function getAllBookings(req, res) {
  try {
    const { page = 1, limit = 50, status = null, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status && status !== 'all') where.status = status;

    if (search) {
      where[Op.or] = [
        { id: isNaN(parseInt(search)) ? 0 : parseInt(search) },
        { '$User.full_name$': { [Op.like]: `%${search}%` } },
        { '$User.email$': { [Op.like]: `%${search}%` } },
        { '$Tour.title$': { [Op.like]: `%${search}%` } }
      ];
    }

    const bookings = await Booking.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ['id', 'email', 'full_name'] },
        { model: Tour, attributes: ['id', 'title'] },
      ],
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      data: bookings.rows,
      pagination: {
        total: bookings.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(bookings.count / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy danh sách booking' });
  }
}

/**
 * PUT /api/bookings/:id/status - Cập nhật trạng thái booking
 */
async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const booking = await Booking.findByPk(id, {
      include: [
        { model: User },
        { model: Tour }
      ]
    });
    if (!booking) {
      return res.status(404).json({ message: 'Booking không tồn tại' });
    }

    const oldStatus = booking.status;
    await booking.update({ status });

    // Đảm bảo sinh vé (gửi PDF) khi đơn hàng xác nhận thành công (chuyển sang paid)
    if (status === 'paid' && oldStatus !== 'paid') {
      try {
        const { generateTicketPDF } = require('../utils/pdfGenerator');
        const transporter = require('../config/mailer');
        const pdfBuffer = await generateTicketPDF(booking);
        
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: booking.User.email,
          subject: 'Xác nhận thanh toán và Vé điện tử',
          html: `
            <h2>Đơn đặt tour của bạn đã được thanh toán thành công!</h2>
            <p>Chào ${booking.User.full_name || booking.User.email},</p>
            <p>Cảm ơn bạn đã thanh toán. Đơn hàng của bạn đã được xác nhận.</p>
            <p>Mã booking: <strong>${booking.id}</strong></p>
            <p>Tên tour: ${booking.Tour.title}</p>
            <p>Vé điện tử đính kèm theo email này. Vui lòng xuất trình vé khi tham gia tour.</p>
          `,
          attachments: [{
            filename: `E-Ticket-${booking.id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          }]
        });
      } catch (err) {
        console.error('Email error when updating status to paid:', err);
      }
    }

    res.json({
      message: 'Trạng thái booking được cập nhật',
      data: booking,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái booking' });
  }
}

/**
 * GET /api/bookings/:id - Chi tiết booking
 */
async function getBookingDetail(req, res) {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id, {
      include: [
        { model: User, attributes: ['id', 'email', 'full_name', 'phone'] },
        { model: Tour },
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking không tồn tại' });
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy chi tiết booking' });
  }
}

/**
 * POST /api/bookings/validate-promo - Kiểm tra mã giảm giá
 */
async function validatePromoCode(req, res) {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Vui lòng nhập mã giảm giá' });

    const promo = await PromoCode.findOne({ 
      where: { 
        code: code.toUpperCase(), 
        is_active: true,
        expires_at: { [Op.gt]: new Date() }
      } 
    });

    if (!promo) {
      return res.status(404).json({ message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' });
    }

    if (promo.current_uses >= promo.max_uses) {
      return res.status(400).json({ message: 'Mã giảm giá đã hết lượt sử dụng' });
    }

    res.json({
      message: 'Mã hợp lệ',
      data: {
        code: promo.code,
        discount_percentage: promo.discount_percentage
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi kiểm tra mã giảm giá' });
  }
}

/**
 * POST /api/bookings/:id/cancel - Khách hàng tự hủy tour (trong vòng 24h)
 */
async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({ where: { id, user_id: req.user.id } });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đơn đặt tour' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Đơn đặt tour này đã bị hủy' });
    }

    // Kiểm tra điều kiện: chỉ cho phép hủy trong vòng 24h kể từ lúc đặt
    const bookingTime = new Date(booking.createdAt).getTime();
    const currentTime = new Date().getTime();
    const hoursDifference = (currentTime - bookingTime) / (1000 * 60 * 60);

    // Cũng có thể kết hợp kiểm tra trước khởi hành 24h
    const departureTime = new Date(booking.departure_date).getTime();
    const timeToDeparture = (departureTime - currentTime) / (1000 * 60 * 60);

    if (hoursDifference > 24 && timeToDeparture < 24) {
      return res.status(400).json({ 
        message: 'Chỉ có thể hủy tour trong vòng 24 giờ sau khi đặt hoặc trước 24 giờ khởi hành.' 
      });
    }

    await booking.update({ status: 'cancelled' });

    res.json({ message: 'Đã hủy tour thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi hủy tour' });
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
  getBookingDetail,
  validatePromoCode,
  cancelBooking,
};
