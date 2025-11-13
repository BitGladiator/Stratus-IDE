import { Terminal as XTerminal } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import socket from "../socket";
import "@xterm/xterm/css/xterm.css";

const Terminal = () => {
  const terminalRef = useRef();
  const terminalInstance = useRef(null);
  const isRendered = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isRendered.current) return;
    isRendered.current = true;

    const term = new XTerminal({
      rows: 24,
      cols: 80,
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 14,
      lineHeight: 1,
      letterSpacing: 0,
      cursorBlink: true,
      theme: {
          background: '#1e1e1e',
          foreground: '#ffffff',
          cursor: '#ffffff'
      },
      scrollback: 1000,
      allowProposedApi: true,
  });

    term.open(terminalRef.current);
    terminalInstance.current = term;
    const resizeTerminal = () => {
      const rect = terminalRef.current.getBoundingClientRect();
      const charWidth = 8.4; 
      const charHeight = 18.6; 
      const cols = Math.floor(rect.width / charWidth); 
      const rows = Math.floor(rect.height / charHeight); 
      if (cols > 10 && rows > 5) {
          term.resize(cols, rows);
      }
  };

    setTimeout(resizeTerminal, 100);
    window.addEventListener('resize', resizeTerminal);
    term.onData((data) => {
      socket.emit("terminal:write", data);
    });
    const handleTerminalData = (data) => {
      term.write(data);
    };

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on("terminal:data", handleTerminalData);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      window.removeEventListener('resize', resizeTerminal);
      socket.off("terminal:data", handleTerminalData);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
      isRendered.current = false;
    };
  }, []);

  const clearTerminal = () => {
    if (terminalInstance.current) {
      terminalInstance.current.clear();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: '#2d2d2d',
        borderBottom: '1px solid #404040',
        fontSize: '12px',
        color: '#fff'
      }}>
        <span>
          Terminal {isConnected ? '✓' : '✗'}
        </span>
        <button
          onClick={clearTerminal}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: '#444',
            color: '#fff',
            border: '1px solid #666',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>
      <div 
        ref={terminalRef} 
        id="terminal" 
        style={{ 
          flex: 1, 
          overflow: 'hidden',
          backgroundColor: '#1e1e1e'
        }} 
      />
    </div>
  );
};

export default Terminal;