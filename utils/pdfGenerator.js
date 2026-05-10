const PDFDocument = require('pdfkit');

function generateTicketPDF(booking) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Design the PDF
      doc.fontSize(25).fillColor('#1976d2').text('VÉ ĐIỆN TỬ - E-TICKET', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(14).fillColor('#000000');
      doc.text(`Mã Đơn Đặt (Booking ID): #${booking.id}`, { underline: true });
      doc.moveDown();
      
      doc.text(`Khách hàng: ${booking.User ? booking.User.full_name || booking.User.email : 'N/A'}`);
      doc.text(`Tên Tour: ${booking.Tour ? booking.Tour.title : 'N/A'}`);
      doc.text(`Ngày khởi hành: ${new Date(booking.departure_date).toLocaleDateString('vi-VN')}`);
      doc.text(`Số lượng: ${booking.adults} Người lớn, ${booking.children} Trẻ em`);
      doc.text(`Phương thức thanh toán: ${booking.payment_method === 'cash' ? 'Tiền mặt/Trực tiếp' : 'VNPay'}`);
      doc.text(`Tổng tiền: ${Number(booking.total_price).toLocaleString('vi-VN')} VND`);
      doc.text(`Trạng thái: ${booking.status.toUpperCase()}`, { continued: true }).fillColor(booking.status === 'paid' ? '#2e7d32' : '#ed6c02').text(' ');

      if (booking.customer_info && Array.isArray(booking.customer_info)) {
        doc.fillColor('#000000').moveDown();
        doc.fontSize(16).text('Danh sách hành khách:');
        doc.fontSize(14);
        booking.customer_info.forEach((c, idx) => {
          doc.text(`  ${idx + 1}. ${c.fullName} - ${c.age} tuổi (${c.type === 'adult' ? 'Người lớn' : 'Trẻ em'})`);
        });
      }

      doc.moveDown(2);
      doc.fontSize(12).fillColor('gray').text('Cảm ơn bạn đã lựa chọn dịch vụ của chúng tôi!', { align: 'center' });
      doc.text('Vui lòng xuất trình vé này (in hoặc xem trên điện thoại) khi tham gia tour.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateTicketPDF };
