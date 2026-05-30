# 🚀 Hướng dẫn triển khai Web App chuyên nghiệp (Frontend + Backend)

Chào mừng bạn! Dự án Dashboard cá nhân của bạn hiện tại đã được nâng cấp toàn diện và tổ chức lại theo mô hình **kiến trúc monorepo thực tế chuẩn sản xuất**. 

Để bạn dễ hiểu và thực hiện triển khai nhanh chóng nhất, cấu trúc dự án đã được phân chia cực kỳ sạch sẽ:
- **`/frontend`**: Toàn bộ mã nguồn giao diện Single Page App (SPA) hiện đại chạy bằng **Vite**, **ES6 Modules**, và **Tailwind CSS**.
- **`/backend`**: Mã nguồn **`backend.js`** (tiền thân là `.gs`) được đổi tên chuẩn sang JavaScript để lưu giữ phiên bản trên GitHub.

Dưới đây là chính xác **3 bước đơn giản nhất** để bạn triển khai ứng dụng này hoạt động trực tuyến vĩnh viễn và đồng bộ Google Sheets mà không gặp bất kỳ lỗi đăng nhập nào!

---

## 🛠️ Bước 1: Deploy lại API Google Sheets (Backend) để tránh lỗi đăng nhập
Để gọi API từ cửa sổ ẩn danh mà không bị Google bắt đăng nhập, hãy làm theo hướng dẫn chuẩn xác sau:

1. Mở trang Google Sheets của bạn. Vào **Tiện ích mở rộng** (Extensions) > chọn **Apps Script**.
2. Xóa hết code cũ trong Apps Script đi. Mở tệp [backend.js](file:///c:/Users/dangn/.gemini/antigravity/scratch/personal_webapp/backend/backend.js) trong dự án này ra, copy toàn bộ mã nguồn và dán vào Apps Script. Nhấn biểu tượng **Lưu** (Save).
3. Nhấp vào nút **Triển khai** (Deploy) ở góc trên bên phải > chọn **Triển khai mới** (New deployment).
4. Nhấp vào biểu tượng bánh răng cài đặt ở dòng "Chọn loại triển khai", chọn **Ứng dụng web** (Web app).
5. **CẤU HÌNH QUAN TRỌNG NHẤT**:
   - **Mô tả**: `Dashboard API v1.0`
   - **Thực thi dưới dạng** (*Execute as*): Chọn **Tôi** (*Me* - địa chỉ email của bạn).
   - **Ai có quyền truy cập** (*Who has access*): Chọn **Mọi người** (**Anyone**). *(Đây là chìa khóa để chạy ẩn danh không bắt đăng nhập!)*
6. Nhấp nút **Triển khai** (Deploy). Tiến hành **Ủy quyền truy cập** nếu Google yêu cầu (chọn Advanced > Go to... > Allow).
7. Hệ thống sẽ cung cấp cho bạn một **URL ứng dụng web** (kết thúc bằng `/exec`). **Hãy copy URL này lại!**

---

## 💻 Bước 2: Nhúng API URL vào Frontend
Có hai cách nhúng cực kỳ đơn giản:

* **Cách 1 (Không cần viết code)**: Chạy ứng dụng, nhấp vào menu cài đặt ở thanh sidebar bên trái > chọn **Cấu hình API URL** > Dán link `/exec` vào đó và chọn Lưu. Trình duyệt của bạn sẽ tự lưu trữ và đồng bộ vĩnh viễn.
* **Cách 2 (Nhúng trực tiếp vào mã nguồn)**: Mở tệp `frontend/src/services/api.js` ra. Tìm dòng số 8:
  ```javascript
  export const WEB_APP_URL = "";
  ```
  Thay thế giá trị rỗng bằng URL của bạn:
  ```javascript
  export const WEB_APP_URL = "https://script.google.com/macros/s/.../exec";
  ```

---

## 🚀 Bước 3: Đẩy dự án lên GitHub để tự động xuất bản (Frontend)
Chúng ta đã cấu hình sẵn công cụ **GitHub Actions tự động biên dịch và deploy**. Bạn không cần phải cài Node.js hay build bất kỳ thứ gì trên máy tính của mình cả! Chỉ cần đẩy code lên GitHub, mọi thứ sẽ tự chạy!

1. Tạo một repository mới trên GitHub của bạn và đặt tên chính xác là: **`webapp_project`**.
2. Tải toàn bộ thư mục `personal_webapp` này lên repository đó (đảm bảo cấu trúc gốc có chứa thư mục `.github/`, `frontend/`, `backend/`).
3. Đi tới trang Repository trên GitHub > chọn mục **Settings** (Cài đặt) > **Actions** > **General**.
4. Cuộn xuống phần **Workflow permissions**, chọn **Read and write permissions** (Quyền đọc và ghi) và bấm **Save** (Lưu).
5. Bây giờ, khi bạn đẩy code lên nhánh `main` hoặc `master`, **GitHub Actions** sẽ tự động kích hoạt:
   - Nó sẽ tự cài đặt thư viện (`npm install`).
   - Tự đóng gói sản phẩm tối ưu hóa giao diện (`npm run build`).
   - Tự xuất bản ứng dụng của bạn trực tuyến lên GitHub Pages hoàn toàn miễn phí!
6. Sau khoảng 1 phút, ứng dụng của bạn sẽ hoạt động trực tuyến tại địa chỉ:
   `https://<tên-user-của-bạn>.github.io/webapp_project/`

---

## 💡 Cách chạy thử ứng dụng cục bộ dưới máy tính (Local Development)
Nếu sau này bạn muốn chỉnh sửa code và chạy thử trực tiếp trên máy tính trước khi đẩy lên GitHub:

1. Đảm bảo máy tính đã cài đặt [Node.js](https://nodejs.org/).
2. Mở terminal tại thư mục `frontend/` và chạy lệnh để cài thư viện:
   ```bash
   npm install
   ```
3. Chạy lệnh phát triển cục bộ:
   ```bash
   npm run dev
   ```
4. Terminal sẽ cấp cho bạn một đường dẫn (ví dụ `http://localhost:3000`), nhấp vào đó để lập trình thử nghiệm thời gian thực cực kỳ nhanh!
