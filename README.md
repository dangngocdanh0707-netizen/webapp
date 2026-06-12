# 🚀 Personal Life OS — My Self-Management Cockpit (Serverless Web App)

Chào bạn! Đây là **Personal Life OS** — hệ điều hành quản lý cuộc sống toàn diện mà mình tự tay xây dựng để tối ưu hóa công việc, tài chính, thói quen và lộ trình học tập hàng ngày. 

Thay vì sử dụng các phần mềm trả phí hoặc các dịch vụ lưu trữ phân tán, mình thiết kế ứng dụng này chạy **100% Client-Side (Serverless)**, sử dụng chính **Google Sheets làm cơ sở dữ liệu thời gian thực**. Toàn bộ dữ liệu nằm trọn trong tay bạn, được bảo mật qua cơ chế **Google OAuth 2.0 (Identity Services)** kết nối trực tiếp từ trình duyệt của bạn đến Google API.

---

## 💡 Tại Sao Mình Xây Dựng Dự Án Này?

Mình muốn tạo ra một "buồng lái" (cockpit) cá nhân hội tụ tất cả các tính năng cần thiết cho cuộc sống hàng ngày:
* **Tài chính tinh gọn:** Theo dõi Tài sản (Assets), Thu nhập (Incomes) và Chi tiêu (Expenses) trực quan qua biểu đồ.
* **Tự quản bản thân:** Lên danh sách công việc theo ma trận Eisenhower (Tasks) và theo dõi thói quen 7 ngày (Habits).
* **Học tiếng Anh thông minh:** Ôn từ vựng qua thẻ nhớ Spaced Repetition (SRS Anki), đối thoại trực tiếp với AI (Speaking Partner) và ghi nhật ký lỗi sai ngữ pháp.
* **Kho lưu trữ nhanh:** Bản đồ địa điểm ăn uống/du lịch (Google Maps), kho chứa Links/Prompts AI và bộ sưu tập đồ dùng cá nhân (Collections).

---

## 🛠️ Kiến Trúc Công Nghệ Mình Đã Lựa Chọn

Để tối ưu hóa tốc độ tải và đảm bảo giao diện đẹp mắt nhất, mình đã lựa chọn:
1. **Bản dựng siêu nhẹ**: HTML5 nguyên bản và Javascript (ES6+) đóng gói bằng **Vite**.
2. **Hệ thống Design & Hiệu ứng**: **TailwindCSS** kết hợp với Vanilla CSS. Mình thiết kế theo ngôn ngữ **Glassmorphism** tối giản, sử dụng các biến màu HSL để tạo cảm giác trang nhã, bổ sung micro-animations và hiệu ứng vệt sáng chuyển động (Ambient glow) để giao diện "sống động" hơn.
3. **Đồ thị & Tương tác**: 
   * **Chart.js** vẽ biểu đồ chi tiết (đồng bộ hóa giao diện xanh biển mềm mại và tắt hoàn toàn tooltips toàn cục để tập trung hiển thị trực quan).
   * **SortableJS** hỗ trợ kéo thả sắp xếp các tab trên Sidebar.
4. **Mô hình kết nối AI**: Tích hợp trực tiếp REST API của **Google Gemini (2.0-flash)** và **OpenAI (4o-mini)** trực tiếp dưới Client. Khóa API của bạn được lưu an toàn trong localStorage của trình duyệt.

---

## 📂 Sơ Đồ Tổ Chức Mã Nguồn

Dưới đây là sơ đồ cấu trúc thư mục của dự án do mình thiết kế:

```text
personal_webapp/
├── .github/workflows/deploy.yml # Pipeline CI/CD tự động deploy lên GitHub Pages
├── README.md                    # Tài liệu giới thiệu dự án (Tệp tin này)
└── frontend/                    # Thư mục mã nguồn ứng dụng
    ├── index.html               # Điểm khởi chạy ứng dụng (Entry Point HTML) & Settings modal
    ├── package.json             # Quản lý thư viện phụ thuộc (Vite, Tailwind, Chart.js...)
    ├── tailwind.config.js       # Cấu hình thiết kế Tailwind
    ├── vite.config.js           # Cấu hình build Vite
    └── src/
        ├── init.js              # Khởi tạo đối tượng toàn cục window.app chống lỗi hoisting ESM
        ├── main.js              # Luồng khởi chạy chính, quản lý định tuyến Tab & xác thực Google
        ├── styles/
        │   └── main.css         # Hệ thống màu CSS, hiệu ứng nền (Ambient glow) & Resizable Sidebar
        ├── services/
        │   ├── api.js           # Engine cốt lõi xử lý CRUD Sheets, đồng bộ Date & lọc bảo mật XSS
        │   └── ai.js            # Service kết nối Gemini/OpenAI REST API & Phát âm TTS giọng Mỹ
        └── components/          # Phân hệ nghiệp vụ hướng cấu trúc module độc lập
            ├── sidebar.js       # Xử lý co giãn tự do (Resizable) & sắp xếp danh sách Sidebar
            ├── charts.js        # Logic vẽ biểu đồ phân tích số liệu (Doughnut, Bar, Line charts)
            ├── expenses.js      # Module quản lý chi tiêu (Phân bổ ngân sách & lọc theo tháng)
            ├── vocabulary.js    # Sổ tay từ vựng & phân loại chủ đề chuyên sâu
            ├── srs.js           # Phân hệ ôn tập thẻ nhớ Anki SRS (Chế độ gõ chữ & ghép cụm từ)
            ├── ai_chat.js       # Chatbot đối tác luyện nói tiếng Anh & Đề xuất câu nói tự nhiên
            ├── grammar_diaries.js # Nhật ký lỗi sai ngữ pháp & lật thẻ 3D ôn tập viết lại câu
            ├── goals.js         # Theo dõi tiến trình mục tiêu (Progress Bar)
            ├── tasks.js         # Danh sách công việc trực quan & Ma trận Eisenhower 2x2
            ├── habits.js        # Lưới theo dõi thói quen 7 ngày qua & hiệu suất hoàn thành
            ├── collections.js   # Quản lý bộ sưu tập tài sản/đồ dùng cá nhân
            └── google_maps.js   # Bản đồ khám phá địa điểm du lịch & ẩm thực
```

