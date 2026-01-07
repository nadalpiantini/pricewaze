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
  FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

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

  const handleDownloadTxt = () => {
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
    toast.success('Contract downloaded as TXT');
  };

  const handleDownloadPdf = () => {
    if (!contract) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Helper function to add text with word wrap
      const addText = (text: string, fontSize: number, isBold = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(text, maxWidth);

        for (const line of lines) {
          if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += fontSize * 0.4;
        }
        yPosition += 2;
      };

      // Title
      doc.setFillColor(245, 158, 11); // Yellow background
      doc.rect(margin - 5, yPosition - 5, maxWidth + 10, 15, 'F');
      addText('⚠️ BORRADOR NO VINCULANTE / NON-BINDING DRAFT ⚠️', 12, true);
      yPosition += 5;

      // Header
      addText('DRAFT PURCHASE AGREEMENT', 16, true);
      addText('BORRADOR DE CONTRATO DE COMPRAVENTA', 14, true);
      yPosition += 5;

      // Contract details
      addText(`Reference: ${contract.offerId}`, 10);
      addText(`Generated: ${new Date(contract.generatedAt).toLocaleDateString()}`, 10);
      yPosition += 5;

      // Parties section
      doc.setDrawColor(200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      addText('PARTIES / PARTES', 12, true);
      addText(`Buyer / Comprador: ${contract.parties.buyer.name}`, 10);
      addText(`Seller / Vendedor: ${contract.parties.seller.name}`, 10);
      yPosition += 3;

      // Property section
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      addText('PROPERTY / INMUEBLE', 12, true);
      addText(`Address: ${contract.property.address}`, 10);
      if (contract.property.area_m2) {
        addText(`Area: ${contract.property.area_m2} m²`, 10);
      }
      addText(`Description: ${contract.property.description}`, 10);
      yPosition += 3;

      // Terms section
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      addText('TERMS / TÉRMINOS', 12, true);
      addText(`Agreed Price: ${formatCurrency(contract.terms.agreedPrice)} ${contract.terms.currency}`, 11, true);
      addText(`Payment Terms: ${contract.terms.paymentTerms}`, 10);
      yPosition += 3;

      // Conditions
      addText('Conditions:', 10, true);
      contract.terms.conditions.forEach((condition) => {
        addText(`• ${condition}`, 9);
      });
      yPosition += 5;

      // Main contract content
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      addText('CONTRACT CONTENT / CONTENIDO DEL CONTRATO', 12, true);
      yPosition += 3;

      // Split contract content by lines and add
      const contentLines = contract.content.split('\n');
      contentLines.forEach((line) => {
        if (line.trim()) {
          addText(line, 9);
        } else {
          yPosition += 2;
        }
      });

      // Disclaimer at the end
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }
      yPosition += 10;

      doc.setFillColor(255, 243, 205); // Light yellow
      doc.rect(margin - 5, yPosition - 5, maxWidth + 10, 50, 'F');
      addText('LEGAL DISCLAIMER / AVISO LEGAL', 10, true);
      addText(contract.disclaimer.substring(0, 500) + '...', 8);

      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128);
        doc.text(
          `Page ${i} of ${pageCount} | Generated by PriceMap | Draft - Not legally binding`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.setTextColor(0);
      }

      // Save PDF
      doc.save(`contract-draft-${contract.offerId.slice(0, 8)}.pdf`);
      toast.success('Contract downloaded as PDF');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Downloading as TXT instead.');
      handleDownloadTxt();
    }
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
              <Button variant="outline" size="sm" onClick={handleDownloadTxt}>
                <Download className="w-4 h-4 mr-1" />
                TXT
              </Button>
              <Button variant="default" size="sm" onClick={handleDownloadPdf}>
                <FileDown className="w-4 h-4 mr-1" />
                PDF
              </Button>
            </div>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
