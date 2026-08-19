// Backend/lib/scanner/document-validator.js

/**
 * Validates whether the AI detected document class matches the selected document type.
 * @param {string} docTypeName - Name of the selected document type (e.g. "Passport", "Card Id")
 * @param {string} detectedClass - Class detected by YOLO ("document", "id_card", "khmer_id", "passport")
 * @param {number} confidence - Detection confidence score
 * @returns {{ isValid: boolean, message?: string }}
 */
export function validateDocTypeMatch(docTypeName, detectedClass, confidence = 1) {
  if (!docTypeName || !detectedClass) return { isValid: true };

  const typeName = docTypeName.toLowerCase();

  const isPassportSelected = typeName.includes("passport") || typeName.includes("លិខិតឆ្លងដែន");
  const isDriverLicenseSelected = typeName.includes("driver") || typeName.includes("license") || typeName.includes("បើកបរ");
  const isCardIdSelected =
    (typeName.includes("card") || typeName.includes("id") || typeName.includes("identity") || typeName.includes("អត្តសញ្ញាណ")) &&
    !isDriverLicenseSelected;
  const isCertSelected =
    typeName.includes("certificate") || typeName.includes("education") || typeName.includes("សញ្ញាបត្រ") || typeName.includes("degree");

  const isCardDetected = detectedClass === "id_card" || detectedClass === "khmer_id";
  const isPassportDetected = detectedClass === "passport";

  // 1. User selected Passport, but uploaded an ID Card
  if (isPassportSelected && isCardDetected) {
    return {
      isValid: false,
      message: "ប្រភេទឯកសារមិនត្រូវគ្នា៖ អ្នកបានជ្រើសរើស \"Passport\" ប៉ុន្តែរូបភាពដែលបានអាប់ឡូដគឺជាកាតសម្គាល់ខ្លួន (ID Card)។ សូមជ្រើសរើសប្រភេទឯកសារឱ្យបានត្រឹមត្រូវ។ (Invalid Document Type: You selected Passport, but uploaded an ID Card.)"
    };
  }

  // 2. User selected Card ID, but uploaded a Passport
  if (isCardIdSelected && isPassportDetected) {
    return {
      isValid: false,
      message: "ប្រភេទឯកសារមិនត្រូវគ្នា៖ អ្នកបានជ្រើសរើស \"Card ID\" ប៉ុន្តែរូបភាពដែលបានអាប់ឡូដគឺជាលិខិតឆ្លងដែន (Passport)។ សូមជ្រើសរើសប្រភេទឯកសារឱ្យបានត្រឹមត្រូវ។ (Invalid Document Type: You selected Card ID, but uploaded a Passport.)"
    };
  }

  // 3. User selected Driver License, but uploaded a Passport
  if (isDriverLicenseSelected && isPassportDetected) {
    return {
      isValid: false,
      message: "ប្រភេទឯកសារមិនត្រូវគ្នា៖ អ្នកបានជ្រើសរើស \"Driver License\" ប៉ុន្តែរូបភាពដែលបានអាប់ឡូដគឺជាលិខិតឆ្លងដែន (Passport)។ (Invalid Document Type: You selected Driver License, but uploaded a Passport.)"
    };
  }

  // 4. User selected Education Certificate, but uploaded an ID Card or Passport
  if (isCertSelected) {
    if (isCardDetected) {
      return {
        isValid: false,
        message: "ប្រភេទឯកសារមិនត្រូវគ្នា៖ អ្នកបានជ្រើសរើស \"Education Certificate\" ប៉ុន្តែរូបភាពដែលបានអាប់ឡូដគឺជាកាតសម្គាល់ខ្លួន (ID Card)។ (Invalid Document Type: You selected Certificate, but uploaded an ID Card.)"
      };
    }
    if (isPassportDetected) {
      return {
        isValid: false,
        message: "ប្រភេទឯកសារមិនត្រូវគ្នា៖ អ្នកបានជ្រើសរើស \"Education Certificate\" ប៉ុន្តែរូបភាពដែលបានអាប់ឡូដគឺជាលិខិតឆ្លងដែន (Passport)។ (Invalid Document Type: You selected Certificate, but uploaded a Passport.)"
      };
    }
  }

  return { isValid: true };
}
