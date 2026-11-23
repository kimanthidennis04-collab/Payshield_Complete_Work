const {
  createReminder,
  getReminders,
  getReminder,
  sendReminder,
  deleteReminder,
} = require('../services/reminderService');

const create = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const data = req.body;

    const reminder = await createReminder(organizationId, data);

    res.status(201).json({ success: true, reminder });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({ error: error.message });
  }
};

const list = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const filters = req.query;

    const reminders = await getReminders(organizationId, filters);

    res.status(200).json({ success: true, reminders });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: error.message });
  }
};

const get = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const reminder = await getReminder(organizationId, id);

    res.status(200).json({ success: true, reminder });
  } catch (error) {
    console.error('Get reminder error:', error);
    res.status(404).json({ error: error.message });
  }
};

const send = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const reminder = await sendReminder(organizationId, id);

    res.status(200).json({ success: true, reminder });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(400).json({ error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    await deleteReminder(organizationId, id);

    res.status(200).json({ success: true, message: 'Reminder deleted' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(404).json({ error: error.message });
  }
};

module.exports = {
  create,
  list,
  get,
  send,
  remove,
};
