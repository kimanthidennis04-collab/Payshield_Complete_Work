const { stringify } = require('csv-stringify/sync');

// Security: Prevent CSV formula injection by escaping leading control characters (=, +, -, @, \t, \r)
const sanitizeCSVField = (val) => {
  if (typeof val !== 'string') return val;
  if (/^[=\+\-@\t\r]/.test(val)) {
    return `'${val}`;
  }
  return val;
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeCSVField(value);
  }
  return sanitized;
};

const generateCSV = (data, headers) => {
  const sanitizedData = data.map(row => sanitizeObject(row));
  return stringify(sanitizedData, {
    header: true,
    columns: headers,
  });
};

const exportExpensesToCSV = (expenses) => {
  const headers = [
    { key: 'id', header: 'ID' },
    { key: 'category', header: 'Category' },
    { key: 'description', header: 'Description' },
    { key: 'amount', header: 'Amount' },
    { key: 'currency', header: 'Currency' },
    { key: 'date', header: 'Date' },
    { key: 'createdAt', header: 'Created At' },
  ];

  const formattedData = expenses.map(exp => ({
    id: exp.id,
    category: exp.category,
    description: exp.description,
    amount: exp.amount,
    currency: exp.currency,
    date: exp.date.toISOString().split('T')[0],
    createdAt: exp.createdAt.toISOString().split('T')[0],
  }));

  return generateCSV(formattedData, headers);
};

const exportInvoicesToCSV = (invoices) => {
  const headers = [
    { key: 'invoiceNumber', header: 'Invoice Number' },
    { key: 'clientName', header: 'Client Name' },
    { key: 'status', header: 'Status' },
    { key: 'subtotal', header: 'Subtotal' },
    { key: 'tax', header: 'Tax' },
    { key: 'total', header: 'Total' },
    { key: 'amountPaid', header: 'Amount Paid' },
    { key: 'balance', header: 'Balance' },
    { key: 'currency', header: 'Currency' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'createdAt', header: 'Created At' },
  ];

  const formattedData = invoices.map(inv => ({
    invoiceNumber: inv.invoiceNumber,
    clientName: inv.client ? inv.client.name : 'N/A',
    status: inv.status,
    subtotal: inv.subtotal,
    tax: inv.tax,
    total: inv.total,
    amountPaid: inv.amountPaid,
    balance: inv.balance,
    currency: inv.currency,
    dueDate: inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : 'N/A',
    createdAt: inv.createdAt.toISOString().split('T')[0],
  }));

  return generateCSV(formattedData, headers);
};

const exportPaymentsToCSV = (payments) => {
  const headers = [
    { key: 'id', header: 'ID' },
    { key: 'invoiceNumber', header: 'Invoice Number' },
    { key: 'amount', header: 'Amount' },
    { key: 'currency', header: 'Currency' },
    { key: 'method', header: 'Method' },
    { key: 'provider', header: 'Provider' },
    { key: 'reference', header: 'Reference' },
    { key: 'status', header: 'Status' },
    { key: 'paidAt', header: 'Paid At' },
    { key: 'createdAt', header: 'Created At' },
  ];

  const formattedData = payments.map(pay => ({
    id: pay.id,
    invoiceNumber: pay.invoice ? pay.invoice.invoiceNumber : 'N/A',
    amount: pay.amount,
    currency: pay.currency,
    method: pay.method,
    provider: pay.provider,
    reference: pay.reference || 'N/A',
    status: pay.status,
    paidAt: pay.paidAt ? pay.paidAt.toISOString().split('T')[0] : 'N/A',
    createdAt: pay.createdAt.toISOString().split('T')[0],
  }));

  return generateCSV(formattedData, headers);
};

module.exports = {
  generateCSV,
  exportExpensesToCSV,
  exportInvoicesToCSV,
  exportPaymentsToCSV,
};
