# 🚀 Personal Life OS — Serverless Dashboard Web Application

**Personal Life OS** là một nền tảng quản lý cuộc sống toàn diện (Life Operating System) được thiết kế dưới dạng ứng dụng đơn trang (SPA) chạy trực tiếp trên trình duyệt (100% Client-Side). Dự án tích hợp các công cụ quản lý tài chính, thói quen, công việc theo ma trận Eisenhower, mục tiêu dài hạn, bản đồ địa điểm khám phá, kết hợp với phân hệ học tiếng Anh thông minh qua phương pháp lặp lại ngắt quãng **Anki Spaced Repetition (SRS)** và trợ lý đối tác hội thoại AI.

Điểm đặc biệt của kiến trúc này là giải pháp **Serverless hoàn toàn**, kết nối trực tiếp với **Google Sheets REST API v4** làm cơ sở dữ liệu lưu trữ thời gian thực thông qua cơ chế xác thực bảo mật **Google OAuth 2.0 (Google Identity Services)** mà không cần bất kỳ máy chủ trung gian nào.

---

## 🛠️ Kiến Trúc Hệ Thống & Công Nghệ Chủ Đạo

Dự án được xây dựng dựa trên các tiêu chuẩn phát triển web hiện đại, đề cao hiệu năng và tính bảo mật:

1. **Frontend Core**: HTML5 Semantic kết hợp Javascript (ES6+) đóng gói qua công cụ build siêu tốc **Vite**.
2. **Styling & UI/UX**: Sử dụng **TailwindCSS** kết hợp Vanilla CSS tạo giao diện Glassmorphism mượt mà, chuyển động tự nhiên (Micro-animations) và chế độ responsive hoàn hảo trên mọi thiết bị.
3. **Database & Sync**: Trực tiếp sử dụng **Google Sheets API v4** để thực hiện CRUD dữ liệu. Tích hợp cơ chế **Cập nhật Lạc quan (Optimistic UI Updates)** nâng cao trải nghiệm phản hồi tức thì và tự động khôi phục dữ liệu (Rollback) khi mất mạng hoặc API lỗi.
4. **AI Engine Integration**: Tích hợp trực tiếp REST API của **Google Gemini (Default: 2.0-flash)** và **OpenAI (Default: 4o-mini)** trực tiếp từ phía client với cơ chế bảo mật khóa API cục bộ.
5. **Interactive UI Utilities**: 
   * **SortableJS** cho phép kéo thả sắp xếp danh sách thanh điều hướng.
   * **Chart.js** trực quan hóa ngân sách chi tiêu và tiến độ thực hiện thói quen.

---

## 📂 Sơ Đồ Kiến Trúc Thư Mục

```text
personal_webapp/
├── .github/workflows/deploy.yml # Pipeline CI/CD tự động deploy lên GitHub Pages
├── README.md                    # Tài liệu kỹ thuật dự án (Tệp tin này)
└── frontend/                    # Thư mục mã nguồn ứng dụng
    ├── index.html               # Điểm khởi đầu ứng dụng (Entry Point HTML) & Settings modal
    ├── package.json             # Quản lý thư viện phụ thuộc (Vite, Tailwind, Chart.js...)
    ├── tailwind.config.js       # Cấu hình hệ thống thiết kế Tailwind
    ├── vite.config.js           # Cấu hình đóng gói & Base path phục vụ deployment
    └── src/
        ├── init.js              # Khởi tạo đối tượng toàn cục window.app chống lỗi ESM hoisting
        ├── main.js              # Luồng khởi chạy chính, quản lý định tuyến Tab & xác thực Google
        ├── styles/
        │   └── main.css         # Hệ thống token màu sắc CSS, hiệu ứng nền (Ambient glow) & Custom Scrollbar
        ├── services/
        │   ├── api.js           # Engine cốt lõi xử lý CRUD Sheets, đồng bộ Date & lọc bảo mật XSS
        │   └── ai.js            # Service kết nối Gemini/OpenAI REST API & Phát âm TTS giọng Anh-Mỹ
        └── components/          # Phân hệ nghiệp vụ hướng cấu trúc module độc lập
            ├── sidebar.js       # Xử lý co giãn tự do (Resizable) & sắp xếp danh sách Sidebar
            ├── charts.js        # Logic vẽ biểu đồ phân tích số liệu (Doughnut, Bar, Line charts)
            ├── expenses.js      # Module quản lý dòng tiền chi tiêu (Phân bổ ngân sách & lọc theo tháng)
            ├── vocabulary.js    # Sổ tay lưu trữ từ vựng & phân loại chủ đề chuyên sâu
            ├── srs.js           # Phân hệ ôn tập thẻ nhớ Anki SRS (Chế độ gõ chữ & ghép cụm từ)
            ├── ai_chat.js       # Chatbot đối tác luyện nói tiếng Anh & Đề xuất câu nói tự nhiên
            ├── grammar_diaries.js # Nhật ký lưu trữ lỗi ngữ pháp & lật thẻ 3D ôn tập viết lại câu
            ├── goals.js         # Theo dõi tiến trình mục tiêu (Progress Bar)
            ├── tasks.js         # Danh sách công việc trực quan & Ma trận Eisenhower 2x2
            ├── habits.js        # Lưới theo dõi thói quen 7 ngày qua & hiệu suất hoàn thành
            ├── collections.js   # Quản lý bộ sưu tập tài sản/đồ dùng cá nhân
            └── google_maps.js   # Bản đồ khám phá địa điểm du lịch & ẩm thực
```

