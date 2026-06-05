# 🚀 Personal Life OS — Serverless Dashboard Web App

**Personal Life OS** là một Single Page Application (SPA) giúp quản lý toàn diện cuộc sống (chi tiêu, thói quen, công việc, mục tiêu, địa điểm du lịch, bộ sưu tập tài sản) và tự học tiếng Anh qua hệ thống thẻ nhớ **Anki Spaced Repetition (SRS)** kết hợp **Trợ lý hội thoại AI Speaking Partner**. 

Ứng dụng kết nối trực tiếp **Google Sheets REST API v4** và **Google OAuth 2.0 (Google Identity Services)**, chạy 100% phía client, không sử dụng server trung gian.

---

## 📂 Cấu trúc thư mục dự án

```text
personal_webapp/
├── .github/workflows/deploy.yml # CI/CD tự động deploy lên GitHub Pages
├── README.md                    # Tài liệu hướng dẫn (Tệp tin này)
└── frontend/                    # Mã nguồn chính của ứng dụng
    ├── index.html               # Entry point HTML & Settings modal
    ├── package.json             # Cấu hình dependencies (Vite, Tailwind, v.v.)
    ├── vite.config.js           # Cấu hình đóng gói build
    └── src/
        ├── main.js              # Khởi chạy ứng dụng, quản lý Auth & định tuyến Tab
        ├── styles/main.css      # Cấu hình CSS chính & giao diện Glassmorphism
        ├── services/
        │   ├── api.js           # Xử lý CRUD Google Sheets & Local Storage
        │   ├── ai.js            # Client kết nối Gemini / OpenAI
        │   └── toast.js         # Hệ thống thông báo toast
        └── components/          # Các module nghiệp vụ UI
            ├── sidebar.js       # Co giãn/điều phối Sidebar
            ├── charts.js        # Vẽ biểu đồ thống kê (Chart.js)
            ├── expenses.js      # Module Quản lý chi tiêu
            ├── vocabulary.js    # Module Từ điển từ vựng
            ├── srs.js           # Trình ôn tập Anki SRS
            ├── ai_chat.js       # Giao diện hội thoại & Phân tích ngữ pháp AI
            ├── grammar_diaries.js # Nhật ký lỗi ngữ pháp & lật thẻ ôn tập
            ├── goals.js         # Theo dõi tiến độ mục tiêu
            ├── tasks.js         # Quản lý công việc
            ├── habits.js        # Đánh giá thói quen hằng ngày
            ├── collections.js   # Quản lý bộ sưu tập tài sản
            └── google_maps.js   # Địa điểm du lịch/ăn uống (Google Maps)
```

---

## ✨ Các tính năng & Giải pháp kỹ thuật chính

* **🤖 Trợ lý hội thoại AI (Speaking Partner)**: 
  * Tích hợp linh hoạt **Google Gemini** (`gemini-2.5-flash`) và **OpenAI** (`gpt-4o-mini`). API Key được lưu bảo mật ở `localStorage`.
  * Hỗ trợ nhận diện giọng nói (Speech-to-Text) và tự động phát âm phản hồi (Text-to-Speech) với nhiều tốc độ, accent.
  * Phân tích và giải thích chi tiết lỗi ngữ pháp bằng tiếng Việt kèm câu sửa mẫu.
  * Tự động phát hiện và gửi thông báo khích lệ khi người dùng áp dụng thành công từ vựng đang học trong thẻ SRS vào hội thoại.
* **📝 Nhật ký lỗi ngữ pháp (Grammar Error Diary)**:
  * Tự động ghi lại các câu có lỗi ngữ pháp trong quá trình chat với AI Speaking Partner và đồng bộ trực tiếp lên Google Sheets.
  * Hiển thị các lỗi dưới dạng thẻ học lật 3D Anki-style (Mặt trước: lỗi sai & ngày; Mặt sau: câu sửa đúng & giải thích chi tiết bằng tiếng Việt).
  * Hỗ trợ nút **Mastered** tự động xóa thẻ ghi nhớ và xóa dòng tương ứng trên Google Sheets bằng đồng bộ hóa ngầm (Silent sync) tránh giật lag, nháy màn hình.
* **🎓 Ôn tập Anki Spaced Repetition (SM-2)**:
  * Chế độ *Typing* luyện chính tả từ đơn và *Word Scramble* kéo thả (Drag & Drop) luyện ghép cụm từ/câu.
  * Áp dụng thuật toán SM-2 chuẩn hóa (Again, Hard, Good, Easy) với cơ chế bảo toàn tiến độ (20% Lapse Penalty) và cộng thưởng trễ hạn (Overdue Delay Bonus).
  * Chống giật khung hình (CLS) bằng layout cố định chiều cao thẻ học.
