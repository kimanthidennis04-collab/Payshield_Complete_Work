const {
  createDeliverable,
  getDeliverables,
  getDeliverable,
  checkAccess,
  unlockDeliverable,
  deleteDeliverable,
} = require('../services/deliverableService');

const create = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const data = req.body;

    const deliverable = await createDeliverable(organizationId, data);

    res.status(201).json({ success: true, deliverable });
  } catch (error) {
    console.error('Create deliverable error:', error);
    res.status(500).json({ error: error.message });
  }
};

const list = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { invoiceId } = req.query;

    const deliverables = await getDeliverables(organizationId, invoiceId);

    res.status(200).json({ success: true, deliverables });
  } catch (error) {
    console.error('Get deliverables error:', error);
    res.status(500).json({ error: error.message });
  }
};

const get = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const deliverable = await getDeliverable(organizationId, id);

    res.status(200).json({ success: true, deliverable });
  } catch (error) {
    console.error('Get deliverable error:', error);
    res.status(404).json({ error: error.message });
  }
};

const checkAccessControl = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const access = await checkAccess(organizationId, id);

    res.status(200).json({ success: true, access, allowed: access.allowed, reason: access.reason });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(404).json({ error: error.message });
  }
};

const unlock = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const { id } = req.params;

    const deliverable = await unlockDeliverable(organizationId, id, userId);

    res.status(200).json({ success: true, deliverable });
  } catch (error) {
    console.error('Unlock deliverable error:', error);
    res.status(400).json({ error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    await deleteDeliverable(organizationId, id);

    res.status(200).json({ success: true, message: 'Deliverable deleted' });
  } catch (error) {
    console.error('Delete deliverable error:', error);
    res.status(404).json({ error: error.message });
  }
};

module.exports = {
  create,
  list,
  get,
  checkAccessControl,
  unlock,
  remove,
};
