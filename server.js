const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('Lỗi: GEMINI_API_KEY không được định cấu hình trong tệp .env');
    process.exit(1);
}

app.post('/analyze-food', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Không có tệp hình ảnh nào được cung cấp.' });
    }

    const base64ImageData = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const prompt = "Ước tính số calo và ghi chú ngắn gọn về nội dung món ăn. Trả lời dưới dạng: 'Calo: [số calo]. Ghi chú: [ghi chú ngắn gọn].' Trả lời bằng tiếng Việt.";

    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64ImageData
                        }
                    }
                ],
            },
        ],
    };

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            res.json({ success: true, response: text }); // Trả về phản hồi cho frontend
        } else {
            console.error('Cấu trúc phản hồi Gemini API không mong muốn:', result);
            res.status(500).json({ error: 'Không thể nhận được phản hồi hợp lệ từ Gemini API.' });
        }
    } catch (error) {
        console.error('Lỗi khi gọi Gemini API:', error);
        res.status(500).json({ error: `Đã xảy ra lỗi khi phân tích hình ảnh: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`Server backend đang chạy tại http://localhost:${port}`);
});