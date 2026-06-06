"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Wallet, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Expenditure {
  _id: string;
  date: string;
  description: string;
  amount: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toYMD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getWeekDates(date: string): string[] {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const nd = new Date(d);
    nd.setDate(d.getDate() - day + i);
    dates.push(nd.toISOString().slice(0, 10));
  }
  return dates;
}

export default function CalendarApp() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [adding, startAdding] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const pickerRef = useRef<HTMLDivElement>(null);

  const mk = monthKey(year, month);

  useEffect(() => {
    if (!pickerOpen) return;
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  function openPicker() {
    setPickerYear(year);
    setPickerOpen(true);
  }

  function jumpTo(m: number) {
    setYear(pickerYear);
    setMonth(m);
    setSelectedDate(null);
    setPickerOpen(false);
  }

  useEffect(() => {
    setLoadingMonth(true);
    fetch(`/api/expenditures?month=${mk}`)
      .then((r) => r.json())
      .then((data) => setExpenditures(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load expenses"))
      .finally(() => setLoadingMonth(false));
  }, [mk]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate = expenditures.reduce<Record<string, Expenditure[]>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});

  const monthTotal = expenditures.reduce((s, e) => s + e.amount, 0);

  const weekTotal = selectedDate
    ? getWeekDates(selectedDate).reduce((s, d) => {
        return s + (byDate[d] ?? []).reduce((ss, e) => ss + e.amount, 0);
      }, 0)
    : null;

  const selectedExps = selectedDate ? (byDate[selectedDate] ?? []) : [];
  const dayTotal = selectedExps.reduce((s, e) => s + e.amount, 0);

  async function addExpenditure() {
    if (!selectedDate || !description.trim() || !amount) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Enter a valid amount");
      return;
    }

    const id = toast.loading("Adding expense…");
    try {
      const res = await fetch("/api/expenditures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, description: description.trim(), amount: parsed }),
      });
      if (!res.ok) throw new Error();
      const created: Expenditure = await res.json();
      setExpenditures(prev => [...prev, created]);
      setDescription("");
      setAmount("");
      toast.success("Expense added", { id });
    } catch {
      toast.error("Failed to add expense", { id });
    }
  }

  async function deleteExpenditure(id: string) {
    const toastId = toast.loading("Deleting…");
    try {
      const res = await fetch(`/api/expenditures/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setExpenditures(prev => prev.filter(e => e._id !== id));
      toast.success("Expense deleted", { id: toastId });
    } catch {
      toast.error("Failed to delete expense", { id: toastId });
    }
  }

  const todayStr = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="dark min-h-screen bg-zinc-950 flex flex-col text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Wallet className="size-4 text-violet-400" />
            </div>
            <span className="font-semibold tracking-tight">Expense Tracker</span>
          </div>
          <div className="text-sm text-zinc-400">
            {new Date(year, month).toLocaleString("default", { month: "long" })}{" "}
            <span className="text-zinc-100 font-semibold">${monthTotal.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden justify-center">
        <div className="w-full max-w-4xl flex overflow-hidden">

          {/* Calendar */}
          <main className="flex-1 px-6 py-5 flex flex-col gap-4 min-w-0 overflow-y-auto">
            {/* Month nav */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>

              {/* Title + calendar picker */}
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={openPicker}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors group"
                >
                  <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
                    {new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" })}
                  </h2>
                  <CalendarDays className="size-3.5 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                </button>

                {pickerOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-64 rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl shadow-black/60 p-4 flex flex-col gap-3">
                    {/* Year selector */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setPickerYear(y => y - 1)}
                        className="size-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                      <span className="text-sm font-semibold text-zinc-100">{pickerYear}</span>
                      <button
                        onClick={() => setPickerYear(y => y + 1)}
                        className="size-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>

                    {/* Month grid */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((name, i) => {
                        const isCurrent = pickerYear === year && i === month;
                        return (
                          <button
                            key={name}
                            onClick={() => jumpTo(i)}
                            className={cn(
                              "rounded-lg py-1.5 text-xs font-medium transition-colors",
                              isCurrent
                                ? "bg-violet-600 text-white"
                                : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                            )}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={nextMonth}
                className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 text-center">
              {DAYS.map(d => (
                <div key={d} className="text-[11px] font-medium text-zinc-500 pb-1 tracking-wider uppercase">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {loadingMonth ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                Loading…
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16" />
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dateStr = toYMD(year, month, day);
                  const dayExps = byDate[dateStr] ?? [];
                  const total = dayExps.reduce((s, e) => s + e.amount, 0);
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === todayStr;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={cn(
                        "relative rounded-xl p-2 text-left transition-all duration-150 h-16 flex flex-col justify-between",
                        "bg-zinc-900 hover:bg-zinc-800/80",
                        isSelected
                          ? "ring-2 ring-violet-500 shadow-[0_0_14px_2px_rgba(139,92,246,0.2)] bg-zinc-800/80"
                          : "ring-1 ring-zinc-800/80",
                        isToday && !isSelected && "ring-1 ring-zinc-600"
                      )}
                    >
                      {/* Day number */}
                      <span
                        className={cn(
                          "text-xs font-semibold size-5 flex items-center justify-center rounded-md leading-none self-start",
                          isToday
                            ? "bg-violet-500 text-white"
                            : "text-zinc-400"
                        )}
                      >
                        {day}
                      </span>

                      {/* Bottom row: amount + dots */}
                      {dayExps.length > 0 && (
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-semibold text-emerald-400 leading-none">
                            ${total.toFixed(0)}
                          </span>
                          <div className="flex gap-0.5">
                            {dayExps.slice(0, 3).map(e => (
                              <span key={e._id} className="size-1 rounded-full bg-violet-400/70" />
                            ))}
                            {dayExps.length > 3 && (
                              <span className="text-[9px] text-zinc-500 leading-none">+{dayExps.length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </main>

          {/* Side panel */}
          {selectedDate && (
            <aside className="w-72 border-l border-zinc-800/60 flex flex-col bg-zinc-900/50">
              {/* Panel header */}
              <div className="px-4 pt-5 pb-4 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-zinc-100">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("default", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <div className="flex gap-3 mt-1.5">
                    <div className="text-xs text-zinc-500">
                      Day{" "}
                      <span className="text-emerald-400 font-semibold">${dayTotal.toFixed(2)}</span>
                    </div>
                    {weekTotal !== null && (
                      <div className="text-xs text-zinc-500">
                        Week{" "}
                        <span className="text-zinc-300 font-semibold">${weekTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="size-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors mt-0.5"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-zinc-800/60 mx-4" />

              {/* Expenditure list */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
                {selectedExps.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-10">
                    <div className="size-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Plus className="size-4 text-zinc-500" />
                    </div>
                    <p className="text-sm text-zinc-500">No expenses yet</p>
                  </div>
                ) : (
                  selectedExps.map(e => (
                    <div
                      key={e._id}
                      className="group flex items-center gap-3 rounded-xl bg-zinc-800/60 px-3 py-2.5 ring-1 ring-zinc-700/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{e.description}</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-400 shrink-0">
                        ${e.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => deleteExpenditure(e._id)}
                        className="size-5 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add form */}
              <div className="px-4 py-4 border-t border-zinc-800/60 flex flex-col gap-2.5">
                <input
                  type="text"
                  placeholder="What did you spend on?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && startAdding(addExpenditure)}
                  className="h-9 w-full rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && startAdding(addExpenditure)}
                    className="h-9 flex-1 min-w-0 rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                  <button
                    onClick={() => startAdding(addExpenditure)}
                    disabled={adding || !description.trim() || !amount}
                    className="h-9 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:pointer-events-none text-white transition-colors flex items-center justify-center"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </aside>
          )}

        </div>
      </div>
    </div>
  );
}
