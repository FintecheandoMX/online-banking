import { describe, expect, test } from "vitest";
import {
  getAccounts,
  getTransactions,
  initialBeneficiaries,
  validateTransferAmount,
} from "./demo";

describe("demo fixtures", () => {
  test("personal and business accounts use integer centavos", () => {
    for (const segment of ["personas", "empresas"] as const) {
      const accounts = getAccounts(segment);
      expect(accounts).toHaveLength(2);
      for (const account of accounts) {
        expect(Number.isInteger(account.balance)).toBe(true);
        expect(account.balance).toBeGreaterThan(0);
      }
    }
    expect(getAccounts("personas")[0].balance).toBe(12845000);
    expect(getAccounts("empresas")[0].balance).toBe(53280000);
  });

  test("transactions reference existing accounts", () => {
    const accounts = new Set(getAccounts("personas").map((a) => a.id));
    for (const transaction of getTransactions("personas")) {
      expect(accounts.has(transaction.accountId)).toBe(true);
      expect(Number.isInteger(transaction.amount)).toBe(true);
      expect(transaction.amount).not.toBe(0);
    }
  });

  test("beneficiary fixtures use 18-digit demo accounts", () => {
    expect(initialBeneficiaries.length).toBeGreaterThan(0);
    for (const beneficiary of initialBeneficiaries) {
      expect(beneficiary.account).toMatch(/^\d{18}$/);
    }
  });
});

describe("validateTransferAmount", () => {
  test("accepts valid amounts within balance and demo limit", () => {
    expect(validateTransferAmount("1250.50", 12845000)).toEqual({
      cents: 125050,
    });
    expect(validateTransferAmount("0.01", 100)).toEqual({ cents: 1 });
  });

  test("rejects amounts outside the demo range", () => {
    expect(validateTransferAmount("0", 100000)).toHaveProperty("error");
    expect(validateTransferAmount("60000", 10000000)).toHaveProperty("error");
    expect(validateTransferAmount("no-numero", 100000)).toHaveProperty("error");
  });

  test("rejects amounts above available balance", () => {
    const result = validateTransferAmount("2000", 100000);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toMatch(/insuficiente/);
  });
});
