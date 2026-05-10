const { Tour, User, Booking, Ticket, TourStaff, LiveLocation, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/tours - Danh sách tour (phân trang, lọc)
 */
async function getTours(req, res) {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const tours = await Tour.findAndCountAll({
      where: {
        is_active: true,
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ],
      },
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'assignedStaff', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    // Tính toán số chỗ còn trống cho từng tour trong danh sách
    for (let tour of tours.rows) {
      const bookedAdults = await Booking.sum('adults', {
        where: { 
          tour_id: tour.id, 
          status: { [Op.ne]: 'cancelled' } 
        }
      }) || 0;

      const bookedChildren = await Booking.sum('children', {
        where: { 
          tour_id: tour.id, 
          status: { [Op.ne]: 'cancelled' } 
        }
      }) || 0;

      const remaining = tour.max_slots - (bookedAdults + bookedChildren);
      tour.setDataValue('remaining_slots', remaining > 0 ? remaining : 0);
    }

    res.json({
      data: tours.rows,
      pagination: {
        total: tours.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(tours.count / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy danh sách tour' });
  }
}

/**
 * GET /api/tours/:id - Chi tiết tour
 */
async function getTourDetail(req, res) {
  try {
    const { id } = req.params;
    const tourId = parseInt(id); // Chuyển đổi ID sang số nguyên

    if (isNaN(tourId)) {
      return res.status(400).json({ message: 'ID tour không hợp lệ' });
    }

    // Tìm tour và tính toán số chỗ đã đặt
    const tour = await Tour.findByPk(tourId, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] }]
    });

    if (tour) {
      const bookedAdults = await Booking.sum('adults', {
        where: { tour_id: tourId, status: { [Op.ne]: 'cancelled' } }
      }) || 0;
      
      const bookedChildren = await Booking.sum('children', {
        where: { tour_id: tourId, status: { [Op.ne]: 'cancelled' } }
      }) || 0;

      // Tính remaining_slots cho từng ngày khởi hành nếu có
      if (tour.departure_dates && Array.isArray(tour.departure_dates)) {
        const available_departures = [];
        for (let date of tour.departure_dates) {
          const bookedA = await Booking.sum('adults', {
            where: { tour_id: tourId, departure_date: date, status: { [Op.ne]: 'cancelled' } }
          }) || 0;
          const bookedC = await Booking.sum('children', {
            where: { tour_id: tourId, departure_date: date, status: { [Op.ne]: 'cancelled' } }
          }) || 0;
          const rem = tour.max_slots - (bookedA + bookedC);
          available_departures.push({
            date: date,
            remaining_slots: rem > 0 ? rem : 0,
            booked: bookedA + bookedC
          });
        }
        tour.setDataValue('available_departures', available_departures);
      }

      // Vẫn giữ remaining_slots tổng để tương thích ngược
      const remaining = tour.max_slots - (bookedAdults + bookedChildren);
      tour.setDataValue('remaining_slots', remaining > 0 ? remaining : 0);
    }

    if (!tour) {
      console.log(`[DEBUG] Không tìm thấy Tour với ID: ${tourId} trong Database`);
      return res.status(404).json({ message: `Tour với ID ${tourId} không tồn tại trong hệ thống` });
    }

    if (!tour.is_active) {
      console.log(`[DEBUG] Tour ID ${tourId} có tồn tại nhưng is_active đang là FALSE`);
      return res.status(404).json({ message: 'Tour này hiện đang ngừng kinh doanh (is_active: false)' });
    }

    res.json(tour);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy chi tiết tour' });
  }
}

/**
 * POST /api/tours - Tạo tour mới (yêu cầu tour.create)
 */
async function createTour(req, res) {
  try {
    const { title, description, itinerary, duration, price_per_person, max_slots, image_url, departure_dates } = req.body;

    if (!title || !duration || !price_per_person || max_slots === undefined) {
      return res.status(400).json({ message: 'Các trường bắt buộc: title, duration, price_per_person, max_slots' });
    }

    const tour = await Tour.create({
      title,
      description,
      itinerary,
      duration,
      price_per_person,
      max_slots,
      image_url,
      departure_dates: departure_dates || [],
      is_active: true,
      created_by: req.user.id,
    });

    res.status(201).json({
      message: 'Tour được tạo thành công',
      data: tour,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo tour' });
  }
}

/**
 * PUT /api/tours/:id - Cập nhật tour (tour.edit)
 */
async function updateTour(req, res) {
  try {
    const { id } = req.params;
    const { title, description, itinerary, duration, price_per_person, max_slots, image_url, is_active, departure_dates } = req.body;

    const tour = await Tour.findByPk(id);
    if (!tour) {
      return res.status(404).json({ message: 'Tour không tồn tại' });
    }

    await tour.update({
      title: title || tour.title,
      description: description || tour.description,
      itinerary: itinerary || tour.itinerary,
      duration: duration || tour.duration,
      price_per_person: price_per_person || tour.price_per_person,
      max_slots: max_slots !== undefined ? max_slots : tour.max_slots,
      image_url: image_url || tour.image_url,
      departure_dates: departure_dates || tour.departure_dates,
      is_active: is_active !== undefined ? is_active : tour.is_active,
    });

    res.json({
      message: 'Tour được cập nhật thành công',
      data: tour,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật tour' });
  }
}

/**
 * DELETE /api/tours/:id - Xóa tour (tour.delete)
 */
async function deleteTour(req, res) {
  try {
    const { id } = req.params;
    const tour = await Tour.findByPk(id);

    if (!tour) {
      return res.status(404).json({ message: 'Tour không tồn tại' });
    }

    // Soft delete: set is_active = false
    await tour.update({ is_active: false });

    res.json({ message: 'Tour được xóa thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi xóa tour' });
  }
}

/**
 * POST /api/tours/:id/assign - Assign staff to tour (admin)
 */
async function assignStaff(req, res) {
  try {
    const { id } = req.params;
    const { staff_ids } = req.body; // Array of user IDs

    const tour = await Tour.findByPk(id);
    if (!tour) return res.status(404).json({ message: 'Tour không tồn tại' });

    // Clear existing assignments
    await TourStaff.destroy({ where: { tour_id: id } });

    // Add new assignments
    if (staff_ids && staff_ids.length > 0) {
      const assignments = staff_ids.map(staff_id => ({
        tour_id: id,
        staff_id
      }));
      await TourStaff.bulkCreate(assignments);
    }

    res.json({ message: 'Phân công nhân viên thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi phân công nhân viên' });
  }
}

/**
 * GET /api/tours/employee/assigned - Lấy danh sách tour được phân công (cho nhân viên)
 */
async function getAssignedTours(req, res) {
  try {
    const userId = req.user.id;
    
    const user = await User.findByPk(userId, {
      include: [{
        model: Tour,
        as: 'assignedTours',
        where: { is_active: true }
      }]
    });

    res.json(user ? user.assignedTours : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy danh sách tour được phân công' });
  }
}

/**
 * GET /api/tours/:id/tickets - Lấy danh sách hành khách/vé của tour
 */
async function getTourTickets(req, res) {
  try {
    const { id } = req.params;
    
    // Find all bookings for this tour
    const bookings = await Booking.findAll({
      where: { tour_id: id, status: 'paid' },
      attributes: ['id']
    });

    const bookingIds = bookings.map(b => b.id);

    // Get all tickets for these bookings
    const tickets = await Ticket.findAll({
      where: { booking_id: { [Op.in]: bookingIds } }
    });

    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy danh sách vé' });
  }
}

/**
 * PUT /api/tours/tickets/:ticketId/check - Kiểm vé (đánh dấu đã check-in)
 */
async function checkInTicket(req, res) {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket) return res.status(404).json({ message: 'Vé không tồn tại' });
    
    await ticket.update({
      is_checked: true,
      check_in_time: new Date()
    });

    res.json({ message: 'Check-in vé thành công', data: ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi check-in vé' });
  }
}

/**
 * POST /api/tours/:id/location - Cập nhật vị trí
 */
async function updateLocation(req, res) {
  try {
    const { id } = req.params;
    const { departure_date, latitude, longitude, is_guide } = req.body;
    const userId = req.user.id;

    let location = await LiveLocation.findOne({
      where: { tour_id: id, departure_date, user_id: userId, is_active: true }
    });

    if (location) {
      await location.update({ latitude, longitude });
    } else {
      await LiveLocation.create({
        tour_id: id,
        departure_date,
        user_id: userId,
        user_name: req.user.full_name,
        is_guide: is_guide || false,
        latitude,
        longitude,
        is_active: true
      });
    }

    res.json({ message: 'Đã cập nhật vị trí' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi cập nhật vị trí' });
  }
}

/**
 * GET /api/tours/:id/location - Lấy tất cả vị trí
 */
async function getLocations(req, res) {
  try {
    const { id } = req.params;
    const { departure_date } = req.query;

    const locations = await LiveLocation.findAll({
      where: { tour_id: id, departure_date, is_active: true }
    });

    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy vị trí' });
  }
}

/**
 * POST /api/tours/:id/location/end - Kết thúc chia sẻ vị trí (Chỉ Guide)
 */
async function endTourSession(req, res) {
  try {
    const { id } = req.params;
    const { departure_date } = req.body;

    await LiveLocation.update(
      { is_active: false },
      { where: { tour_id: id, departure_date } }
    );

    res.json({ message: 'Đã kết thúc tour session' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi kết thúc tour' });
  }
}

module.exports = {
  getTours,
  getTourDetail,
  createTour,
  updateTour,
  deleteTour,
  assignStaff,
  getAssignedTours,
  getTourTickets,
  checkInTicket,
  updateLocation,
  getLocations,
  endTourSession
};
