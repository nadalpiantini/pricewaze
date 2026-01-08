/**
 * Mortgage Calculator - CFPB Amortize-style Implementation
 *
 * Implements standard mortgage calculations following CFPB guidelines:
 * - Standard amortization with monthly compounding
 * - PITI (Principal, Interest, Taxes, Insurance) breakdown
 * - APR calculation
 * - Loan comparison tools
 * - Affordability analysis
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MortgageInput {
  /** Property purchase price in USD */
  propertyPrice: number;
  /** Down payment amount in USD */
  downPayment: number;
  /** Annual interest rate as decimal (e.g., 0.065 for 6.5%) */
  interestRate: number;
  /** Loan term in years */
  loanTermYears: number;
  /** Annual property tax (optional, defaults to 1.2% of property price) */
  annualPropertyTax?: number;
  /** Annual homeowner's insurance (optional, defaults to 0.5% of property price) */
  annualInsurance?: number;
  /** Monthly HOA fees (optional, defaults to 0) */
  monthlyHOA?: number;
  /** Private Mortgage Insurance rate (optional, auto-calculated if LTV > 80%) */
  pmiRate?: number;
  /** Loan origination fee as decimal (optional) */
  originationFee?: number;
  /** Other closing costs (optional) */
  otherClosingCosts?: number;
}

export interface MonthlyPaymentBreakdown {
  /** Principal portion of payment */
  principal: number;
  /** Interest portion of payment */
  interest: number;
  /** Property tax portion (monthly) */
  propertyTax: number;
  /** Homeowner's insurance (monthly) */
  insurance: number;
  /** HOA fees (monthly) */
  hoa: number;
  /** Private Mortgage Insurance (monthly) */
  pmi: number;
  /** Total monthly payment (PITI + HOA + PMI) */
  total: number;
}

export interface AmortizationEntry {
  /** Payment number (1 to total payments) */
  paymentNumber: number;
  /** Date of payment */
  paymentDate: Date;
  /** Monthly payment amount */
  payment: number;
  /** Principal portion */
  principal: number;
  /** Interest portion */
  interest: number;
  /** Remaining balance after payment */
  remainingBalance: number;
  /** Cumulative principal paid */
  cumulativePrincipal: number;
  /** Cumulative interest paid */
  cumulativeInterest: number;
}

export interface MortgageCalculation {
  /** Loan amount (price - down payment) */
  loanAmount: number;
  /** Loan-to-value ratio as decimal */
  ltv: number;
  /** Monthly payment breakdown */
  monthlyPayment: MonthlyPaymentBreakdown;
  /** Annual Percentage Rate (includes fees) */
  apr: number;
  /** Total interest paid over loan life */
  totalInterest: number;
  /** Total cost of loan (principal + interest) */
  totalLoanCost: number;
  /** Total cost of ownership (includes taxes, insurance, etc.) */
  totalOwnershipCost: number;
  /** Closing costs */
  closingCosts: number;
  /** Number of months until PMI can be removed (if applicable) */
  pmiRemovalMonth: number | null;
  /** Full amortization schedule */
  amortizationSchedule: AmortizationEntry[];
  /** Summary statistics by year */
  yearlyBreakdown: YearlyBreakdown[];
}

export interface YearlyBreakdown {
  year: number;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
  remainingBalance: number;
  equity: number;
  equityPercent: number;
}

export interface AffordabilityResult {
  /** Maximum affordable home price */
  maxHomePrice: number;
  /** Maximum loan amount */
  maxLoanAmount: number;
  /** Recommended down payment */
  recommendedDownPayment: number;
  /** Monthly payment at max price */
  monthlyPayment: number;
  /** Debt-to-income ratio */
  dtiRatio: number;
  /** Front-end ratio (housing/income) */
  frontEndRatio: number;
  /** Affordability status */
  status: 'affordable' | 'stretching' | 'unaffordable';
  /** Recommendations */
  recommendations: string[];
}

