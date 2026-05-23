const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const net = require('net');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const LOCAL_DB_PATH = path.join(__dirname, 'projects_db.json');
const DEFAULT_TEMPLATE_PATH = path.join(__dirname, 'default-project-template.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ----------------------------------------------------
// DATABASE & MODELS SETTINGS
// ----------------------------------------------------
let isLocalDB = true; // Safe default until Mongo connects; API can serve JSON immediately
let MongoProject = null;

function getDefaultProjectTemplate() {
  return JSON.parse(fs.readFileSync(DEFAULT_TEMPLATE_PATH, 'utf8'));
}

// Local JSON File Helper
const localDB = {
  read() {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify([], null, 2));
      return [];
    }
    try {
      const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error('Error reading local JSON database, returning empty array', err);
      return [];
    }
  },
  write(data) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
  }
};

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Get Status (indicates database mode to frontend)
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    dbMode: isLocalDB ? 'Local JSON File DB' : 'MongoDB (Production)',
    env: process.env.NODE_ENV || 'development'
  });
});

function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 Server up and running on port http://localhost:${PORT}`);
  });
}

// Accept API traffic before Mongo/template work finishes loading
startServer();

// 2. Get All Projects
app.get('/api/projects', async (req, res) => {
  try {
    if (!isLocalDB) {
      const projects = await MongoProject.find().select('name updatedAt createdAt').sort({ updatedAt: -1 });
      return res.json(projects);
    } else {
      const data = localDB.read();
      // map only metadata to optimize
      const projects = data.map(p => ({
        _id: p._id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })).reverse();
      return res.json(projects);
    }
  } catch (err) {
    console.error('Error getting projects', err);
    res.status(500).json({ error: 'Server failed to retrieve projects' });
  }
});

// 3. Get Single Project Details
app.get('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (!isLocalDB) {
      const project = await MongoProject.findById(id);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      return res.json(project);
    } else {
      const data = localDB.read();
      const project = data.find(p => p._id === id);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      return res.json(project);
    }
  } catch (err) {
    console.error('Error fetching project details', err);
    res.status(500).json({ error: 'Server failed to retrieve project details' });
  }
});

// 4. Create Project
app.post('/api/projects', async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const template = getDefaultProjectTemplate();
  const defaultProjectPayload = {
    name: name.trim(),
    files: template.files,
    dependencies: template.dependencies,
    activeFile: '/src/App.jsx',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    if (!isLocalDB) {
      const newProject = new MongoProject(defaultProjectPayload);
      const saved = await newProject.save();
      return res.status(201).json(saved);
    } else {
      const data = localDB.read();
      const newProject = {
        _id: Math.random().toString(36).substr(2, 9),
        ...defaultProjectPayload
      };
      data.push(newProject);
      localDB.write(data);
      return res.status(201).json(newProject);
    }
  } catch (err) {
    console.error('Error creating project', err);
    res.status(500).json({ error: 'Server failed to create project' });
  }
});

// 5. Update Project (autosave/manual save)
app.put('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const { files, dependencies, activeFile } = req.body;

  try {
    const updates = {
      updatedAt: new Date()
    };
    if (files) updates.files = files;
    if (dependencies) updates.dependencies = dependencies;
    if (activeFile) updates.activeFile = activeFile;

    if (!isLocalDB) {
      const updatedProject = await MongoProject.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, strict: false }
      );
      if (!updatedProject) return res.status(404).json({ error: 'Project not found' });
      return res.json(updatedProject);
    } else {
      const data = localDB.read();
      const index = data.findIndex(p => p._id === id);
      if (index === -1) return res.status(404).json({ error: 'Project not found' });

      data[index] = {
        ...data[index],
        ...updates,
        files: files ? files : data[index].files,
        dependencies: dependencies ? dependencies : data[index].dependencies,
        updatedAt: new Date()
      };
      localDB.write(data);
      return res.json(data[index]);
    }
  } catch (err) {
    console.error('Error updating project', err);
    res.status(500).json({ error: 'Server failed to update project' });
  }
});

// 6. Delete Project
app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (!isLocalDB) {
      const deleted = await MongoProject.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ error: 'Project not found' });
      return res.json({ message: 'Project successfully deleted' });
    } else {
      const data = localDB.read();
      const filtered = data.filter(p => p._id !== id);
      if (data.length === filtered.length) {
        return res.status(404).json({ error: 'Project not found' });
      }
      localDB.write(filtered);
      return res.json({ message: 'Project successfully deleted' });
    }
  } catch (err) {
    console.error('Error deleting project', err);
    res.status(500).json({ error: 'Server failed to delete project' });
  }
});

// ----------------------------------------------------
// DATABASE CONNECTION (deferred — mongoose loads after listen)
// ----------------------------------------------------
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/banao_sandbox';

function checkMongoPort(host, port, timeout = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function bootstrap() {
  console.log('Connecting to database...');
  let checkPort = true;
  let host = '127.0.0.1';
  let port = 27017;

  if (MONGO_URI.startsWith('mongodb+srv://') || MONGO_URI.includes('mongodb.net')) {
    checkPort = false; // Atlas/remote URI, connect directly without local TCP check
  } else {
    try {
      const cleanUri = MONGO_URI.replace('mongodb://', 'http://');
      const urlObj = new URL(cleanUri);
      host = urlObj.hostname || '127.0.0.1';
      port = parseInt(urlObj.port) || 27017;
    } catch (e) {
      checkPort = false;
    }
  }

  let isMongoAlive = false;
  if (checkPort) {
    isMongoAlive = await checkMongoPort(host, port, 400);
  } else {
    isMongoAlive = true; // Remote connection, bypass local check
  }

  if (isMongoAlive) {
    console.log('✅ MongoDB target detected. Initializing connection...');
    try {
      const mongoose = require('mongoose');
      mongoose.set('bufferCommands', false);

      const projectSchema = new mongoose.Schema({
        name: { type: String, required: true },
        files: { type: mongoose.Schema.Types.Mixed, default: {} },
        dependencies: { type: mongoose.Schema.Types.Mixed, default: {} },
        activeFile: { type: String, default: '/src/App.jsx' },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      });

      MongoProject = mongoose.models.Project || mongoose.model('Project', projectSchema);

      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 2000
      });
      console.log('✅ Successfully connected to MongoDB!');
      isLocalDB = false;
    } catch (err) {
      console.warn('⚠️ MongoDB connection failed. Falling back to offline DB.');
      isLocalDB = true;
    }
  } else {
    console.warn('\n⚠️ MongoDB port is closed. Failsafe activated instantly!');
    console.warn('Backend is now running in offline mode using projects_db.json.\n');
    isLocalDB = true;
  }
}

bootstrap();
