import '../styles/tokens.css';
import '../styles/base.css';
import { scrambleEl } from '../lib/scramble';
import { initTransitions } from '../lib/transitions';
import { initCursor } from '../shell/cursor';
import { mountAtmosphere } from '../shell/grain';

mountAtmosphere();
initCursor();
initTransitions();
const st = document.getElementById('statement');
if (st) void scrambleEl(st);
