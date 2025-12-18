import jsPDF from 'jspdf';

export const generateReceiptPDF = (receipt) => {
    if (!receipt) return;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // Thermal printer width
    });

    doc.setFontSize(12);
    doc.text('RENKREDIT', 40, 10, { align: 'center' });

    doc.setFontSize(8);
    doc.text('Recibo de Pago', 40, 15, { align: 'center' });
    doc.text(`Fecha: ${new Date(receipt.date).toLocaleString()}`, 40, 20, { align: 'center' });

    doc.line(5, 22, 75, 22);

    doc.text(`Cliente: ${receipt.clientName}`, 5, 27);
    doc.text(`Préstamo: #${receipt.loanId.slice(0, 8)}`, 5, 31);

    doc.setFontSize(10);
    doc.text(`Monto: $${receipt.amount}`, 5, 40);

    if (receipt.concept) {
        doc.setFontSize(8);
        doc.text(`Concepto: ${receipt.concept}`, 5, 45);
    }

    doc.text('--------------------------------', 40, 55, { align: 'center' });
    doc.text('Gracias por su pago', 40, 60, { align: 'center' });

    doc.save(`recibo_${receipt.id}.pdf`);
};
