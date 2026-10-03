export function matchesFinancialQr(image, context, id, amount) {
  if (
    !image ||
    !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(
      image.imageDataUrl || "",
    )
  )
    return false;
  if (context === "bank") return image.accountId === id;
  if (
    (context === "payout" ? image.payoutId : image.refundId) !== id ||
    image.amount !== amount
  )
    return false;
  if (image.kind === "MOMO_ORIGINAL")
    return (
      (context === "payout"
        ? image.containsPayoutAmount
        : image.containsRefundAmount) === false
    );
  return (
    image.kind === "BANK_GENERATED" &&
    (context === "payout"
      ? image.containsPayoutAmount
      : image.containsRefundAmount) === true
  );
}
