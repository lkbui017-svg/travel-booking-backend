const { ChatbotLog, Tour } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

let genAI = null;
try {
  // Kiểm tra xem thư viện có tồn tại không trước khi require
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const apiKey = process.env.GEMINI_API_KEY?.replace(/['"]/g, '').trim();
  if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('✓ Gemini AI initialized successfully');
  }
} catch (err) {
  console.warn('⚠️ Gemini AI chưa được cài đặt hoặc cấu hình. Chatbot sẽ chạy ở chế độ Rule-based.');
}

/**
 * Simple rule-based chatbot (Alternative to Dialogflow)
 * Returns predefined responses based on keywords
 */
function getSimpleChatbotResponse(message) {
  const lowerMessage = message.toLowerCase();

  // Define rules
  const rules = [
    {
      keywords: ['tour', 'du lịch', 'có tour nào không', 'tour nào'],
      response:
        'Chúng tôi có nhiều tour du lịch hấp dẫn! Bạn có thể xem danh sách tour trên trang chủ. Bạn quan tâm đến tour nào?',
    },
    {
      keywords: ['giá', 'bao nhiêu tiền', 'chi phí', 'tính tiền'],
      response:
        'Giá tour tùy thuộc vào loại tour và thời gian. Vui lòng xem chi tiết từng tour để biết giá. Nếu bạn có thắc mắc về giá tour cụ thể, hãy cho biết tên tour?',
    },
    {
      keywords: ['ngày', 'lịch', 'khi nào', 'lên lịch'],
      response:
        'Bạn có thể chọn ngày khởi hành khi đặt tour. Những tour của chúng tôi có các đợt khởi hành khác nhau. Bạn muốn tìm tour cho ngày nào?',
    },
    {
      keywords: ['booking', 'đặt', 'đăng ký', 'reserve'],
      response:
        'Để đặt tour, bạn cần đăng nhập tài khoản, chọn tour, chọn ngày khởi hành, và thanh toán. Bạn đã có tài khoản chưa?',
    },
    {
      keywords: ['thanks', 'cảm ơn', 'thank you', 'thanks'],
      response: 'Vui lòng! Nếu bạn cần hỗ trợ thêm, hãy liên hệ với chúng tôi.',
    },
    {
      keywords: ['hello', 'hi', 'xin chào', 'chào', 'hey'],
      response:
        'Xin chào! Chào mừng bạn đến với dịch vụ đặt tour du lịch của chúng tôi. Chúng tôi có thể giúp bạn gì?',
    },
  ];

  // Check rules
  for (let rule of rules) {
    for (let keyword of rule.keywords) {
      if (lowerMessage.includes(keyword)) {
        return rule.response;
      }
    }
  }

  // Default response
  return 'Xin lỗi, tôi không hiểu câu hỏi của bạn. Bạn có thể hỏi về tour, giá cả, cách đặt tour, v.v. Tôi sẽ cố gắng hỗ trợ bạn.';
}

/**
 * Fulfillment webhook handler for Dialogflow/Google Assistant
 * Processes intents and returns dynamic responses from database
 */
async function handleFulfillmentWebhook(req, res) {
  try {
    const { queryResult, session } = req.body;

    if (!queryResult) {
      return res.status(400).json({ error: 'Invalid webhook request' });
    }

    const intentName = queryResult.intent.displayName;
    const parameters = queryResult.parameters || {};
    const userQuery = queryResult.queryText;

    // Extract session ID from Dialogflow session
    const sessionId = session.split('/').pop();

    // Process intent
    let responseText = '';
    let fulfillmentMessages = [];

    switch (intentName) {
      case 'tour.search':
        responseText = await handleTourSearch(parameters);
        break;

      case 'tour.price':
        responseText = await handleTourPrice(parameters);
        break;

      case 'tour.details':
        responseText = await handleTourDetails(parameters);
        break;

      case 'booking.inquiry':
        responseText = await handleBookingInquiry(parameters);
        break;

      case 'general.greeting':
        responseText = 'Xin chào! Tôi là trợ lý du lịch. Tôi có thể giúp bạn tìm tour, hỏi giá, hoặc hỗ trợ đặt tour. Bạn cần gì hôm nay?';
        break;

      case 'general.goodbye':
        responseText = 'Cảm ơn bạn đã liên hệ! Chúc bạn có chuyến đi vui vẻ. Nếu cần hỗ trợ thêm, hãy quay lại nhé!';
        break;

      default:
        responseText = await getSimpleChatbotResponse(userQuery);
    }

    // Save log
    await ChatbotLog.create({
      session_id: sessionId,
      message_in: userQuery,
      message_out: responseText,
    });

    // Return Dialogflow-compatible response
    const response = {
      fulfillmentText: responseText,
      fulfillmentMessages: [
        {
          text: {
            text: [responseText]
          }
        }
      ],
      source: 'webhook'
    };

    res.json(response);

  } catch (err) {
    console.error('Fulfillment webhook error:', err);
    res.status(500).json({
      fulfillmentText: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
      fulfillmentMessages: [
        {
          text: {
            text: ['Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.']
          }
        }
      ]
    });
  }
}

/**
 * Handle tour search intent
 */
async function handleTourSearch(parameters) {
  try {
    const { destination, duration, price_range } = parameters;

    let whereClause = { is_active: true };

    // Filter by destination (search in title/description)
    if (destination) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { title: { [Op.like]: `%${destination}%` } },
          { description: { [Op.like]: `%${destination}%` } }
        ]
      };
    }

    // Filter by duration
    if (duration) {
      whereClause.duration = duration;
    }

    // Filter by price range
    if (price_range) {
      const [min, max] = price_range.split('-').map(p => parseInt(p));
      if (min && max) {
        whereClause.price_per_person = {
          [Op.between]: [min, max]
        };
      }
    }

    const tours = await Tour.findAll({
      where: whereClause,
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    if (tours.length === 0) {
      return 'Xin lỗi, tôi không tìm thấy tour nào phù hợp với yêu cầu của bạn. Bạn có thể mô tả rõ hơn về điểm đến hoặc ngân sách không?';
    }

    let response = `Tôi tìm thấy ${tours.length} tour phù hợp:\n\n`;

    tours.forEach((tour, index) => {
      response += `${index + 1}. ${tour.title}\n`;
      response += `   ⏱️ ${tour.duration} ngày\n`;
      response += `   💰 ${tour.price_per_person.toLocaleString('vi-VN')} VND/người\n`;
      response += `   👥 Còn ${tour.max_slots} chỗ\n\n`;
    });

    response += 'Bạn muốn biết thêm chi tiết về tour nào?';

    return response;

  } catch (err) {
    console.error('Tour search error:', err);
    return 'Xin lỗi, có lỗi khi tìm kiếm tour. Vui lòng thử lại.';
  }
}