export interface LoanComparison {
  /** Original loan scenario */
  original: MortgageCalculation;
  /** Alternative loan scenario */
  alternative: MortgageCalculation;
  /** Monthly payment difference */
  monthlyDifference: number;
  /** Total interest difference */
  interestDifference: number;
  /** Total cost difference */
  totalCostDifference: number;
  /** Breakeven point in months (if refinancing) */
  breakevenMonths: number | null;
  /** Winner recommendation */
  recommendation: 'original' | 'alternative' | 'depends';
  /** Explanation */
  explanation: string;
}

// ============================================================================
// CORE CALCULATIONS
// ============================================================================

/**
 * Calculate monthly mortgage payment using standard amortization formula
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);

  const monthlyRate = annualRate / 12;
  const totalPayments = termYears * 12;

  const payment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1);

  return Math.round(payment * 100) / 100;
}

/**
 * Calculate PMI rate based on LTV
 * Standard PMI ranges from 0.3% to 1.5% annually based on LTV and credit
 */
export function calculatePMIRate(ltv: number, creditScore = 740): number {
  if (ltv <= 0.8) return 0; // No PMI needed

  // PMI rate increases with higher LTV and lower credit scores
  let baseRate: number;
  if (ltv <= 0.85) {
    baseRate = 0.003;
  } else if (ltv <= 0.90) {
    baseRate = 0.005;
  } else if (ltv <= 0.95) {
    baseRate = 0.008;
  } else {
    baseRate = 0.012;
  }

  // Adjust for credit score
  if (creditScore < 680) {
    baseRate *= 1.5;
  } else if (creditScore < 720) {
    baseRate *= 1.25;
  } else if (creditScore >= 760) {
    baseRate *= 0.8;
  }

  return baseRate;
}

/**
 * Calculate when PMI can be removed (when LTV reaches 78%)
 */
export function calculatePMIRemovalMonth(
  loanAmount: number,
  propertyPrice: number,
  monthlyRate: number,
  monthlyPayment: number
): number | null {
  const targetBalance = propertyPrice * 0.78;

  if (loanAmount <= targetBalance) return null;

  let balance = loanAmount;
  let month = 0;

  while (balance > targetBalance && month < 360) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    balance -= principal;
    month++;
  }

  return month;
}

/**
 * Generate full amortization schedule
 */
