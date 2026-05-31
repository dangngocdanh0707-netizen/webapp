# 🚀 Personal Dashboard - Serverless SPA Web App (Google Sheets API v4 & OAuth 2.0)

Đây là dự án **Personal Dashboard** - ứng dụng web cá nhân dạng Serverless SPA (Single Page Application) do mình tự phát triển và tối ưu hóa để quản lý mọi mặt trong cuộc sống (chi tiêu, từ vựng học tiếng Anh, công việc, mục tiêu, thói quen...).

Ứng dụng của mình **loại bỏ hoàn toàn 100% Apps Script (Backend) trung gian**, kết nối trực tiếp và an toàn từ trình duyệt đến máy chủ Google thông qua **Google Sheets REST API v4** chính thức và luồng đăng nhập **Google OAuth 2.0 (Google Identity Services)** cực kỳ hiện đại.

---

## 📂 Sơ đồ cấu trúc thư mục tối giản & chuyên nghiệp
Mã nguồn dự án của mình được thiết kế rất sạch sẽ và quy củ theo tiêu chuẩn web hiện đại:

```text
webapp_project/ (personal_webapp/)
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD tự động biên dịch & deploy lên GitHub Pages
├── README.md                    # File hướng dẫn vận hành và cấu hình dự án (Chính là file này)
└── frontend/                    # [MÃ NGUỒN FRONTEND STATIC WEB APP]
    ├── index.html               # Entry Point HTML (Đã tích hợp GAPI, GIS và Settings Modal)
    ├── package.json             # Khai báo thư viện (Vite, Tailwind, Autoprefixer, PostCSS)
    ├── vite.config.js           # Cấu hình Vite đóng gói (base path: /webapp_project/)
    ├── postcss.config.js        # Cấu hình tối ưu hóa biên dịch tĩnh CSS
    ├── tailwind.config.js       # Cấu hình phạm vi biên dịch lớp học Tailwind
    ├── .gitignore               # Loại trừ node_modules/, dist/
    └── src/
        ├── main.js              # Entrypoint JS (Khởi chạy SDKs Google, điều phối & quản lý Auth, Hotkeys)
        ├── styles/
        │   └── main.css         # CSS gốc chứa Tailwind directives và hiệu ứng Glassmorphism & Toast
        ├── services/
        │   ├── api.js           # Core API Client (Direct Sheets API v4 CRUD & LocalStorage Fallback)
        │   └── toast.js         # Hệ thống thông báo Custom Toast cao cấp xếp chồng
        └── components/          # Các mô-đun UI cô lập điều khiển nghiệp vụ chi tiết
            ├── charts.js        # Vẽ biểu đồ tương tác thời gian thực bằng Chart.js (Import Local)
            ├── sidebar.js       # Kéo thả sắp xếp vị trí và co giãn Sidebar (Import Local)
            ├── cost.js          # Nghiệp vụ & CRUD chi tiêu (Expenses)
            ├── vocabulary.js    # Nghiệp vụ & CRUD từ vựng (Vocabulary)
            ├── srs.js           # Thuật toán học tập Anki Spaced Repetition (Practice English)
            ├── links.js         # Nghiệp vụ & CRUD liên kết ghi nhớ (Quick Links)
            ├── prompts.js       # Nghiệp vụ & CRUD Prompt gợi ý AI
            ├── goals.js         # Nghiệp vụ & CRUD theo dõi mục tiêu (Goals - Đã cải tiến UI gọn gàng)
            ├── tasks.js         # Nghiệp vụ & CRUD việc cần làm (Tasks)
            └── habits.js        # Nghiệp vụ & CRUD theo dõi thói quen (Habits)
```

---

## ⚡ Các tính năng kỹ thuật và giải pháp cao cấp mình đã tích hợp:

1. **🌐 Hoạt động Offline & Bundle thư viện cục bộ (Local-First Capabilities)**:
   * Mình đã loại bỏ hoàn toàn việc tải các thư viện như `Chart.js` hay `SortableJS` từ các CDN ngoài tại runtime.
   * Mọi thư viện bên thứ ba giờ đây đều được quản lý qua tệp tin `package.json`, cài đặt cục bộ và đóng gói tự động bằng Vite. Nhờ vậy, ứng dụng khởi động tức thì, hoạt động mượt mà ngay cả khi không có kết nối mạng (Local-First Fallback).

