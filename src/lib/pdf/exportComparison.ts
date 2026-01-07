import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Property } from '@/types/database';
import { formatPrice } from '@/lib/utils';

const propertyTypeLabels: Record<Property['property_type'], string> = {
  apartment: 'Apartment',
  house: 'House',
  land: 'Land',
  commercial: 'Commercial',
  office: 'Office',
};

export async function exportComparisonToPDF(properties: Property[]): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Header
  doc.setFillColor(6, 182, 212); // cyan-600
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PriceWaze - Comparación de Propiedades', margin, 30);

  yPosition = 60;

  // Property Cards
  const cardWidth = (contentWidth - 10) / Math.min(properties.length, 3);
  const cardHeight = 80;

  properties.forEach((property, index) => {
    if (index > 0 && index % 3 === 0) {
      doc.addPage();
      yPosition = margin;
    }

    const xPosition = margin + (index % 3) * (cardWidth + 5);

    // Card background
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(xPosition, yPosition, cardWidth, cardHeight, 3, 3, 'FD');

    // Property title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(property.title.substring(0, 30), xPosition + 5, yPosition + 10);

    // Price
    doc.setFontSize(16);
    doc.setTextColor(6, 182, 212);
    doc.text(formatPrice(property.price), xPosition + 5, yPosition + 25);

    // Details
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Tipo: ${propertyTypeLabels[property.property_type]}`, xPosition + 5, yPosition + 35);
    doc.text(`Área: ${property.area_m2} m²`, xPosition + 5, yPosition + 42);
    if (property.bedrooms) {
      doc.text(`Habitaciones: ${property.bedrooms}`, xPosition + 5, yPosition + 49);
    }
    if (property.bathrooms) {
      doc.text(`Baños: ${property.bathrooms}`, xPosition + 5, yPosition + 56);
    }
    doc.text(`Precio/m²: $${property.price_per_m2.toLocaleString()}`, xPosition + 5, yPosition + 63);
  });

  yPosition += cardHeight + 20;

  // Comparison Table
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = margin;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Tabla Comparativa', margin, yPosition);
  yPosition += 15;

  const tableHeaders = ['Característica', ...properties.map((p) => p.title.substring(0, 20))];
  const tableRows = [
    ['Precio', ...properties.map((p) => formatPrice(p.price))],
    ['Precio/m²', ...properties.map((p) => `$${p.price_per_m2.toLocaleString()}`)],
    ['Tipo', ...properties.map((p) => propertyTypeLabels[p.property_type])],
    ['Área', ...properties.map((p) => `${p.area_m2} m²`)],
    ['Habitaciones', ...properties.map((p) => p.bedrooms?.toString() || 'N/A')],
    ['Baños', ...properties.map((p) => p.bathrooms?.toString() || 'N/A')],
    ['Estacionamientos', ...properties.map((p) => p.parking_spaces?.toString() || 'N/A')],
    ['Zona', ...properties.map((p) => p.zone?.name || 'N/A')],
  ];

  const colWidths = [60, ...properties.map(() => (contentWidth - 60) / properties.length)];
  const rowHeight = 8;

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  let xPos = margin;
  tableHeaders.forEach((header, i) => {
    doc.text(header.substring(0, 15), xPos + 2, yPosition + 6);
    xPos += colWidths[i];
  });
  yPosition += rowHeight;

  // Table rows
  doc.setFont('helvetica', 'normal');
  tableRows.forEach((row, rowIndex) => {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = margin;
    }

    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
    }

    xPos = margin;
    row.forEach((cell, i) => {
      doc.text(cell.substring(0, 15), xPos + 2, yPosition + 6);
      xPos += colWidths[i];
    });
    yPosition += rowHeight;
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${totalPages} - Generado por PriceWaze`,
      margin,
      pageHeight - 10
    );
  }

  // Save PDF
  doc.save(`comparison-${new Date().toISOString().split('T')[0]}.pdf`);
}


