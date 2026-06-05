# 🚀 Personal Life OS — Serverless Dashboard Web App

> **Personal Life OS** là một "hệ điều hành" cá nhân giúp bạn quản lý toàn diện cuộc sống từ quản lý chi tiêu (Expenses), theo dõi thói quen (Habits), công việc (Tasks), mục tiêu (Goals), danh sách địa điểm thám hiểm (Google Maps), bộ sưu tập tài sản (Collections), đến việc tự học tiếng Anh chuyên sâu bằng phương pháp Anki Spaced Repetition (SRS) kết hợp cùng **Trợ lý luyện nói Tiếng Anh AI Speaking Partner**.
>
> Ứng dụng chạy dưới dạng **Single Page Application (SPA)** trực tiếp trên trình duyệt, kết nối thời gian thực và lưu trữ dữ liệu trực tiếp lên **Google Sheets REST API v4** thông qua cơ chế xác thực bảo mật **Google OAuth 2.0 (Google Identity Services)** mà **không cần server trung gian**.

---

## 🛠️ Tech Stack & Key Integrations

| Thành phần | Công nghệ / Dịch vụ tích hợp | Mô tả |
| :--- | :--- | :--- |
| **Core** | JavaScript (ES Modules), HTML5, CSS3 | Logic thuần túy, mô-đun hóa cao |
| **Styling** | Tailwind CSS | Giao diện hiện đại, responsive, hỗ trợ Glassmorphism |
| **Build Tool** | Vite | Đóng gói tối ưu hóa dung lượng và thời gian tải trang |
| **Database** | Google Sheets API v4 | Sử dụng Google Sheet làm Database lưu trữ miễn phí |
| **Auth** | Google Identity Services (OAuth 2.0) | Đăng nhập trực tiếp, bảo mật token phía client |
| **Voice Engine** | Web Speech API (STT & TTS) | Nhận diện giọng nói và phát âm tiếng Anh bản xứ miễn phí |
| **AI Partner** | Google Gemini API / OpenAI API | Xử lý kịch bản giao tiếp hội thoại và phân tích ngữ pháp |

---

## 📂 Sơ đồ cấu trúc thư mục dự án

Mã nguồn được phân tách rõ ràng theo cấu trúc module nghiệp vụ (Separation of Concerns):

```text
personal_webapp/
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD tự động biên dịch & triển khai lên GitHub Pages
├── README.md                    # Tài liệu hướng dẫn vận hành chuẩn hóa (Tệp tin này)
└── frontend/                    # Mã nguồn Static Web App
    ├── index.html               # Entry Point chính (Chứa Layout chính & Settings Modal)
    ├── package.json             # Danh sách dependencies & lệnh chạy (Vite, Tailwind, v.v.)
    ├── vite.config.js           # Cấu hình Vite build (base path: /webapp_project/)
    ├── postcss.config.js        # Cấu hình tối ưu hóa xử lý CSS
    ├── tailwind.config.js       # Cấu hình phạm vi biên dịch Tailwind CSS
    └── src/
        ├── main.js              # Khởi chạy SDKs, điều phối Auth, định tuyến Tab & Hotkeys
        ├── styles/
        │   └── main.css         # CSS gốc chứa cấu hình Tailwind & Glassmorphism
        ├── services/
        │   ├── api.js           # Google Sheets API v4 CRUD client & Local Storage engine
        │   ├── ai.js            # API Client kết nối Gemini / OpenAI
        │   └── toast.js         # Hệ thống thông báo toast xếp chồng cao cấp
        └── components/          # Các mô-đun UI cô lập điều khiển nghiệp vụ chi tiết
            ├── sidebar.js       # Co giãn và kéo thả sắp xếp vị trí các menu trên Sidebar
            ├── charts.js        # Vẽ biểu đồ tương tác thời gian thực bằng Chart.js
            ├── expenses.js      # CRUD tài chính chi tiêu (Expenses)
            ├── vocabulary.js    # CRUD từ vựng tiếng Anh (Vocabulary)
            ├── srs.js           # Ôn tập Anki Spaced Repetition (SRS Learning)
            ├── ai_chat.js       # Trợ lý trò chuyện tiếng Anh & Phân tích ngữ pháp AI
            ├── links.js         # Quản lý liên kết nhanh (Quick Links)
            ├── prompts.js       # Quản lý gợi ý AI (AI Prompts)
            ├── goals.js         # Theo dõi tiến độ mục tiêu (Goals)
            ├── tasks.js         # Quản lý công việc thông minh (Tasks)
            ├── habits.js        # Theo dõi & đánh giá thói quen hằng ngày (Habits)
            ├── collections.js   # Quản lý bộ sưu tập tài sản cá nhân (Collections)
            └── google_maps.js   # Quản lý danh sách địa điểm thám hiểm (Google Maps)
```

---

## ✨ Các tính năng nổi bật & Giải pháp kỹ thuật

