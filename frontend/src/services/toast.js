// DỊCH VỤ THÔNG BÁO CUSTOM - TOAST NOTIFICATION SERVICE
// Đã được vô hiệu hóa giao diện hiển thị theo yêu cầu người dùng, chỉ ghi log debug.

export function showToast(message, type = 'info') {
  console.log(`[Toast ${type}]:`, message);
}

// Bám trực tiếp vào window để hỗ trợ debug hoặc gọi nhanh từ các script cũ hơn nếu cần
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}
