const {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} = require('../services/serviceService');

const create = async (req, res) => {
  try {
    const service = await createService(req.user.organizationId, req.body);
    res.status(201).json({ success: true, service });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: error.message || 'Failed to create service' });
  }
};

const list = async (req, res) => {
  try {
    const services = await getServices(req.user.organizationId, req.query);
    res.json({ success: true, services });
  } catch (error) {
    console.error('List services error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};

const getById = async (req, res) => {
  try {
    const service = await getServiceById(req.user.organizationId, req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json({ success: true, service });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
};

const update = async (req, res) => {
  try {
    const service = await updateService(req.user.organizationId, req.params.id, req.body);
    res.json({ success: true, service });
  } catch (error) {
    console.error('Update service error:', error);
    if (error.message === 'Service not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update service' });
  }
};

const remove = async (req, res) => {
  try {
    await deleteService(req.user.organizationId, req.params.id);
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    if (error.message === 'Service not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to delete service' });
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
};
