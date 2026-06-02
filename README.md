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
        │   ├── api.js           # Core API Client (Direct Sheets API v4 CRUD & LocalStorage Fallback)
        │   └── toast.js         # Hệ thống thông báo Custom Toast xếp chồng cao cấp
        └── components/          # Các mô-đun UI cô lập điều khiển nghiệp vụ chi tiết
            ├── charts.js        # Vẽ biểu đồ tương tác thời gian thực bằng Chart.js (Import Local)
            ├── sidebar.js       # Co giãn và kéo thả sắp xếp vị trí các menu trên Sidebar
            ├── expenses.js      # Nghiệp vụ & CRUD tài chính chi tiêu (Expenses)
            ├── vocabulary.js    # Nghiệp vụ & CRUD kho từ vựng (Vocabulary)
            ├── srs.js           # Game tương tác & thuật toán học tập Anki Spaced Repetition (Practice)
            ├── links.js         # Quản lý liên kết nhanh (Quick Links)
            ├── prompts.js       # Quản lý gợi ý AI (AI Prompts)
            ├── goals.js         # Theo dõi tiến độ mục tiêu tối giản (Goals)
            ├── tasks.js         # Quản lý công việc thông minh (Tasks)
            ├── habits.js        # Theo dõi & đánh giá thói quen hằng ngày (Habits)
            └── google_maps.js   # Game tương tác thám hiểm thành phố & Bản đồ vệ tinh (Google Maps)
```

---

## ⚡ Các giải pháp công nghệ & Tính năng cao cấp mình đã tích hợp

### 1. 🎓 Hệ thống học tập Anki Spaced Repetition (SM-2) đa chế độ
* **Phân tách Chế độ học động**: Hệ thống tự động phân loại học tập dựa trên dữ liệu đầu vào. Kích hoạt **Tự gõ (Typing)** đối với từ vựng đơn (`Vocabulary`) giúp khắc sâu trí nhớ chính tả. Kích hoạt **Ghép thẻ chữ (Word Scramble)** dạng kéo thả đối với cụm từ (`Phrase`) hoặc câu (`Sentence`).
* **Microphone Shadowing (Web Speech API)**: Tích hợp công nghệ nhận diện giọng nói gốc của trình duyệt. Luyện nói đuổi trực tiếp, tự động so khớp, tính % độ chính xác và tô màu trực quan từng từ đúng/sai mà không tốn chi phí cho API bên thứ ba.
* **Đồng bộ hóa Thuật toán Anki SM-2 chuẩn xác**: Khắc phục triệt để lỗi hoán đổi chỉ số cột GAPI cũ. Chu kỳ ôn tập của thẻ học được tính toán khoa học dựa trên mức độ đánh giá tương ứng (**Again, Hard, Good, Easy**), giúp giãn cách thời gian học hợp lý.

### 2. 🖱️ Cơ chế Ghép từ Word Scramble kéo thả (HTML5 Drag & Drop) mượt mà
* Tích hợp đồng thời hai chế độ: click chọn nhanh thẻ từ và **kéo thả vật lý** trực tiếp trên Desktop để thay đổi vị trí các thẻ câu vô cùng trực quan và sinh động.
* **Auto-Check & Ẩn động**: Ngay khi ghép đúng thẻ chữ cuối cùng, hệ thống tự động chấm điểm và hiển thị banner kết quả mà không cần nút bấm thủ công rườm rà. Ô chứa thẻ từ trống bên dưới sẽ tự động được ẩn đi (`hidden`) để giải phóng không gian.
* **Bảo toàn từ viết tắt**: Thuật toán xử lý chuỗi thông minh, bảo toàn nguyên vẹn dấu nháy đơn (`'`) của các từ viết tắt tiếng Anh (như *That's, don't, I'm*) mà không bị lọc bỏ nhầm.

### 3. 🎯 Khử hoàn toàn hiện tượng co giãn và giật khung (CLS Elimination)
* Thiết lập chiều cao tối thiểu cố định (`min-h-[460px] sm:min-h-[480px]`) kết hợp cấu trúc cột Flexbox (`flex flex-col justify-between`).
* Toàn bộ cụm nút hành động và đánh giá Anki được neo chặt (anchor) ở đáy thẻ học. Các thông tin đáp án xuất hiện chỉ lấp đầy khoảng trống ở giữa, giúp giao diện ôn tập ổn định tuyệt đối trước và sau khi lật đáp án, loại bỏ 100% cảm giác giật khung hình gây khó chịu cho mắt.

### 4. 🛡️ Bảo mật tối đa chống tấn công chéo XSS & Lộ Key
* **XSS Clean-up**: Lọc sạch 100% mã độc đầu ra bằng hàm `escapeHTML` ở tất cả các mô-đun UI (bao gồm cả danh mục Habits mới cập nhật), bảo vệ trình duyệt của bạn khỏi việc thực thi mã script độc hại.
* **Bảo vệ khóa bí mật**: Các thông tin bảo mật kết nối Google Cloud của bạn được che giấu an toàn thông qua tệp cấu hình `.env` cục bộ (được bỏ qua bởi `.gitignore`), hoặc được mã hóa lưu trữ an toàn trong `localStorage` cá nhân của riêng bạn khi chạy trực tuyến.

### 5. 🌐 Cơ chế hoạt động Offline & Bundle Thư viện cục bộ (Local-First)
* Loại bỏ hoàn toàn CDNs ngoài tại thời gian chạy (runtime) cho các thư viện bên thứ ba như `Chart.js` hay `SortableJS`. 
* Tất cả được cài đặt cục bộ qua `npm` và đóng gói tĩnh thông qua Vite. Ứng dụng khởi chạy tức thì và tự động kích hoạt chế độ **Offline Fallback** (ghi/đọc trực tiếp trên LocalStorage) khi mất kết nối mạng.

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
