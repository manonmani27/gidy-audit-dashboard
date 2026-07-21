require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.log(err));

const logSchema = new mongoose.Schema({
  actor: { type: String, index: true },
  role: { type: String, index: true },
  action: { type: String, index: true },
  resource: String,
  resourceType: { type: String, index: true },
  ipAddress: String,
  region: { type: String, index: true },
  severity: { type: String, index: true },
  status: { type: String, index: true, default: 'Unresolved' },
  timestamp: { type: Date, index: true },
}, { timestamps: true });

const Log = mongoose.model('Log', logSchema);

app.post('/api/logs/bulk', async (req, res) => {
    try {
        const logs = req.body; // or wherever your data comes from
        await Log.deleteMany({});
        const result = await Log.insertMany(logs, { ordered: false });
        res.json({ inserted: result.length });
    } catch (err) {
        ...
    }
});

app.get('/api/logs', async (req, res) => {
  try {
    const { page=1, limit=20, sortBy='timestamp', sortOrder='desc', search, severity, status, region, role } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { actor: { $regex: search, $options: 'i' }},
      { action: { $regex: search, $options: 'i' }},
      { resource: { $regex: search, $options: 'i' }},
      { ipAddress: { $regex: search, $options: 'i' }},
    ];
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (region) filter.region = region;
    if (role) filter.role = role;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page)-1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      Log.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      Log.countDocuments(filter)
    ]);
    res.json({ logs, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total/parseInt(limit)) }});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs/stats', async (req, res) => {
  try {
    const [total, bySeverity, byStatus] = await Promise.all([
      Log.countDocuments(),
      Log.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 }}}]),
      Log.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }}}]),
    ]);
    res.json({ total, bySeverity, byStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/logs/:id', async (req, res) => {
  try {
    const log = await Log.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!log) return res.status(404).json({ error: 'Not found' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));