### 1. 🤖 Trợ lý luyện hội thoại tiếng Anh AI (Speaking Partner)
* **Kết nối đa mô hình (Gemini & OpenAI)**: Chọn lựa linh hoạt giữa Google Gemini (`gemini-2.5-flash`) và OpenAI (`gpt-4o-mini`) thông qua cài đặt trực tiếp trên giao diện. Khóa API lưu trữ cục bộ an toàn (`localStorage`).
* **Microphone Shadowing (Voice STT)**: Sử dụng giọng nói trực tiếp qua micro nhờ Web Speech API của trình duyệt, tự động phiên dịch thời gian thực.
* **Text-to-Speech (TTS) thông minh**: Tự động phát âm lời thoại của AI với nhiều accent tùy chọn (Mỹ, Anh, Úc...) và điều chỉnh tốc độ đọc linh hoạt (0.5x - 1.5x).
* **Phân tích Ngữ pháp (Grammar Feedback)**: AI tự động phân tích câu nói của bạn, đề xuất câu sửa lại tự nhiên hơn và giải thích chi tiết lỗi ngữ pháp bằng Tiếng Việt.
* **Nhập vai theo Tình huống (Roleplay)**: Hỗ trợ 4 kịch bản giao tiếp phổ biến bao gồm: Tán gẫu tự do (*Casual Chat*), Phỏng vấn xin việc (*Job Interview*), Gọi món ăn (*At a Restaurant*), và Thủ tục du lịch (*Travel & Booking*).
* **Khích lệ áp dụng từ vựng**: Tự động đối chiếu câu thoại của bạn với kho từ vựng đang học trong thẻ nhớ Anki, hiển thị Toast khích lệ khi bạn sử dụng thành công từ mới.

### 2. 🎓 Hệ thống ôn tập thẻ nhớ Anki Spaced Repetition (SM-2)
* **Chế độ tự học thông minh**: 
  * *Tự gõ (Typing)* đối với từ đơn để rèn luyện trí nhớ chính tả.
  * *Ghép thẻ chữ (Word Scramble)* dạng kéo thả (HTML5 Drag & Drop) hoặc click chọn nhanh đối với cụm từ/câu.
* **Thuật toán Anki SM-2 chuẩn hóa**: Tính toán chu kỳ ôn tập của thẻ dựa trên 4 mức độ tự đánh giá (*Again, Hard, Good, Easy*).
* **Bảo toàn tiến độ học**: Sử dụng hệ số phạt quên 20% (Lapse Multiplier) khi bấm *Again* thay vì reset hoàn toàn về 1 ngày, kết hợp điểm thưởng trễ hạn (Overdue Delay Bonus) khi bấm *Hard* cho thẻ trễ ngày ôn tập.
* **Khử rung giật khung hình (Cumulative Layout Shift - CLS)**: Thiết kế thẻ học với chiều cao tối thiểu cố định và bố cục Flexbox neo các nút bấm ở đáy giúp giao diện không bị giật hay dịch chuyển khi hiển thị đáp án.

### 3. 🗺️ Địa điểm thám hiểm Google Maps Explorer
* **Locations Ledger**: Bảng lưu giữ và theo dõi trạng thái các quán ăn, quán cafe hay địa điểm du lịch muốn chinh phục.
* **Cột Address tinh tế**: Cột địa chỉ được thiết kế đồng bộ kích thước và font chữ (`text-slate-650`) của cột Meaning trên trang Vocabulary, giúp giao diện bảng luôn hài hòa, liền mạch.
* **Nút Explore thông minh**: Tự sinh liên kết tìm kiếm nhanh trên Google bằng tên địa điểm và thành phố.

### 4. 💎 Quản lý tài sản & Bộ sưu tập (Collections Tracker)
* Bộ danh mục 3 cột tinh giản giúp quản lý đồ dùng, thương hiệu, loại tài sản và trạng thái check-in. Tự động sinh liên kết Google Search tìm kiếm nguồn gốc sản phẩm nhanh chóng.

### 5. 🚀 Cơ chế Cập nhật lạc quan (Optimistic UI) & Rollback tự động
* **Zero Latency**: Mọi thao tác thêm mới, sửa đổi hay xóa dữ liệu đều cập nhật trực quan trên màn hình ngay lập tức mà không chờ API Sheets phản hồi.
* **Auto-Rollback**: Khi API xảy ra lỗi hoặc mất kết nối mạng, hệ thống tự động hoàn tác (rollback) dữ liệu cục bộ về trạng thái cũ và hiển thị thông báo lỗi chi tiết.
* **Row Shifting thông minh**: Khi xóa dòng trên Google Sheets (làm đẩy các dòng dưới lên), hệ thống tự động điều chỉnh chỉ số dòng (`rowNumber`) cục bộ thời gian thực mà không cần tải lại toàn bộ bảng tính.