2. **🔔 Hệ thống Custom Toast Notification mượt mà**:
   * Mình đã khai tử hoàn toàn các ô thông báo `alert()` mặc định của trình duyệt – vốn rất thô ráp và gây gián đoạn trải nghiệm người dùng.
   * Thay vào đó, mình tự viết một dịch vụ Toast Notification cực kỳ xịn mịn, hỗ trợ xếp chồng (stacked layout), tự động ẩn sau 4 giây, phối màu HSL nhẹ nhàng tinh tế theo từng trạng thái (Success, Error, Warning, Info) và có hiệu ứng trượt xuất hiện/biến mất rất mướt mắt.

3. **⚡ Xóa dữ liệu siêu tốc, phản hồi trực quan (No-Confirm Deletions)**:
   * Khi bấm nút xóa ở bất kỳ danh mục nào, hệ thống sẽ thực hiện xóa ngay lập tức (không bắt hiển thị popup confirm phiền phức nữa).
   * Đi kèm với đó là thông báo Toast hiện lên tức thì để báo cho người dùng biết dòng dữ liệu đã được xóa thành công, vừa nhanh gọn vừa an tâm.

4. **⌨️ Hệ thống Phím tắt & Tiện ích nhập liệu thông minh (Smart Hotkeys)**:
   * **Phím `H`**: Bấm `H` để tự động quay về trang chủ (Home page). Hệ thống tự động nhận diện thông minh: khi mình đang gõ chữ trong bất kỳ ô nhập liệu (input, textarea...) nào, phím `H` vẫn hoạt động như ký tự bình thường để tránh bị gián đoạn khi gõ.
   * **Phím `F`**: Ở các trang có chức năng tìm kiếm (Dictionary, Quick Links, AI Prompts, Tasks), khi mình bấm phím `F` (ở ngoài các ô nhập liệu), con trỏ chuột sẽ tự động focus ngay vào thanh tìm kiếm để mình gõ từ cần tìm luôn mà không cần tốn công rê chuột click. Mình cũng đã xử lý để tránh xung đột với các phím nóng hệ thống như `Ctrl+F` hay `Cmd+F`.
   * **Auto-save trên `Enter`**: Trong các form thêm mới hoặc chỉnh sửa dữ liệu, chỉ cần điền xong và ấn phím `Enter` là ứng dụng tự động lưu lại dòng đó ngay lập tức, cực kỳ tiết kiệm thời gian.

5. **🎨 Tối ưu hóa UI trang Goals chuyên nghiệp & tối giản**:
   * Cột giá trị "Current" và "Target" giờ đây được hiển thị gọn gàng trên cùng một hàng ngang, tối ưu diện tích và dễ so sánh.
   * Cột "Progress" thể hiện phần trăm tiến độ bằng chữ đậm trần (plain bold text) với cùng font chữ sang trọng của "Current"/"Target" và loại bỏ hoàn toàn các loại background màu mè hay badge lòe loẹt, giúp giao diện đạt được vẻ đẹp thanh lịch, hiện đại nhất.

6. **🔒 Bảo mật tuyệt đối chống XSS (Cross-Site Scripting)**:
   * Mình đã xây dựng lớp lọc `escapeHTML` tại Core API để tự động làm sạch mọi chuỗi ký tự đầu vào từ người dùng, ngăn chặn tuyệt đối các cuộc tấn công tiêm nhiễm mã độc qua dữ liệu đầu vào.

7. **🔌 Plug-and-Play (Tự động tạo bảng tính)**:
   * Khi kết nối với một tệp Google Sheet trống, ứng dụng sẽ tự động khởi tạo **đầy đủ 7 tab dữ liệu** (`cost`, `vocabulary`, `habit_tracker`, `link`, `prompt`, `goal`, `task`) kèm các tiêu đề cột chuẩn xác. Bạn không cần lo lắng về việc thiết lập file Excel/Sheet ban đầu!

