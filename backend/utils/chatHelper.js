/**
 * chatHelper.js
 * Fungsi shared untuk memproses pertanyaan chatbot menggunakan Groq dan RAG.
 */
import { ChatGroq } from "@langchain/groq";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { retrieveDocuments } from "./ragHelper.js";

const QA_TEMPLATE = `Anda adalah asisten virtual resmi untuk LiVE Unpad (Learning Innovation and Virtual Education) Universitas Padjadjaran.

INSTRUKSI PENTING:

Langkah 1: Analisis topik pertanyaan pengguna.
- Jika pertanyaan bersifat UMUM atau TIDAK BERHUBUNGAN dengan LiVE Unpad, JAWABLAH TEPAT INI: "Maaf, saya hanya dapat membantu menjawab pertanyaan seputar informasi dan panduan penggunaan LiVE Unpad (Learning Innovation and Virtual Education) Universitas Padjadjaran."

Langkah 2: Jika pertanyaan BERHUBUNGAN dengan akademik/kampus, periksa Konteks di bawah.
- Jika jawaban TIDAK DITEMUKAN di dalam Konteks, JAWABLAH TEPAT INI: "Mohon maaf, informasi spesifik mengenai hal tersebut belum tersedia di dalam basis data kami. Untuk informasi lebih lanjut, silakan hubungi Helpdesk Akademik Universitas Padjadjaran."
- Jika jawaban ADA di Konteks, ikuti ATURAN FORMAT di bawah ini.

ATURAN FORMAT JAWABAN (WAJIB DIIKUTI):
1. Gunakan **teks tebal** untuk judul atau istilah penting.
2. Jika jawaban berupa langkah-langkah atau prosedur, gunakan NOMOR URUT dengan baris baru untuk setiap langkah.
3. Jika jawaban berupa daftar fitur, opsi, atau poin, gunakan tanda BULLET (- ) dengan baris baru untuk setiap poin.
4. Jika jawaban berisi perbandingan data atau daftar dengan lebih dari 2 kolom informasi, gunakan FORMAT TABEL Markdown.
5. Pisahkan setiap bagian jawaban dengan baris kosong agar mudah dibaca.
6. Jangan menulis jawaban dalam satu paragraf panjang jika bisa dipecah menjadi poin atau langkah.
7. Awali jawaban dengan kalimat pembuka singkat yang formal dan profesional.
8. Akhiri jawaban dengan kalimat penutup singkat jika relevan (misalnya menawarkan bantuan lebih lanjut).

Konteks:
{context}

Pertanyaan:
{question}

Jawaban:`;

let llmInstance = null;

function getLLM() {
    if (!llmInstance) {
        if (!process.env.GROQ_API_KEY) {
            console.warn("⚠️ Warning: GROQ_API_KEY is not set in environment variables.");
        }
        llmInstance = new ChatGroq({
            apiKey: process.env.GROQ_API_KEY,
            model: process.env.LLM_MODEL || "llama-3.1-8b-instant",
        });
    }
    return llmInstance;
}

/**
 * Memproses pertanyaan menggunakan RAG (Retrieval-Augmented Generation).
 *
 * @param {string} question - Pertanyaan dari pengguna
 * @returns {Promise<string>} - Jawaban dari model
 */
export async function processQuestion(question) {
    try {
        const prompt = PromptTemplate.fromTemplate(QA_TEMPLATE);
        const llm = getLLM();

        const chain = RunnableSequence.from([
            {
                context: async (input) => {
                    const docs = await retrieveDocuments(input.question, 3);
                    return docs.map(d => d.content_text).join("\n\n");
                },
                question: new RunnablePassthrough().pipe(input => input.question),
            },
            prompt,
            llm,
            new StringOutputParser(),
        ]);

        const raw = await chain.invoke({ question });

        const answer = raw
            .replace(/\n*Dengan demikian,.*/s, "")
            .replace(/\n*Jadi,.*/s, "")
            .replace(/\n*Kesimpulannya,.*/s, "")
            .trim();

        return answer;
    } catch (error) {
        console.error("❌ [processQuestion] Error:", error);
        return "Mohon maaf, terjadi kesalahan saat memproses pertanyaan Anda. Silakan coba lagi nanti.";
    }
}
