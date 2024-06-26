import { Router } from 'express';
import { completeSentence, correctGrammar, createScript, deleteScript, getScripts, updateScript, titleSuggestions } from '../controllers/scriptController';

const router = Router();

router.post('/create', createScript);
router.get('/get', getScripts)
router.put('/update/:id', updateScript);
router.delete('/delete/:id', deleteScript);
router.post('/complete-sentence', completeSentence);
router.post('/correct-grammar', correctGrammar);
router.post('/title-suggestions', titleSuggestions);

export default router;