---

## 💎 Những Giải Pháp Kỹ Thuật Mình Tâm Đắc Nhất

### 1. Thuật Toán Khớp Cấu Trúc Bảng Thông Minh (Heuristic Column Matching)
Để người dùng tự do cá nhân hóa Google Sheets của họ, mình đã viết bộ máy tự động khớp cột. Nếu bạn đổi tên tab hoặc tên cột trên Google Sheets, ứng dụng sẽ tải dòng tiêu đề hàng đầu tiên (`A1:J1`), phân tích từ khóa tương đồng (ví dụ: `assets` / `tài sản` / `assests` / `quantity` / `số lượng`) để tự động ánh xạ chính xác mà không làm lỗi ứng dụng.

### 2. Triển Khai Thuật Toán Anki SM-2 Thực Tế
Phần mềm ôn tập từ vựng (SRS) được mình áp dụng thuật toán **SuperMemo-2 (SM-2)** hoàn chỉnh:
* **Lapse Penalty (Phạt khi quên)**: Khi bạn bấm quên từ (Again), khoảng thời gian ôn tập tiếp theo sẽ bị giảm đi 20% thay vì đưa về 1 ngày như thông thường, tối ưu tốc độ ghi nhớ lại.
* **Overdue Delay Bonus (Thưởng ôn muộn)**: Khi bạn ôn tập trễ hạn và vẫn nhớ từ, thuật toán sẽ cộng điểm thưởng thời gian giúp giãn cách thẻ học hợp lý hơn.
* **Anki Fuzz (Nhiễu loạn ngẫu nhiên)**: Cộng trừ một khoảng thời gian nhỏ ngẫu nhiên vào chu kỳ lặp lại tiếp theo để tránh việc tất cả từ vựng dồn vào ôn cùng một ngày.

### 3. Vòng Lặp Sửa Lỗi Ngữ Pháp Bằng AI (Grammar Evaluation Loop)
* Trong phòng chat đối thoại tiếng Anh (`ai_chat.js`), mỗi khi bạn gửi tin nhắn, AI sẽ chấm điểm và trả về phản hồi dạng JSON chứa các thuộc tính: câu trả lời, lỗi sai ngữ pháp (`isCorrect`), câu đề xuất sửa đổi (`correctText`) và giải thích lỗi chi tiết bằng tiếng Việt.
* Nếu câu của bạn bị sai ngữ pháp, ứng dụng lập tức đẩy dòng dữ liệu đó lên Google Sheet tab `grammar_diary`. Bạn có thể mở tab Grammar Diary để luyện tập viết lại các câu sai thông qua giao diện **Thẻ lật 3D** cực kỳ trực quan.

### 4. Cơ Chế Tải Dữ Liệu Lạc Quan (Optimistic UI với Auto-Rollback)
Để tạo trải nghiệm cực kỳ nhanh, khi bạn thêm/sửa/xóa dòng dữ liệu (ví dụ: thêm một khoản chi tiêu hoặc check hoàn thành thói quen), ứng dụng sẽ **cập nhật giao diện ngay lập tức** trước khi API hoàn tất. Nếu quá trình gửi dữ liệu lên Google Sheets thất bại (mất mạng hoặc lỗi token), hệ thống sẽ tự động khôi phục lại trạng thái cũ trên màn hình và thông báo lỗi.

---

## 🚀 Hướng Dẫn Cài Đặt & Vận Hành Nhanh

### Bước 1: Khởi Tạo API Trên Google Cloud Console
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo một dự án mới và kích hoạt dịch vụ **Google Sheets API**.
3. Tại mục **Credentials**:
   * Tạo một **API Key** (Khuyên dùng giới hạn IP hoặc giới hạn chỉ gọi API Google Sheets).
   * Tạo một **OAuth 2.0 Client ID** (Loại Web Application). Thêm URL origins:
     * Cục bộ: `http://localhost:5173`
     * Production: `https://<tên_username_của_bạn>.github.io`
4. Tạo một file Google Sheets mới trên Google Drive và copy **Spreadsheet ID** trên thanh địa chỉ URL:
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

### Bước 2: Cấu Hình
Bạn có thể kết nối nhanh bằng cách mở giao diện ứng dụng, nhấn biểu tượng răng cưa **Setting** ở góc dưới bên trái Sidebar, điền các mã khóa vừa tạo và bấm **Save Settings**. 
*Hoặc* tạo file `.env` nằm trong thư mục `frontend/` nếu bạn là lập trình viên:
```env
VITE_SPREADSHEET_ID=spreadsheet_id_cua_ban
VITE_GOOGLE_API_KEY=api_key_cua_ban
VITE_OAUTH_CLIENT_ID=client_id_cua_ban
```

### Bước 3: Chạy Cục Bộ (Local Development)
Yêu cầu máy tính cài đặt sẵn Node.js (phiên bản khuyến nghị >= 18).
1. Di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   npm install
   ```
2. Khởi chạy máy chủ phát triển cục bộ:
   ```bash
   npm run dev
   ```
3. Truy cập địa chỉ `http://localhost:5173` trên trình duyệt.
