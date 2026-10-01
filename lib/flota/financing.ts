export function financingProgress(termMonths: number, monthlyPayment: number, paidInstallments: number) {
  const term = Math.max(0, Math.floor(termMonths));
  const paid = Math.min(term, Math.max(0, Math.floor(paidInstallments)));
  const remainingCount = term - paid;
  const paidAmount = Math.round(monthlyPayment * paid * 100) / 100;
  const remainingAmount = Math.round(monthlyPayment * remainingCount * 100) / 100;
  return { paid, remainingCount, paidAmount, remainingAmount };
}
