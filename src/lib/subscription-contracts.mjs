function fail() {
  throw new Error("Dữ liệu gói từ máy chủ không hợp lệ.");
}
export function readPlans(value) {
  if (!Array.isArray(value)) fail();
  for (const p of value) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !/^[a-z0-9_]{3,80}$/.test(p.id) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      !["Customer", "MUA"].includes(p.role) ||
      !Number.isInteger(p.amountVnd) ||
      p.amountVnd < 1000 ||
      !Number.isInteger(p.version) ||
      p.version < 1 ||
      typeof p.description !== "string" ||
      !["Draft", "Published", "Paused", "Archived"].includes(p.state) ||
      (p.role === "Customer"
        ? p.days !== null
        : !Number.isInteger(p.days) || p.days < 30 || p.days % 30 !== 0)
    )
      fail();
  }
  return value;
}
export function readOrderPage(value) {
  if (
    !value ||
    !Array.isArray(value.items) ||
    !Number.isInteger(value.total) ||
    value.total < value.items.length
  )
    fail();
  for (const p of value.items)
    if (
      !p ||
      typeof p.id !== "string" ||
      typeof p.userId !== "string" ||
      typeof p.productName !== "string" ||
      !Number.isInteger(p.amountVnd) ||
      p.amountVnd <= 0 ||
      typeof p.state !== "string"
    )
      fail();
  return value;
}
