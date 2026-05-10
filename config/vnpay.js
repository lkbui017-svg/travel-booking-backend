require('dotenv').config();

module.exports = {
  tmnCode: process.env.VNPAY_TMNCODE,
  hashSecret: process.env.VNPAY_HASHSECRET,
  url: process.env.VNPAY_URL,
  apiUrl: process.env.VNPAY_API_URL,
  returnUrl: `${process.env.FRONTEND_URL}/payment-result`,
  notifyUrl: `${process.env.FRONTEND_URL}/payment-notify`, // Note: In production this should be your backend URL
};
