import './App.css'
import Terminal from './components/terminal'
function App() {
  return (
    <div className='playground-container'>
      <div className='editor-container'></div>
      <div className='terminal-container'>
        <Terminal/>
      </div>
    </div>
  )
}

export default App