/**
 * Handle tour price inquiry
 */
async function handleTourPrice(parameters) {
  try {
    const { tour_name } = parameters;

    if (!tour_name) {
      return 'Bạn muốn hỏi giá của tour nào? Vui lòng cho biết tên tour.';
    }

    const tour = await Tour.findOne({
      where: {
        title: { [Op.like]: `%${tour_name}%` },
        is_active: true
      }
    });

    if (!tour) {
      return `Xin lỗi, tôi không tìm thấy tour "${tour_name}". Bạn có thể kiểm tra lại tên tour hoặc xem danh sách tour có sẵn.`;
    }

    return `Tour "${tour.title}" có giá ${tour.price_per_person.toLocaleString('vi-VN')} VND cho mỗi người. Giá đã bao gồm: ${tour.description.substring(0, 100)}... Bạn muốn đặt tour này không?`;

  } catch (err) {
    console.error('Tour price error:', err);
    return 'Xin lỗi, có lỗi khi tra cứu giá tour. Vui lòng thử lại.';
  }
}

/**
 * Handle tour details inquiry
 */
async function handleTourDetails(parameters) {
  try {
    const { tour_name } = parameters;

    if (!tour_name) {
      return 'Bạn muốn biết chi tiết về tour nào? Vui lòng cho biết tên tour.';
    }

    const tour = await Tour.findOne({
      where: {
        title: { [Op.like]: `%${tour_name}%` },
        is_active: true
      }
    });

    if (!tour) {
      return `Xin lỗi, tôi không tìm thấy tour "${tour_name}". Bạn có thể kiểm tra lại tên tour.`;
    }

    let response = `Chi tiết tour "${tour.title}":\n\n`;
    response += `⏱️ Thời gian: ${tour.duration} ngày\n`;
    response += `💰 Giá: ${tour.price_per_person.toLocaleString('vi-VN')} VND/người\n`;
    response += `👥 Số chỗ tối đa: ${tour.max_slots}\n\n`;
    response += `📝 Mô tả: ${tour.description}\n\n`;
    response += `🗺️ Lịch trình: ${tour.itinerary}\n\n`;
    response += 'Bạn muốn đặt tour này không?';

    return response;

  } catch (err) {
    console.error('Tour details error:', err);
    return 'Xin lỗi, có lỗi khi lấy chi tiết tour. Vui lòng thử lại.';
  }
}

