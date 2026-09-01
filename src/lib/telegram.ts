export type TelegramConfig = {
  botToken: string;
  chatId: string;
  enabled: boolean;
  autoSendOnAnalysis: boolean;
};

export const TELEGRAM_CONFIG_KEY = "nsn-xmlcheck-telegram-config";

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: "",
  chatId: "",
  enabled: false,
  autoSendOnAnalysis: false,
};

export function loadTelegramConfig(): TelegramConfig {
  try {
    const saved = localStorage.getItem(TELEGRAM_CONFIG_KEY);
    if (!saved) return { ...DEFAULT_TELEGRAM_CONFIG };
    const parsed = JSON.parse(saved);
    return {
      botToken: typeof parsed.botToken === "string" ? parsed.botToken.trim() : "",
      chatId: typeof parsed.chatId === "string" ? parsed.chatId.trim() : "",
      enabled: Boolean(parsed.enabled),
      autoSendOnAnalysis: Boolean(parsed.autoSendOnAnalysis),
    };
  } catch {
    return { ...DEFAULT_TELEGRAM_CONFIG };
  }
}

export function saveTelegramConfig(config: TelegramConfig): void {
  localStorage.setItem(TELEGRAM_CONFIG_KEY, JSON.stringify(config));
}

export async function testTelegramConnection(
  token: string,
  chatId: string,
): Promise<{ ok: boolean; description?: string }> {
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();
  if (!cleanToken || !cleanChatId) {
    return { ok: false, description: "Vui lòng nhập đầy đủ Bot Token và Chat ID." };
  }

  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const text = `🔔 [NsN_XMLcheck] Kiểm tra kết nối thành công!\n⏱ Thời gian: ${now}\n✅ Bot Telegram đã sẵn sàng nhận báo cáo Excel & file backup.`;

  return sendTelegramMessage(cleanToken, cleanChatId, text);
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; description?: string }> {
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();
  if (!cleanToken || !cleanChatId) {
    return { ok: false, description: "Thiếu Bot Token hoặc Chat ID." };
  }

  try {
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      return { ok: false, description: data.description || "Gửi tin nhắn Telegram thất bại." };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : "Lỗi kết nối mạng đến Telegram API.",
    };
  }
}

export async function sendTelegramDocument(
  token: string,
  chatId: string,
  caption: string,
  blob: Blob,
  filename: string,
): Promise<{ ok: boolean; description?: string }> {
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();
  if (!cleanToken || !cleanChatId) {
    return { ok: false, description: "Thiếu Bot Token hoặc Chat ID." };
  }

  try {
    const url = `https://api.telegram.org/bot${cleanToken}/sendDocument`;
    const formData = new FormData();
    formData.append("chat_id", cleanChatId);
    formData.append("caption", caption);
    formData.append("parse_mode", "HTML");
    formData.append("document", blob, filename);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!data.ok) {
      return { ok: false, description: data.description || "Gửi file tài liệu Telegram thất bại." };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      description:
        error instanceof Error ? error.message : "Lỗi kết nối mạng khi gửi file qua Telegram.",
    };
  }
}