8. **🔑 Bảo mật thông số định danh tối đa (.env & Git Safe)**:
   * Không còn tình trạng hardcode API Key hay Client ID trong code để tránh nguy cơ lộ mã nguồn trên các nền tảng công khai. Mọi thông số được cấu hình qua tệp tin `.env` cá nhân hoặc trực tiếp trên giao diện của Settings Modal.

---

## 🛠️ Hướng dẫn thiết lập & Vận hành thực tế (3 Bước)

### Bước 1: Tạo các thông số kết nối Google Cloud
Bạn hãy vào [Google Cloud Console](https://console.cloud.google.com/) để lấy 3 thông số định danh sau:

1. **API Key**: Vào mục *APIs & Services > Credentials*, chọn *Create Credentials > API Key*.
2. **OAuth 2.0 Client ID**: 
   * Cũng tại trang Credentials, chọn *Create Credentials > OAuth client ID* chọn loại ứng dụng là **Web application**.
   * Tại mục **Authorized JavaScript origins**, thêm địa chỉ web chạy dưới máy (`http://localhost:5173`) và địa chỉ trang GitHub Pages của bạn (`https://tên-github-của-bạn.github.io`).
3. **Spreadsheet ID**: Tạo một file Google Sheet mới bất kỳ, copy mã ký tự nằm ở giữa cụm `/d/` và `/edit` trên URL trình duyệt.

### Bước 2: Cấu hình thông số kết nối (Chọn 1 trong 2 cách)

* **Cách A: Nhập thông tin trực tiếp trên giao diện (Được khuyến nghị)**:
  1. Truy cập vào trang web Dashboard cá nhân của bạn (trực tuyến hoặc cục bộ).
  2. Nhấn nút **Settings (Credentials)** ở góc dưới sidebar bên trái.
  3. Nhập 3 thông số vừa lấy ở Bước 1 vào và bấm **Lưu cấu hình**.
  4. Nhấn nút **Connect Google Sheets** và cấp quyền để ứng dụng đồng bộ hai chiều thời gian thực!

* **Cách B: Sử dụng File `.env` cục bộ**:
  1. Sao chép file [frontend/.env.example](file:///c:/Users/dangn/.gemini/antigravity/scratch/personal_webapp/frontend/.env.example) thành `.env` ở thư mục `frontend/`.
  2. Điền đầy đủ 3 thông số định danh vào các trường tương ứng:
     ```env
     VITE_SPREADSHEET_ID=spreadsheet_id_cua_ban
     VITE_API_KEY=api_key_cua_ban
     VITE_CLIENT_ID=client_id_cua_ban
     ```
  3. Khởi chạy ứng dụng, hệ thống sẽ tự động nạp cấu hình này khi build và chạy trực tiếp mà không cần thiết lập thủ công trên trình duyệt.

---

### Bước 3: Đẩy dự án lên GitHub để tự động xuất bản (GitHub Pages)
Mình đã cấu hình sẵn quy trình **GitHub Actions tự động biên dịch và xuất bản**. Bạn chỉ cần:

1. Đẩy toàn bộ mã nguồn của dự án này lên một repository trên GitHub của bạn tên là: **`webapp_project`**.
2. Đi tới Repository trên GitHub > chọn mục **Settings** (Cài đặt) > **Actions** > **General**.
3. Cuộn xuống phần **Workflow permissions**, chọn **Read and write permissions** (Quyền đọc và ghi) và bấm **Save** (Lưu).
4. Kích hoạt tính năng **GitHub Pages** trong phần *Settings > Pages*, tại mục *Source*, chọn nguồn deploy từ **GitHub Actions**.
5. Bây giờ, mỗi khi bạn push code lên nhánh `main`, hệ thống sẽ tự động build Vite tối ưu và deploy web lên địa chỉ trực tuyến miễn phí của bạn sau khoảng 1 phút:
   `https://<tên-github-của-bạn>.github.io/webapp_project/`

---

## 💻 Cách chạy thử nghiệm cục bộ dưới máy tính (Local Development)

Nếu muốn tự chỉnh sửa và phát triển mã nguồn trực tiếp trên máy tính cá nhân:

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

Hy vọng dự án **Personal Dashboard** này sẽ giúp bạn quản lý cuộc sống và học tập hiệu quả, trơn tru hơn mỗi ngày! 🚀
