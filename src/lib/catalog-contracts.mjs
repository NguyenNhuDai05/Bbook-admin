export const catalogTabs = [
  ["styles", "Phong cách makeup"],
  ["occasion", "Dịp / sự kiện"],
  ["intensity", "Độ đậm nhạt"],
  ["color-tone", "Tông màu"],
  ["effect", "Hiệu ứng makeup"],
  ["review", "Phong cách MUA tạo"],
];
export const intensityKeys = ["light", "medium", "bold"];
export function catalogQuery(filters) {
  return new URLSearchParams(
    Object.entries({ pageSize: 10, ...filters })
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();
}
export function validCatalogKey(key) {
  return key.length <= 100 && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(key);
}
export function catalogValidation(value, isStyle, creating) {
  const label = isStyle ? value.name : value.label;
  const normalized = (label || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ");
  if (
    !normalized ||
    normalized.length > 100 ||
    label.length > 100 ||
    /[\u0000-\u0008\u000e-\u001f\u007f]/u.test(label)
  )
    return "Tên bắt buộc, tối đa 100 ký tự và không chứa ký tự điều khiển.";
  if ((value.description || "").length > (isStyle ? 255 : 2000))
    return `Mô tả tối đa ${isStyle ? 255 : 2000} ký tự.`;
  if (
    !Number.isInteger(value.sortOrder) ||
    value.sortOrder < 0 ||
    value.sortOrder > 100000
  )
    return "Thứ tự phải là số nguyên từ 0 đến 100000.";
  if (
    creating &&
    ((!isStyle && !value.key) || (value.key && !validCatalogKey(value.key)))
  )
    return "Key bắt đầu bằng chữ thường; chỉ gồm a-z, 0-9 và dấu gạch ngang, tối đa 100 ký tự.";
  if (!isStyle && value.kind === "intensity" && creating)
    return "Không tạo thêm mức độ đậm nhạt.";
  if (!isStyle && ["occasion", "effect"].includes(value.kind) && !value.groupId)
    return "Vui lòng chọn nhóm.";
  return "";
}
export function canActivate(record) {
  return !record.archivedAt && record.reviewStatus !== "Rejected";
}
export function canReview(record) {
  return (
    record.source === "MUA" &&
    !record.archivedAt &&
    Number.isSafeInteger(record.version)
  );
}
export function catalogError(status, payload, fallback) {
  const code = payload?.code ?? payload?.Code;
  if (
    [
      "VERSION_CONFLICT",
      "CATALOG_VERSION_CONFLICT",
      "CATALOG_WRITE_CONFLICT",
    ].includes(code)
  )
    return "Dữ liệu đã được người khác thay đổi. Tải lại bản mới trước khi tiếp tục; nội dung chưa lưu sẽ được thay thế.";
  if (status === 404)
    return "Không tìm thấy dữ liệu hoặc backend chưa hỗ trợ API danh mục này. Kiểm tra triển khai Phase B; không có dữ liệu mẫu thay thế.";
  return fallback;
}
export function portfolioUsageLabel(count) {
  return count == null ? "Chưa hỗ trợ" : String(count);
}
export function reviewFilters(value) {
  if (value === "LegacyUnknown") return { source: "LegacyUnknown" };
  if (value === "Archived") return { source: "MUA", status: "archived" };
  return { source: "MUA", ...(value ? { reviewStatus: value } : {}) };
}