* **🚀 Cập nhật lạc quan (Optimistic UI) & Rollback tự động**:
  * Cập nhật UI ngay lập tức (Zero Latency) khi thêm/sửa/xóa dòng, tự động hoàn tác (rollback) nếu API Sheets báo lỗi hoặc mất mạng.
  * Tự động căn chỉnh chỉ số dòng (`rowNumber`) thời gian thực khi có thao tác xóa hàng trên Google Sheets.
* **🗺️ Google Maps Explorer**:
  * Quản lý địa điểm thám hiểm kèm nút tìm kiếm nhanh trên Google.
  * Cột Address được đồng bộ kiểu chữ (`text-slate-650`) với cột Meaning của trang Vocabulary nhằm tối ưu hóa thẩm mỹ giao diện.
* **🛡️ Bảo mật & An toàn**:
  * Sử dụng bộ lọc `escapeHTML` ở tất cả các đầu ra để ngăn chặn tấn công XSS.

---

## 📊 Cấu trúc cột dữ liệu Google Sheet tiêu chuẩn

Nếu Spreadsheet trống, hệ thống sẽ **tự động khởi tạo** các tab và dòng tiêu đề sau:

| Tên Tab | Cột A | Cột B | Cột C | Cột D | Cột E | Các cột còn lại (F đến J) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`expenses`** | Date | Category | Amount | Note | | |
| **`vocabulary`** | Content | Transcription | Category | Topic | Level | Meaning, Status, Next Review, Ease Factor, Interval |
| **`habits`** | Date | Habit | Status | | | |
| **`links`** | Title | Category | Content | | | |
| **`prompts`** | Title | Content | Category | | | |
| **`goals`** | Goal Name | Start Date | End Date | Current Value | Target Value | |
| **`tasks`** | Date | Task | Status | | | |
| **`google_maps`**| place | city | category | address | status | |
| **`collections`**| item | brand | style | category | status | |
| **`grammar_diaries`**| date | scenario | user_sentence | corrected_sentence | explanation | |

---

## 🛠️ Hướng dẫn thiết lập & Vận hành nhanh

### Bước 1: Lấy thông tin kết nối từ Google Cloud Console
1. **API Key**: Tạo API Key tại mục *APIs & Services > Credentials* (giới hạn quyền truy cập chỉ dùng cho *Google Sheets API*).
2. **OAuth 2.0 Client ID**: Tạo Client ID cho ứng dụng Web. Thêm các link được phép truy cập vào **Authorized JavaScript origins**:
   * Chạy local: `http://localhost:5173`
   * Chạy online: `https://<tên-tài-khoản-github>.github.io`
3. **Spreadsheet ID**: Tạo Google Sheet mới và sao chép ID trên URL: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`.

### Bước 2: Cấu hình credentials (Chọn 1 trong 2 cách)
* **Cách A (Giao diện Web)**: Vào **Setting** (góc dưới sidebar bên trái) -> Nhập Spreadsheet ID, API Key, Client ID -> Bấm **Save Settings** -> Nhấp **Connect Google Sheets** để đăng nhập OAuth.
* **Cách B (Môi trường Dev)**: Tạo file `.env` tại thư mục `frontend/` và điền:
  ```env
  VITE_SPREADSHEET_ID=mã_bảng_tính
  VITE_API_KEY=api_key_của_bạn
  VITE_CLIENT_ID=client_id_của_bạn
  ```

### Bước 3: Triển khai lên GitHub Pages
1. Đẩy code lên repository GitHub cá nhân (nhánh `main`).
2. Vào **Settings > Actions > General**, mục *Workflow permissions* chọn **Read and write permissions** rồi lưu lại.
3. Vào **Settings > Pages**, mục *Build and deployment > Source* chọn **GitHub Actions**. Hệ thống sẽ tự động build và deploy sau mỗi lượt push code lên `main`.

---

## 💻 Khởi chạy dưới máy tính (Local Development)

1. Cài đặt các thư viện cần thiết:
   ```bash
   cd frontend
   npm install
   ```
2. Khởi chạy server phát triển cục bộ:
   ```bash
   npm run dev
   ```
3. Truy cập địa chỉ hiển thị trên terminal (thông thường là `http://localhost:5173`) để kiểm thử.
