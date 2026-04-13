import mongoose from 'mongoose';
 
const KnowledgeSourceSchema = new mongoose.Schema({
  tag: { type: String, required: true, unique: true, trim: true },
  content_text: { type: String, required: true },
  last_compiled: { type: Date, default: null },
  embedding: { type: [Number], default: [] }
}, { timestamps: true });
 
export default mongoose.model('KnowledgeSource', KnowledgeSourceSchema);
 