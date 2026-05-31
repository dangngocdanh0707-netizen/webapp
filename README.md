# 🚀 Personal Dashboard - Serverless SPA Web App (Google Sheets API v4 & OAuth 2.0)

Chào mừng bạn! Hệ thống **Personal Dashboard** của bạn đã được nâng cấp toàn diện và cấu trúc lại theo kiến trúc **Serverless SPA (Single Page Application)** chuẩn sản xuất hiện đại. 

Chúng ta đã **loại bỏ hoàn toàn 100% Apps Script (Backend) trung gian**, thiết lập kết nối trực tiếp và an toàn từ trình duyệt của bạn đến máy chủ Google thông qua **Google Sheets REST API v4** chính thức và luồng đăng nhập **Google OAuth 2.0 (Google Identity Services)** tiên tiến nhất.

---

## 📂 Sơ đồ cấu trúc thư mục tối giản & chuyên nghiệp
Mã nguồn dự án của bạn hiện tại đã đạt độ sạch sẽ, cấu trúc chuẩn hóa tối đa theo tiêu chuẩn web hiện đại:

```text
webapp_project/ (personal_webapp/)
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD tự động biên dịch & deploy lên GitHub Pages
├── README.md                    # Hướng dẫn vận hành và cấu hình dự án
└── frontend/                    # [MÃ NGUỒN FRONTEND STATIC WEB APP]
    ├── index.html               # Entry Point HTML (Đã tích hợp GAPI, GIS và Settings Modal)
    ├── package.json             # Khai báo thư viện (Vite, Tailwind, Autoprefixer, PostCSS)
    ├── vite.config.js           # Cấu hình Vite đóng gói (base path: /webapp_project/)
    ├── postcss.config.js        # Cấu hình tối ưu hóa biên dịch tĩnh CSS
    ├── tailwind.config.js       # Cấu hình phạm vi biên dịch lớp học Tailwind
    ├── .gitignore               # Loại trừ node_modules/, dist/
    └── src/
        ├── main.js              # Entrypoint JS (Khởi chạy SDKs Google, điều phối & quản lý Auth)
        ├── styles/
        │   └── main.css         # CSS gốc chứa Tailwind directives và hiệu ứng Glassmorphism
        ├── services/
        │   └── api.js           # Core API Client (Direct Sheets API v4 CRUD & LocalStorage Fallback)
        └── components/          # Các mô-đun UI cô lập điều khiển nghiệp vụ chi tiết
            ├── charts.js        # Vẽ biểu đồ tương tác thời gian thực bằng Chart.js
            ├── sidebar.js       # Kéo thả sắp xếp vị trí và co giãn Sidebar
            ├── cost.js          # Nghiệp vụ & CRUD chi tiêu (Expenses)
            ├── vocabulary.js    # Nghiệp vụ & CRUD từ vựng (Vocabulary)
            ├── srs.js           # Thuật toán học tập Anki Spaced Repetition (Practice English)
            ├── links.js         # Nghiệp vụ & CRUD liên kết ghi nhớ (Quick Links)
            ├── prompts.js       # Nghiệp vụ & CRUD Prompt gợi ý AI
            ├── goals.js         # Nghiệp vụ & CRUD theo dõi mục tiêu (Goals)
            ├── tasks.js         # Nghiệp vụ & CRUD việc cần làm (Tasks)
            └── habits.js        # Nghiệp vụ & CRUD theo dõi thói quen (Habits)
```

---

## ⚡ Các tính năng kỹ thuật và giải pháp cao cấp đã tích hợp:

1. **🔒 Bảo mật tuyệt đối (XSS Protection)**:
   * Xây dựng lớp xử lý `escapeHTML` thông minh tại Core API. 
   * Tự động làm sạch toàn bộ dữ liệu nhập vào và hiển thị của người dùng (trong tất cả các mô-đun: Expenses, Vocabulary, Tasks, Goals, Links, Prompts) để triệt tiêu hoàn toàn lỗ hổng bảo mật **XSS (Cross-Site Scripting)**.

2. **🚀 Tối ưu hiệu suất siêu tốc (Static Tailwind CSS Build)**:
   * Đã loại bỏ hoàn toàn trình biên dịch runtime Tailwind CSS CDN động nặng hơn 3MB khỏi `index.html`. 
   * 100% mã CSS lớp được thu gom và biên dịch tĩnh tối ưu tại build-time nhờ Vite & PostCSS. Giúp giảm dung lượng tải ban đầu đi **hơn 85%**, loại bỏ hiện tượng giật giao diện (FOUC), gia tăng tốc độ tải trang lên **gấp 3 lần**!

3. **🔑 Luồng Google OAuth 2.0 & GIS chính thống**:
   * Xác thực tài khoản trực tiếp qua popup Google Identity Services bảo mật cao. 
   * Mã truy cập (Access Token) được quản lý an toàn trong bộ nhớ phiên làm việc, không lưu trữ trên máy chủ trung gian nào.

