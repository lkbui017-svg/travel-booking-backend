const { sequelize, User, Blog } = require('./models');

const MOCK_BLOGS = [
  {
    title: 'Top 5 địa điểm ngắm tuyết rơi ở Sapa không thể bỏ lỡ',
    summary: 'Mùa đông năm nay, Sapa dự kiến sẽ có tuyết rơi diện rộng. Khám phá ngay những tọa độ check-in tuyệt đẹp để có những bức ảnh triệu like.',
    content: 'Sapa vào mùa đông là một bức tranh thủy mặc tuyệt đẹp. Khi nhiệt độ xuống dưới 0 độ C, tuyết bắt đầu rơi phủ trắng núi đồi. Các địa điểm như Đỉnh Fansipan, Đèo Ô Quy Hồ, hay Bản Tả Phìn là những tọa độ lý tưởng nhất để bạn săn tuyết. Hãy chuẩn bị áo ấm, giày chống trượt và máy ảnh đầy pin nhé!',
    image_url: 'https://images.unsplash.com/photo-1533519894386-30c14bdf88ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    category: 'Kinh nghiệm du lịch',
    status: 'approved'
  },
  {
    title: 'Review chi tiết lịch trình khám phá Phú Quốc 4 ngày 3 đêm',
    summary: 'Bạn đang có ý định du lịch Phú Quốc nhưng chưa biết đi đâu, ăn gì? Tham khảo ngay lịch trình siêu chi tiết và tiết kiệm này.',
    content: 'Phú Quốc không chỉ có biển xanh cát trắng mà còn vô số điểm vui chơi hấp dẫn. Ngày 1: Nhận phòng và check-in Sunset Sanato. Ngày 2: Khám phá VinWonders và Safari. Ngày 3: Tour 4 đảo lặn ngắm san hô. Ngày 4: Mua sắm đặc sản và về nhà. Chi phí cực kỳ hợp lý nếu bạn đi nhóm 4 người.',
    image_url: 'https://images.unsplash.com/photo-1582292376914-7f13b63a948e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    category: 'Review Điểm Đến',
    status: 'approved'
  },
  {
    title: 'Gợi ý 10 món ăn đường phố phải thử khi đến Hà Nội',
    summary: 'Từ phở gia truyền, bún chả cho đến kem Tràng Tiền. Khám phá tinh hoa ẩm thực thủ đô qua lăng kính của những người sành ăn.',
    content: 'Phở cuốn Ngũ Xã, Bún chả Hàng Mành, Kem Tràng Tiền hay Bún đậu mắm tôm ngõ Trạm là những món ăn gây thương nhớ. Bạn nên thử đi bộ dạo quanh Hồ Gươm vào chiều thu mát mẻ và thưởng thức một ly trà chanh chém gió, đó mới là cảm nhận đúng chất Hà Nội.',
    image_url: 'https://images.unsplash.com/photo-1555126634-323283e090fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    category: 'Ẩm Thực',
    status: 'approved'
  },
  {
    title: 'Cẩm nang săn mây Tà Xùa cho người mới đi lần đầu',
    summary: 'Bí kíp trọn bộ từ A-Z để bạn không bỏ lỡ khoảnh khắc biển mây cuồn cuộn hùng vĩ tại đỉnh Tà Xùa.',
    content: 'Tà Xùa (Sơn La) mệnh danh là thiên đường mây. Để săn được mây, bạn cần đi vào khoảng thời gian từ tháng 10 đến tháng 4 năm sau. Chọn những ngày trước đó có mưa rào nhẹ và hôm sau hửng nắng. Chạy xe cẩn thận vì đường dốc và có nhiều khúc cua sương mù che khuất.',
    image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    category: 'Cẩm nang',
    status: 'approved'
  },
  {
    title: '[Bài viết chờ duyệt] Lặn biển ngắm san hô tại Nha Trang',
    summary: 'Trải nghiệm lặn biển tuyệt vời nhất tại Vịnh Nha Trang với hàng ngàn loài san hô rực rỡ.',
    content: 'Đây là một bài viết do khách hàng gửi lên và đang ở trạng thái pending chờ Admin duyệt. Nếu bạn đọc được bài này ở trang chủ, nghĩa là có lỗi. Nó chỉ được xem bởi Admin.',
    image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    category: 'Review Điểm Đến',
    status: 'pending'
  }
];

async function seedBlogs() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Fetch any user to act as author (e.g. Admin or first user)
    const author = await User.findOne({ order: [['id', 'ASC']] });
    
    if (!author) {
      console.log('No user found to assign as author. Run npm run seed first.');
      process.exit(1);
    }

    // Clear existing blogs (optional)
    await Blog.destroy({ where: {} });
    console.log('Cleared existing blogs.');

    // Assign author ID to mock blogs
    const blogsToCreate = MOCK_BLOGS.map(blog => ({
      ...blog,
      author_id: author.id
    }));

    await Blog.bulkCreate(blogsToCreate);
    console.log('Successfully seeded mock blogs!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding blogs:', error);
    process.exit(1);
  }
}

seedBlogs();
