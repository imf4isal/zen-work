import React, { useState, useEffect } from 'react';

const DeepWorkLogger = () => {
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(0);
  const [distractions, setDistractions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isDistracted, setIsDistracted] = useState(false);
  const [distractionReason, setDistractionReason] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [distractionStartTime, setDistractionStartTime] = useState(null);
  const [currentDistractionTime, setCurrentDistractionTime] = useState(0);

  useEffect(() => {
    const savedData = localStorage.getItem('deepWorkData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.sessions && Array.isArray(parsed.sessions)) {
          setSessions(parsed.sessions);
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      const dataToSave = {
        sessions,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('deepWorkData', JSON.stringify(dataToSave));
    }
  }, [sessions]);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setTime(time => time + 1);
      }, 1000);
    } else if (!isActive && time !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, time]);

  useEffect(() => {
    let interval = null;
    if (isDistracted && distractionStartTime) {
      interval = setInterval(() => {
        setCurrentDistractionTime(Math.floor((Date.now() - distractionStartTime) / 1000));
      }, 1000);
    } else {
      setCurrentDistractionTime(0);
    }
    return () => clearInterval(interval);
  }, [isDistracted, distractionStartTime]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = () => {
    setIsActive(true);
  };

  const pauseSession = () => {
    setIsActive(false);
  };

  const endSession = () => {
    if (time > 0) {
      const newSession = {
        id: Date.now(),
        duration: time,
        distractions: distractions,
        timestamp: new Date().toLocaleString()
      };
      setSessions([newSession, ...sessions]);
    }
    setIsActive(false);
    setTime(0);
    setDistractions([]);
    setIsDistracted(false);
    setDistractionReason('');
    setDistractionStartTime(null);
    setCurrentDistractionTime(0);
  };

  const logDistraction = () => {
    setIsActive(false);
    setIsDistracted(true);
    setDistractionStartTime(Date.now());
    setCurrentDistractionTime(0);
  };

  const resumeFromDistraction = () => {
    if (distractionReason.trim() && distractionStartTime) {
      const distractionDuration = Math.round((Date.now() - distractionStartTime) / 1000);
      const newDistraction = {
        id: Date.now(),
        reason: distractionReason.trim(),
        timestamp: new Date().toLocaleTimeString(),
        duration: distractionDuration
      };
      setDistractions([...distractions, newDistraction]);
      setDistractionReason('');
      setIsDistracted(false);
      setIsActive(true);
      setDistractionStartTime(null);
    }
  };

  const cancelDistraction = () => {
    setIsDistracted(false);
    setDistractionReason('');
    setIsActive(true);
    setDistractionStartTime(null);
    setCurrentDistractionTime(0);
  };

  const clearHistory = () => {
    setSessions([]);
    localStorage.removeItem('deepWorkData');
  };

  const groupSessionsByDate = (sessions) => {
    const groups = {};
    sessions.forEach(session => {
      const date = new Date(session.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
    });
    return groups;
  };

  const exportToCSV = () => {
    if (sessions.length === 0) return;

    const headers = ['Date', 'Duration (min)', 'Duration (formatted)', 'Distractions Count', 'Distraction Details'];
    const rows = sessions.map(session => {
      const date = new Date(session.timestamp).toLocaleDateString();
      const durationMin = Math.round(session.duration / 60 * 100) / 100;
      const durationFormatted = formatTime(session.duration);
      const distractionsCount = session.distractions.length;
      const distractionDetails = session.distractions.map(d => 
        `${d.reason} (${d.timestamp}${d.duration ? ` - ${formatTime(d.duration)}` : ''})`
      ).join('; ');
      
      return [date, durationMin, durationFormatted, distractionsCount, distractionDetails];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `deep-work-sessions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (sessions.length === 0) return;

    const dataToExport = {
      sessions,
      exportDate: new Date().toISOString(),
      totalSessions: sessions.length,
      totalTime: sessions.reduce((acc, s) => acc + s.duration, 0),
      totalDistractions: sessions.reduce((acc, s) => acc + s.distractions.length, 0)
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `deep-work-backup-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.sessions && Array.isArray(importedData.sessions)) {
          setSessions(importedData.sessions);
          setShowSettings(false);
        } else {
          alert('Invalid file format. Please select a valid backup file.');
        }
      } catch (error) {
        alert('Error reading file. Please check the file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md space-y-8">
        
        <div className="flex justify-between items-center">
          <div></div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs text-gray-400 hover:text-gray-600 uppercase tracking-wide"
          >
            {showSettings ? 'Close' : 'Settings'}
          </button>
        </div>
        
        {showSettings && (
          <div className="border border-gray-200 bg-white p-4 space-y-4">
            <h3 className="text-sm uppercase tracking-wide text-gray-600 mb-4">Data Management</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">Export Data</label>
                <div className="flex space-x-2">
                  <button
                    onClick={exportToCSV}
                    disabled={sessions.length === 0}
                    className="flex-1 px-3 py-2 bg-gray-800 text-white text-xs uppercase tracking-wide hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={exportToJSON}
                    disabled={sessions.length === 0}
                    className="flex-1 px-3 py-2 border border-gray-400 text-gray-600 text-xs uppercase tracking-wide hover:bg-gray-100 transition-colors disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Backup JSON
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">Import Data</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:border-0 file:text-xs file:bg-gray-800 file:text-white file:uppercase file:tracking-wide hover:file:bg-gray-700 file:cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-gray-200">
                <button
                  onClick={clearHistory}
                  className="w-full px-3 py-2 text-xs text-red-600 border border-red-300 hover:bg-red-50 transition-colors uppercase tracking-wide"
                >
                  Clear All Data
                </button>
              </div>

              {sessions.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Total sessions: {sessions.length}</div>
                    <div>Total time: {formatTime(sessions.reduce((acc, s) => acc + s.duration, 0))}</div>
                    <div>Data saved locally in your browser</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="text-center">
          <div className="text-6xl font-light text-gray-800 mb-2 tracking-wider">
            {formatTime(time)}
          </div>
          {distractions.length > 0 && (
            <div className="text-sm text-gray-500">
              {distractions.length} distraction{distractions.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Distraction Input Modal */}
        {isDistracted && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 w-full max-w-sm space-y-4">
              <div className="text-center">
                <h3 className="text-sm uppercase tracking-wide text-gray-600 mb-2">
                  What distracted you?
                </h3>
                <div className="text-lg font-mono text-red-600 mb-4">
                  {formatTime(currentDistractionTime)}
                </div>
                <input
                  type="text"
                  value={distractionReason}
                  onChange={(e) => setDistractionReason(e.target.value)}
                  placeholder="e.g. phone notification, thought, noise..."
                  className="w-full p-3 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && resumeFromDistraction()}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={resumeFromDistraction}
                  disabled={!distractionReason.trim()}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white text-xs uppercase tracking-wide hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Resume
                </button>
                <button
                  onClick={cancelDistraction}
                  className="flex-1 px-4 py-2 border border-gray-400 text-gray-600 text-xs uppercase tracking-wide hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          {!isActive && time === 0 && !isDistracted && (
            <button
              onClick={startSession}
              className="px-8 py-3 bg-gray-800 text-white text-sm uppercase tracking-wide hover:bg-gray-700 transition-colors"
            >
              Start
            </button>
          )}
          
          {isActive && !isDistracted && (
            <>
              <button
                onClick={pauseSession}
                className="px-6 py-3 bg-gray-300 text-gray-800 text-sm uppercase tracking-wide hover:bg-gray-400 transition-colors"
              >
                Pause
              </button>
              <button
                onClick={logDistraction}
                className="px-6 py-3 border border-gray-400 text-gray-600 text-sm uppercase tracking-wide hover:bg-gray-100 transition-colors"
              >
                Distracted
              </button>
            </>
          )}
          
          {!isActive && time > 0 && !isDistracted && (
            <>
              <button
                onClick={startSession}
                className="px-6 py-3 bg-gray-800 text-white text-sm uppercase tracking-wide hover:bg-gray-700 transition-colors"
              >
                Resume
              </button>
              <button
                onClick={endSession}
                className="px-6 py-3 bg-gray-600 text-white text-sm uppercase tracking-wide hover:bg-gray-500 transition-colors"
              >
                End
              </button>
            </>
          )}
        </div>

        {sessions.length > 0 && (
          <div className="border-t border-gray-200 pt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm uppercase tracking-wide text-gray-600">Session History</h3>
              <div className="flex space-x-3 text-xs text-gray-400">
                <span>{sessions.length} total</span>
              </div>
            </div>
            
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {Object.entries(groupSessionsByDate(sessions))
                .sort(([a], [b]) => new Date(b) - new Date(a))
                .map(([date, dateSessions]) => (
                  <div key={date} className="space-y-2">
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium border-b border-gray-100 pb-1">
                      {date === new Date().toDateString() ? 'Today' : 
                       date === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' :
                       new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    
                    <div className="space-y-2 pl-2">
                      {dateSessions.map((session) => (
                        <div key={session.id} className="border-b border-gray-50 pb-2">
                          <div className="flex justify-between items-center py-1">
                            <div className="text-sm text-gray-800">
                              {formatTime(session.duration)}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-3">
                              {session.distractions.length > 0 && (
                                <span>{session.distractions.length}d</span>
                              )}
                              <span>{session.timestamp.split(',')[1]?.trim() || new Date(session.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                          {session.distractions.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {session.distractions.map((d) => (
                                <div key={d.id} className="text-xs text-gray-400 pl-2 border-l-2 border-gray-200">
                                  {d.reason} <span className="text-gray-300">
                                    ({d.timestamp}{d.duration ? ` • ${formatTime(d.duration)}` : ''})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <div className="text-xs text-gray-400 pl-2 pt-1">
                        {dateSessions.length} session{dateSessions.length !== 1 ? 's' : ''} • {' '}
                        {formatTime(dateSessions.reduce((acc, s) => acc + s.duration, 0))} total
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 text-center">
                Total: {formatTime(sessions.reduce((acc, s) => acc + s.duration, 0))} 
                {' • '}
                {sessions.reduce((acc, s) => acc + s.distractions.length, 0)} distractions
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepWorkLogger;