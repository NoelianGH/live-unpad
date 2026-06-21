import { OllamaEmbeddings } from "@langchain/ollama";
import { OpenAIEmbeddings } from "@langchain/openai";
import { prisma } from "../services/prisma.js";

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getEmbeddings() {
    const provider = (process.env.EMBEDDING_PROVIDER || "ollama").toLowerCase();
    
    if (provider === "openai") {
        if (!process.env.OPENAI_API_KEY) {
            console.warn("⚠️ Warning: OPENAI_API_KEY is not set but OpenAI embedding provider is selected.");
        }
        return new OpenAIEmbeddings({
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
        });
    } else {
        return new OllamaEmbeddings({
            baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
            model: process.env.EMBEDDING_MODEL || "nomic-embed-text",
        });
    }
}

/**
 * Sinkronisasi teks ke vektor (embedding) di PostgreSQL via Prisma.
 */
export async function syncEmbeddingsToAtlas() {
    console.log("🔄 Mengecek sinkronisasi embedding ke PostgreSQL...");
    try {
        const sources = await prisma.knowledgeSource.findMany({
            where: {
                OR: [
                    { embedding: { equals: [] } },
                    { last_compiled: null }
                ]
            }
        });

        if (sources.length === 0) {
            console.log("✅ Semua data sudah memiliki embedding.");
            return;
        }

        const embeddings = getEmbeddings();

        // Quick connection test with 3-second timeout to prevent hanging when Ollama is offline
        try {
            console.log("🔌 Menguji koneksi ke embedding provider...");
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Embedding provider timeout after 3s")), 3000)
            );
            await Promise.race([embeddings.embedQuery("connection test"), timeout]);
            console.log("🔌 Koneksi sukses!");
        } catch (connErr) {
            console.warn("⚠️ Gagal terhubung ke embedding provider (Ollama/OpenAI offline). Melewati sinkronisasi database embedding.");
            return;
        }

        console.log(`⚙️ Mengonversi ${sources.length} data menjadi vektor (paralel batch)...`);
        const BATCH_SIZE = 5;
        
        for (let i = 0; i < sources.length; i += BATCH_SIZE) {
            const batch = sources.slice(i, i + BATCH_SIZE);

            // Generate query embeddings in parallel for the batch
            const vectors = await Promise.all(
                batch.map(doc => embeddings.embedQuery(doc.content_text))
            );

            // Update database records
            await Promise.all(
                batch.map((doc, idx) =>
                    prisma.knowledgeSource.update({
                        where: { id: doc.id },
                        data: {
                            embedding: vectors[idx],
                            last_compiled: new Date()
                        }
                    })
                )
            );

            console.log(`✔ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.map(d => d.tag).join(", ")} berhasil di-embed.`);
        }

        console.log("🚀 Sinkronisasi selesai!");
    } catch (error) {
        console.error("❌ Gagal saat sinkronisasi embedding:", error);
        throw error;
    }
}

/**
 * Retrieve documents similar to query using cosine similarity in memory
 */
export async function retrieveDocuments(question, k = 6) {
    try {
        const embeddings = getEmbeddings();
        const queryVector = await embeddings.embedQuery(question);

        const sources = await prisma.knowledgeSource.findMany({
            where: {
                NOT: {
                    embedding: {
                        equals: []
                    }
                }
            }
        });

        if (sources.length === 0) return [];

        const scored = sources.map(source => {
            const similarity = cosineSimilarity(queryVector, source.embedding);
            return { ...source, similarity };
        });

        // Sort by similarity descending
        scored.sort((a, b) => b.similarity - a.similarity);

        // Take top k
        return scored.slice(0, k);
    } catch (error) {
        console.warn("⚠️ [retrieveDocuments] Error embedQuery/fetching vector (Ollama offline). Falling back to keyword search:", error.message || error);
        
        try {
            // Fallback to simple keyword matching on database
            const sources = await prisma.knowledgeSource.findMany();
            if (sources.length === 0) return [];
            
            const keywords = question.toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
                .split(/\s+/)
                .filter(word => word.length > 2);
                
            if (keywords.length === 0) {
                // Return first k documents if query is too short
                return sources.slice(0, k);
            }
            
            const scored = sources.map(source => {
                const text = (source.content_text || "").toLowerCase();
                let score = 0;
                
                keywords.forEach(keyword => {
                    if (text.includes(keyword)) {
                        score += 1;
                    }
                });
                
                // Boost score if the query phrase appears as-is
                const cleanQuestion = question.toLowerCase().trim();
                if (text.includes(cleanQuestion)) {
                    score += 5;
                }
                
                return { ...source, similarity: score };
            });
            
            // Filter out items that had no matches if there are any matched documents
            const matched = scored.filter(s => s.similarity > 0);
            matched.sort((a, b) => b.similarity - a.similarity);
            
            return (matched.length > 0 ? matched : scored).slice(0, k);
        } catch (fallbackError) {
            console.error("❌ [retrieveDocuments] Fallback search failed:", fallbackError);
            return [];
        }
    }
}

// Dummy vector store methods for backward compatibility if any
export async function getVectorStore() {
    return null;
}

export function resetVectorStore() {
    // No-op
}
