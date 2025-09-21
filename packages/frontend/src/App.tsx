import { HelloWorld } from './components/HelloWorld';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Social Media App</h1>
      </header>
      <main className="app-main">
        <HelloWorld />
      </main>
    </div>
  );
}

export default App;