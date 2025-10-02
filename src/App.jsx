import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import TestChat from "./pages/TestChat";
import Connection from "./pages/Connection";

import './index.scss'


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Connection />} />
        <Route path="/messagerie" element={<TestChat />} />
      </Routes>
    </Router>
  );
}

export default App;
