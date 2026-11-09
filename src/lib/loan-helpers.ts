/**
 * Loan repayment summary helpers.
 * Pure functions for computing loan summary data from repayment schedule.
 */
import type { RepaymentSchedule, RepaymentSchedulePeriod } from "./auth-api";

export interface LoanRepaymentSummary {
  monthlyAmount: number;
  remainingTerm: number;
  nextPaymentDate: Date | null;
  daysUntilDue: number | null;
  nextPaymentLabel: string;
  badgeText: string;
  isFullyPaid: boolean;
  isOverdue: boolean;
}

/**
 * Parses a Fineract date array [yyyy, m, d] to a local Date (midnight, no timezone shift).
 */
export function parseFineractDate(dateArray: [number, number, number]): Date {
  const [year, month, day] = dateArray;
  return new Date(year, month - 1, day);
}

/**
 * Formats a date as "Lunes, 12 de abril del 2027" (es-MX, weekday capitalized, month lowercase, "del" before year).
 */
export function formatNextPaymentDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });

  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  // Format: "Lunes, 12 de abril del 2027"
  const weekday = partMap.weekday?.charAt(0).toUpperCase() + partMap.weekday?.slice(1);
  const day = partMap.day;
  const month = partMap.month?.toLowerCase();
  const year = partMap.year;

  return `${weekday}, ${day} de ${month} del ${year}`;
}

/**
 * Calculates whole calendar days between two local dates (midnight to midnight).
 */
export function daysBetween(start: Date, end: Date): number {
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffMs = endMidnight.getTime() - startMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Computes the loan repayment summary from the repayment schedule.
 *
 * @param loan - Loan detail object containing repaymentSchedule
 * @param today - Reference date (defaults to now). Use a fixed date for testing.
 * @returns LoanRepaymentSummary with all computed fields
 */
export function getLoanRepaymentSummary(
  loan: { repaymentSchedule?: RepaymentSchedule } | null | undefined,
  today: Date = new Date(),
): LoanRepaymentSummary {
  const emptyResult: LoanRepaymentSummary = {
    monthlyAmount: 0,
    remainingTerm: 0,
    nextPaymentDate: null,
    daysUntilDue: null,
    nextPaymentLabel: "",
    badgeText: "",
    isFullyPaid: true,
    isOverdue: false,
  };

  if (!loan?.repaymentSchedule?.periods?.length) {
    return emptyResult;
  }

  // Filter out disbursement row (period is undefined or null) and sort by period/dueDate
  const installments = loan.repaymentSchedule.periods
    .filter((p): p is RepaymentSchedulePeriod & { period: number } => p.period != null)
    .sort((a, b) => (a.period ?? 0) - (b.period ?? 0));

  // Unpaid installments: complete !== true OR totalOutstandingForPeriod > 0
  const unpaid = installments.filter(
    (p) => p.complete !== true || (p.totalOutstandingForPeriod ?? 0) > 0,
  );

  if (unpaid.length === 0) {
    // All installments paid
    return {
      ...emptyResult,
      isFullyPaid: true,
      monthlyAmount: 0,
      remainingTerm: 0,
      nextPaymentLabel: "Crédito liquidado",
      badgeText: "",
    };
  }

  const nextInstallment = unpaid[0];
  const nextPaymentDate = parseFineractDate(nextInstallment.dueDate);
  const daysUntilDue = daysBetween(today, nextPaymentDate);

  // Monthly amount = totalOutstandingForPeriod (what is actually due now), fallback to totalDueForPeriod
  const monthlyAmount = nextInstallment.totalOutstandingForPeriod ?? nextInstallment.totalDueForPeriod ?? 0;

  // Remaining term = number of unpaid installments
  const remainingTerm = unpaid.length;

  // Format date label
  const nextPaymentLabel = formatNextPaymentDate(nextPaymentDate);

  // Badge text based on days until due
  let badgeText: string;
  let isOverdue = false;

  if (daysUntilDue < 0) {
    badgeText = `Vencido hace ${Math.abs(daysUntilDue)} día${Math.abs(daysUntilDue) !== 1 ? "s" : ""}`;
    isOverdue = true;
  } else if (daysUntilDue === 0) {
    badgeText = "Vence hoy";
  } else if (daysUntilDue === 1) {
    badgeText = "Vence mañana";
  } else {
    badgeText = `Vence en ${daysUntilDue} día${daysUntilDue !== 1 ? "s" : ""}`;
  }

  return {
    monthlyAmount,
    remainingTerm,
    nextPaymentDate,
    daysUntilDue,
    nextPaymentLabel,
    badgeText,
    isFullyPaid: false,
    isOverdue,
  };
}

/**
 * Formats the remaining term as "1 mes" or "N meses".
 */
export function formatRemainingTerm(remainingTerm: number): string {
  return `${remainingTerm} mes${remainingTerm !== 1 ? "es" : ""}`;
}

/**
 * Formats currency amount in centavos to display string with $ symbol and 2 decimals.
 */
export function formatCurrency(amountInCentavos: number): string {
  const pesos = amountInCentavos / 100;
  return `$${pesos.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}