import { useCallback, useEffect, useState } from "react";
import "./App.css";
import Terminal from "./components/terminal";
import FileTree from "./components/tree";
import socket from "./socket";
import AceEditor from "react-ace";

// Import ACE modes and themes
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-xml";
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/mode-sh";

// Import themes
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/theme-solarized_dark";
import "ace-builds/src-noconflict/theme-solarized_light";

// Import extensions
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/ext-searchbox";

function App() {
  const [fileTree, setFileTree] = useState({});
  const [selectedFile, setSelectedFile] = useState("");
  const [code, setCode] = useState("");
  const [selectedFileContent, setSelectedFileContent] = useState("");
  const [editorTheme, setEditorTheme] = useState("monokai");
  const [fontSize, setFontSize] = useState(14);
  const [isLoading, setIsLoading] = useState(false);
  
  const isSaved = selectedFileContent === code;

  // Get file mode based on extension
  const getFileMode = (filePath) => {
    if (!filePath) return "text";
    
    const extension = filePath.split('.').pop().toLowerCase();
    
    const modeMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'javascript',
      'tsx': 'javascript',
      'py': 'python',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'css',
      'sass': 'css',
      'json': 'json',
      'md': 'markdown',
      'xml': 'xml',
      'yml': 'yaml',
      'yaml': 'yaml',
      'sh': 'sh',
      'bash': 'sh',
      'txt': 'text'
    };
    
    return modeMap[extension] || 'text';
  };

  const getFileTree = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("http://localhost:9000/files");
      if (response.ok) {
        const result = await response.json();
        setFileTree(result.tree);
      }
    } catch (error) {
      console.error('Error fetching file tree:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileContents = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(
        `http://localhost:9000/files/content?path=${selectedFile}`
      );
      if (response.ok) {
        const result = await response.json();
        setSelectedFileContent(result.content);
      } else {
        console.error('Failed to load file');
        setSelectedFileContent("");
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
      setSelectedFileContent("");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);

  // Format code function
  const formatCode = () => {
    if (!code) return;
    
    // Simple formatting for JavaScript/JSON
    if (getFileMode(selectedFile) === 'javascript' || getFileMode(selectedFile) === 'json') {
      try {
        const formatted = JSON.stringify(JSON.parse(code), null, 2);
        setCode(formatted);
      } catch (error) {
        console.log('Could not format as JSON, skipping...');
      }
    }
  };

  // Save shortcut
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        if (!isSaved && selectedFile) {
          socket.emit("file:change", {
            path: selectedFile,
            content: code,
          });
        }
      }
      if (e.key === 'f') {
        e.preventDefault();
        // ACE editor's find will be triggered automatically
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [code, selectedFile, isSaved]);

  useEffect(() => {
    if (selectedFile) {
      getFileContents();
    }
  }, [getFileContents, selectedFile]);

  useEffect(() => {
    getFileTree();
  }, []);

  useEffect(() => {
    socket.on("file:refresh", getFileTree);
    return () => {
      socket.off("file:refresh", getFileTree);
    };
  }, []);

  // Auto-save with debouncing
  useEffect(() => {
    if (code && !isSaved && selectedFile) {
      const timer = setTimeout(() => {
        socket.emit("file:change", {
          path: selectedFile,
          content: code,
        });
      }, 2000); // Reduced to 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [code, selectedFile, isSaved]);

  useEffect(() => {
    if (selectedFile && selectedFileContent) {
      setCode(selectedFileContent);
    }
  }, [selectedFile, selectedFileContent]);

  const handleFileSelect = (path) => {
    if (path !== selectedFile) {
      setSelectedFile(path);
      setSelectedFileContent("");
      setCode("");
    }
  };

  return (
    <div className="playground-container">
      <div className="editor-container">
        {/* File Explorer */}
        <div className="files">
          <div className="files-header">
            <h3>Explorer</h3>
            {isLoading && <div className="loading-spinner">⟳</div>}
          </div>
          <FileTree
            onSelect={handleFileSelect}
            tree={fileTree}
          />
        </div>

        {/* Editor Section */}
        <div className="editor">
          {/* Editor Header */}
          {selectedFile && (
            <div className="editor-header">
              <div className="file-info">
                <span className="file-path">
                  {selectedFile.replaceAll("/", " › ")}
                </span>
                <span className={`save-status ${isSaved ? 'saved' : 'unsaved'}`}>
                  {isSaved ? "✓ Saved" : "● Unsaved"}
                </span>
              </div>
              
              <div className="editor-controls">
                {/* Theme Selector */}
                <select
                  value={editorTheme}
                  onChange={(e) => setEditorTheme(e.target.value)}
                  className="theme-selector"
                >
                  <option value="monokai">Monokai</option>
                  <option value="github">GitHub</option>
                  <option value="tomorrow_night">Tomorrow Night</option>
                  <option value="solarized_dark">Solarized Dark</option>
                  <option value="solarized_light">Solarized Light</option>
                </select>

                {/* Font Size */}
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="font-size-selector"
                >
                  <option value={12}>12px</option>
                  <option value={14}>14px</option>
                  <option value={16}>16px</option>
                  <option value={18}>18px</option>
                  <option value={20}>20px</option>
                </select>

                {/* Format Button */}
                <button onClick={formatCode} className="format-btn">
                  Format
                </button>
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="editor-wrapper">
            {selectedFile ? (
              <AceEditor
                value={code}
                onChange={setCode}
                mode={getFileMode(selectedFile)}
                theme={editorTheme}
                name="code-editor"
                width="100%"
                height="100%"
                fontSize={fontSize}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false,
                  wrap: false,
                  foldStyle: "markbegin",
                  fontFamily: '"Monaco", "Menlo", "Consolas", monospace', // Use system monospace
                  fixedWidthGutter: true,
                  scrollPastEnd: 0.5
                }}
                editorProps={{
                  $blockScrolling: Infinity
                }}
                onLoad={(editor) => {
                  // Fix cursor alignment issues
                  editor.renderer.setPrintMarginColumn(false);
                  editor.renderer.setShowPrintMargin(false);
                  editor.setShowFoldWidgets(false);
                  
                  // Force re-render to fix cursor position
                  setTimeout(() => {
                    editor.renderer.updateFull();
                    editor.resize();
                  }, 100);
                }}
                style={{
                  fontFamily: '"Monaco", "Menlo", "Consolas", monospace',
                  lineHeight: '1.5'
                }}
              />
            ) : (
              <div className="no-file-selected">
                <div className="welcome-message">
                  <h2>Welcome to Code Editor</h2>
                  <p>Select a file from the explorer to start editing</p>
                  <div className="shortcuts">
                    <h4>Keyboard Shortcuts:</h4>
                    <ul>
                      <li><kbd>Ctrl+S</kbd> - Save file</li>
                      <li><kbd>Ctrl+F</kbd> - Find in file</li>
                      <li><kbd>Ctrl+H</kbd> - Find and replace</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div className="terminal-container">
        <Terminal />
      </div>
    </div>
  );
}

export default App;