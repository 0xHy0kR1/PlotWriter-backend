import { Request, Response } from "express";
import Script from '../model/Script';
// import OpenAI from "openai";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(apiKey);

const ai = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

  const handleError = (res: Response, error: unknown, defaultMessage: string) => {
    if (error instanceof Error) {
        console.error("Error: ", error);
        res.status(500).json({ message: defaultMessage, error: error.message });
    } else {
        console.error("Unexpected error: ", error);
        res.status(500).json({ message: defaultMessage });
    }
};


export const createScript = async (req: Request, res: Response) => {
    const { title, genre, synopsis, content, socialMedia } = req.body;

    console.log("title: " + title, "genre: " + genre, "synopsis: " + synopsis, "content: " + content);
    if(!req.user){
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user._id;
    console.log("userId: ", userId)

    try{
        const newScript = new Script({ userId, title, genre, synopsis, content, socialMedia });
        console.log("inside try createScript: ");

        await newScript.save();
        console.log("Script saved successfully: ", newScript);
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
    const { title, genre, synopsis, content, socialMedia } = req.body;

    if(!req.user){
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user._id;

    try{
        const updatedScript = await Script.findOneAndUpdate(
            {_id: id, userId },
            { title, genre, synopsis, content, socialMedia },
            { new: true}
        );

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
  console.log("req.body: " + JSON.stringify(req.body));
  const { prompt } = req.body;
  console.log("prompt: " + prompt);

  try {

    // Generate content based on the prompt
    const result = await ai.generateContent(prompt);
    const response = await result.response;
    const message = await response.text();

    if (message) {
      res.json({ completion: message.trim() });
    } else {
      res.status(500).json({ message: 'Error completing sentence' });
    }
  } catch (error) {
    handleError(res, error, 'Error completing sentence:');
}
};

export const correctGrammar = async (req: Request, res: Response) => {
  console.log("req: ", req.body.prompt)
  const text = req.body.prompt;
  console.log("text: ", text)

  try {
    const prompt = `Correct the grammar of the following text:\n\n${text}`;
    console.log("prompt: ", prompt)
    
    // Generate corrected text
    const result = await ai.generateContent(prompt);
    const response = await result.response;
    const correctedText = await response.text();

    if (correctedText) {
      res.json({ correctedText: correctedText.trim() });
    } else {
      res.status(500).json({ message: 'Error correcting grammar' });
    }
  } catch (error: unknown) {
    handleError(res, error, 'Error correcting grammar');
  }
};