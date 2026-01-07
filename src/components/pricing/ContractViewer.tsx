'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePricing } from '@/hooks/use-pricing';
import type { ContractDraft } from '@/types/pricing';
import {
  FileText,
  Download,
  Loader2,
  AlertTriangle,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface ContractViewerProps {
  offerId: string;
  disabled?: boolean;
}

export function ContractViewer({ offerId, disabled }: ContractViewerProps) {
  const [contract, setContract] = useState<ContractDraft | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { generateContract, loading, error } = usePricing();

  const handleGenerate = async () => {
    const result = await generateContract(offerId);
    if (result) {
      setContract(result);
      setIsOpen(true);
    }
  };

  const handleCopy = async () => {
    if (!contract) return;

    try {
      await navigator.clipboard.writeText(
        contract.disclaimer + '\n\n' + contract.content
      );
      setCopied(true);
      toast.success('Contract copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy contract');
    }
  };

  const handlePrint = () => {
    if (!contract) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contract Draft - ${contract.offerId}</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              line-height: 1.6;
            }
            .disclaimer {
              background: #fff3cd;
              border: 2px solid #ffc107;
              padding: 20px;
              margin-bottom: 30px;
              font-size: 12px;
              white-space: pre-wrap;
            }
            .contract {
              white-space: pre-wrap;
              font-size: 14px;
            }
            @media print {
              .disclaimer {
                background: #fff3cd !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="disclaimer">${contract.disclaimer}</div>
          <div class="contract">${contract.content}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    if (!contract) return;

    const content = contract.disclaimer + '\n\n' + contract.content;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contract-draft-${contract.offerId.slice(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Contract downloaded');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      <Button
        onClick={handleGenerate}
        disabled={loading || disabled}
        variant="outline"
        size="sm"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 mr-2" />
            Generate Contract
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Draft Purchase Agreement
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Non-binding draft for reference only
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          {contract && (
            <>
              {/* Contract Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Buyer</p>
                  <p className="font-medium">{contract.parties.buyer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seller</p>
                  <p className="font-medium">{contract.parties.seller.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Property</p>
                  <p className="font-medium">{contract.property.address}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agreed Price</p>
                  <p className="font-medium text-green-600">
                    {formatCurrency(contract.terms.agreedPrice)}
                  </p>
                </div>
              </div>

              {/* Disclaimer Banner */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Legal Disclaimer</p>
                  <p>
                    This is an AI-generated draft for reference purposes only. It is NOT a legally
                    binding document. Please consult with a licensed attorney in the Dominican
                    Republic before proceeding with any real estate transaction.
                  </p>
                </div>
              </div>

              {/* Contract Content */}
              <div className="flex-1 overflow-auto border rounded-lg p-4 bg-white font-mono text-sm whitespace-pre-wrap">
                {contract.content}
              </div>

              {/* Conditions */}
              <div className="flex flex-wrap gap-2">
                {contract.terms.conditions.map((condition, i) => (
                  <Badge key={i} variant="secondary">
                    {condition}
                  </Badge>
                ))}
              </div>
            </>
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="w-4 h-4 mr-1" />
                ) : (
                  <Copy className="w-4 h-4 mr-1" />
                )}
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
            <Button variant="default" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
