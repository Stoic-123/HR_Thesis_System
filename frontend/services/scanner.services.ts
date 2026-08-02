// frontend/services/scanner.services.ts

import { api } from "@/lib/api";

export const scanDocument = async (imageFile: File, documentTypeId?: string) => {
  const formData = new FormData();
  formData.append("image", imageFile);
  if (documentTypeId) {
    formData.append("document_type_id", documentTypeId);
  }

  const res = await api.post("/api/scanner/scan", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    responseType: "blob", // We expect a processed image back
  });

  return res.data;
};