export function generateAmortizationSchedule(
  loanAmount: number,
  annualRate: number,
  termYears: number,
  startDate = new Date()
): AmortizationEntry[] {
  const monthlyRate = annualRate / 12;
  const totalPayments = termYears * 12;
  const monthlyPayment = calculateMonthlyPayment(loanAmount, annualRate, termYears);

  const schedule: AmortizationEntry[] = [];
  let balance = loanAmount;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;

  for (let i = 1; i <= totalPayments; i++) {
    const interest = balance * monthlyRate;
    const principal = Math.min(monthlyPayment - interest, balance);
    balance = Math.max(0, balance - principal);

    cumulativePrincipal += principal;
    cumulativeInterest += interest;

    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + i);

    schedule.push({
      paymentNumber: i,
      paymentDate,
      payment: Math.round(monthlyPayment * 100) / 100,
      principal: Math.round(principal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      remainingBalance: Math.round(balance * 100) / 100,
      cumulativePrincipal: Math.round(cumulativePrincipal * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
    });
  }

  return schedule;
}

/**
 * Calculate APR including fees
 * Uses Newton-Raphson method to solve for rate
 */
export function calculateAPR(
  loanAmount: number,
  fees: number,
  monthlyPayment: number,
  totalPayments: number
): number {
  const netLoan = loanAmount - fees;

  // Initial guess
  let apr = 0.06 / 12; // Start with 6% monthly

  // Newton-Raphson iteration
  for (let i = 0; i < 100; i++) {
    const x = Math.pow(1 + apr, totalPayments);
    const f = netLoan * apr * x / (x - 1) - monthlyPayment;
    const df = netLoan * (x * (apr * totalPayments + x - 1) - apr * totalPayments * x) /
               Math.pow(x - 1, 2);

    const newApr = apr - f / df;

    if (Math.abs(newApr - apr) < 0.0000001) {
      break;
    }

    apr = newApr;
  }

  return Math.round(apr * 12 * 10000) / 10000; // Annual rate, 4 decimal places
}

// ============================================================================
// MAIN CALCULATOR
// ============================================================================

/**
 * Calculate complete mortgage details
 */
export function calculateMortgage(input: MortgageInput): MortgageCalculation {
  const {
    propertyPrice,
    downPayment,
    interestRate,
    loanTermYears,
    annualPropertyTax = propertyPrice * 0.012,
    annualInsurance = propertyPrice * 0.005,
    monthlyHOA = 0,
    pmiRate,
    originationFee = 0,
    otherClosingCosts = 0,
  } = input;

  // Core calculations
  const loanAmount = propertyPrice - downPayment;
  const ltv = loanAmount / propertyPrice;
  const monthlyRate = interestRate / 12;
  const totalPayments = loanTermYears * 12;

  // Monthly P&I
  const monthlyPI = calculateMonthlyPayment(loanAmount, interestRate, loanTermYears);

  // PMI calculation
  const effectivePMIRate = pmiRate ?? calculatePMIRate(ltv);
  const monthlyPMI = ltv > 0.8 ? (loanAmount * effectivePMIRate) / 12 : 0;

  // Monthly breakdown
  const monthlyPayment: MonthlyPaymentBreakdown = {
    principal: 0, // Varies monthly, initial approximation
    interest: loanAmount * monthlyRate,
    propertyTax: annualPropertyTax / 12,
    insurance: annualInsurance / 12,
    hoa: monthlyHOA,
    pmi: monthlyPMI,
    total: 0,
  };

  monthlyPayment.principal = monthlyPI - monthlyPayment.interest;
  monthlyPayment.total =
    monthlyPI +
    monthlyPayment.propertyTax +
    monthlyPayment.insurance +
    monthlyPayment.hoa +
    monthlyPayment.pmi;

  // Round all values
  Object.keys(monthlyPayment).forEach((key) => {
    monthlyPayment[key as keyof MonthlyPaymentBreakdown] =
      Math.round(monthlyPayment[key as keyof MonthlyPaymentBreakdown] * 100) / 100;
  });

  // Closing costs
  const closingCosts =
    loanAmount * originationFee + otherClosingCosts + (loanAmount * 0.01); // 1% title/escrow estimate

  // APR
  const apr = calculateAPR(loanAmount, closingCosts, monthlyPI, totalPayments);

  // Generate amortization schedule
  const amortizationSchedule = generateAmortizationSchedule(
    loanAmount,
    interestRate,
    loanTermYears
  );

  // Total interest from schedule
  const totalInterest = amortizationSchedule.reduce((sum, entry) => sum + entry.interest, 0);

  // Total loan cost
  const totalLoanCost = loanAmount + totalInterest;

  // Total ownership cost (includes taxes, insurance, HOA for full term)
  const totalOwnershipCost =
    totalLoanCost +
    annualPropertyTax * loanTermYears +
    annualInsurance * loanTermYears +
    monthlyHOA * totalPayments;

  // PMI removal month
  const pmiRemovalMonth = ltv > 0.8
    ? calculatePMIRemovalMonth(loanAmount, propertyPrice, monthlyRate, monthlyPI)
    : null;

  // Yearly breakdown
  const yearlyBreakdown: YearlyBreakdown[] = [];
  for (let year = 1; year <= loanTermYears; year++) {
    const startMonth = (year - 1) * 12;
    const endMonth = year * 12;
    const yearEntries = amortizationSchedule.slice(startMonth, endMonth);

    const principalPaid = yearEntries.reduce((sum, e) => sum + e.principal, 0);
    const interestPaid = yearEntries.reduce((sum, e) => sum + e.interest, 0);
    const lastEntry = yearEntries[yearEntries.length - 1];
    const equity = propertyPrice - (lastEntry?.remainingBalance ?? loanAmount);

    yearlyBreakdown.push({
      year,
      principalPaid: Math.round(principalPaid * 100) / 100,
      interestPaid: Math.round(interestPaid * 100) / 100,
      totalPaid: Math.round((principalPaid + interestPaid) * 100) / 100,
      remainingBalance: lastEntry?.remainingBalance ?? 0,
      equity: Math.round(equity * 100) / 100,
      equityPercent: Math.round((equity / propertyPrice) * 10000) / 100,
    });
  }

  return {
    loanAmount,
    ltv: Math.round(ltv * 10000) / 10000,
    monthlyPayment,
    apr,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalLoanCost: Math.round(totalLoanCost * 100) / 100,
    totalOwnershipCost: Math.round(totalOwnershipCost * 100) / 100,
    closingCosts: Math.round(closingCosts * 100) / 100,
    pmiRemovalMonth,
    amortizationSchedule,
    yearlyBreakdown,
  };
}

// ============================================================================
// AFFORDABILITY CALCULATOR
// ============================================================================

/**
 * Calculate home affordability based on income and debts
 */
export function calculateAffordability(
  annualIncome: number,
  monthlyDebts: number,
  downPaymentAvailable: number,
  interestRate: number,
  loanTermYears = 30,
  maxDTI = 0.43, // CFPB qualified mortgage limit
  maxFrontEnd = 0.28 // Traditional front-end ratio
): AffordabilityResult {
  const monthlyIncome = annualIncome / 12;

  // Calculate max housing payment based on front-end ratio
  const maxHousingPayment = monthlyIncome * maxFrontEnd;

  // Calculate max total debt payment based on back-end DTI
  const maxTotalDebt = monthlyIncome * maxDTI;
  const maxHousingFromDTI = maxTotalDebt - monthlyDebts;

  // Use the lower of the two limits
  const maxMonthlyPayment = Math.min(maxHousingPayment, maxHousingFromDTI);

  // Estimate property tax and insurance (about 20% of PITI)
  const pitiMultiplier = 0.8; // P&I is about 80% of total PITI
  const maxPI = maxMonthlyPayment * pitiMultiplier;

  // Calculate max loan from P&I payment
  const monthlyRate = interestRate / 12;
  const totalPayments = loanTermYears * 12;

  const maxLoanAmount = maxPI > 0
    ? (maxPI * (Math.pow(1 + monthlyRate, totalPayments) - 1)) /
      (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))
    : 0;

  // Calculate max home price
  // Assume 20% down payment is ideal, but use available funds
  const idealDownPaymentPercent = 0.20;
  const maxFromDownPayment = downPaymentAvailable / idealDownPaymentPercent;
  const maxFromLoan = maxLoanAmount / (1 - idealDownPaymentPercent);

  const maxHomePrice = Math.min(maxFromDownPayment, maxFromLoan);
  const recommendedDownPayment = maxHomePrice * idealDownPaymentPercent;

  // Actual monthly payment at max price
  const actualLoanAmount = maxHomePrice - Math.min(downPaymentAvailable, recommendedDownPayment);
  const monthlyPayment = calculateMonthlyPayment(actualLoanAmount, interestRate, loanTermYears);
  const estimatedPITI = monthlyPayment / pitiMultiplier;

  // Calculate actual ratios
  const frontEndRatio = estimatedPITI / monthlyIncome;
  const dtiRatio = (estimatedPITI + monthlyDebts) / monthlyIncome;

  // Determine status
  let status: 'affordable' | 'stretching' | 'unaffordable';
  const recommendations: string[] = [];

  if (dtiRatio <= 0.36 && frontEndRatio <= 0.28) {
    status = 'affordable';
    recommendations.push('This purchase fits comfortably within your budget.');
  } else if (dtiRatio <= maxDTI && frontEndRatio <= 0.32) {
    status = 'stretching';
    recommendations.push('This purchase is manageable but will require careful budgeting.');
    if (downPaymentAvailable < recommendedDownPayment) {
      recommendations.push('Consider saving for a larger down payment to reduce monthly costs.');
    }
  } else {
    status = 'unaffordable';
    recommendations.push('This purchase exceeds recommended affordability limits.');
    recommendations.push('Consider a less expensive property or increasing your down payment.');
  }

  if (maxHomePrice * 0.8 > maxLoanAmount) {
    recommendations.push('Your down payment allows for a higher price than your income supports.');
  }

  return {
    maxHomePrice: Math.round(maxHomePrice),
    maxLoanAmount: Math.round(maxLoanAmount),
    recommendedDownPayment: Math.round(recommendedDownPayment),
    monthlyPayment: Math.round(estimatedPITI * 100) / 100,
    dtiRatio: Math.round(dtiRatio * 1000) / 1000,
    frontEndRatio: Math.round(frontEndRatio * 1000) / 1000,
    status,
    recommendations,
  };
}

