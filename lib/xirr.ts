// XIRR: Extended Internal Rate of Return
// Computes the annualised return for irregular cash flows using Newton-Raphson iteration.

export interface CashFlow {
  date: Date;
  amount: number; // Negative = investment (outflow), Positive = current value (inflow)
}

function npv(rate: number, cashflows: CashFlow[], refDate: Date): number {
  return cashflows.reduce((acc, cf) => {
    const years = (cf.date.getTime() - refDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return acc + cf.amount / Math.pow(1 + rate, years);
  }, 0);
}

function npvDerivative(rate: number, cashflows: CashFlow[], refDate: Date): number {
  return cashflows.reduce((acc, cf) => {
    const years = (cf.date.getTime() - refDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return acc - (years * cf.amount) / Math.pow(1 + rate, years + 1);
  }, 0);
}

// Returns XIRR as a decimal (e.g. 0.15 = 15% per year), or null if it fails to converge.
export function xirr(cashflows: CashFlow[], guess = 0.1): number | null {
  if (cashflows.length < 2) return null;

  const refDate = cashflows[0].date;
  let rate = guess;

  for (let i = 0; i < 100; i++) {
    const f  = npv(rate, cashflows, refDate);
    const df = npvDerivative(rate, cashflows, refDate);
    if (Math.abs(df) < 1e-10) break;

    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < 1e-8) return newRate;
    rate = newRate;

    // Clamp to avoid overflow
    if (rate < -0.999) rate = -0.999;
    if (rate > 100) rate = 100;
  }

  return Math.abs(npv(rate, cashflows, refDate)) < 1e-3 ? rate : null;
}

// Convenience: compute XIRR for a single stock holding
// buyDate + avgBuyPrice → investedAmount as outflow; today + currentPrice → inflow
export function stockXirr(buyDate: Date, avgBuyPrice: number, qty: number, currentPrice: number): number | null {
  const invested = avgBuyPrice * qty;
  const currentValue = currentPrice * qty;
  if (invested <= 0 || currentValue <= 0) return null;

  return xirr([
    { date: buyDate,  amount: -invested },
    { date: new Date(), amount: currentValue },
  ]);
}

// Format XIRR as a percentage string e.g. "+24.5% p.a."
export function formatXirr(rate: number | null): string {
  if (rate === null) return '—';
  return `${rate >= 0 ? '+' : ''}${(rate * 100).toFixed(1)}% p.a.`;
}
