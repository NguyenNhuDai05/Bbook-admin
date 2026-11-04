export function subscriptionError(error) {
  if (error?.status === 404)
    return new Error(
      "Backend đang chạy chưa có API quản lý gói. Cần triển khai backend mới để đồng bộ gói Visibility và AI hiện có; không cần tạo lại gói.",
    );
  return error;
}