// ============================================================================
// LOAN COMPARISON
// ============================================================================

/**
 * Compare two loan scenarios
 */
export function compareLoanScenarios(
  scenario1: MortgageInput,
  scenario2: MortgageInput,
  refinanceCosts = 0
): LoanComparison {
  const original = calculateMortgage(scenario1);
  const alternative = calculateMortgage(scenario2);

  const monthlyDifference =
    alternative.monthlyPayment.total - original.monthlyPayment.total;
  const interestDifference = alternative.totalInterest - original.totalInterest;
  const totalCostDifference =
    alternative.totalOwnershipCost - original.totalOwnershipCost + refinanceCosts;

  // Calculate breakeven if refinancing (lower payment but upfront costs)
  let breakevenMonths: number | null = null;
  if (monthlyDifference < 0 && refinanceCosts > 0) {
    breakevenMonths = Math.ceil(refinanceCosts / Math.abs(monthlyDifference));
  }

  // Determine recommendation
  let recommendation: 'original' | 'alternative' | 'depends';
  let explanation: string;

  if (totalCostDifference < -5000) {
    recommendation = 'alternative';
    explanation = `The alternative saves $${Math.abs(Math.round(totalCostDifference)).toLocaleString()} over the loan term.`;
  } else if (totalCostDifference > 5000) {
    recommendation = 'original';
    explanation = `The original loan saves $${Math.round(totalCostDifference).toLocaleString()} over the loan term.`;
  } else {
    recommendation = 'depends';
    explanation = 'Both options are similar. Consider your cash flow needs and how long you plan to stay.';
  }

  if (breakevenMonths && breakevenMonths > 60) {
    explanation += ` Note: Breakeven point is ${breakevenMonths} months, which may be too long if you plan to move soon.`;
  }

  return {
    original,
    alternative,
    monthlyDifference: Math.round(monthlyDifference * 100) / 100,
    interestDifference: Math.round(interestDifference * 100) / 100,
    totalCostDifference: Math.round(totalCostDifference * 100) / 100,
    breakevenMonths,
    recommendation,
    explanation,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercent(rate: number, decimals = 2): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}

/**
 * Calculate equity at a specific month
 */
export function getEquityAtMonth(
  schedule: AmortizationEntry[],
  month: number,
  propertyPrice: number
): number {
  if (month <= 0) return propertyPrice - (schedule[0]?.remainingBalance ?? 0);
  if (month > schedule.length) return propertyPrice;

  const entry = schedule[month - 1];
  return propertyPrice - entry.remainingBalance;
}

/**
 * Get extra payment impact analysis
 */
export function analyzeExtraPayments(
  baseCalculation: MortgageCalculation,
  extraMonthlyPayment: number
): {
  monthsSaved: number;
  interestSaved: number;
  newPayoffDate: Date;
} {
  const { loanAmount, monthlyPayment, amortizationSchedule } = baseCalculation;

  // Recalculate with extra payment
  const totalPayment = monthlyPayment.principal + monthlyPayment.interest + extraMonthlyPayment;
  const monthlyRate = monthlyPayment.interest / amortizationSchedule[0].remainingBalance;

  let balance = loanAmount;
  let months = 0;
  let totalInterest = 0;

  while (balance > 0 && months < 360) {
    const interest = balance * monthlyRate;
    const principal = Math.min(totalPayment - interest, balance);
    balance -= principal;
    totalInterest += interest;
    months++;
  }

  const originalMonths = amortizationSchedule.length;
  const monthsSaved = originalMonths - months;

  const originalInterest = amortizationSchedule.reduce((sum, e) => sum + e.interest, 0);
  const interestSaved = originalInterest - totalInterest;

  const newPayoffDate = new Date();
  newPayoffDate.setMonth(newPayoffDate.getMonth() + months);

  return {
    monthsSaved,
    interestSaved: Math.round(interestSaved * 100) / 100,
    newPayoffDate,
  };
}