---

## 💎 Điểm Nhấn Thiết Kế Kỹ Thuật & Giải Pháp

### 1. Đồng bộ Dữ liệu và Tự động Khởi tạo Sheet (Auto Schema Initialization)
Khi người dùng kết nối với một file Google Sheet mới trống hoàn toàn, ứng dụng sẽ tự động phân tích và chạy truy vấn tạo cấu trúc các Sheet tab bị thiếu, đồng thời điền trước tiêu đề cột tương ứng. Nếu người dùng thay đổi tên Tab thủ công, hệ thống sở hữu **thuật toán tự động phân giải cột (Heuristic Column Matching)** bằng cách tải dòng tiêu đề hàng 1 để tự động ánh xạ chính xác Tab phù hợp mà không làm gián đoạn công việc.

### 2. Giải thuật Spaced Repetition (Anki SM-2)
Trình ôn tập Anki SRS được cài đặt thuật toán **SuperMemo-2 (SM-2)** chuẩn hóa:
* **Lapse Penalty**: Thẻ bị quên (chọn Again) sẽ chuyển trạng thái học lại (Relearning) với mức phạt 20% khoảng thời gian cũ để tránh giảm tiến độ đột ngột.
* **Overdue Delay Bonus**: Điểm thưởng cộng dồn khoảng thời gian ôn tập khi người dùng ôn trễ hạn, giúp giãn cách thẻ hiệu quả hơn.
* **Anki Fuzz**: Cộng trừ một lượng ngẫu nhiên nhỏ vào chu kỳ ôn tập để tránh hiện tượng các thẻ bị lặp lại đồng loạt vào cùng một ngày.

### 3. Phân Tích & Sửa Lỗi Ngữ Pháp Bằng AI Trực Tiếp (Grammar Evaluation Loop)
* Hệ thống phân tích tin nhắn người dùng gửi đi trong khung AI Chat thông qua JSON Schema nghiêm ngặt. Phản hồi trả về gồm câu trò chuyện tự nhiên của AI, trạng thái lỗi (`isCorrect`), câu đề xuất sửa lại (`correctText`) và giải thích chi tiết lỗi bằng Tiếng Việt (`corrections`).
* Khi câu viết có lỗi, hệ thống tự động ghi nhận vào phân hệ **Nhật ký lỗi ngữ pháp** để người dùng ôn tập lại dưới dạng thẻ lật 3D.
* Hỗ trợ giải thuật so khớp chuỗi thông minh ở Client-side trước khi gọi AI để chấm điểm câu luyện tập nhằm tiết kiệm API token tối đa.

### 4. Trợ lý ảo bong bóng nổi "DANH"
* Kích hoạt nhanh bằng phím tắt **`A`** để đóng/mở trợ lý thông minh hỗ trợ điều hướng hệ thống bằng giọng lệnh tự nhiên (không tốn phí API nếu là các lệnh chuyển trang đơn giản).
* **AI Link Finder (Bảo mật URL)**: Trợ lý giúp tìm kiếm và mở nhanh các liên kết đã lưu trong cơ sở dữ liệu. Để bảo vệ dữ liệu cá nhân, hệ thống chỉ gửi danh sách tiêu đề (`title`) và chủ đề (`category`) lên AI để xác định chỉ mục (`index`), sau đó client tự động thực hiện mở liên kết ở tab mới mà không bao giờ tiết lộ URL thô cho nhà cung cấp AI.
* **Tin nhắn tự hủy**: Lịch sử trò chuyện với trợ lý DANH sẽ tự động xóa sạch khỏi bộ nhớ và DOM sau 5 phút để bảo mật màn hình làm việc của bạn.