### 6. 🛡️ An toàn & Bảo mật tuyệt đối
* **XSS Clean-up**: Mọi dữ liệu hiển thị đều đi qua bộ lọc `escapeHTML`, triệt tiêu hoàn toàn nguy cơ bị tiêm mã độc.
* **Lưu trữ Credentials cục bộ**: Không sử dụng máy chủ trung gian, toàn bộ khóa API và token đều được lưu trữ trực tiếp trên trình duyệt cá nhân của bạn.

---

## 📊 Cấu trúc cơ sở dữ liệu Google Sheet tiêu chuẩn

Hệ thống sẽ **tự động khởi tạo** các tab và cấu trúc cột sau đây nếu bảng tính Google Sheet của bạn đang trống:

| Tên Tab (Có thể tùy biến) | Cột A | Cột B | Cột C | Cột D | Cột E | Cột F / G / H / I / J |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`expenses`** (Chi tiêu) | Date | Category | Amount | Note | | |
| **`vocabulary`** (Từ vựng) | Content | Transcription | Category | Topic | Level | Meaning, Status, Next Review, Ease Factor, Interval |
| **`habits`** (Thói quen) | Date | Habit | Status | | | |
| **`links`** (Liên kết nhanh) | Title | Category | Content | | | |
| **`prompts`** (Gợi ý AI) | Title | Content | Category | | | |
| **`goals`** (Mục tiêu) | Goal Name | Start Date | End Date | Current Value | Target Value | |
| **`tasks`** (Công việc) | Date | Task | Status | | | |
| **`google_maps`** (Địa điểm) | place | city | category | address | status | |
| **`collections`** (Tài sản) | item | brand | style | category | status | |

---

## 🛠️ Hướng dẫn thiết lập & Vận hành

### Bước 1: Khởi tạo thông số kết nối Google Cloud
Truy cập [Google Cloud Console](https://console.cloud.google.com/) và thực hiện:
1. **API Key**: Vào mục *APIs & Services > Credentials*, chọn *Create Credentials > API Key*. Giới hạn API Key chỉ dùng cho **Google Sheets API**.
2. **OAuth 2.0 Client ID**: Chọn loại ứng dụng là **Web application**. Thêm các địa chỉ được phép chạy vào mục *Authorized JavaScript origins*:
   - Local: `http://localhost:5173`
   - Online: `https://<tên-tài-khoản-github>.github.io`
3. **Spreadsheet ID**: Tạo Google Sheet mới và sao chép chuỗi mã ký tự ngẫu nhiên trên URL bảng tính:
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

### Bước 2: Cấu hình ứng dụng (Chọn 1 trong 2 cách)
* **Cách A: Nhập trực tiếp trên giao diện Dashboard (Khuyên dùng)**
  1. Click biểu tượng **Setting** ở góc dưới sidebar bên trái.
  2. Điền **Spreadsheet ID**, **API Key**, và **Client ID**, sau đó nhấn **Save Settings**.
  3. Bấm **Connect Google Sheets** và tiến hành xác thực cấp quyền với tài khoản Google.
* **Cách B: Sử dụng tệp cấu hình `.env` cho môi trường Dev**
  1. Tạo tệp `.env` tại thư mục `frontend/` (sao chép từ `.env.example`).
  2. Điền thông tin cấu hình:
     ```env
     VITE_SPREADSHEET_ID=mã_bảng_tính_của_bạn
     VITE_API_KEY=api_key_của_bạn
     VITE_CLIENT_ID=client_id_của_bạn
     ```

### Bước 3: Deploy lên GitHub Pages tự động qua GitHub Actions
1. Đẩy mã nguồn lên một repository GitHub (ví dụ: `webapp_project`).
2. Vào **Settings > Actions > General** của repo, cuộn xuống phần **Workflow permissions**, chọn **Read and write permissions** rồi bấm **Save**.
3. Vào **Settings > Pages**, dưới mục **Build and deployment > Source**, thiết lập deploy từ **GitHub Actions**.
4. Mỗi lần bạn `git push` lên nhánh `main`, hệ thống sẽ tự động build và deploy lên GitHub Pages sau khoảng 1 phút tại địa chỉ:
   `https://<tên-tài-khoản-github>.github.io/webapp_project/`

---

## 💻 Hướng dẫn phát triển dưới môi trường Local (Local Development)

Để chạy thử nghiệm và phát triển ứng dụng trực tiếp trên máy tính:
1. Đảm bảo máy tính đã cài đặt **[Node.js](https://nodejs.org/)**.
2. Di chuyển vào thư mục `frontend` và cài đặt các thư viện:
   ```bash
   cd frontend
   npm install
   ```
3. Khởi chạy server phát triển cục bộ (Hot Reload):
   ```bash
   npm run dev
   ```
4. Mở trình duyệt và truy cập: `http://localhost:5173` để bắt đầu phát triển.

Chúc bạn có những trải nghiệm quản lý cuộc sống tự động hóa và học tập tiếng Anh hiệu quả tuyệt vời cùng **Personal Life OS**! 🚀
