import React, { useState, useEffect } from 'react';
import Editor from './components/Editor';
import MapView from './components/MapView';
import { Map, Code2, AlertCircle, Info, ChevronLeft, ChevronRight, PenTool, Trash2, CheckCircle, XCircle, Copy, Save, FileText, Plus, Clock } from 'lucide-react';

const INITIAL_GEOJSON = {
  "type": "FeatureCollection",
  "features": []
};

function App() {
  const [jsonString, setJsonString] = useState(JSON.stringify(INITIAL_GEOJSON, null, 2));
  const [geoData, setGeoData] = useState(INITIAL_GEOJSON);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);

  // Projects state
  const [savedProjects, setSavedProjects] = useState([]);
  const [copyStatus, setCopyStatus] = useState('Copy');

  // Load projects from LocalStorage on mount
  useEffect(() => {
    const localData = localStorage.getItem('geojson_projects');
    if (localData) {
      setSavedProjects(JSON.parse(localData));
    }
  }, []);

  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonString);
      setGeoData(parsed);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [jsonString]);

  const handleDataUpdate = (newData) => {
    setGeoData(newData);
    setJsonString(JSON.stringify(newData, null, 2));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy'), 2000);
    });
  };

  const saveToLocal = () => {
    const name = window.prompt("Masukkan nama untuk area ini:", `Proyek ${savedProjects.length + 1}`);
    if (!name) return;

    const newProject = {
      id: Date.now(),
      name,
      data: geoData,
      timestamp: new Date().toLocaleString()
    };

    const updatedProjects = [newProject, ...savedProjects];
    setSavedProjects(updatedProjects);
    localStorage.setItem('geojson_projects', JSON.stringify(updatedProjects));
  };

  const loadProject = (project) => {
    handleDataUpdate(project.data);
  };

  const deleteProject = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Hapus proyek ini dari memori browser?")) {
      const updatedProjects = savedProjects.filter(p => p.id !== id);
      setSavedProjects(updatedProjects);
      localStorage.setItem('geojson_projects', JSON.stringify(updatedProjects));
    }
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawPoints([]);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawPoints([]);
  };

  const handleAddPoint = (latlng) => {
    if (!isDrawing) return;
    setDrawPoints([...drawPoints, [latlng.lng, latlng.lat]]);
  };

  const undoDrawPoint = () => {
    if (drawPoints.length === 0) return;
    setDrawPoints(drawPoints.slice(0, -1));
  };

  // Shortcut for Undo (Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isDrawing && (e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoDrawPoint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, drawPoints]);

  const completeDrawing = () => {
    if (drawPoints.length < 3) return;
    const coordinates = [[...drawPoints, drawPoints[0]]];
    const newFeature = {
      "type": "Feature",
      "properties": { "name": `Wilayah Baru ${geoData.features.length + 1}` },
      "geometry": { "type": "Polygon", "coordinates": coordinates }
    };
    const newData = { ...geoData, features: [...geoData.features, newFeature] };
    handleDataUpdate(newData);
    setIsDrawing(false);
    setDrawPoints([]);
  };

  const clearAll = () => {
    if (window.confirm("Hapus semua data di editor?")) {
      handleDataUpdate(INITIAL_GEOJSON);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="glass-header">
        <div className="logo-container">
          <div className="icon-box">
            <Map size={24} />
          </div>
          <h1 className="gradient-text">Mapper Geo JSON by LABIB</h1>
        </div>
        
        <div className="header-actions">
          {!isDrawing ? (
            <>
              <button onClick={startDrawing} className="btn-primary"><PenTool size={18} /> Gambar</button>
              <button onClick={saveToLocal} className="btn-success"><Save size={18} /> Simpan</button>
              <button onClick={copyToClipboard} className="btn-ghost">
                {copyStatus === 'Copied!' ? <CheckCircle size={18} color="#22c55e" /> : <Copy size={18} />}
                {copyStatus}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={completeDrawing} disabled={drawPoints.length < 3} className="btn-success"><CheckCircle size={18} /> Selesai</button>
              <button 
                onClick={undoDrawPoint} 
                disabled={drawPoints.length === 0} 
                className="btn-ghost"
                style={{ border: '1px solid #f59e0b', color: '#f59e0b' }}
              >
                Undo
              </button>
              <button onClick={cancelDrawing} className="btn-ghost"><XCircle size={18} /> Batal</button>
            </div>
          )}
          <button onClick={clearAll} className="btn-danger"><Trash2 size={16} /> Reset</button>
        </div>
      </header>

      <main className="main-content">
        {/* Editor & Projects Sidebar */}
        <div className="sidebar" style={{ width: isSidebarOpen ? '450px' : '0' }}>
          {/* Projects Section */}
          <div className="projects-section">
            <div className="section-header">
              <FileText size={18} color="#818cf8" />
              <span>Daftar Proyek Lokal</span>
            </div>
            <div className="projects-list">
              {savedProjects.length === 0 ? (
                <div className="empty-state">Belum ada proyek tersimpan</div>
              ) : (
                savedProjects.map(project => (
                  <div key={project.id} className="project-item" onClick={() => loadProject(project)}>
                    <div className="project-info">
                      <span className="project-name">{project.name}</span>
                      <div className="project-meta"><Clock size={10} /> {project.timestamp}</div>
                    </div>
                    <button className="delete-btn" onClick={(e) => deleteProject(project.id, e)}><Trash2 size={14} /></button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="sidebar-header">
            <Code2 size={20} color="#818cf8" />
            <span>JSON Editor</span>
          </div>
          
          <div className="editor-wrapper">
            <Editor value={jsonString} onChange={setJsonString} />
          </div>

          {error && (
            <div className="error-toast">
              <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.75rem' }}>
                <p style={{ color: '#f87171', fontWeight: 'bold' }}>Invalid JSON Format</p>
                <p style={{ color: 'rgba(248, 113, 113, 0.7)', fontFamily: 'monospace' }}>{error}</p>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sidebar-toggle" style={{ left: isSidebarOpen ? '450px' : '0' }}>
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="map-view-wrapper">
          <MapView 
            data={geoData} onUpdateData={handleDataUpdate}
            isDrawing={isDrawing} drawPoints={drawPoints} onAddPoint={handleAddPoint}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
