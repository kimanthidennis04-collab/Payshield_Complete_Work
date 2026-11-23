const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
} = require('../services/clientService');

const create = async (req, res) => {
  try {
    const client = await createClient(req.user.organizationId, req.body);
    res.status(201).json({ success: true, client });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: error.message || 'Failed to create client' });
  }
};

const list = async (req, res) => {
  try {
    const clients = await getClients(req.user.organizationId, req.query);
    res.json({ success: true, clients });
  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

const getById = async (req, res) => {
  try {
    const client = await getClientById(req.user.organizationId, req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ success: true, client });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
};

const update = async (req, res) => {
  try {
    const client = await updateClient(req.user.organizationId, req.params.id, req.body);
    res.json({ success: true, client });
  } catch (error) {
    console.error('Update client error:', error);
    if (error.message === 'Client not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update client' });
  }
};

const remove = async (req, res) => {
  try {
    await deleteClient(req.user.organizationId, req.params.id);
    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    if (error.message === 'Client not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete client' });
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
};
