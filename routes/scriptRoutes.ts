import { Router } from 'express';
import { completeSentence, correctGrammar, createScript, deleteScript, getScripts, updateScript, titleSuggestions, getEditorSampleContent, getScriptById } from '../controllers/scriptController';

const router = Router();

router.post('/create', createScript);
router.get('/list-scripts', getScripts)
router.put('/update/:id', updateScript);
router.delete('/delete/:id', deleteScript);
router.post('/complete-sentence', completeSentence);
router.post('/correct-grammar', correctGrammar);
router.post('/title-suggestions', titleSuggestions);
router.post('/sample-script', getEditorSampleContent)
router.get('/editor/:id', getScriptById)

export default router;