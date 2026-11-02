export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function buildUploadFormData(fieldName: string, file: File | { uri?: string; name?: string; type?: string }) {
  const formData = new FormData();

  if (file instanceof File) {
    formData.append(fieldName, file, file.name);
    return formData;
  }

  throw new Error("В веб-версии нужно передавать объект File");
}
