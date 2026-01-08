'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  calculateMortgage,
  calculateAffordability,
  compareLoanScenarios,
  formatCurrency,
  formatPercent,
  type MortgageInput,
  type MortgageCalculation,
  type AffordabilityResult,
  type LoanComparison,
} from '@/lib/mortgage';

interface MortgageCalculatorProps {
  initialPrice?: number;
  initialDownPayment?: number;
  className?: string;
}

export function MortgageCalculator({
  initialPrice = 500000,
  initialDownPayment = 100000,
  className,
}: MortgageCalculatorProps) {
  // Form state
  const [propertyPrice, setPropertyPrice] = React.useState(initialPrice);
  const [downPayment, setDownPayment] = React.useState(initialDownPayment);
  const [interestRate, setInterestRate] = React.useState(6.5);
  const [loanTermYears, setLoanTermYears] = React.useState(30);
  const [propertyTaxRate, setPropertyTaxRate] = React.useState(1.2);
  const [homeInsuranceAnnual, setHomeInsuranceAnnual] = React.useState(1500);
  const [hoaMonthly, setHoaMonthly] = React.useState(0);
  const [closingCosts, setClosingCosts] = React.useState(15000);

  // Affordability inputs
  const [annualIncome, setAnnualIncome] = React.useState(120000);
  const [monthlyDebts, setMonthlyDebts] = React.useState(500);

  // Comparison inputs
  const [compareRate, setCompareRate] = React.useState(7.0);
  const [compareTerm, setCompareTerm] = React.useState(15);

  // Calculations
  const mortgageInput: MortgageInput = React.useMemo(
    () => ({
      propertyPrice,
      downPayment,
      interestRate: interestRate / 100, // Convert to decimal
      loanTermYears,
      annualPropertyTax: (propertyTaxRate / 100) * propertyPrice,
      annualInsurance: homeInsuranceAnnual,
      monthlyHOA: hoaMonthly,
      otherClosingCosts: closingCosts,
    }),
    [
      propertyPrice,
      downPayment,
      interestRate,
      loanTermYears,
      propertyTaxRate,
      homeInsuranceAnnual,
      hoaMonthly,
      closingCosts,
    ]
  );

  const calculation: MortgageCalculation = React.useMemo(
    () => calculateMortgage(mortgageInput),
    [mortgageInput]
  );

  const affordability: AffordabilityResult = React.useMemo(
    () =>
      calculateAffordability(
        annualIncome,
        monthlyDebts,
        downPayment,
        interestRate / 100, // Convert to decimal
        loanTermYears
      ),
    [annualIncome, monthlyDebts, downPayment, interestRate, loanTermYears]
  );

  const comparison: LoanComparison | null = React.useMemo(() => {
    const altInput: MortgageInput = {
      ...mortgageInput,
      interestRate: compareRate / 100, // Convert to decimal
      loanTermYears: compareTerm,
    };
    return compareLoanScenarios(mortgageInput, altInput);
  }, [mortgageInput, compareRate, compareTerm]);

  const ltv = ((propertyPrice - downPayment) / propertyPrice) * 100;
  const downPaymentPercent = (downPayment / propertyPrice) * 100;

  return (
    <div className={className}>
      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="affordability">Affordability</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        {/* Main Calculator Tab */}
        <TabsContent value="calculator" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Inputs Card */}
            <Card>
              <CardHeader>
                <CardTitle>Loan Details</CardTitle>
                <CardDescription>
                  Enter your mortgage parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Property Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={propertyPrice}
                    onChange={(e) => setPropertyPrice(Number(e.target.value))}
                    min={0}
                    step={10000}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="downpayment">Down Payment</Label>
                    <span className="text-sm text-muted-foreground">
                      {formatPercent(downPaymentPercent / 100)}
                    </span>
                  </div>
                  <Input
                    id="downpayment"
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    min={0}
                    max={propertyPrice}
                    step={5000}
                  />
                  <Slider
                    value={[downPayment]}
                    onValueChange={([v]) => setDownPayment(v)}
                    min={0}
                    max={propertyPrice}
                    step={5000}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="rate">Interest Rate</Label>
                    <span className="text-sm text-muted-foreground">
                      {formatPercent(interestRate / 100)}
                    </span>
                  </div>
                  <Slider
                    value={[interestRate]}
                    onValueChange={([v]) => setInterestRate(v)}
                    min={1}
                    max={12}
                    step={0.125}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Loan Term</Label>
                    <span className="text-sm text-muted-foreground">
                      {loanTermYears} years
                    </span>
                  </div>
                  <Slider
                    value={[loanTermYears]}
                    onValueChange={([v]) => setLoanTermYears(v)}
                    min={10}
                    max={30}
                    step={5}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax">Property Tax %</Label>
                    <Input
                      id="tax"
                      type="number"
                      value={propertyTaxRate}
                      onChange={(e) => setPropertyTaxRate(Number(e.target.value))}
                      min={0}
                      max={5}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurance">Annual Insurance</Label>
                    <Input
                      id="insurance"
                      type="number"
                      value={homeInsuranceAnnual}
                      onChange={(e) => setHomeInsuranceAnnual(Number(e.target.value))}
                      min={0}
                      step={100}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hoa">Monthly HOA</Label>
                    <Input
                      id="hoa"
                      type="number"
                      value={hoaMonthly}
                      onChange={(e) => setHoaMonthly(Number(e.target.value))}
                      min={0}
                      step={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closing">Closing Costs</Label>
                    <Input
                      id="closing"
                      type="number"
                      value={closingCosts}
                      onChange={(e) => setClosingCosts(Number(e.target.value))}
                      min={0}
                      step={1000}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Card */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Payment</CardTitle>
                <CardDescription>
                  PITI + PMI breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">
                    {formatCurrency(calculation.monthlyPayment.total)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    per month
                  </div>
                </div>

                <div className="space-y-3">
                  <PaymentBreakdownRow
                    label="Principal & Interest"
                    amount={calculation.monthlyPayment.principal + calculation.monthlyPayment.interest}
                    percent={
                      ((calculation.monthlyPayment.principal + calculation.monthlyPayment.interest) /
                        calculation.monthlyPayment.total) *
                      100
                    }
                    color="bg-blue-500"
                  />
                  <PaymentBreakdownRow
                    label="Property Tax"
                    amount={calculation.monthlyPayment.propertyTax}
                    percent={
                      (calculation.monthlyPayment.propertyTax /
                        calculation.monthlyPayment.total) *
                      100
                    }
                    color="bg-green-500"
                  />
                  <PaymentBreakdownRow
                    label="Insurance"
                    amount={calculation.monthlyPayment.insurance}
                    percent={
                      (calculation.monthlyPayment.insurance /
                        calculation.monthlyPayment.total) *
                      100
                    }
                    color="bg-yellow-500"
                  />
                  {calculation.monthlyPayment.pmi > 0 && (
                    <PaymentBreakdownRow
                      label="PMI"
                      amount={calculation.monthlyPayment.pmi}
                      percent={
                        (calculation.monthlyPayment.pmi /
                          calculation.monthlyPayment.total) *
                        100
                      }
                      color="bg-red-500"
                    />
                  )}
                  {calculation.monthlyPayment.hoa > 0 && (
                    <PaymentBreakdownRow
                      label="HOA"
                      amount={calculation.monthlyPayment.hoa}
                      percent={
                        (calculation.monthlyPayment.hoa /
                          calculation.monthlyPayment.total) *
                        100
                      }
                      color="bg-purple-500"
                    />
                  )}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Loan Amount</span>
                    <span className="font-medium">
                      {formatCurrency(calculation.loanAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">LTV</span>
                    <span className="font-medium">{formatPercent(ltv / 100)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">APR</span>
                    <span className="font-medium">
                      {formatPercent(calculation.apr / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Interest</span>
                    <span className="font-medium">
                      {formatCurrency(calculation.totalInterest)}
                    </span>
                  </div>
                  {calculation.pmiRemovalMonth && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">PMI Removed</span>
                      <span className="font-medium">
                        Month {calculation.pmiRemovalMonth}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Amortization Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Amortization Schedule</CardTitle>
              <CardDescription>
                Year-by-year breakdown of your loan payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Year</th>
                      <th className="text-right py-2 px-2">Principal</th>
                      <th className="text-right py-2 px-2">Interest</th>
                      <th className="text-right py-2 px-2">Balance</th>
                      <th className="text-right py-2 px-2">Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculation.yearlyBreakdown.map((year) => (
                      <tr key={year.year} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2">{year.year}</td>
                        <td className="text-right py-2 px-2">
                          {formatCurrency(year.principalPaid)}
                        </td>
                        <td className="text-right py-2 px-2">
                          {formatCurrency(year.interestPaid)}
                        </td>
                        <td className="text-right py-2 px-2">
                          {formatCurrency(year.remainingBalance)}
                        </td>
                        <td className="text-right py-2 px-2">
                          {formatPercent(
                            (propertyPrice - year.remainingBalance) / propertyPrice
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Affordability Tab */}
        <TabsContent value="affordability" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Income & Debts</CardTitle>
                <CardDescription>
                  Calculate what you can afford
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="income">Annual Income</Label>
                  <Input
                    id="income"
                    type="number"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(Number(e.target.value))}
                    min={0}
                    step={5000}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debts">Monthly Debts</Label>
                  <Input
                    id="debts"
                    type="number"
                    value={monthlyDebts}
                    onChange={(e) => setMonthlyDebts(Number(e.target.value))}
                    min={0}
                    step={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Car payments, credit cards, student loans, etc.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Affordability Results</CardTitle>
                <CardDescription>
                  Based on 28% housing ratio, 36% DTI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Max Home Price
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(affordability.maxHomePrice)}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Monthly Payment
                    </span>
                    <span className="font-medium">
                      {formatCurrency(affordability.monthlyPayment)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Max Loan Amount
                    </span>
                    <span className="font-medium">
                      {formatCurrency(affordability.maxLoanAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Recommended Down Payment
                    </span>
                    <span className="font-medium">
                      {formatCurrency(affordability.recommendedDownPayment)}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Front-End Ratio</span>
                    <span className="text-sm font-medium">
                      {formatPercent(affordability.frontEndRatio)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min((affordability.frontEndRatio / 0.28) * 100, 100)}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Target: 28% or less ({affordability.status})
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Alternative Loan</CardTitle>
                <CardDescription>
                  Compare with a different scenario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Interest Rate</Label>
                    <span className="text-sm text-muted-foreground">
                      {formatPercent(compareRate / 100)}
                    </span>
                  </div>
                  <Slider
                    value={[compareRate]}
                    onValueChange={([v]) => setCompareRate(v)}
                    min={1}
                    max={12}
                    step={0.125}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Loan Term</Label>
                    <span className="text-sm text-muted-foreground">
                      {compareTerm} years
                    </span>
                  </div>
                  <Slider
                    value={[compareTerm]}
                    onValueChange={([v]) => setCompareTerm(v)}
                    min={10}
                    max={30}
                    step={5}
                  />
                </div>
              </CardContent>
            </Card>

            {comparison && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparison Results</CardTitle>
                  <CardDescription>
                    {loanTermYears}yr @ {formatPercent(interestRate / 100)} vs{' '}
                    {compareTerm}yr @ {formatPercent(compareRate / 100)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground uppercase">
                        Current
                      </div>
                      <div className="text-xl font-bold">
                        {formatCurrency(comparison.original.monthlyPayment.total)}
                      </div>
                      <div className="text-xs text-muted-foreground">/month</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground uppercase">
                        Alternative
                      </div>
                      <div className="text-xl font-bold">
                        {formatCurrency(comparison.alternative.monthlyPayment.total)}
                      </div>
                      <div className="text-xs text-muted-foreground">/month</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Monthly Difference
                      </span>
                      <span
                        className={
                          comparison.monthlyDifference < 0
                            ? 'text-green-600 font-medium'
                            : 'text-red-600 font-medium'
                        }
                      >
                        {comparison.monthlyDifference < 0 ? '-' : '+'}
                        {formatCurrency(Math.abs(comparison.monthlyDifference))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Interest Difference
                      </span>
                      <span
                        className={
                          comparison.interestDifference < 0
                            ? 'text-green-600 font-medium'
                            : 'text-red-600 font-medium'
                        }
                      >
                        {comparison.interestDifference < 0
                          ? 'Save '
                          : 'Pay '}
                        {formatCurrency(
                          Math.abs(comparison.interestDifference)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Cost Difference
                      </span>
                      <span
                        className={
                          comparison.totalCostDifference < 0
                            ? 'text-green-600 font-medium'
                            : 'text-red-600 font-medium'
                        }
                      >
                        {comparison.totalCostDifference < 0 ? 'Save ' : 'Pay '}
                        {formatCurrency(Math.abs(comparison.totalCostDifference))}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-1">
                      Recommendation: {comparison.recommendation === 'original' ? 'Current Loan' : comparison.recommendation === 'alternative' ? 'Alternative' : 'Depends on goals'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {comparison.explanation}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PaymentBreakdownRow({
  label,
  amount,
  percent,
  color,
}: {
  label: string;
  amount: number;
  percent: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatCurrency(amount)}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
