import { Request, Response } from "express";
import Script from '../model/Script';
// import OpenAI from "openai";
import dotenv from "dotenv";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
// import { model } from "mongoose";

dotenv.config();

// Initializing the OpenAI client
// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//   });

const apiKey = process.env.GEN_API_KEY;
if (!apiKey) {
  throw new Error("GEN_API_KEY is not defined in environment variables");
}

// Configure safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(apiKey);

// Access your model with safety settings
const ai = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings});

const handleError = (res: Response, error: unknown, defaultMessage: string) => {
  if (error instanceof Error) {
    console.error("Error: ", error);
    res.status(500).json({ message: defaultMessage, error: error.message });
  } else {
    console.error("Unexpected error: ", error);
    res.status(500).json({ message: defaultMessage });
  }
};

// Helper function to check if error is related to SAFETY concern
const isSafetyError = (error: unknown): boolean => {
  if (error instanceof Error && error.message.includes('SAFETY')) {
    return true;
  }
  return false;
};

// Helper function to extract characters and scenes from the script
const extractCharactersAndScenes = (script: string) => {
  // Revised regex patterns
  const primaryCharacterRegex = /^\*\s\*\*(.*?):\s*(.*?)$/gm;// Updated pattern for primary characters
  const fallbackCharacterRegex = /^\*\*\s*([A-Za-z\s\.]+):\s*\*\*$/gm; // Updated pattern for fallback characters
  const dialogueCharacterRegex = /^\*\*([A-Z\s]+)\*\*:?/gm; // Pattern to match dialogue tags
  // const sceneRegex = /^\*\*(INT\.|EXT\.)[^\*]*\*\*/gm; // Scene pattern remains the same
  // Regular expression to match scenes with or without parentheses
// ^\**          - Matches zero or more asterisks at the beginning of the line (allows for optional leading asterisks)
// \s*           - Matches zero or more whitespace characters
// \(?           - Matches an optional opening parenthesis
// (INT\.|EXT\.) - Matches "INT." or "EXT." literally (denoting the start of a scene heading)
// [^\*\)]*      - Matches zero or more characters that are neither an asterisk nor a closing parenthesis
// \)?           - Matches an optional closing parenthesis
  const sceneRegex = /^\**\s*(\(?(INT\.|EXT\.)[^\*\)]*\)?)/gm; // Updated scene pattern to match scenes with or without parentheses

  const characters1 = new Set<string>();
  const characters2 = new Set<string>();
  const scenes = new Set<string>();

  let match;

  // Check for the presence of "**Themes:**" and split the script accordingly
  const scriptUpToThemes = script.includes('**Themes:**') ? script.split('**Themes:**')[0] : script;

  // Match characters with the primary regex
  while ((match = primaryCharacterRegex.exec(scriptUpToThemes)) !== null) {
    const cleanedCharacter = match[1].trim();
    characters1.add(cleanedCharacter);
  }
  console.log("characters1: " + JSON.stringify(characters1))

  // Match characters with the fallback regex
  while ((match = fallbackCharacterRegex.exec(scriptUpToThemes)) !== null) {
    const cleanedCharacter = match[1].replace(/\*\*/g, '').trim(); // Remove the ** and trim
    characters2.add(cleanedCharacter);
  }
  console.log("characters2: " + JSON.stringify(characters2))

  // If no primary or fallback characters found, extract characters from dialogues in the entire script
  if (characters1.size === 0 && characters2.size === 0) {
    while ((match = dialogueCharacterRegex.exec(scriptUpToThemes)) !== null) {
      const cleanedCharacter = match[1].trim();
      characters2.add(cleanedCharacter);
    }
  }
  console.log("characters2: size0 both", characters2);

  // Normalize character names to lower case and remove duplicates between characters1 and characters2
  const normalize = (name: string) => name.toLowerCase().replace(/[^\w\s]/gi, '').trim();
  const characters1Normalized = new Set(Array.from(characters1).map(normalize));
  console.log("chars1Normalized: ", characters1Normalized)
  const characters2Normalized = new Set(Array.from(characters2).map(normalize));
  console.log("chars2Normalized: ", characters2Normalized)

  // Add unique characters from characters2 to characters1
  for (const character of characters2) {
    if (!characters1Normalized.has(normalize(character))) {
      console.log("character of characters2: ", character);
      characters1.add(character);
    }
  }

  console.log("character of characters after for loop characters1", characters1)
  const characters = Array.from(characters1);

  // Remove unwanted strings
  const unwantedStrings = ["fade in", "characters", "logline", "ending", "voiceover", "notes", "voice (off-screen)", "scene", "end credits"];
  const uniqueCharacters = characters.filter(character => !unwantedStrings.includes(character.toLowerCase()));

  // Match scenes in the entire script up to the "Themes" section
  while ((match = sceneRegex.exec(scriptUpToThemes)) !== null) {
    const cleanedScene = match[0].replace(/\*\*/g, '').trim();
    scenes.add(cleanedScene);
  }

  return {
    characters: uniqueCharacters,
    scenes: Array.from(scenes),
  };
};

