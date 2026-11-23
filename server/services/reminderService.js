const prisma = require('../config/database');
const whatsappService = require('./whatsappService');

const createReminder = async (organizationId, data) => {
  const { invoiceId, scheduledFor, method } = data;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      organizationId,
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status === 'PAID') {
    throw new Error('Cannot create reminder for paid invoice');
  }

  return await prisma.paymentReminder.create({
    data: {
      organizationId,
      invoiceId,
      scheduledFor: new Date(scheduledFor),
      method,
    },
  });
};

const getReminders = async (organizationId, filters = {}) => {
  const where = { organizationId };

  if (filters.invoiceId) {
    where.invoiceId = filters.invoiceId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const reminders = await prisma.paymentReminder.findMany({
    where,
    orderBy: { scheduledFor: 'asc' },
  });

  const remindersWithDetails = await Promise.all(
    reminders.map(async (reminder) => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: reminder.invoiceId },
        select: {
          invoiceNumber: true,
          status: true,
          total: true,
          balance: true,
          dueDate: true,
          client: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      return {
        ...reminder,
        invoice,
      };
    })
  );

  return remindersWithDetails;
};

const getReminder = async (organizationId, reminderId) => {
  const reminder = await prisma.paymentReminder.findFirst({
    where: {
      id: reminderId,
      organizationId,
    },
  });

  if (!reminder) {
    throw new Error('Reminder not found');
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: reminder.invoiceId },
    select: {
      invoiceNumber: true,
      status: true,
      total: true,
      balance: true,
      dueDate: true,
      client: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return {
    ...reminder,
    invoice,
  };
};

const sendReminder = async (organizationId, reminderId) => {
  const reminder = await getReminder(organizationId, reminderId);

  if (reminder.status === 'SENT') {
    throw new Error('Reminder already sent');
  }

  if (reminder.status === 'FAILED') {
    console.log('Retrying failed reminder');
  }

  const invoice = reminder.invoice;

  let errorMessage = null;
  let sentSuccessfully = false;

  try {
    if (reminder.method === 'EMAIL') {
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Email service not configured');
        }
        console.log(`[Dev Simulation] Sending email reminder for invoice ${invoice.invoiceNumber} to ${invoice.client?.email}`);
      } else {
        console.log(`Sending email reminder for invoice ${invoice.invoiceNumber} to ${invoice.client?.email}`);
      }
      sentSuccessfully = true;
    } else if (reminder.method === 'WHATSAPP') {
      const clientPhone = invoice.client?.phone;
      if (!clientPhone) {
        throw new Error('Client phone number missing for WhatsApp reminder');
      }

      const message = `Hello ${invoice.client?.name || 'Customer'},\nThis is a friendly payment reminder from PayShield regarding invoice *${invoice.invoiceNumber}* for *${invoice.total}* (Outstanding: *${invoice.balance}*). Due date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Immediate'}.\nThank you!`;

      const result = await whatsappService.sendTextMessage(organizationId, {
        to: clientPhone,
        message,
        invoiceId: invoice.id,
      });

      if (result.success) {
        sentSuccessfully = true;
      } else {
        errorMessage = result.message;
        // In dev or without credentials, record as FAILED with descriptive note
        sentSuccessfully = false;
      }
    } else {
      console.log(`Manual reminder created for invoice ${invoice.invoiceNumber}`);
      sentSuccessfully = true;
    }
  } catch (error) {
    errorMessage = error.message;
    console.error('Send reminder error:', error);
  }

  const updated = await prisma.paymentReminder.update({
    where: { id: reminderId },
    data: {
      status: sentSuccessfully ? 'SENT' : 'FAILED',
      sentAt: sentSuccessfully ? new Date() : null,
      errorMessage: errorMessage,
    },
  });

  if (sentSuccessfully) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        action: 'SEND_REMINDER',
        entity: 'PaymentReminder',
        entityId: reminderId,
        metadata: JSON.stringify({
          invoiceId: reminder.invoiceId,
          method: reminder.method,
          invoiceNumber: invoice.invoiceNumber,
        }),
      },
    });
  }

  return updated;
};

const deleteReminder = async (organizationId, reminderId) => {
  const reminder = await getReminder(organizationId, reminderId);

  await prisma.paymentReminder.delete({
    where: { id: reminderId },
  });

  return { message: 'Reminder deleted' };
};

module.exports = {
  createReminder,
  getReminders,
  getReminder,
  sendReminder,
  deleteReminder,
};
