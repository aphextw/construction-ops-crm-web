import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiFileText,
  FiPaperclip,
  FiSend,
  FiX,
} from "react-icons/fi";

import { useMail } from "@/hooks/useMail";

const EMPTY_MAIL_FORM = {
  to: "",
  subject: "",
  text: "",
};

const MAX_FILES = 5;
const MAX_TOTAL_SIZE = 500 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.xls,.xlsx";
const ACCEPTED_FILE_PATTERN = /\.(pdf|docx?|xlsx?)$/i;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatFileSize(size) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} КБ`;
  }

  return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} МБ`;
}

function getFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function MailPage() {
  const { sendMail, sendingMail, mailError, setMailError } = useMail();
  const [form, setForm] = useState(EMPTY_MAIL_FORM);
  const [files, setFiles] = useState([]);
  const [sentMessage, setSentMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMailError(null);
    setSentMessage("");
  };

  const addFiles = (selectedFiles) => {
    const incomingFiles = Array.from(selectedFiles || []);
    if (!incomingFiles.length) return;

    const unsupportedFiles = incomingFiles.filter(
      (file) => !ACCEPTED_FILE_PATTERN.test(file.name),
    );
    if (unsupportedFiles.length) {
      setMailError("Можно прикрепить только файлы PDF, Word или Excel.");
      return;
    }

    const existingKeys = new Set(files.map(getFileKey));
    const uniqueFiles = incomingFiles.filter(
      (file) => !existingKeys.has(getFileKey(file)),
    );
    const nextFiles = [...files, ...uniqueFiles];

    if (nextFiles.length > MAX_FILES) {
      setMailError("К одному письму можно прикрепить не больше 5 файлов.");
      return;
    }

    const totalSize = nextFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      setMailError("Общий размер вложений не должен превышать 500 МБ.");
      return;
    }

    setFiles(nextFiles);
    setMailError(null);
    setSentMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const to = form.to.trim();
    const subject = form.subject.trim();
    const text = form.text.trim();
    if (!to || !subject || !text) return;

    const html = `<p>${escapeHtml(text).replaceAll("\n", "<br>")}</p>`;
    const result = await sendMail({ to, subject, text, html, files });

    if (!result) return;

    setForm(EMPTY_MAIL_FORM);
    setFiles([]);
    setSentMessage("Письмо успешно отправлено");
  };

  const handleFilesChange = (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const removeFile = (fileIndex) => {
    setFiles((current) => current.filter((_, index) => index !== fileIndex));
    setMailError(null);
    setSentMessage("");
  };

  const formIsValid = Boolean(
    form.to.trim() && form.subject.trim() && form.text.trim(),
  );
  const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="page mail-page">
      <header className="mail-page__header">
        <h1>Новое письмо</h1>
        <p>Создание и отправка писем.</p>
      </header>

      <section className="mail-editor" aria-label="Редактор письма">
        <form
          className="mail-editor__form"
          onSubmit={handleSubmit}
          onDragEnter={() => setIsDragging(true)}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsDragging(false);
            }
          }}
          onDrop={handleDrop}
        >
          <div className="mail-editor__fields">
            <label className="mail-editor__row">
              <span>Кому</span>
              <input
                type="email"
                placeholder="example@company.ru"
                autoComplete="email"
                value={form.to}
                onChange={(event) => updateField("to", event.target.value)}
                required
              />
            </label>

            <label className="mail-editor__row">
              <span>Тема</span>
              <input
                type="text"
                placeholder="О чём это письмо?"
                value={form.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                required
              />
            </label>
          </div>

          <label className="mail-editor__body">
            <span className="sr-only">Текст письма</span>
            <textarea
              placeholder="Напишите сообщение..."
              value={form.text}
              onChange={(event) => updateField("text", event.target.value)}
              required
            />
          </label>

          <AnimatePresence initial={false}>
            {isDragging ? (
              <motion.div
                className="mail-drop-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                <FiPaperclip aria-hidden="true" />
                <strong>Отпустите файлы здесь</strong>
                <span>PDF, Word или Excel</span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {files.length ? (
              <motion.div
                className="mail-files"
                aria-label="Выбранные файлы"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {files.map((file, index) => (
                  <motion.div
                    className="mail-file"
                    key={getFileKey(file)}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16 }}
                  >
                    <span className="mail-file__icon" aria-hidden="true">
                      <FiFileText />
                    </span>
                    <span className="mail-file__info">
                      <strong>{file.name}</strong>
                      <small>{formatFileSize(file.size)}</small>
                    </span>
                    <button
                      className="mail-file__remove"
                      type="button"
                      onClick={() => removeFile(index)}
                      aria-label={`Удалить файл ${file.name}`}
                    >
                      <FiX aria-hidden="true" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mail-editor__feedback" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              {mailError ? (
                <motion.div
                  className="mail-feedback mail-feedback--error"
                  key="mail-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                  role="alert"
                >
                  <FiAlertCircle aria-hidden="true" />
                  <span>{mailError}</span>
                </motion.div>
              ) : sentMessage ? (
                <motion.div
                  className="mail-feedback mail-feedback--success"
                  key="mail-success"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                >
                  <FiCheckCircle aria-hidden="true" />
                  <span>{sentMessage}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <footer className="mail-editor__footer">
            <div className="mail-editor__attachments">
              <label className="mail-attach-button">
                <input
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  multiple
                  onChange={handleFilesChange}
                  hidden
                />
                <FiPaperclip aria-hidden="true" />
                <span>Прикрепить</span>
              </label>
              <span className="mail-editor__file-meta">
                {files.length
                  ? `${files.length} из ${MAX_FILES} · ${formatFileSize(totalFileSize)}`
                  : "PDF, Word или Excel · до 5 файлов"}
              </span>
            </div>

            <button
              className="button button--primary mail-send-button"
              type="submit"
              disabled={sendingMail || !formIsValid}
            >
              {sendingMail ? "Отправляем..." : "Отправить"}
              <FiSend aria-hidden="true" />
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
