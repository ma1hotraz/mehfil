import { createRoot } from 'react-dom/client';

import './styles/base.css';
import './styles/print.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<h1>Mehfil</h1>);
}