---

## 📊 Cấu Trúc Bảng Dữ Liệu Google Sheets

Bảng dưới đây mô tả chính xác các cột dữ liệu được lưu trữ trên Google Sheets mà ứng dụng tương tác:

| Tên Tab | Cột A | Cột B | Cột C | Cột D | Cột E | Cột F | Ghi chú cột còn lại (G - J) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`expenses`** | Date | Category | Amount | Note | | | Quản lý chi tiêu cá nhân |
| **`vocabulary`** | Content | Transcription | Category | Topic | Level | Meaning | G - J: Status, Next Review, Ease Factor, Interval |
| **`habits`** | Date | Habit | Status | | | | Theo dõi thói quen (TRUE/FALSE) |
| **`links`** | Title | Category | Content | | | | Lưu trữ liên kết nhanh |
| **`prompts`** | Title | Content | Category | | | | Thư viện prompt AI |
| **`goals`** | Goal Name | Start Date | End Date | Current Value | Target Value | | Theo dõi mục tiêu |
| **`tasks`** | Date | Task | Urgent | Important | Status | | Ma trận Eisenhower (TRUE/FALSE) |
| **`google_maps`**| place | city | category | address | | | Địa điểm khám phá |
| **`collections`**| item | brand | category | | | | Bộ sưu tập tài sản cá nhân |
| **`grammar_diaries`**| date | scenario | user_sentence | corrected_sentence | explanation | status | Nhật ký lỗi sai ngữ pháp |
| **`chat_histories`**| date | scenario | role | content | | | Lưu trữ lịch sử chat đối thoại |

---

## 🚀 Hướng Dẫn Cài Đặt & Vận Hành Nhanh

### Bước 1: Khởi Tạo Credentials Trên Google Cloud Console
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo một Project mới và kích hoạt dịch vụ **Google Sheets API**.
3. Tại mục **APIs & Services > Credentials**:
   * Tạo một **API Key** (Khuyến nghị cấu hình giới hạn quyền truy cập API chỉ dành riêng cho *Google Sheets API*).
   * Tạo một **OAuth 2.0 Client ID** (Chọn loại ứng dụng Web). Thêm các URL sau vào mục **Authorized JavaScript origins**:
     * Phát triển cục bộ: `http://localhost:5173`
     * Môi trường online: `https://<ten-user-github>.github.io`
4. Tạo một trang tính Google Sheets mới và sao chép **Spreadsheet ID** từ thanh địa chỉ URL:
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

### Bước 2: Cấu Hình Ứng Dụng (Chọn một trong hai phương án)
* **Phương án 1 (Qua giao diện Web - Khuyên dùng)**:
  Mở ứng dụng -> Bấm nút **Setting** ở góc dưới sidebar bên trái -> Nhập Spreadsheet ID, API Key, Client ID của dự án -> Bấm **Save Settings** -> Bấm nút **Connect Google Sheets** ở sidebar để đăng nhập qua tài khoản Google.
* **Phương án 2 (Qua tệp tin `.env` cho Developer)**:
  Tạo tệp tin `.env` hoặc `.env.local` tại thư mục `frontend/` với nội dung:
  ```env
  VITE_SPREADSHEET_ID=mã_spreadsheet_id_của_bạn
  VITE_API_KEY=api_key_google_của_bạn
  VITE_CLIENT_ID=oauth_client_id_của_bạn
  ```

### Bước 3: Phát Triển Dưới Máy Cục Bộ (Local Development)
Yêu cầu hệ máy cài đặt sẵn **Node.js** (Phiên bản khuyến nghị >= 18).
1. Di chuyển vào thư mục frontend và cài đặt dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Khởi chạy máy chủ phát triển cục bộ của Vite:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt truy cập `http://localhost:5173`.

### Bước 4: Deploy Lên GitHub Pages Tự Động (CI/CD)
Dự án đã được cấu hình sẵn GitHub Actions ở `.github/workflows/deploy.yml`:
1. Đẩy mã nguồn lên repository GitHub cá nhân của bạn.
2. Vào **Settings > Actions > General**, cuộn xuống mục **Workflow permissions**, cấp quyền chọn **Read and write permissions** rồi lưu lại.
3. Kích hoạt tính năng GitHub Pages: Vào **Settings > Pages**, tại mục *Build and deployment > Source*, chọn **GitHub Actions**. Hệ thống sẽ tự động build sản phẩm và đẩy lên GitHub Pages sau vài phút sau mỗi đợt push code lên nhánh `main`.
