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
      { rowNumber: 2, place: "XLIII Specialty Coffee", city: "Da Nang", category: "Cafe", address: "422 Ngô Thì Sĩ, Mỹ An, Ngũ Hành Sơn, Đà Nẵng", rating: 4.8, total_reviews: 6893, link: "https://www.google.com/maps/search/?api=1&query=XLIII+Specialty+Coffee+Da+Nang", check: false },
      { rowNumber: 3, place: "Trinh Cafe", city: "Da Nang", category: "Cafe", address: "25 Phạm Hồng Thái, Hải Châu 1, Hải Châu, Đà Nẵng", rating: 4.7, total_reviews: 4126, link: "https://www.google.com/maps/search/?api=1&query=Trinh+Cafe+Da+Nang", check: false },
      { rowNumber: 4, place: "Nối Coffee", city: "Da Nang", category: "Cafe", address: "113/18 Nguyễn Chí Thanh, Hải Châu 1, Hải Châu, Đà Nẵng", rating: 4.6, total_reviews: 1520, link: "https://maps.app.goo.gl/hmNsK6Aa2omb2Ddn9", check: false },
      { rowNumber: 5, place: "The Hideout Cafe", city: "Da Nang", category: "Cafe", address: "24/72 Nguyễn Văn Thoại, Mỹ An, Ngũ Hành Sơn, Đà Nẵng", rating: 4.8, total_reviews: 1106, link: "https://www.google.com/maps/search/?api=1&query=The+Hideout+Cafe+Da+Nang", check: false },
      { rowNumber: 6, place: "Craft Cafe", city: "Da Nang", category: "Cafe", address: "126/20 Nguyễn Duy Hiệu, An Hải Đông, Sơn Trà, Đà Nẵng", rating: 4.5, total_reviews: 318, link: "https://www.google.com/maps/search/?api=1&query=Craft+Cafe+Da+Nang", check: false },
      { rowNumber: 7, place: "The Local Beans Cafe", city: "Da Nang", category: "Cafe", address: "132 Lê Quang Đạo, Mỹ An, Ngũ Hành Sơn, Đà Nẵng", rating: 4.7, total_reviews: 411, link: "https://www.google.com/maps/search/?api=1&query=The+Local+Beans+Cafe+Da+Nang", check: false },
      { rowNumber: 8, place: "H Coffee", city: "Da Nang", category: "Cafe", address: "89 Hoàng Kế Viêm, Mỹ An, Ngũ Hành Sơn, Đà Nẵng", rating: 4.6, total_reviews: 809, link: "https://www.google.com/maps/search/?api=1&query=H+Coffee+Da+Nang", check: false },
      { rowNumber: 9, place: "Golem Coffee", city: "Da Nang", category: "Cafe", address: "27 Trần Quốc Toản, Phước Ninh, Hải Châu, Đà Nẵng", rating: 4.5, total_reviews: 470, link: "https://www.google.com/maps/search/?api=1&query=Golem+Coffee+Da+Nang", check: false },
      { rowNumber: 10, place: "Nam House", city: "Da Nang", category: "Cafe", address: "15/1 Lê Hồng Phong, Phước Ninh, Hải Châu, Đà Nẵng", rating: 4.7, total_reviews: 1479, link: "https://www.google.com/maps/search/?api=1&query=Nam+House+Da+Nang", check: false },
      { rowNumber: 11, place: "Brewman Coffee Concept", city: "Da Nang", category: "Cafe", address: "K27a/21 Thái Phiên, Phước Ninh, Hải Châu, Đà Nẵng", rating: 4.8, total_reviews: 850, link: "https://www.google.com/maps/search/?api=1&query=Brewman+Coffee+Concept+Da+Nang", check: false },
      { rowNumber: 12, place: "HAIAN Beach Hotel & Spa", city: "Da Nang", category: "Hotel", address: "278 Võ Nguyên Giáp, Bắc Mỹ Phú, Ngũ Hành Sơn, Đà Nẵng", rating: 4.7, total_reviews: 3800, link: "https://haianbeach.backhotelite.com/en/", check: false },
      { rowNumber: 13, place: "TMS Hotel Da Nang Beach", city: "Da Nang", category: "Hotel", address: "292 Võ Nguyên Giáp, Mỹ An, Ngũ Hành Sơn, Đà Nẵng", rating: 4.8, total_reviews: 9165, link: "https://tmshotel.vn/", check: false },
      { rowNumber: 14, place: "Sala Danang Beach Hotel", city: "Da Nang", category: "Hotel", address: "36 Lâm Hoành, Phước Mỹ, Sơn Trà, Đà Nẵng", rating: 4.7, total_reviews: 3465, link: "https://salahotelgroup.com/en/saladanangbeachhotel/", check: false },
      { rowNumber: 15, place: "Novotel Danang Premier Han River", city: "Da Nang", category: "Hotel", address: "36 Bạch Đằng, Thạch Thang, Hải Châu, Đà Nẵng", rating: 4.5, total_reviews: 8271, link: "https://www.novotel-danang-premier.com/", check: false },
      { rowNumber: 16, place: "InterContinental Danang Sun Peninsula Resort", city: "Da Nang", category: "Hotel", address: "Bãi Bắc, Bán Đảo Sơn Trà, Đà Nẵng", rating: 4.8, total_reviews: 11400, link: "https://www.danang.intercontinental.com/", check: false },
      { rowNumber: 17, place: "Furama Resort Danang", city: "Da Nang", category: "Hotel", address: "105 Võ Nguyên Giáp, Khuê Mỹ, Ngũ Hành Sơn, Đà Nẵng", rating: 4.6, total_reviews: 7092, link: "https://furamavietnam.com/", check: false },
      { rowNumber: 18, place: "Pullman Danang Beach Resort", city: "Da Nang", category: "Hotel", address: "101 Võ Nguyên Giáp, Khuê Mỹ, Ngũ Hành Sơn, Đà Nẵng", rating: 4.6, total_reviews: 4191, link: "https://www.pullman-danang.com/", check: false }
    ]
  };
}