/**
 * Handle booking inquiry
 */
async function handleBookingInquiry(parameters) {
  try {
    const { tour_name, date, people_count } = parameters;

    let response = 'Để đặt tour, bạn cần:\n\n';
    response += '1. Đăng nhập tài khoản trên website\n';
    response += '2. Chọn tour bạn muốn đặt\n';
    response += '3. Chọn ngày khởi hành và số lượng người\n';
    response += '4. Thanh toán qua VNPAY\n\n';

    if (tour_name) {
      const tour = await Tour.findOne({
        where: {
          title: { [Op.like]: `%${tour_name}%` },
          is_active: true
        }
      });

      if (tour) {
        response += `Tour "${tour.title}" hiện còn ${tour.max_slots} chỗ trống. `;
        response += `Giá: ${tour.price_per_person.toLocaleString('vi-VN')} VND/người\n\n`;
      }
    }

    response += 'Bạn muốn tôi hướng dẫn bạn đặt tour ngay bây giờ không?';

    return response;

  } catch (err) {
    console.error('Booking inquiry error:', err);
    return 'Xin lỗi, có lỗi khi xử lý yêu cầu đặt tour. Vui lòng thử lại.';
  }
}

/**
 * POST /api/chatbot/message - Gửi tin nhắn
 */
async function sendMessage(req, res) {
  try {
    const { message, session_id } = req.body;

    if (!message || !session_id) {
      return res.status(400).json({ message: 'message và session_id là bắt buộc' });
    }

    let response = '';

    // Ưu tiên sử dụng Gemini AI nếu có API Key
    if (genAI && process.env.NODE_ENV !== 'test') {
      try {
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash",
          systemInstruction: "Bạn là một trợ lý du lịch thông minh của CKCNW. Hãy trả lời khách hàng một cách lịch sự, thân thiện. Tư vấn tour dựa trên dữ liệu tour thực tế được cung cấp."
        });

        // Lấy danh sách tour làm ngữ cảnh cho AI
        const tours = await Tour.findAll({ where: { is_active: true }, limit: 5 });
        const tourContext = tours.map(t => `- ${t.title}: ${t.price_per_person.toLocaleString('vi-VN')} VND, thời gian ${t.duration} ngày.`).join('\n');

        const prompt = `Dữ liệu các tour hiện có tại CKCNW:\n${tourContext}\n\nCâu hỏi của khách hàng: ${message}`;
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        
        response = result.response.text() || getSimpleChatbotResponse(message);
      } catch (aiErr) {
        console.error('⚠️ Gemini API Error:', aiErr.message);
        response = getSimpleChatbotResponse(message); // Fallback về quy tắc cũ nếu API lỗi
      }
    }

    if (!response) {
      response = getSimpleChatbotResponse(message);
    }

    // Save log
    const log = await ChatbotLog.create({
      user_id: req.user ? req.user.id : null,
      session_id,
      message_in: message,
      message_out: response,
    });

    res.json({
      session_id,
      message: response,
      timestamp: log.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi xử lý tin nhắn chatbot' });
  }
}

/**
 * GET /api/chatbot/logs - Xem chatbot logs (quyền: chatbot.view)
 */
async function getChatbotLogs(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const logs = await ChatbotLog.findAndCountAll({
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      data: logs.rows,
      pagination: {
        total: logs.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(logs.count / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lấy chatbot logs' });
  }
}

/**
 * DELETE /api/chatbot/logs/:id - Xóa log
 */
async function deleteLog(req, res) {
  try {
    const { id } = req.params;

    const log = await ChatbotLog.findByPk(id);
    if (!log) {
      return res.status(404).json({ message: 'Log không tồn tại' });
    }

    await log.destroy();

    res.json({ message: 'Log được xóa thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi xóa log' });
  }
}

module.exports = {
  handleFulfillmentWebhook,
  sendMessage,
  getChatbotLogs,
  deleteLog,
};
