// DỮ LIỆU GIẢ LẬP DEMO CHO DỰ ÁN FRONTEND OFFLINE

export function getMockData() {
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');

  return {
    cost: [
      { rowNumber: 2, date: todayStr, category: "Must have", amount: 150000, note: "Trưa văn phòng" },
      { rowNumber: 3, date: todayStr, category: "Nice to have", amount: 65000, note: "Trà sữa" },
      { rowNumber: 4, date: yesterdayStr, category: "Wasted", amount: 200000, note: "Mua tài liệu tham khảo" },
      { rowNumber: 5, date: yesterdayStr, category: "Must have", amount: 800000, note: "Mua nhu yếu phẩm" }
    ],
    vocabulary: [
      { rowNumber: 2, content: "resilient", category: "Core", topic: "Psychology", level: "B2", meaning: "Kiên cường, phục hồi nhanh", status: "Learning", next_review: todayStr, interval: 3, ease_factor: 2.5 },
      { rowNumber: 3, content: "ephemeral", category: "Academic", topic: "Nature", level: "C1", meaning: "Ngắn ngủi, thoáng qua", status: "New", next_review: "", interval: 0, ease_factor: 2.5 },
      { rowNumber: 4, content: "serendipity", category: "General", topic: "Philosophy", level: "C2", meaning: "Sự may mắn tình cờ", status: "Mastered", next_review: "2026-06-25", interval: 30, ease_factor: 2.6 }
    ],
    habit_tracker: [
      { rowNumber: 2, date: todayStr, habit: "Đọc sách 10 trang", status: true },
      { rowNumber: 3, date: todayStr, habit: "Tập thể dục 30 phút", status: false },
      { rowNumber: 4, date: todayStr, habit: "Học 5 từ mới tiếng Anh", status: true },
      { rowNumber: 5, date: yesterdayStr, habit: "Đọc sách 10 trang", status: true },
      { rowNumber: 6, date: yesterdayStr, habit: "Tập thể dục 30 phút", status: true },
      { rowNumber: 7, date: yesterdayStr, habit: "Học 5 từ mới tiếng Anh", status: false }
    ],
    link: [
      { rowNumber: 2, title: "Tài liệu học API Sheets", category: "Programming", content: "https://developers.google.com/sheets/api" },
      { rowNumber: 3, title: "Danh ngôn yêu thích", category: "Quotes", content: "The journey of a thousand miles begins with a single step. - Lao Tzu" }
    ],
    prompt: [
      { rowNumber: 2, title: "Practice English", content: "I want to practice speaking English with you. Please act as a patient native speaker...", category: "English" }
    ],
    goal: [
      { rowNumber: 2, goal_name: "Tiết kiệm mua Laptop", start_date: "2026-05-01", end_date: "2026-08-31", current_value: 8000000, target_value: 20000000 },
      { rowNumber: 3, goal_name: "Học hết 300 từ vựng", start_date: "2026-05-10", end_date: "2026-06-10", current_value: 120, target_value: 300 }
    ],
    task: [
      { rowNumber: 2, date: todayStr, task: "Đẩy mã nguồn lên GitHub", status: false },
      { rowNumber: 3, date: todayStr, task: "Thiết lập cấu hình Vite và Tailwind CSS", status: true }
    ],
    google_map: [
      { rowNumber: 2, place: "XLIII Specialty Coffee", city: "Da Nang", category: "Cafe", address: "422 Ngô Thì Sĩ, Mỹ An, Ngũ Hành Sơn, Đà Nẵng", check: false },
      { rowNumber: 3, place: "Trinh Cafe", city: "Da Nang", category: "Cafe", address: "25 Phạm Hồng Thái, Hải Châu 1, Hải Châu, Đà Nẵng", check: false },
      { rowNumber: 4, place: "Nối Coffee", city: "Da Nang", category: "Cafe", address: "113/18 Nguyễn Chí Thanh, Hải Châu 1, Hải Châu, Đà Nẵng", check: false },
      { rowNumber: 5, place: "HAIAN Beach Hotel & Spa", city: "Da Nang", category: "Hotel", address: "278 Võ Nguyên Giáp, Bắc Mỹ Phú, Ngũ Hành Sơn, Đà Nẵng", check: false },
      { rowNumber: 6, place: "TMS Hotel Da Nang Beach", city: "Da Nang", category: "Hotel", address: "292 Võ Nguyên Giáp, Mỹ An, Ngũ Hành Sơn, Đà Nẵng", check: false },
      { rowNumber: 7, place: "Sala Danang Beach Hotel", city: "Da Nang", category: "Hotel", address: "36 Lâm Hoành, Phước Mỹ, Sơn Trà, Đà Nẵng", check: false }
    ],
    collections: [
      { rowNumber: 2, item: "Audemars Piguet Royal Oak", category: "Watch", price: 800000000 },
      { rowNumber: 3, item: "Audemars Piguet Royal Oak Offshore", category: "Watch", price: 950000000 },
      { rowNumber: 4, item: "Audi A4", category: "Car", price: 1700000000 },
      { rowNumber: 5, item: "Audi A6", category: "Car", price: 2500000000 },
      { rowNumber: 6, item: "Audi Q5", category: "Car", price: 2400000000 },
      { rowNumber: 7, item: "Audi Q7", category: "Car", price: 3400000000 },
      { rowNumber: 8, item: "BMW 3 Series", category: "Car", price: 1899000000 },
      { rowNumber: 9, item: "BMW 5 Series", category: "Car", price: 2499000000 },
      { rowNumber: 10, item: "BMW X3", category: "Car", price: 2299000000 },
      { rowNumber: 11, item: "BMW X5", category: "Car", price: 3900000000 },
      { rowNumber: 12, item: "Breguet Classique", category: "Watch", price: 500000000 }
    ]
  };
}
