const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { Booking, Payment, User } = require('../models');
const vnpayConfig = require('../config/vnpay');
const transporter = require('../config/mailer');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { Tour } = require('../models');
require('dotenv').config();

/**
 * Tạo chữ ký VNPAY
 */
function sortObject(obj) {
  let sorted = {};
  let str = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (let key of str) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
  }
  return sorted;
}

function createVnpaySignature(data, secretKey) {
  let signData = '';
  for (let key in data) {
    if (data.hasOwnProperty(key)) {
      let v = data[key];
      if (v === null || v === '') {
        continue;
      }
      signData += '&' + key + '=' + v;
    }
  }
  signData = signData.substring(1);
  return crypto
    .createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
}

/**
 * POST /api/payment/create - Tạo giao dịch VNPAY
 */
async function createPayment(req, res) {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({ message: 'booking_id là bắt buộc' });
    }

    const booking = await Booking.findByPk(booking_id, {
      include: [{ model: User }],
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking không tồn tại' });
    }

    // Kiểm tra booking có phải của user không
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền thanh toán booking này' });
    }

    // Kiểm tra trạng thái booking
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Booking phải ở trạng thái pending' });
    }

    // Tạo mã giao dịch
    const txnRef = `${Date.now()}-${uuidv4().substring(0, 8)}`;
    const amount = Math.round(booking.total_price * 100); // Convert to VND * 100

    // Tạo URL VNPAY
    let vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: vnpayConfig.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan tour booking: ${booking_id}`,
      vnp_OrderType: 'order',
      vnp_Amount: amount,
      vnp_ReturnUrl: `${process.env.FRONTEND_URL}/payment-result`,
      vnp_IpAddr: req.ip || '0.0.0.0',
      vnp_CreateDate: new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14),
    };

    // Sort params
    vnpParams = sortObject(vnpParams);

    // Create sign
    const signature = createVnpaySignature(vnpParams, vnpayConfig.hashSecret);
    vnpParams.vnp_SecureHash = signature;

    // Build payment URL
    let paymentUrl = vnpayConfig.url + '?';
    for (let key in vnpParams) {
      paymentUrl += encodeURIComponent(key) + '=' + vnpParams[key] + '&';
    }
    paymentUrl = paymentUrl.slice(0, -1); // Remove trailing &

    // Save payment record
    const payment = await Payment.create({
      booking_id,
      vnpay_txn_ref: txnRef,
      amount: booking.total_price,
      status: 'fail', // Initially failed, update when payment succeeds
    });

    res.json({
      message: 'Tạo giao dịch thành công',
      payment_url: paymentUrl,
      txn_ref: txnRef,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo giao dịch thanh toán' });
  }
}

/**
 * GET /api/payment/vnpay-return - Xử lý kết quả thanh toán từ VNPAY
 */
async function handleVnpayReturn(req, res) {
  try {
    // Copy query params to verify signature
    let vnpParams = req.query;
    const secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    // Verify signature
    vnpParams = sortObject(vnpParams);
    const signature = createVnpaySignature(vnpParams, vnpayConfig.hashSecret);

    if (signature !== secureHash) {
      return res.status(400).json({ message: 'Chữ ký không hợp lệ' });
    }

    const txnRef = vnpParams.vnp_TxnRef;
    const responseCode = vnpParams.vnp_ResponseCode;
    const transactionNo = vnpParams.vnp_TransactionNo;

    // Find payment
    const payment = await Payment.findOne({ where: { vnpay_txn_ref: txnRef } });
    if (!payment) {
      return res.status(404).json({ message: 'Giao dịch không tồn tại' });
    }

    // Update payment status
    if (responseCode === '00') {
      // Success
      await payment.update({
        response_code: responseCode,
        transaction_no: transactionNo,
        pay_date: new Date(),
        status: 'success',
      });

      // Update booking status
      const booking = await Booking.findByPk(payment.booking_id, {
        include: [{ model: User }, { model: Tour }],
      });
      await booking.update({ status: 'paid' });

      // Send confirmation email with PDF
      try {
        const pdfBuffer = await generateTicketPDF(booking);

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: booking.User.email,
          subject: 'Xác nhận thanh toán tour du lịch',
          html: `
            <h2>Xác nhận thanh toán</h2>
            <p>Chào ${booking.User.full_name},</p>
            <p>Thanh toán của bạn đã được xác nhận thành công!</p>
            <p>Mã booking: ${booking.id}</p>
            <p>Mã giao dịch: ${transactionNo}</p>
            <p>Số tiền: ${booking.total_price.toLocaleString('vi-VN')} VND</p>
            <p>Cảm ơn bạn đã đặt tour!</p>
          `,
          attachments: [
            {
              filename: `E-Ticket-${booking.id}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });
      } catch (emailErr) {
        console.error('Email error:', emailErr);
      }

      return res.json({
        message: 'Thanh toán thành công',
        booking_id: payment.booking_id,
        status: 'success',
      });
    } else {
      // Failure
      await payment.update({
        response_code: responseCode,
        status: 'fail',
      });

      return res.json({
        message: 'Thanh toán thất bại',
        status: 'failed',
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi xử lý kết quả thanh toán' });
  }
}

/**
 * GET /api/payment/status/:txnRef - Kiểm tra trạng thái giao dịch
 */
async function getPaymentStatus(req, res) {
  try {
    const { txnRef } = req.params;

    const payment = await Payment.findOne({ where: { vnpay_txn_ref: txnRef } });

    if (!payment) {
      return res.status(404).json({ message: 'Giao dịch không tồn tại' });
    }

    res.json({
      status: payment.status,
      payment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi kiểm tra trạng thái giao dịch' });
  }
}

module.exports = {
  createPayment,
  handleVnpayReturn,
  getPaymentStatus,
};
