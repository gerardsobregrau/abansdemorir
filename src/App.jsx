import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus, Trash2, CheckCircle2, Circle,
  ChevronDown, ChevronUp, ImagePlus, X,
  MountainSnow, ListTodo, MessageSquare, Cloud, CloudOff, Loader2, Info
} from 'lucide-react';

import cimsFeec from './cims_essencials_feec.json';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('syncing'); // 'syncing', 'synced', 'error'

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  // Age calculation
  const birthDate = new Date('2001-01-09');
  const [ageInfo, setAgeInfo] = useState({ years: 25, percentageTo80: 0 });

  useEffect(() => {
    const calculateAge = () => {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      const percentTo80 = Math.min(100, ((age / 80) * 100).toFixed(1));
      setAgeInfo({ years: age, percentageTo80: percentTo80 });
    };
    calculateAge();

    // Fetch initial data from backend API
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
          const data = await response.json();
          // The API returns the default challenge populated from the JSON if empty
          if (data && Array.isArray(data)) {
            setTasks(data);
          } else {
            // Fallback just in case db is corrupt
            loadLocalDefault(true);
          }
          setSyncStatus('synced');
        } else {
          console.warn("API Error, falling back to local file.");
          loadLocalDefault(true);
          setSyncStatus('error');
        }
      } catch (err) {
        // Fallback for local Vite dev (if not utilizing Vercel CLI /vercel dev)
        console.log("No backend connection (probably testing locally on Vite without 'vercel dev'). Falling back to memory state.");
        loadLocalDefault(true);
        setSyncStatus('error');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const loadLocalDefault = (useBackup = false) => {
    if (useBackup) {
      // Intentem recuperar qualsevol estat local possible guardat al passat.
      const keysToCheck = ['abansdemorir-backup', 'abansdemorir-tasks', 'antesdemorir-tasks'];
      for (const key of keysToCheck) {
        const backup = localStorage.getItem(key);
        if (backup) {
          try {
            const parsed = JSON.parse(backup);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTasks(parsed);
              // Ho re-sincronitzem ja que pot ser vell (cal apujar al núvol per tenir-ho actiu si fa falta)
              return;
            }
          } catch (e) { }
        }
      }
    }

    // Default en cas que no hi hagi absoultament res...
    setTasks([
      {
        id: "repte-100-cims",
        title: "Fer els 100 Cims Essencials de la FEEC amb la Pesseta",
        isDone: false,
        subtasks: cimsFeec,
        comments: "",
        images: [],
        tags: ["🏔️ Muntanyisme", "🏔️ Catalunya"]
      }
    ]);
  };

  // Safe-guard REACTIVAT: Sempre tenir una còpia fresca de l'estat actual al LocalStorage
  // (Així si estàs en local provant i hi ha un reload de Vite, mai perdràs la feina no guardada a l'API)
  useEffect(() => {
    if (!loading && tasks.length > 0) {
      localStorage.setItem('abansdemorir-backup', JSON.stringify(tasks));
    }
  }, [tasks, loading]);

  // Synchronize Tasks to API
  const syncToApi = async (updatedTasks) => {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTasks)
      });
      if (res.ok) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask = {
      id: uuidv4(),
      title: newTaskTitle.trim(),
      isDone: false,
      subtasks: [],
      comments: "",
      images: [],
      tags: []
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    setNewTaskTitle('');
    syncToApi(updated);
  };

  const updateTask = (id, updates) => {
    const updated = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    setTasks(updated);
    syncToApi(updated);
  };

  const deleteTask = (id) => {
    if (window.confirm('Estàs segur que vols eliminar aquest repte de la teva llista?')) {
      const updated = tasks.filter(t => t.id !== id);
      setTasks(updated);
      syncToApi(updated);
    }
  };

  // Calculate Global Progress
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.isDone).length;
  const globalProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Filter tasks based on Search
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTitle = task.title.toLowerCase().includes(q);
    const matchTags = task.tags?.some(tag => tag.toLowerCase().includes(q));
    const matchSubtasks = task.subtasks?.some(sub => sub.title.toLowerCase().includes(q));
    return matchTitle || matchTags || matchSubtasks;
  });

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <Loader2 size={32} className="spinning" style={{ marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
        <p className="subtitle">Connectant amb el servidor...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Abans de Morir</h1>
          <div title={syncStatus === 'synced' ? 'Desat directament al núvol' : (syncStatus === 'syncing' ? 'Sincronitzant...' : 'S\'està desant localment, Sense connexió')} style={{ color: 'var(--text-muted)' }}>
            {syncStatus === 'synced' && <Cloud size={20} strokeWidth={1} />}
            {syncStatus === 'syncing' && <Loader2 size={20} className="spinning" style={{ animation: 'spin 1s linear infinite' }} />}
            {syncStatus === 'error' && <CloudOff size={20} strokeWidth={1} />}
          </div>
        </div>

        <p className="subtitle">Llista de reptes · {ageInfo.years} anys ({ageInfo.percentageTo80}% del camí fins als 80)</p>

        {tasks.length > 0 && (
          <div className="global-progress">
            <div className="global-progress-bar">
              <div className="global-progress-fill" style={{ width: `${globalProgress}%` }}></div>
            </div>
            <div className="global-stats">
              {doneTasks} de {totalTasks} reptes completats ({globalProgress}%)
            </div>
          </div>
        )}

      </header>

      <form onSubmit={addTask} className="add-task-form">
        <input
          type="text"
          className="main-input"
          placeholder="Què vols fer abans de morir?"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
        />
        <button type="submit" className="primary">
          Afegir
        </button>
      </form>

      {tasks.length > 0 && (
        <div className="search-bar-container">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Cercar reptes, sub-tasques o tags (#)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="task-list">
        {filteredTasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            updateTask={updateTask}
            deleteTask={deleteTask}
            onPreview={setPreviewImage}
          />
        ))}

        {filteredTasks.length === 0 && tasks.length > 0 && (
          <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem' }}>
            <p style={{ fontWeight: 300 }}>Cap repte coincideix amb la teva cerca.</p>
          </div>
        )}

        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', opacity: 0.3, marginTop: '4rem' }}>
            <MountainSnow size={48} style={{ margin: '0 auto', marginBottom: '1rem', strokeWidth: 1 }} />
            <p style={{ fontWeight: 300 }}>La teva llista està buida.<br />Afegeix el teu primer gran repte.</p>
          </div>
        )}
      </div>

      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <button className="close-preview-btn"><X size={32} /></button>
          <img src={previewImage} alt="Preview" className="image-preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, updateTask, deleteTask, onPreview }) {
  const [expanded, setExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);

  // Per imatges a cada subtasca
  const [activeSubtaskForImage, setActiveSubtaskForImage] = useState(null);
  const [isUploadingSubtask, setIsUploadingSubtask] = useState(false);

  // Per tags
  const [newTag, setNewTag] = useState('');

  // Calculate Progress
  const totalSubtasks = task.subtasks.length;
  const doneSubtasks = task.subtasks.filter(s => s.isDone).length;

  const hasSubtasks = totalSubtasks > 0;

  let progress = 0;
  if (hasSubtasks) {
    progress = Math.round((doneSubtasks / totalSubtasks) * 100);
  } else {
    progress = task.isDone ? 100 : 0;
  }

  // Auto-complete parent task if all subtasks are complete and there are subtasks
  useEffect(() => {
    if (hasSubtasks) {
      const allDone = doneSubtasks === totalSubtasks;
      if (allDone !== task.isDone) {
        updateTask(task.id, { isDone: allDone });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneSubtasks, totalSubtasks, hasSubtasks, task.isDone, task.id]);


  const toggleMainDone = (e) => {
    e.stopPropagation();
    // If it has subtasks, clicking this marks ALL subtasks as done or undone
    if (hasSubtasks) {
      if (!task.isDone && !window.confirm("Això marcarà totes les sub-tasques com a completades. N'estàs segur?")) {
        return;
      }
      const newDoneState = !task.isDone;
      const updatedSubtasks = task.subtasks.map(s => ({ ...s, isDone: newDoneState }));
      updateTask(task.id, { isDone: newDoneState, subtasks: updatedSubtasks });
    } else {
      updateTask(task.id, { isDone: !task.isDone });
    }

    // Automatically open accordion if marked as done to invite adding images/comments
    if (!task.isDone && !expanded) {
      setExpanded(true);
    }
  };

  const addSubtask = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!newSubtaskTitle.trim()) return;
      const newSubtask = { id: uuidv4(), title: newSubtaskTitle.trim(), isDone: false };
      updateTask(task.id, {
        subtasks: [...task.subtasks, newSubtask],
        isDone: false // adding a new subtask means parent is no longer 100% complete
      });
      setNewSubtaskTitle('');
    }
  };

  const toggleSubtask = (subId) => {
    const updatedSubtasks = task.subtasks.map(s =>
      s.id === subId ? { ...s, isDone: !s.isDone } : s
    );
    updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const removeSubtask = (subId, e) => {
    e.stopPropagation();
    if (window.confirm('N\'estàs segur que vols eliminar aquest pas/cim?')) {
      const updatedSubtasks = task.subtasks.filter(s => s.id !== subId);
      updateTask(task.id, { subtasks: updatedSubtasks });
    }
  };

  const uploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingGlobal(true);
    try {
      const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }
      const blob = await response.json();
      updateTask(task.id, { images: [...task.images, blob.url] });
    } catch (err) {
      alert(`Error penjant la imatge: ${err.message}`);
      console.error(err);
    } finally {
      setIsUploadingGlobal(false);
      // reset file input
      e.target.value = null;
    }
  };

  const removeImage = (imgUrl) => {
    if (window.confirm('Segur que vols eliminar aquesta foto del record?')) {
      updateTask(task.id, { images: task.images.filter(url => url !== imgUrl) });
    }
  };

  const uploadSubtaskImage = async (e, subId) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingSubtask(true);
    try {
      const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }
      const blob = await response.json();

      const updatedSubtasks = task.subtasks.map(s =>
        s.id === subId ? { ...s, image: blob.url } : s
      );
      updateTask(task.id, { subtasks: updatedSubtasks });
    } catch (err) {
      alert(`Error penjant la foto: ${err.message}`);
      console.error(err);
    } finally {
      setIsUploadingSubtask(false);
      setActiveSubtaskForImage(null);
      // reset file input
      e.target.value = null;
    }
  };

  const removeSubtaskImage = (subId) => {
    if (window.confirm('Segur que vols eliminar la foto d\'aquesta sub-tasca?')) {
      const updatedSubtasks = task.subtasks.map(s =>
        s.id === subId ? { ...s, image: undefined } : s
      );
      updateTask(task.id, { subtasks: updatedSubtasks });
    }
  };

  const addTag = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!newTag.trim()) return;
      const t = newTag.trim();
      const currentTags = task.tags || [];
      if (!currentTags.includes(t)) {
        updateTask(task.id, { tags: [...currentTags, t] });
      }
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove, e) => {
    e.stopPropagation();
    const currentTags = task.tags || [];
    updateTask(task.id, { tags: currentTags.filter(t => t !== tagToRemove) });
  };

  const completeCount = hasSubtasks ? `${doneSubtasks}/${totalSubtasks}` : (task.isDone ? '1/1' : '0/1');

  return (
    <div className={`task-item ${task.isDone ? 'is-done' : ''}`}>
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="task-header" onClick={() => setExpanded(!expanded)}>
        <div className="task-title-group">
          <button
            type="button"
            className={`icon-btn ${task.isDone ? 'done' : ''}`}
            onClick={toggleMainDone}
          >
            {task.isDone ? <CheckCircle2 size={24} strokeWidth={1.5} /> : <Circle size={24} strokeWidth={1.5} />}
          </button>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <textarea
              className="task-title-input"
              value={task.title}
              rows={1}
              onChange={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
                updateTask(task.id, { title: e.target.value });
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
            />
            <div className="task-tags-inline">
              {(task.tags || []).map(tag => (
                <span key={tag} className="tag-pill" onClick={(e) => removeTag(tag, e)} title="Eliminar tag">
                  {tag} <X size={10} style={{ marginLeft: '2px', display: 'inline-block' }} />
                </span>
              ))}
              {expanded && (
                <input
                  type="text"
                  className="tag-input"
                  placeholder="+ Afegir Tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={addTag}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </div>

          <span className="progress-pill">
            {hasSubtasks ? `${progress}% (${completeCount})` : (task.isDone ? 'COMPLETAT' : 'PENDENT')}
          </span>
        </div>

        <div className="task-actions">
          <button
            type="button"
            className="icon-btn delete"
            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
            title="Eliminar repte"
          >
            <Trash2 size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="task-content">
          <div className="section-title">
            <ListTodo size={14} strokeWidth={2} /> DESGLOSSAMENT ({completeCount})
          </div>
          <div className="subtasks-list">
            {task.subtasks.map(sub => (
              <div key={sub.id} className="subtask-container">
                <div className="subtask-item">
                  <input
                    type="checkbox"
                    className="subtask-checkbox"
                    checked={sub.isDone}
                    onChange={() => toggleSubtask(sub.id)}
                  />
                  <textarea
                    className={`subtask-name-input ${sub.isDone ? 'done' : ''}`}
                    value={sub.title}
                    rows={1}
                    onChange={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                      const updatedSubtasks = task.subtasks.map(s =>
                        s.id === sub.id ? { ...s, title: e.target.value } : s
                      );
                      updateTask(task.id, { subtasks: updatedSubtasks });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                  />

                  {!sub.image && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={(e) => { e.stopPropagation(); setActiveSubtaskForImage(activeSubtaskForImage === sub.id ? null : sub.id); }}
                      title="Afegir foto a aquest cim/pas"
                      style={{ padding: 0, marginRight: '0.5rem' }}
                    >
                      <ImagePlus size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="icon-btn delete"
                    onClick={(e) => removeSubtask(sub.id, e)}
                    style={{ padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {activeSubtaskForImage === sub.id && !sub.image && (
                  <div className="add-subtask-image-form">
                    <input
                      type="file"
                      accept="image/*"
                      className="sub-input"
                      onChange={(e) => uploadSubtaskImage(e, sub.id)}
                      disabled={isUploadingSubtask}
                      style={{ fontSize: '0.75rem', padding: '0.2rem' }}
                    />
                    {isUploadingSubtask && <Loader2 size={14} className="spinning" style={{ animation: 'spin 1s linear infinite' }} />}
                  </div>
                )}

                {sub.image && (
                  <div className="subtask-image-wrapper">
                    <img style={{ cursor: 'pointer' }} src={sub.image} alt={sub.title} onClick={(e) => { e.stopPropagation(); onPreview(sub.image); }} />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeSubtaskImage(sub.id)}
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="add-subtask">
              <input
                type="text"
                className="sub-input"
                placeholder="Afegir pas (intro per desar)..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={addSubtask}
              />
            </div>
          </div>

          <div className="done-details">
            <div className="section-title" style={{ marginTop: 0 }}>
              <MessageSquare size={14} strokeWidth={2} /> DIARI I RECORDS
            </div>
            <textarea
              className="comments-input"
              placeholder="Què vas sentir en aconseguir-ho? Escriu els teus records aquí..."
              value={task.comments}
              onChange={(e) => updateTask(task.id, { comments: e.target.value })}
            />

            <div className="section-title">
              <ImagePlus size={14} strokeWidth={2} /> ÀLBUM DE FOTOS
            </div>
            <div className="add-image-form" style={{ alignItems: 'center' }}>
              <input
                type="file"
                accept="image/*"
                className="sub-input"
                onChange={uploadImage}
                disabled={isUploadingGlobal}
              />
              {isUploadingGlobal && <Loader2 size={20} className="spinning" style={{ animation: 'spin 1s linear infinite', marginLeft: '0.5rem' }} />}
            </div>

            {task.images.length > 0 && (
              <div className="images-grid">
                {task.images.map((imgUrl, i) => (
                  <div key={i} className="image-card">
                    <img style={{ cursor: 'pointer' }} src={imgUrl} alt="Record" onClick={(e) => { e.stopPropagation(); onPreview(imgUrl); }} />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage(imgUrl)}
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
