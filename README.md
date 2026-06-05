# 🚀 Personal Life OS - Serverless Dashboard Web App
> *Hệ điều hành quản lý cuộc sống cá nhân (Chi tiêu, Thói quen, Từ vựng Anki, Công việc, Mục tiêu) dạng Serverless SPA chạy trực tiếp trên trình duyệt, kết nối trực tiếp Google Sheets REST API v4 & Google OAuth 2.0 (Google Identity Services).*

[![Built with Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white)](https://vitejs.dev/)
[![Styled with Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Powered by Google Sheets](https://img.shields.io/badge/Google_Sheets_API-4285F4?style=for-the-badge&logo=google-sheets&logoColor=white)](https://developers.google.com/sheets/api)
[![OAuth 2.0 Protected](https://img.shields.io/badge/Google_OAuth_2.0-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/identity)
[![CI/CD GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)

---

## 🌟 Lời mở đầu & Tầm nhìn dự án

Đây là **Personal Life OS** - dự án mà mình tự tay thiết kế, phát triển và tối ưu hóa nhằm tạo ra một "hệ điều hành" quản lý trọn vẹn cuộc sống của chính mình (từ tài chính, thói quen hằng ngày, công việc, mục tiêu năm cho đến việc học tiếng Anh chuyên sâu). 

Điểm đặc biệt và tự hào nhất của dự án này là **100% không dùng Backend/Apps Script trung gian**. Mình đã xây dựng ứng dụng kết nối trực tiếp, bảo mật và thời gian thực từ trình duyệt của người dùng đến máy chủ Google Cloud thông qua bộ đôi **Google Sheets API v4 REST** và **Google OAuth 2.0 (Google Identity Services)**. Google Sheets đóng vai trò như một cơ sở dữ liệu (Database) hoàn toàn miễn phí, trực quan và thuộc quyền sở hữu dữ liệu tuyệt đối của bạn!

---

## 📂 Sơ đồ cấu trúc thư mục tiêu chuẩn doanh nghiệp

Mã nguồn được mình thiết kế vô cùng tinh gọn, phân tách module nghiệp vụ rõ ràng (Separation of Concerns) giúp dễ dàng mở rộng và bảo trì:

```text
webapp_project/ (personal_webapp/)
├── .github/
│   └── workflows/
│       └── deploy.yml           # Quy trình CI/CD tự động build & deploy lên GitHub Pages
├── README.md                    # Tài liệu hướng dẫn vận hành chuẩn hóa (Tệp tin này)
└── frontend/                    # [MÃ NGUỒN STATIC WEB APP]
    ├── index.html               # Entry Point HTML (Đã tích hợp CSS/JS đóng gói, Settings Modal)
    ├── package.json             # Danh sách thư viện và Scripts vận hành (Vite, Tailwind, Autoprefixer)
    ├── vite.config.js           # Cấu hình Vite đóng gói tối ưu (base path: /webapp_project/)
    ├── postcss.config.js        # Tối ưu hóa xử lý CSS hậu biên dịch
    ├── tailwind.config.js       # Phạm vi biên dịch các lớp tiện ích Tailwind
    ├── .gitignore               # Loại trừ môi trường node_modules/, các khóa bí mật .env
    └── src/
        ├── main.js              # Khởi chạy SDKs Google, điều phối & quản lý Auth, Hotkeys toàn cục
        ├── styles/
        │   └── main.css         # CSS gốc chứa Tailwind directives, thiết kế Glassmorphism & Toast
        ├── services/
        │   ├── api.js           # Core API Client (Direct Sheets API v4 CRUD)
        │   ├── ai.js            # [NEW] AI REST API Client (Gemini & OpenAI integrations)
        │   └── toast.js         # Hệ thống thông báo Custom Toast xếp chồng cao cấp
        └── components/          # Các mô-đun UI cô lập điều khiển nghiệp vụ chi tiết
            ├── charts.js        # Vẽ biểu đồ tương tác thời gian thực bằng Chart.js (Import Local)
            ├── sidebar.js       # Co giãn và kéo thả sắp xếp vị trí các menu trên Sidebar
            ├── expenses.js      # Nghiệp vụ & CRUD tài chính chi tiêu (Expenses)
            ├── vocabulary.js    # Nghiệp vụ & CRUD kho từ vựng (Vocabulary)
            ├── srs.js           # Game tương tác & thuật toán học tập Anki Spaced Repetition (Practice)
            ├── ai_chat.js       # [NEW] Logic & giao diện Trợ lý trò chuyện tiếng Anh (AI Speaking Partner)
            ├── links.js         # Quản lý liên kết nhanh (Quick Links)
            ├── prompts.js       # Quản lý gợi ý AI (AI Prompts)
            ├── goals.js         # Theo dõi tiến độ mục tiêu tối giản (Goals)
            ├── tasks.js         # Quản lý công việc thông minh (Tasks)
            ├── habits.js        # Theo dõi & đánh giá thói quen hằng ngày (Habits)
            ├── collections.js   # Quản lý bộ sưu tập & danh mục tài sản 3 cột tinh giản (Collections)
            └── google_maps.js   # Bản đồ tương tác & Quản lý danh sách địa điểm thám hiểm (Google Maps)
```

---

## ⚡ Các giải pháp công nghệ & Tính năng cao cấp mình đã tích hợp

### 1. 🎓 Hệ thống ôn tập Anki Spaced Repetition (SM-2) khoa học
* **Phân tách Chế độ học động**: Hệ thống tự động phân loại học tập dựa trên dữ liệu đầu vào. Kích hoạt **Tự gõ (Typing)** đối với từ vựng đơn (`Vocabulary`) giúp khắc sâu trí nhớ chính tả. Kích hoạt **Ghép thẻ chữ (Word Scramble)** dạng kéo thả đối với cụm từ (`Phrase`) hoặc câu (`Sentence`).
* **Microphone Shadowing (Web Speech API)**: Tích hợp công nghệ nhận diện giọng nói gốc của trình duyệt. Luyện nói đuổi trực tiếp, tự động so khớp, tính % độ chính xác và tô màu trực quan từng từ đúng/sai mà không tốn chi phí cho API bên thứ ba.
* **Chuẩn hóa Thuật toán Anki SM-2**: Chu kỳ ôn tập của thẻ học được tính toán khoa học dựa trên mức độ đánh giá tương ứng (**Again, Hard, Good, Easy**). Quản lý 3 trạng thái thẻ (*New*, *Relearning*, *Review*) với các công số điều chỉnh hệ số dễ (Ease Factor) tối ưu.
* **Lưu giữ prevInterval & Hệ số quên (20% Lapse Multiplier)**: Khi thẻ bị quên (Again), khoảng cách ngày trước đó được lưu trữ trong session và áp dụng hệ số suy giảm 20% khi thẻ tốt nghiệp lại, giúp thẻ không bị mất dấu sự tiến bộ trước đó (thay vì bị reset hoàn toàn về 1 ngày).
* **Điểm cộng trễ (Overdue Delay Bonus)**: Tự động cộng thêm ngày thưởng khi người dùng nhấn Hard cho các thẻ ôn tập bị trễ hạn: `new_interval = Math.round((prev_interval + delay / 4) * 1.2)`.

### 2. 🖱️ Cơ chế Ghép từ Word Scramble kéo thả (HTML5 Drag & Drop) mượt mà
* Tích hợp đồng thời hai chế độ: click chọn nhanh thẻ từ và **kéo thả vật lý** trực tiếp trên Desktop để thay đổi vị trí các thẻ câu vô cùng trực quan và sinh động.
* **Auto-Check & Đồng bộ hiển thị tối giản**: Ngay khi ghép đúng thẻ chữ cuối cùng hoặc khi xem đáp án (Reveal), hệ thống tự động hoàn thành và quy về chung một kiểu hiển thị tối giản: ẩn hoàn toàn các nền ô chữ (word buttons) rườm rà, chỉ giữ lại văn bản trơn (Plain Text) được căn giữa gọn gàng bên trong một khung viền dày dặn `border-[3px]` sắc nét (màu xanh lá khi đúng, xanh dương khi reveal) trên nền trắng tinh tế. Đồng bộ hóa hoàn hảo với giao diện của chế độ Tự gõ (Typing).
* **Bảo toàn từ viết tắt**: Thuật toán xử lý chuỗi thông minh, bảo toàn nguyên vẹn dấu nháy đơn (`'`) của các từ viết tắt tiếng Anh (như *That's, don't, I'm*) mà không bị lọc bỏ nhầm.

### 3. 🎯 Khử hoàn toàn hiện tượng co giãn và giật khung (CLS Elimination)
* Thiết lập chiều cao tối thiểu cố định (`min-h-[360px] sm:min-h-[380px]`) kết hợp cấu trúc cột Flexbox (`flex flex-col justify-between`).
* Toàn bộ cụm nút hành động và đánh giá Anki được neo chặt (anchor) ở đáy thẻ học. Các thông tin đáp án xuất hiện chỉ lấp đầy khoảng trống ở giữa, giúp giao diện ôn tập ổn định tuyệt đối trước và sau khi lật đáp án, loại bỏ 100% cảm giác giật khung hình gây khó chịu cho mắt.

### 4. 🛡️ Bảo mật tối đa chống tấn công chéo XSS & Lộ Key
* **XSS Clean-up**: Lọc sạch 100% mã độc đầu ra bằng hàm `escapeHTML` ở tất cả các mô-đun UI (bao gồm cả danh mục Habits mới cập nhật), bảo vệ trình duyệt của bạn khỏi việc thực thi mã script độc hại.
* **Bảo vệ khóa bí mật**: Các thông tin bảo mật kết nối Google Cloud của bạn được che giấu an toàn thông qua tệp cấu hình `.env` cục bộ (được bỏ qua bởi `.gitignore`), hoặc được mã hóa lưu trữ an toàn trong `localStorage` cá nhân của riêng bạn khi chạy trực tuyến.

### 5. 📦 Bundle Thư viện cục bộ (Self-hosted Assets)
* Loại bỏ hoàn toàn CDNs ngoài tại thời gian chạy (runtime) cho các thư viện bên thứ ba như `Chart.js` hay `SortableJS`. 
* Tất cả được cài đặt cục bộ qua `npm` và đóng gói tĩnh thông qua Vite. Ứng dụng khởi chạy tức thì, an toàn và tối ưu hóa tài nguyên mạng.

### 6. 🗺️ Danh sách địa điểm Google Maps Explorer Tinh Giản
* **Bảng theo dõi chuyến đi**: Giúp lưu trữ, phân loại và đánh dấu check-in trạng thái đã chinh phục đối với các quán ăn, địa danh du lịch mong muốn thám hiểm.
* **Hộp số liệu thống kê ở đầu thẻ**: Bổ sung bảng hiển thị tổng số địa điểm và số danh mục (Categories) trực quan ngay tại phần tiêu đề giúp theo dõi tiến độ nhanh chóng.
* **Đồng bộ hóa 5 Cột Tinh giản**: Dữ liệu chạy hoàn toàn trên 5 cột Sheet gọn nhẹ: `place` (Địa điểm), `city` (Thành phố), `category` (Phân loại), `address` (Địa chỉ), `check` (Trạng thái Check-in).
* **Nút Explore Google Search thông minh**: Nút "Explore 🔍" tự sinh liên kết Google Search tìm kiếm nhanh thông tin chi tiết về địa điểm theo Tên quán + Thành phố tiện lợi.

### 7. 💎 Quản lý Bộ sưu tập Collections (Asset Portfolio) Tinh Giản
* **Ledger Theo Dõi Chi Tiết**: Ghi nhận toàn diện danh mục đồ dùng cá nhân thông qua bảng 6 cột: `Asset Item` (Tên vật phẩm), `Brand` (Thương hiệu), `Style` (Kiểu dáng/Loại), `Category` (Phân loại), `Status` (Trạng thái Check-in hoàn thành) và các nút hành động.
* **Hộp số liệu thống kê ở đầu thẻ**: Bổ sung bảng hiển thị tổng số tài sản, số thương hiệu và số danh mục (Categories) trực quan ngay tại phần tiêu đề.
* **Form & Bộ lọc Tiện ích**: Nhập liệu nhanh chóng qua form 4 trường nhập liệu và bộ lọc tự động phân tích theo Brand & Category.
* **Nút Explore Liên kết Thông minh**: Tự sinh liên kết tìm kiếm nhanh vật phẩm trên Google Search hỗ trợ tra cứu nguồn gốc.

### 8. 🎯 Theo dõi Tiến độ Mục tiêu (Goals Tracker) Nâng cấp 2 Cột & Progress Bar
* **Tách cột Current / Target**: Phân chia chỉ số hiện tại và mục tiêu thành 2 cột riêng biệt (`CURRENT` và `TARGET`) giúp bảng dữ liệu trực quan và dễ đọc hơn.
* **Thanh tiến độ Progress Bar Gradient Xanh biển**: Cập nhật màu sắc thanh tiến độ sang dải gradient xanh dương hiện đại (`from-blue-600 to-sky-500`) đồng bộ với hệ thống.

### 9. 🚀 Cơ chế Cập nhật lạc quan (Optimistic UI) & Co giãn số dòng (Row Shifting) tự động
* **Cập nhật tức thời (Zero Latency)**: Mọi thao tác Thêm mới, Chỉnh sửa, Thay đổi trạng thái hoặc Xóa trên tất cả các trang (Habits, Expenses, Tasks, Goals, Google Maps, Collections, Links, Prompts, Vocabulary) đều cập nhật trực tiếp mảng dữ liệu cục bộ và vẽ lại giao diện ngay lập tức mà không cần chờ API phản hồi. Người dùng trải nghiệm tốc độ phản hồi 0s.
* **Tự động Hoàn tác (Rollback)**: Nếu API Google Sheets trả về lỗi hoặc mất kết nối mạng, hệ thống tự động phục hồi trạng thái giao diện và mảng dữ liệu về thời điểm trước khi thao tác, hiển thị thông báo lỗi trực quan mà không bị gián đoạn trải nghiệm.
* **Co giãn số dòng thông minh (Row Shifting on Delete)**: Do đặc thù Google Sheets đẩy các dòng phía sau lên khi xóa 1 dòng, hệ thống tự động co giãn `rowNumber` của các phần tử cục bộ để luôn đồng bộ chỉ số dòng mà không phải tải lại toàn bộ bảng tính (giảm tải 3 giây chờ).

### 10. 📖 Quản lý Từ vựng (Vocabulary Dictionary) & Phát âm bản xứ
* **Tích hợp Phiên âm (Transcription)**: Thêm cột `Transcription` ngay sau từ vựng giúp theo dõi và sửa đổi cách phát âm chuẩn IPA của từ ngay trên bảng danh sách.
* **Tính năng Phát âm Tức thì (Speech Synthesis)**: Tích hợp nút loa phát âm ngay cạnh từ vựng trong danh sách, sử dụng Web Speech API để phát giọng đọc tiếng Anh chuẩn bản xứ trực tiếp không qua API bên thứ ba.

### 11. 🤖 Trợ lý luyện nói Tiếng Anh AI Speaking Partner (Gemini & OpenAI)
* **Tích hợp linh hoạt đa mô hình (Multi-provider AI)**: Cho phép cấu hình và chuyển đổi linh hoạt giữa Google Gemini (`gemini-2.5-flash`) và OpenAI (`gpt-4o-mini`) ngay trong Credentials Modal. Dữ liệu khoá API được lưu trữ cục bộ bảo mật trên trình duyệt cá nhân (`localStorage`).
* **Nhận diện & Phát âm thời gian thực (Voice STT & TTS)**: Tích hợp nhận diện giọng nói `SpeechRecognition` để bạn nói chuyện trực tiếp qua Micro thay vì gõ văn bản, kết hợp phát giọng đọc câu trả lời của AI tự động bằng `SpeechSynthesis` (tuỳ chọn Accent Mỹ, Anh, Úc... và thanh trượt tốc độ từ 0.5x đến 1.5x).
* **Báo cáo và Sửa lỗi Ngữ pháp (Grammar & Syntax Analysis)**: AI tự động phân tích độ chính xác trong câu thoại của bạn. Hiển thị trạng thái phân tích ngữ pháp trực quan, đề xuất câu sửa lại tự nhiên hơn và giải thích chi tiết lỗi bằng tiếng Việt ở bảng điều khiển bên phải.
* **Nhập vai theo Tình huống (Roleplay Scenarios)**: Hỗ trợ 4 kịch bản giao tiếp thực tế bao gồm: Tán gẫu tự do (Casual Chat), Phỏng vấn xin việc (Job Interview Practice), Gọi món tại nhà hàng (At a Restaurant), và Thủ tục du lịch (Travel & Booking).
* **Khích lệ áp dụng từ vựng SRS**: Tự động so khớp câu trò chuyện của bạn với kho từ vựng tiếng Anh hiện tại trong hệ thống Anki. Khi bạn dùng thành công một từ đang học, ứng dụng sẽ gửi thông báo chúc mừng (Custom Toast) để khích lệ sự tiến bộ.

---

## 🛠️ Hướng dẫn thiết lập & Vận hành thực tế (3 Bước)

### Bước 1: Tạo các thông số kết nối trên Google Cloud Console
Truy cập vào [Google Cloud Console](https://console.cloud.google.com/) để khởi tạo 3 thông số định danh sau:
1. **API Key**: Vào mục *APIs & Services > Credentials*, chọn *Create Credentials > API Key*.
   * *Khuyến nghị bảo mật:* Cấu hình giới hạn chỉ cho phép API này gọi Google Sheets API, và giới hạn người gọi từ tên miền ứng dụng trực tuyến của bạn để tránh bị lạm dụng.
2. **OAuth 2.0 Client ID**: 
   * Tại trang Credentials, chọn *Create Credentials > OAuth client ID* chọn loại ứng dụng là **Web application**.
   * Tại mục **Authorized JavaScript origins**, thêm địa chỉ chạy local (`http://localhost:5173`) và địa chỉ trang GitHub Pages của bạn (`https://tên-github-của-bạn.github.io`).
3. **Spreadsheet ID**: Tạo một file Google Sheet mới bất kỳ, sao chép chuỗi ký tự ngẫu nhiên nằm ở giữa cụm `/d/` và `/edit` trên URL trình duyệt của bảng tính đó.

### Bước 2: Cấu hình thông số kết nối (Lựa chọn 1 trong 2 cách)

* **Cách A: Thiết lập trực tiếp trên giao diện Web (Khuyên dùng)**:
  1. Truy cập vào trang web Dashboard của bạn.
  2. Bấm nút **Settings (Credentials)** ở góc dưới sidebar bên trái.
  3. Điền 3 thông số vừa lấy ở Bước 1 vào form và bấm **Lưu cấu hình**.
  4. Nhấn nút **Connect Google Sheets** và tiến hành đăng nhập cấp quyền cho trình duyệt kết nối trực tiếp.
  *👉 Cách này lưu key an toàn trong localStorage trình duyệt cá nhân của bạn, không ai có thể xem trộm.*

* **Cách B: Sử dụng tệp `.env` để nhúng tự động khi lập trình**:
  1. Tạo tệp `.env` nằm trong thư mục `frontend/` (sao chép từ `.env.example`).
  2. Điền đầy đủ thông số:
     ```env
     VITE_SPREADSHEET_ID=mã_spreadsheet_của_bạn
     VITE_API_KEY=api_key_của_bạn
     VITE_CLIENT_ID=client_id_của_bạn
     ```
  3. Hệ thống sẽ tự động nạp cấu hình này khi chạy dưới máy mà không cần nhập thủ công trên giao diện.

### Bước 3: Đẩy dự án lên GitHub & Xuất bản tự động (GitHub Pages)
Quy trình **GitHub Actions** đã được mình viết sẵn để tự động biên dịch và triển khai mã nguồn tối ưu lên GitHub Pages:
1. Tạo một repository trên GitHub của bạn tên là: **`webapp_project`** và đẩy mã nguồn lên nhánh `main`.
2. Đi tới Repository trên GitHub > **Settings** (Cài đặt) > **Actions** > **General**.
3. Cuộn xuống phần **Workflow permissions**, chọn **Read and write permissions** và bấm **Save**.
4. Vào tiếp mục **Settings > Pages**, tại mục *Build and deployment > Source*, chọn nguồn deploy từ **GitHub Actions**.
5. Kể từ giờ, mỗi khi bạn push code mới lên nhánh `main`, ứng dụng sẽ tự động build và xuất bản trực tuyến sau khoảng 1 phút tại địa chỉ:
   `https://<tên-github-của-bạn>.github.io/webapp_project/`

---

## 💻 Cách chạy thử nghiệm và phát triển dưới máy tính (Local Development)

Nếu bạn muốn tự chỉnh sửa, phát triển thêm các tính năng mới trên máy tính cá nhân:
1. Yêu cầu cài đặt sẵn **[Node.js](https://nodejs.org/)** trên máy tính.
2. Mở terminal tại thư mục dự án `frontend/` và cài đặt các dependencies:
   ```bash
   npm install
   ```
3. Khởi chạy máy chủ phát triển cục bộ thời gian thực (Hot Reload):
   ```bash
   npm run dev
   ```
4. Truy cập địa chỉ `http://localhost:5173` được cấp trên terminal để bắt đầu lập trình kiểm thử cực nhanh!

Hy vọng dự án **Personal Life OS** này sẽ mang lại trải nghiệm quản lý cuộc sống tự động hóa và học tiếng Anh hiệu quả tuyệt vời hằng ngày cho bạn! 🚀
