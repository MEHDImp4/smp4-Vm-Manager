import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    name: 'test-vm-1',
    memory: 2048,
    cores: 2,
    storage: 'local-lvm',
    templateId: ''
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    // Default backend URL
    const API_URL = 'http://localhost:3000/api/vms';

    try {
      const response = await axios.post(API_URL, {
        ...formData,
        memory: Number(formData.memory),
        cores: Number(formData.cores),
        templateId: Number(formData.templateId) // Convert to number if needed
      });
      setStatus({ type: 'success', message: `Success! VM Created. Info: ${JSON.stringify(response.data)}` });
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || error.message;
      setStatus({ type: 'error', message: `Error: ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>VM Manager</h1>
        <p className="subtitle">Proxmox Auto-Provisioning</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Container Hostname</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="my-app-container"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="templateId">Select Plan</label>
            <select
              id="templateId"
              name="templateId"
              value={formData.templateId}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Choose a plan...</option>
              <option value="101">Starter (512MB RAM, 1 CPU) - ID 101</option>
              <option value="102">Basic (1GB RAM, 2 CPU) - ID 102</option>
              <option value="103">Pro (2GB RAM, 2 CPU) - ID 103</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="storage">Storage Target</label>
            <input
              type="text"
              id="storage"
              name="storage"
              value={formData.storage}
              onChange={handleChange}
              placeholder="local-lvm"
              disabled
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Container...' : 'Create LXC Container'}
          </button>
        </form>

        {status && (
          <div className={`message ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
