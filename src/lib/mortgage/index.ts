/**
 * Mortgage Calculator Module
 * CFPB-compliant mortgage calculations with full amortization schedules
 */

export {
  // Main calculation functions
  calculateMortgage,
  calculateMonthlyPayment,
  calculatePMIRate,
  calculatePMIRemovalMonth,
  calculateAPR,
  generateAmortizationSchedule,

  // Analysis tools
  calculateAffordability,
  compareLoanScenarios,
  analyzeExtraPayments,

  // Utility functions
  formatCurrency,
  formatPercent,
  getEquityAtMonth,
} from './calculator';

export type {
  MortgageInput,
  MonthlyPaymentBreakdown,
  AmortizationEntry,
  MortgageCalculation,
  YearlyBreakdown,
  AffordabilityResult,
  LoanComparison,
} from './calculator';
