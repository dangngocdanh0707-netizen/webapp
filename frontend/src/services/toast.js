// DỊCH VỤ THÔNG BÁO CUSTOM - TOAST NOTIFICATION SERVICE
// Cung cấp thông báo pop-up đẹp mắt thay thế hàm alert() mặc định của trình duyệt

export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  
  // Nếu chưa có container, tự động tạo mới và gắn vào body
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-6 right-6 z-[9999] flex flex-col gap-3.5 pointer-events-none w-full max-w-[360px] sm:max-w-[400px] px-4 sm:px-0';
    document.body.appendChild(container);
  }

  // Khởi tạo thẻ toast
  const toast = document.createElement('div');
  
  // Thiết lập class styles và icon dựa trên type
  let iconClass = 'fa-solid fa-circle-info text-blue-500';
  let borderClass = 'border-l-blue-500';
  let bgGradient = 'from-blue-50/90 to-white/95';
  let shadowColor = 'rgba(59,130,246,0.08)';

  if (type === 'success') {
    iconClass = 'fa-solid fa-circle-check text-emerald-500';
    borderClass = 'border-l-emerald-500';
    bgGradient = 'from-emerald-50/90 to-white/95';
    shadowColor = 'rgba(16,185,129,0.08)';
  } else if (type === 'error') {
    iconClass = 'fa-solid fa-circle-exclamation text-rose-500';
    borderClass = 'border-l-rose-500';
    bgGradient = 'from-rose-50/90 to-white/95';
    shadowColor = 'rgba(244,63,94,0.08)';
  } else if (type === 'warning') {
    iconClass = 'fa-solid fa-triangle-exclamation text-amber-500';
    borderClass = 'border-l-amber-500';
    bgGradient = 'from-amber-50/90 to-white/95';
    shadowColor = 'rgba(245,158,11,0.08)';
  }

  toast.className = `toast-item pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl border border-slate-200/70 border-l-4 ${borderClass} bg-gradient-to-r ${bgGradient} backdrop-blur-md shadow-lg transition-all duration-500 ease-out transform translate-x-full opacity-0`;
  toast.style.boxShadow = `0 15px 30px ${shadowColor}, 0 2px 4px rgba(0,0,0,0.02)`;

  // Gán nội dung HTML
  toast.innerHTML = `
    <div class="flex-shrink-0 mt-0.5">
      <i class="${iconClass} text-lg"></i>
    </div>
    <div class="flex-grow">
      <p class="text-xs font-semibold text-slate-800 leading-relaxed">${message}</p>
    </div>
    <button class="flex-shrink-0 ml-1 text-slate-400 hover:text-slate-600 transition cursor-pointer self-start" aria-label="Close">
      <i class="fa-solid fa-xmark text-xs"></i>
    </button>
  `;

  // Thêm vào container
  container.appendChild(toast);

  // Kích hoạt animation trượt vào (slide-in)
  setTimeout(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  }, 50);

  // Hàm ẩn và hủy toast
  const dismissToast = () => {
    toast.classList.add('translate-x-full', 'opacity-0');
    toast.addEventListener('transitionend', () => {
      toast.remove();
      // Nếu container rỗng thì dọn dẹp luôn container
      if (container.children.length === 0) {
        container.remove();
      }
    });
  };

  // Lắng nghe sự kiện click vào nút tắt
  const closeBtn = toast.querySelector('button');
  if (closeBtn) {
    closeBtn.addEventListener('click', dismissToast);
  }

  // Tự động tắt sau 4.5 giây
  setTimeout(dismissToast, 4500);
}

// Bám trực tiếp vào window để hỗ trợ debug hoặc gọi nhanh từ các script cũ hơn nếu cần
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}
