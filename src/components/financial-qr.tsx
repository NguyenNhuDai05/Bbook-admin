"use client";
import { matchesFinancialQr } from "@/lib/financial-qr.mjs";
import { useEffect, useState } from "react";
import { adminService } from "@/services/admin-service";
import type { FinancialQr as Qr } from "@/lib/types";
export function FinancialQr({
  id,
  context,
  amount,
}: {
  id: string;
  context: "bank" | "payout" | "refund";
  amount?: number;
}) {
  const [state, setState] = useState<{
    key: string;
    image?: Qr;
    error?: string;
  }>({ key: "" });
  const key = context + ":" + id + ":" + (amount ?? "");
  useEffect(() => {
    const controller = new AbortController();
    adminService
      .financialQr(id, context, controller.signal)
      .then((image) => {
        if (!matchesFinancialQr(image, context, id, amount))
          throw Error("QR không khớp giao dịch đang xem.");
        if (!controller.signal.aborted) setState({ key, image });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            key,
            error:
              "QR chưa khả dụng. Hãy đối chiếu thông tin nhận tiền thủ công.",
          });
      });
    return () => controller.abort();
  }, [id, context, amount, key]);
  const current = state.key === key ? state : undefined;
  return (
    <section className="panel tab-content">
      <h3>
        {context === "bank" ? "QR do người dùng cung cấp" : "QR chuyển tiền"}
      </h3>
      {current?.image ? (
        <>
          <img
            src={current.image.imageDataUrl}
            alt="QR nhận tiền riêng tư"
            width={240}
            height={240}
            style={{ maxWidth: "100%", objectFit: "contain" }}
          />
          {current.image.kind === "MOMO_ORIGINAL" && (
            <p className="notice neutral">
              QR MoMo do người nhận cung cấp. Hãy nhập/kiểm tra đúng số tiền
              giao dịch hiển thị bên cạnh.
            </p>
          )}
        </>
      ) : (
        <p>{current?.error ?? "Đang tải QR riêng tư…"}</p>
      )}
    </section>
  );
}
