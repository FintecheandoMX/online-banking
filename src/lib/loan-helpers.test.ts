import { describe, it, expect } from "vitest";
import {
  getLoanRepaymentSummary,
  parseFineractDate,
  formatNextPaymentDate,
  daysBetween,
  formatRemainingTerm,
  formatCurrency,
} from "./loan-helpers";
import type { RepaymentSchedule } from "./auth-api";

describe("loan-helpers", () => {
  // Fixture mirroring loan 1473 / account 000001475
  // 11 installments + disbursement row
  // Periods 1-9: complete: true (paid)
  // Period 10: due 2027-04-12, outstanding 910.00, NOT paid
  // Period 11: due 2027-05-12, NOT paid
  const createFixtureLoan = (): { repaymentSchedule: RepaymentSchedule } => ({
    repaymentSchedule: {
      periods: [
        // Disbursement row (no period)
        {
          dueDate: [2026, 4, 12],
          complete: true,
          totalDueForPeriod: 0,
          totalOutstandingForPeriod: 0,
          totalPaidForPeriod: 0,
          principalDue: 0,
          interestDue: 0,
          principalPaid: 0,
          interestPaid: 0,
        },
        // Periods 1-9: paid
        ...Array.from({ length: 9 }, (_, i) => ({
          period: i + 1,
          dueDate: [2026, 5 + i, 12] as [number, number, number],
          complete: true,
          totalDueForPeriod: 91000,
          totalOutstandingForPeriod: 0,
          totalPaidForPeriod: 91000,
          principalDue: 81000,
          interestDue: 10000,
          principalPaid: 81000,
          interestPaid: 10000,
        })),
        // Period 10: due 2027-04-12, NOT paid, outstanding 910.00
        {
          period: 10,
          dueDate: [2027, 4, 12],
          complete: false,
          totalDueForPeriod: 91000,
          totalOutstandingForPeriod: 91000,
          totalPaidForPeriod: 0,
          principalDue: 81000,
          interestDue: 10000,
          principalPaid: 0,
          interestPaid: 0,
        },
        // Period 11: due 2027-05-12, NOT paid
        {
          period: 11,
          dueDate: [2027, 5, 12],
          complete: false,
          totalDueForPeriod: 91000,
          totalOutstandingForPeriod: 91000,
          totalPaidForPeriod: 0,
          principalDue: 81000,
          interestDue: 10000,
          principalPaid: 0,
          interestPaid: 0,
        },
      ],
      totalPrincipalDue: 1000000,
      totalInterestDue: 110000,
      totalFeesDue: 0,
      totalPenaltyChargesDue: 0,
      totalDue: 1110000,
      totalPrincipalOutstanding: 181000,
      totalInterestOutstanding: 0,
      totalFeesOutstanding: 0,
      totalPenaltyChargesOutstanding: 0,
      totalOutstanding: 181000,
      totalPrincipalPaid: 819000,
      totalInterestPaid: 110000,
      totalFeesPaid: 0,
      totalPenaltyChargesPaid: 0,
      totalPaid: 929000,
    },
  });

  const today = new Date(2026, 10, 8); // 8 Nov 2026 (month is 0-indexed)

  describe("parseFineractDate", () => {
    it("parses [yyyy, m, d] to local Date at midnight", () => {
      const date = parseFineractDate([2027, 4, 12]);
      expect(date.getFullYear()).toBe(2027);
      expect(date.getMonth()).toBe(3); // 0-indexed
      expect(date.getDate()).toBe(12);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
    });
  });

  describe("daysBetween", () => {
    it("calculates whole calendar days between two dates", () => {
      const start = new Date(2026, 10, 8); // 8 Nov 2026
      const end = new Date(2027, 3, 12); // 12 Apr 2027
      expect(daysBetween(start, end)).toBe(155);
    });

    it("returns 0 for same day", () => {
      const date = new Date(2026, 10, 8);
      expect(daysBetween(date, date)).toBe(0);
    });

    it("returns negative for past dates", () => {
      const start = new Date(2026, 10, 8);
      const end = new Date(2026, 10, 5);
      expect(daysBetween(start, end)).toBe(-3);
    });
  });

  describe("formatNextPaymentDate", () => {
    it("formats as 'Lunes, 12 de abril del 2027'", () => {
      const date = new Date(2027, 3, 12); // 12 Apr 2027
      const formatted = formatNextPaymentDate(date);
      expect(formatted).toBe("Lunes, 12 de abril del 2027");
    });
  });

  describe("formatRemainingTerm", () => {
    it("formats singular", () => {
      expect(formatRemainingTerm(1)).toBe("1 mes");
    });

    it("formats plural", () => {
      expect(formatRemainingTerm(2)).toBe("2 meses");
      expect(formatRemainingTerm(5)).toBe("5 meses");
    });
  });

  describe("formatCurrency", () => {
    it("formats centavos to pesos with 2 decimals", () => {
      expect(formatCurrency(91000)).toBe("$910.00");
      expect(formatCurrency(819000)).toBe("$8,190.00");
      expect(formatCurrency(181000)).toBe("$1,810.00");
    });
  });

  describe("getLoanRepaymentSummary", () => {
    it("returns correct summary for loan 1473 on 8 Nov 2026", () => {
      const loan = createFixtureLoan();
      const summary = getLoanRepaymentSummary(loan, today);

      expect(summary.monthlyAmount).toBe(91000); // 910.00 in centavos
      expect(summary.remainingTerm).toBe(2); // periods 10 and 11
      expect(summary.nextPaymentDate).toEqual(new Date(2027, 3, 12));
      expect(summary.daysUntilDue).toBe(155);
      expect(summary.nextPaymentLabel).toBe("Lunes, 12 de abril del 2027");
      expect(summary.badgeText).toBe("Vence en 155 días");
      expect(summary.isFullyPaid).toBe(false);
      expect(summary.isOverdue).toBe(false);
    });

    it("handles fully paid loan", () => {
      const paidLoan = {
        repaymentSchedule: {
          periods: [
            {
              period: 1,
              dueDate: [2026, 5, 12] as [number, number, number],
              complete: true,
              totalDueForPeriod: 91000,
              totalOutstandingForPeriod: 0,
              totalPaidForPeriod: 91000,
              principalDue: 81000,
              interestDue: 10000,
              principalPaid: 81000,
              interestPaid: 10000,
            },
          ],
          totalPrincipalDue: 91000,
          totalInterestDue: 10000,
          totalFeesDue: 0,
          totalPenaltyChargesDue: 0,
          totalDue: 101000,
          totalPrincipalOutstanding: 0,
          totalInterestOutstanding: 0,
          totalFeesOutstanding: 0,
          totalPenaltyChargesOutstanding: 0,
          totalOutstanding: 0,
          totalPrincipalPaid: 91000,
          totalInterestPaid: 10000,
          totalFeesPaid: 0,
          totalPenaltyChargesPaid: 0,
          totalPaid: 101000,
        },
      };

      const summary = getLoanRepaymentSummary(paidLoan, today);

      expect(summary.isFullyPaid).toBe(true);
      expect(summary.monthlyAmount).toBe(0);
      expect(summary.remainingTerm).toBe(0);
      expect(summary.nextPaymentLabel).toBe("Crédito liquidado");
      expect(summary.badgeText).toBe("");
    });

    it("handles overdue installment", () => {
      const pastDate = new Date(2027, 3, 15); // 15 Apr 2027 (3 days after due date)
      const loan = createFixtureLoan();
      const summary = getLoanRepaymentSummary(loan, pastDate);

      expect(summary.daysUntilDue).toBe(-3);
      expect(summary.badgeText).toBe("Vencido hace 3 días");
      expect(summary.isOverdue).toBe(true);
    });

    it("handles due today", () => {
      const dueDate = new Date(2027, 3, 12); // 12 Apr 2027
      const loan = createFixtureLoan();
      const summary = getLoanRepaymentSummary(loan, dueDate);

      expect(summary.daysUntilDue).toBe(0);
      expect(summary.badgeText).toBe("Vence hoy");
    });

    it("handles due tomorrow", () => {
      const dayBefore = new Date(2027, 3, 11); // 11 Apr 2027
      const loan = createFixtureLoan();
      const summary = getLoanRepaymentSummary(loan, dayBefore);

      expect(summary.daysUntilDue).toBe(1);
      expect(summary.badgeText).toBe("Vence mañana");
    });

    it("handles singular remaining term", () => {
      const loan = {
        repaymentSchedule: {
          periods: [
            {
              period: 1,
              dueDate: [2027, 4, 12] as [number, number, number],
              complete: false,
              totalDueForPeriod: 91000,
              totalOutstandingForPeriod: 91000,
              totalPaidForPeriod: 0,
              principalDue: 81000,
              interestDue: 10000,
              principalPaid: 0,
              interestPaid: 0,
            },
          ],
          totalPrincipalDue: 91000,
          totalInterestDue: 10000,
          totalFeesDue: 0,
          totalPenaltyChargesDue: 0,
          totalDue: 101000,
          totalPrincipalOutstanding: 91000,
          totalInterestOutstanding: 10000,
          totalFeesOutstanding: 0,
          totalPenaltyChargesOutstanding: 0,
          totalOutstanding: 101000,
          totalPrincipalPaid: 0,
          totalInterestPaid: 0,
          totalFeesPaid: 0,
          totalPenaltyChargesPaid: 0,
          totalPaid: 0,
        },
      };

      const summary = getLoanRepaymentSummary(loan, today);
      expect(summary.remainingTerm).toBe(1);
    });

    it("handles partially paid installment (outstanding > 0 but complete=true)", () => {
      const loan = {
        repaymentSchedule: {
          periods: [
            {
              period: 1,
              dueDate: [2027, 4, 12] as [number, number, number],
              complete: true, // marked complete but still has outstanding
              totalDueForPeriod: 91000,
              totalOutstandingForPeriod: 10000, // partially paid
              totalPaidForPeriod: 81000,
              principalDue: 81000,
              interestDue: 10000,
              principalPaid: 81000,
              interestPaid: 0,
            },
          ],
          totalPrincipalDue: 91000,
          totalInterestDue: 10000,
          totalFeesDue: 0,
          totalPenaltyChargesDue: 0,
          totalDue: 101000,
          totalPrincipalOutstanding: 10000,
          totalInterestOutstanding: 0,
          totalFeesOutstanding: 0,
          totalPenaltyChargesOutstanding: 0,
          totalOutstanding: 10000,
          totalPrincipalPaid: 81000,
          totalInterestPaid: 0,
          totalFeesPaid: 0,
          totalPenaltyChargesPaid: 0,
          totalPaid: 81000,
        },
      };

      const summary = getLoanRepaymentSummary(loan, today);
      expect(summary.remainingTerm).toBe(1); // Should count as unpaid due to outstanding > 0
      expect(summary.monthlyAmount).toBe(10000); // Should use totalOutstandingForPeriod
    });

    it("returns empty result for missing repayment schedule", () => {
      const summary = getLoanRepaymentSummary(null, today);
      expect(summary.monthlyAmount).toBe(0);
      expect(summary.remainingTerm).toBe(0);
      expect(summary.nextPaymentDate).toBeNull();
      expect(summary.daysUntilDue).toBeNull();
    });

    it("returns empty result for empty periods", () => {
      const loan = { repaymentSchedule: { periods: [] } } as unknown as { repaymentSchedule: RepaymentSchedule };
      const summary = getLoanRepaymentSummary(loan, today);
      expect(summary.monthlyAmount).toBe(0);
      expect(summary.remainingTerm).toBe(0);
    });

    it("ignores disbursement row (no period)", () => {
      const loan = {
        repaymentSchedule: {
          periods: [
            // Disbursement row
            {
              dueDate: [2026, 4, 12] as [number, number, number],
              complete: true,
              totalDueForPeriod: 0,
              totalOutstandingForPeriod: 0,
              totalPaidForPeriod: 0,
              principalDue: 0,
              interestDue: 0,
              principalPaid: 0,
              interestPaid: 0,
            },
            // First actual installment
            {
              period: 1,
              dueDate: [2027, 4, 12] as [number, number, number],
              complete: false,
              totalDueForPeriod: 91000,
              totalOutstandingForPeriod: 91000,
              totalPaidForPeriod: 0,
              principalDue: 81000,
              interestDue: 10000,
              principalPaid: 0,
              interestPaid: 0,
            },
          ],
          totalPrincipalDue: 91000,
          totalInterestDue: 10000,
          totalFeesDue: 0,
          totalPenaltyChargesDue: 0,
          totalDue: 101000,
          totalPrincipalOutstanding: 91000,
          totalInterestOutstanding: 10000,
          totalFeesOutstanding: 0,
          totalPenaltyChargesOutstanding: 0,
          totalOutstanding: 101000,
          totalPrincipalPaid: 0,
          totalInterestPaid: 0,
          totalFeesPaid: 0,
          totalPenaltyChargesPaid: 0,
          totalPaid: 0,
        },
      } as unknown as { repaymentSchedule: RepaymentSchedule };

      const summary = getLoanRepaymentSummary(loan, today);
      expect(summary.remainingTerm).toBe(1); // Only counts the actual installment
      expect(summary.monthlyAmount).toBe(91000);
    });
  });
});