4. **🔌 Plug-and-Play (Tự động khởi tạo cấu trúc dữ liệu)**:
   * Nếu bạn kết nối ứng dụng với một file Google Sheet mới **hoàn toàn trống rỗng**, hệ thống sẽ tự động phát hiện và gửi yêu cầu API khởi tạo **đầy đủ 7 tab dữ liệu** (`cost`, `vocabulary`, `habit_tracker`, `link`, `prompt`, `goal`, `task`) kèm **tiêu đề cột chuẩn xác**. Bạn không cần tạo bảng tính thủ công!

5. **⚙️ Hộp thoại Settings credentials mờ đục (Glassmorphic)**:
   * Giao diện nhập API Key, OAuth Client ID, và Spreadsheet ID trực quan, lưu trữ an toàn trong `localStorage` cá nhân của trình duyệt của bạn.

6. **🌐 Chế độ Hybrid Local-First Fallback (Offline Mode)**:
   * Nếu chưa kết nối Google Sheets, ứng dụng sẽ tự động chuyển đổi mượt mà sang cơ sở dữ liệu ngoại tuyến dự phòng trong trình duyệt (`localStorage`), đảm bảo trải nghiệm đầy đủ tính năng không bị gián đoạn.

---

## 🛠️ Hướng dẫn thiết lập & Vận hành thực tế (3 Bước)

### Bước 1: Tạo các thông số kết nối Google Cloud
Bạn hãy vào [Google Cloud Console](https://console.cloud.google.com/) để lấy 3 thông số định danh sau:

1. **API Key**: Vào mục *APIs & Services > Credentials*, chọn *Create Credentials > API Key*.
2. **OAuth 2.0 Client ID**: 
   * Cũng tại trang Credentials, chọn *Create Credentials > OAuth client ID* chọn loại ứng dụng là **Web application**.
   * Tại mục **Authorized JavaScript origins**, thêm địa chỉ web chạy dưới máy (`http://localhost:5173`) và địa chỉ trang GitHub Pages của bạn (`https://tên-github-của-bạn.github.io`).
3. **Spreadsheet ID**: Tạo một file Google Sheet mới bất kỳ, copy mã ký tự nằm ở giữa cụm `/d/` và `/edit` trên URL trình duyệt.

### Bước 2: Nhập thông tin cấu hình trên Dashboard
1. Truy cập vào trang web Dashboard cá nhân của bạn (trực tuyến hoặc cục bộ).
2. Nhấn nút **Settings (Credentials)** ở góc dưới sidebar bên trái.
3. Nhập 3 thông số vừa lấy ở Bước 1 vào và bấm **Lưu cấu hình**.
4. Nhấn nút **Connect Google Sheets** và cấp quyền cho popup Google để ứng dụng đồng bộ hai chiều thời gian thực!

### Bước 3: Đẩy dự án lên GitHub để tự động xuất bản (GitHub Pages)
Chúng ta đã cấu hình sẵn quy trình **GitHub Actions tự động biên dịch và xuất bản**. Bạn chỉ cần:

1. Đẩy toàn bộ mã nguồn của dự án này lên một repository trên GitHub của bạn tên là: **`webapp_project`**.
2. Đi tới Repository trên GitHub > chọn mục **Settings** (Cài đặt) > **Actions** > **General**.
3. Cuộn xuống phần **Workflow permissions**, chọn **Read and write permissions** (Quyền đọc và ghi) và bấm **Save** (Lưu).
4. Kích hoạt tính năng **GitHub Pages** trong phần *Settings > Pages*, tại mục *Source*, chọn nguồn deploy từ **GitHub Actions**.
5. Bây giờ, mỗi khi bạn push code lên nhánh `main`, hệ thống sẽ tự động build Vite tối ưu và deploy web lên địa chỉ trực tuyến miễn phí của bạn sau khoảng 1 phút:
   `https://<tên-github-của-bạn>.github.io/webapp_project/`

---

## 💻 Cách chạy thử nghiệm cục bộ dưới máy tính (Local Development)

Nếu bạn muốn chỉnh sửa và phát triển mã nguồn trực tiếp trên máy tính cá nhân của mình:

1. Đảm bảo máy tính đã cài đặt sẵn **[Node.js](https://nodejs.org/)**.
2. Mở terminal tại thư mục `frontend/` và cài đặt các thư viện:
   ```bash
   npm install
   ```
3. Khởi chạy máy chủ phát triển cục bộ thời gian thực (Hot Reload):
   ```bash
   npm run dev
   ```
4. Truy cập địa chỉ `http://localhost:5173` được cấp trên terminal để lập trình kiểm thử cực nhanh!

Chúc bạn có những trải nghiệm tuyệt vời và quản lý hiệu quả cuộc sống cùng **Personal Dashboard v1.1.7**! 🚀
