import mongoose, { Document, Schema } from "mongoose";

// Define an interface representing a script document in MongoDB
export interface IScript extends Document {
  userId: Schema.Types.ObjectId;
  title: string;
  genre?: string;
  synopsis?: string;
  content?: string;
  socialMedia?: string;
  scriptSample: string;
  characters?: string[];
  characterDescriptions?: { [name: string]: string }; // Map character name to description
  scenes?: string[];
}

// Define the schema for a script using the IScript interface
const ScriptSchema = new Schema<IScript>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: {
      type: String,
      required: true,
    },
    synopsis: {
      type: String,
      required: false,
    },
    genre: {
      type: String,
      required: false,
    },
    content: {
      type: String,
      required: false,
    },
    socialMedia: {
      type: String,
      required: false,
    },
    scriptSample: { type: String, required: true },
    characters: { type: [String], required: false },
    characterDescriptions: { 
      type: Map, 
      of: String, 
      required: false, 
      default: {}  // Ensure default empty object for new scripts
     }, // Use Map for character descriptions
    scenes: { type: [String], required: false },
  },
  // Enable automatic creation of createdAt and updatedAt fields
  { timestamps: true }
);

// create the Script model using the defined schema and interface
const Script = mongoose.model("Script", ScriptSchema);

//export the Script model using the defined schema and interface
export default Script;
