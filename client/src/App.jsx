import { useEffect, useState } from 'react'
import './App.css'
import Terminal from './components/terminal'
import FileTree from './components/tree'
import socket from './socket'
import AceEditor from 'react-ace';
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";

function App() {
  const [fileTree, setFileTree] = useState({})
  const getFileTree = async() =>{
    const response = await fetch("http://localhost:9000/files")
    const result = await response.json(); 
    setFileTree(result.tree);
  }
  useEffect(()=>{
    getFileTree();
  },[])
  useEffect(()=>{
   socket.on('file:refresh',getFileTree);
   return ()=>{
    socket.off('file:refresh',getFileTree)
   }
  },[])
  return ( 
    <div className='playground-container'>
      <div className='editor-container'>
         <div className="files">
          <FileTree tree={fileTree}/>
         </div>
         <div className="editor"><AceEditor/></div>
      </div>
      <div className='terminal-container'>
        <Terminal/>
      </div>
    </div>
  )
}

export default App
