"use client";
import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { reportPreset } from "@/lib/reporting-range.mjs";
import {
  calendarRange,
  validRange,
  vietnamToday,
} from "@/lib/dashboard-presentation.mjs";
import s from "./reporting.module.css";

export interface ReportRange {
  preset: string;
  from: string;
  to: string;
}
export function RangeCaption({ range }: { range: ReportRange }) {
  return (
    <span className={s.rangeCaption}>
      {range.from
        ? `${range.from.split("-").reverse().join("/")} – ${range.to.split("-").reverse().join("/")}`
        : "Từ đầu đến nay"}{" "}
      · Giờ Việt Nam
    </span>
  );
}
export function ReportRangeFilter({
  value,
  onChange,
  allowAll = false,
}: {
  value: ReportRange;
  onChange: (value: ReportRange) => void;
  allowAll?: boolean;
}) {
  const [error, setError] = useState("");
  return (
    <div className={s.rangeControl}>
      <label className={s.selectControl}>
        <CalendarDays size={16} aria-hidden="true" />
        <select
          aria-label="Khoảng thời gian"
          value={value.preset}
          onChange={(e) => {
            const preset = e.target.value;
            setError("");
            if (["custom", "pick-month", "pick-year"].includes(preset)) {
              const fallback = value.from ? value : reportPreset("month");
              const calendar =
                preset === "pick-month"
                  ? calendarRange(fallback.from.slice(0, 7))
                  : preset === "pick-year"
                    ? calendarRange(fallback.from.slice(0, 4))
                    : fallback;
              onChange({ ...calendar!, preset });
            } else onChange(reportPreset(preset));
          }}
        >
          {allowAll && <option value="all">Toàn bộ thời gian</option>}
          <option value="today">Hôm nay</option>
          <option value="week">7 ngày gần đây</option>
          <option value="month">30 ngày gần đây</option>
          <option value="quarter">90 ngày gần đây</option>
          <option value="this-month">Tháng này</option>
          <option value="this-year">Năm nay</option>
          <option value="pick-month">Chọn tháng</option>
          <option value="pick-year">Chọn năm</option>
          <option value="custom">Tùy chỉnh khoảng ngày</option>
        </select>
        <ChevronDown size={14} aria-hidden="true" />
      </label>
      {value.preset === "pick-month" && (
        <label className={s.dateField}>
          Tháng
          <input
            aria-label="Chọn tháng"
            type="month"
            min="1970-01"
            value={value.from.slice(0, 7)}
            onChange={(e) => {
              const next = calendarRange(e.target.value);
              if (next) onChange({ ...next, preset: "pick-month" });
            }}
          />
        </label>
      )}
      {value.preset === "pick-year" && (
        <label className={s.dateField}>
          Năm
          <select
            aria-label="Chọn năm"
            value={value.from.slice(0, 4)}
            onChange={(e) => {
              const next = calendarRange(e.target.value);
              if (next) onChange({ ...next, preset: "pick-year" });
            }}
          >
            {Array.from(
              { length: Number(vietnamToday().slice(0, 4)) - 1969 },
              (_, i) => Number(vietnamToday().slice(0, 4)) - i,
            ).map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
      )}
      {value.preset === "custom" && (
        <form
          className={s.customRange}
          key={`${value.from}:${value.to}`}
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const from = String(form.get("from")),
              to = String(form.get("to"));
            if (!validRange(from, to)) {
              setError("Chọn khoảng ngày hợp lệ, tối đa 366 ngày.");
              return;
            }
            setError("");
            onChange({ preset: "custom", from, to });
          }}
        >
          <label className={s.dateField}>
            Từ ngày
            <input
              type="date"
              name="from"
              defaultValue={value.from}
              min="1970-01-01"
              required
            />
          </label>
          <label className={s.dateField}>
            Đến ngày
            <input
              type="date"
              name="to"
              defaultValue={value.to}
              min="1970-01-01"
              required
            />
          </label>
          <button className={s.button} type="submit">
            Áp dụng
          </button>
          {error && (
            <span className={s.fieldError} role="alert">
              {error}
            </span>
          )}
        </form>
      )}
    </div>
  );
}
