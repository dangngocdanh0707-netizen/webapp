// DỊCH VỤ NHẬN DIỆN GIỌNG NÓI - SPEECH RECOGNITION SERVICE
import { showToast } from './toast.js';

/**
 * Khởi tạo bộ nhận dạng giọng nói chuẩn hóa
 * @param {Object} params
 * @param {string} params.lang Ngôn ngữ nhận diện ('en-US', 'vi-VN', v.v.)
 * @param {Function} params.onStart Callback khi bắt đầu lắng nghe
 * @param {Function} params.onResult Callback nhận kết quả văn bản: (transcript) => {}
 * @param {Function} params.onError Callback khi gặp lỗi
 * @param {Function} params.onEnd Callback khi kết thúc lắng nghe
 * @returns {SpeechRecognition|null} Đối tượng nhận dạng giọng nói hoặc null nếu không hỗ trợ
 */
export function createSpeechRecognizer({ lang = 'en-US', onStart, onResult, onError, onEnd }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("[speech.js] Trình duyệt không hỗ trợ Web Speech Recognition API.");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = lang;

  recognition.onstart = function(event) {
    if (typeof onStart === 'function') {
      onStart(event);
    }
  };

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    if (typeof onResult === 'function') {
      onResult(transcript, event);
    }
  };

  recognition.onerror = function(event) {
    console.error(`[speech.js] Lỗi nhận dạng giọng nói (${lang}):`, event.error);
    
    // Chỉ hiển thị thông báo lỗi cho các lỗi thực tế, loại trừ việc dừng chủ động (aborted)
    if (event.error === 'not-allowed') {
      showToast("Không được phép truy cập micro. Hãy cấp quyền trong trình duyệt.", "warning");
    } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
      showToast("Lỗi nhận dạng giọng nói: " + event.error, "error");
    }

    if (typeof onError === 'function') {
      onError(event);
    }
  };

  recognition.onend = function(event) {
    if (typeof onEnd === 'function') {
      onEnd(event);
    }
  };

  return recognition;
}