export const createScript = async (req: Request, res: Response) => {
    const { title, genre, synopsis, content, socialMedia, scriptSample, characters, characterDescriptions, scenes } = req.body;

    if(!req.user){
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user._id;

    try{
        const newScript = new Script({ userId, title, genre, synopsis, content, socialMedia, scriptSample, characters, characterDescriptions, scenes });

        await newScript.save();
        res.status(201).json(newScript);
    } catch (error) {
        handleError(res, error, 'Error creating script');
    }
}

export const getScripts = async (req: Request, res: Response) => {

    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user._id;
    
    try{
        const scripts = await Script.find({ userId });
        res.status(200).json(scripts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching scripts'});
    }
}

export const updateScript = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, genre, synopsis, content, socialMedia, scriptSample, characters, scenes } = req.body;

    if(!req.user){
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user._id;
    console.log("userId: ", userId)

    try{
        const updatedScript = await Script.findOneAndUpdate(
            {_id: id, userId },
            { title, genre, synopsis, content, socialMedia, scriptSample, characters, scenes },
            { new: true}
        );
        console.log("script updated successfully: ", updatedScript);

        if(!updatedScript) {
            return res.status(404).json({ message: 'Script not found' });
        }

        res.status(200).json(updatedScript);
    } catch (error){
        res.status(500).json({ message: 'Error updating script' });
    }
};

export const deleteScript = async (req: Request, res: Response) => {
    const { id } = req.params;

    if(!req.user){
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user._id;

    try{
        const deletedScript = await Script.findOneAndDelete({ _id: id, userId });

        if(!deletedScript){
            return res.status(404).json({ message: 'Script not found' });
        }

        res.status(200).json({ message: 'Script deleted successfully' });
    } catch (error){
        res.status(500).json({ message: 'Error deleting script' });
    }
};

export const completeSentence = async (req: Request, res: Response) => {
  const prompt = req.body.completion;

  try {
    const result = await ai.generateContent(prompt);
    const response = result.response;
    const message = response.text();

    if (message) {
      res.json({ completion: message.trim() });
    } else {
      res.status(500).json({ message: 'Error completing sentence' });
    }
  } catch (error: unknown) {
    if (isSafetyError(error)) {
      console.error("Safety Error: Retrying with modified prompt");
      try {
        const modifiedPrompt = `SAFE: ${prompt}`;
        const result = await ai.generateContent(modifiedPrompt);
        const response = result.response;
        const message = response.text();

        if (message) {
          res.json({ completion: message.trim() });
        } else {
          res.status(500).json({ message: 'Error completing sentence' });
        }
      } catch (retryError: unknown) {
        handleError(res, retryError, 'Error completing sentence after retry');
      }
    } else {
      handleError(res, error, 'Error completing sentence');
    }
  }
};

export const correctGrammar = async (req: Request, res: Response) => {
  const text = req.body.prompt;

  try {
    const prompt = `Correct the grammar of the following text:\n\n${text}`;
    
    const result = await ai.generateContent(prompt);
    const response = await result.response;
    const correctedText = await response.text();

    if (correctedText) {
      res.json({ correctedText: correctedText.trim() });
    } else {
      res.status(500).json({ message: 'Error correcting grammar' });
    }
  } catch (error: unknown) {
    if (isSafetyError(error)) {
      console.error("Safety Error: Retrying with modified prompt");
      try {
        const modifiedPrompt = `SAFE: Correct the grammar of the following text:\n\n${text}`;
        const result = await ai.generateContent(modifiedPrompt);
        const response = result.response;
        const correctedText = response.text();

        if (correctedText) {
          res.json({ correctedText: correctedText.trim() });
        } else {
          res.status(500).json({ message: 'Error correcting grammar' });
        }
      } catch (retryError: unknown) {
        handleError(res, retryError, 'Error correcting grammar after retry');
      }
    } else {
      handleError(res, error, 'Error correcting grammar');
    }
  }
};

export const titleSuggestions = async (req: Request, res: Response) => {
  const { synopsis } = req.body;

  try{
    const result = await ai.generateContent(`Generate title based on: ${synopsis}`);
    const response = result.response;
    const suggestions = response
      .text()
      .split("\n")
      .filter(line => line.startsWith('*') && !line.includes('**'))
      .map(line => line.replace('* ', '').trim());

    console.log("suggestions: ", suggestions)
    res.json({ titles: suggestions});
  } catch (error: unknown) {
    if (isSafetyError(error)) {
      // Handle SAFETY error
      console.error("Safety Error occurred:", error);
      res.status(500).json({ message: 'Title suggestion blocked due to safety concerns' });
    } else {
      // Handle other errors
      handleError(res, error, 'Error generating title suggestions');
    }
  }
}

export const getEditorSampleContent = async (req: Request, res: Response) => {
  const { synopsis, socialMedia, content, genre } = req.body;

  try{
    let prompt = '';

    if(socialMedia && content){
      prompt = `Generate a script for ${socialMedia} on "${content}"`
    }
    else if(synopsis){
      prompt = `Generate a movie script with ${genre} based on the following synopsis:\n\n${synopsis}`;
    }
    else{
      res.status(400).json({ message: 'Insufficient data to generate a script' })
      return;
    }

    const result = await ai.generateContent(prompt);
    const response = result.response;
    const scriptSample = response.text();

    if(scriptSample){
      const { characters, scenes } = extractCharactersAndScenes(scriptSample);
      
      console.log("characters: ", characters)
      console.log("scenes: ", scenes)
      res.json({
        scriptSample: scriptSample.trim(),
        characters,
        scenes,
      });
    } else{
      res.status(500).json({ message: 'Error generating script' });
    }
  } catch(error: unknown){
    if(isSafetyError(error)){
      console.error("Safety Error: Retrying with modified prompt");
      try{
        const modifiedPrompt = `SAFE: ${prompt}`;
        const result = await ai.generateContent(modifiedPrompt);
        const response = result.response;
        const scriptSample = response.text();

        if(scriptSample){
          const { characters, scenes } = extractCharactersAndScenes(scriptSample);

          res.json({
            scriptSample: scriptSample.trim(),
            characters,
            scenes,
          });
        } else{
          res.status(500).json({ message: 'Error generating script' });
        }
      } catch (retryError: unknown){
        handleError(res, retryError, 'Error generating script after retry');
      }
    } else{
      handleError(res, error, 'Error generating script');
    }
  }
  
}

// Function to fetch sample script by script ID
export const getScriptById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if(!req.user){
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userId = req.user._id;

  try{
    // Fetch script by ID and userId from MongoDB
    const script = await Script.findOne({ _id: id, userId });

    if(!script){
      return res.status(404).json({ message: 'Script not found' });
    }

    res.status(200).json(script);
  } catch (error){
    res.status(500).json({ message: 'Error fetching script'})
  }
}

const sanitizeText = (text: string): string => {
  return text.replace(/[*#]/g, '').trim();
};

// Function to generate description for a character 
export const generateDescription = async (req: Request, res: Response) => {
  const { individuality } = req.body;

  if(!individuality){
    return res.status(400).json({ message: "Individuality description is required" })
  }

  try{
    const prompt = `Generate a detailed description of a character with the following individuality: ${individuality}. Include details on age, appearance, background, personality, motivation, and conflict.`;
    const result = await ai.generateContent(prompt);
    const response = result.response;
    const description = response.text();

    if(description){
      const sanitizedDescription = sanitizeText(description);
      res.json({ description: sanitizedDescription });
    } else{
      res.status(500).json({ message: "Error generating description" });
    }
  } catch (error: unknown) {
    if(isSafetyError(error)) {
      console.error("Safety Error: Retrying with modified prompt");

      try{
        const modifiedPrompt = `SAFE: Generate a detailed description of a character with the following individuality: ${individuality}. Include details on appearance, background, personality, motivation, and conflict.`;
        const result = await ai.generateContent(modifiedPrompt);
        const response = result.response;
        const description = response.text();

        if(description){
          res.json({ description: description.trim() });
        } else{ 
          res.status(500).json({ message: "Error generating description" });
        }
      } catch (retryError: unknown){
        handleError(res, retryError, "Error generating description after retry");
      }
    } else{
      handleError(res, error, "Error generating descrition");
    }
  }

}

// Function to update character details in a script
export const updateCharacterDetails = async (req: Request, res: Response) => {
  try{
    const { scriptId } = req.params;
    const { oldCharacterName, newCharacterName, characterDescriptions } = req.body;

    if( !scriptId || !oldCharacterName || !newCharacterName || !characterDescriptions ){
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const script = await Script.findById(scriptId);
    if(!script){
      return res.status(404).json({ success: false, message: "Script not found" });
    }

    // Update characters array
    if(!script.characters){
      script.characters = [];
    }

    const charIndex = script.characters.findIndex(char => char === oldCharacterName);
    if(charIndex !== -1) {
      // Character found, update it
      script.characters[charIndex] = newCharacterName;
    } else {
      // Character not found, add new character
      script.characters.push(newCharacterName);
    }

    // Update character descriptions
    script.characterDescriptions = {
      ...script.characterDescriptions,
      [newCharacterName]: characterDescriptions,
    };

    // Remove old character description if the name has changed
    if(oldCharacterName !== newCharacterName) {
      delete script.characterDescriptions[oldCharacterName];
    }

    await script.save();

    return res.status(200).json({ success: true, message: "Character details updated successfully", data: script });
  } catch (error: unknown) {
    return res.status(500).json({ success: false, message: "Error updating character details"});
  }
}