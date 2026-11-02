import { useState } from "react";

import { api } from "@/hooks/api_client";

type SendMailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
  files?: File[];
};

export function useMail() {
  const [sendingMail, setSendingMail] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);

  const sendMail = async (payload: SendMailPayload) => {
    try {
      setSendingMail(true);
      setMailError(null);

      const formData = new FormData();
      formData.append("to", payload.to);
      formData.append("subject", payload.subject);
      formData.append("text", payload.text);
      formData.append("html", payload.html);

      payload.files?.forEach((file) => {
        formData.append("files", file, file.name);
      });

      const response = await api.request("api/v1/mail/send", {
        method: "POST",
        body: formData,
      });
      return response?.status === "sent" || response === null
        ? response ?? { status: "sent" }
        : null;
    } catch (error: any) {
      const rawMessage = error?.message || "";
      let message = rawMessage;

      try {
        message = JSON.parse(rawMessage)?.error || rawMessage;
      } catch {
        // The API can also return a plain-text error.
      }

      const normalizedMessage = message.toLowerCase();
      if (normalizedMessage.includes("invalid recipient email")) {
        message = "Проверьте адрес получателя.";
      } else if (normalizedMessage.includes("too many")) {
        message = "К письму можно прикрепить не больше 5 файлов.";
      } else if (
        normalizedMessage.includes("too large") ||
        normalizedMessage.includes("request body")
      ) {
        message = "Вложения слишком большие. Уменьшите общий размер файлов.";
      } else if (normalizedMessage.includes("only pdf")) {
        message = "Можно прикрепить только файлы PDF, Word или Excel.";
      } else if (!message) {
        message = "Не удалось отправить письмо. Попробуйте ещё раз.";
      }

      setMailError(message);
      return null;
    } finally {
      setSendingMail(false);
    }
  };

  return {
    sendingMail,
    mailError,
    setMailError,
    sendMail,
  };
}
