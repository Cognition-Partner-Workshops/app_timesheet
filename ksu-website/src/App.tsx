import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import RegulationsPage from './pages/RegulationsPage';
import './App.css';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/regulations" element={<RegulationsPage />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default App;
