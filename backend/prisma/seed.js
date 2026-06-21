import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@liveunpad.com';
  const userEmail = 'user@liveunpad.com';

  console.log('🌱 Starting database seeding...');

  // Clean up legacy MIM accounts if any exist
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['admin@mim.com', 'user@mim.com']
      }
    }
  });
  console.log('🧹 Cleaned up legacy MIM seed accounts');

  // Create admin account
  const adminExists = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminExists) {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.create({
      data: {
        name: 'LiVE Unpad Admin',
        email: adminEmail,
        password: adminPasswordHash,
        role: 'admin',
      },
    });
    console.log(`✅ Admin account created: ${adminUser.email} / admin123`);
  } else {
    console.log('ℹ️ Admin account already exists');
  }

  // Create teacher account
  const teacherEmail = 'teacher@liveunpad.com';
  const teacherExists = await prisma.user.findUnique({
    where: { email: teacherEmail },
  });

  if (!teacherExists) {
    const teacherPasswordHash = await bcrypt.hash('teacher123', 10);
    const teacherUser = await prisma.user.create({
      data: {
        name: 'LiVE Unpad Teacher',
        email: teacherEmail,
        password: teacherPasswordHash,
        role: 'teacher',
      },
    });
    console.log(`✅ Teacher account created: ${teacherUser.email} / teacher123`);
  } else {
    console.log('ℹ️ Teacher account already exists');
  }

  // Create student account
  const studentEmail = 'student@liveunpad.com';
  const studentExists = await prisma.user.findUnique({
    where: { email: studentEmail },
  });

  if (!studentExists) {
    const studentPasswordHash = await bcrypt.hash('student123', 10);
    const studentUser = await prisma.user.create({
      data: {
        name: 'LiVE Unpad Student',
        email: studentEmail,
        password: studentPasswordHash,
        role: 'student',
      },
    });
    console.log(`✅ Student account created: ${studentUser.email} / student123`);
  } else {
    console.log('ℹ️ Student account already exists');
  }

  // Create user account (legacy)
  const userExists = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!userExists) {
    const userPasswordHash = await bcrypt.hash('user123', 10);
    const regularUser = await prisma.user.create({
      data: {
        name: 'LiVE Unpad User',
        email: userEmail,
        password: userPasswordHash,
        role: 'student', // Default to student now
      },
    });
    console.log(`✅ User account created: ${regularUser.email} / user123`);
  } else {
    console.log('ℹ️ User account already exists');
  }

  // Parse and seed DataLiveUnpad.txt
  const txtPath = path.join(__dirname, '../DataLiveUnpad.txt');
  if (fs.existsSync(txtPath)) {
    console.log(`📖 Reading guidelines from ${txtPath}...`);
    const content = fs.readFileSync(txtPath, 'utf-8');
    const paragraphs = content.split(/\r?\n\r?\n/);
    
    let currentHeader = 'Umum';
    let chunks = [];
    
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      
      const lines = trimmed.split('\n');
      const firstLine = lines[0].trim();
      
      // Simple header detection: if paragraph is single line, relatively short, and doesn't end with a period
      if (lines.length === 1 && firstLine.length < 100 && !firstLine.endsWith('.')) {
        currentHeader = firstLine;
        continue;
      }
      
      // If the paragraph starts with a header-like line
      const headerPatterns = [/^[0-9]\.[0-9]?\s+.*/, /^Panduan.*/, /^Cara.*/, /^Halaman.*/, /^Pengelolaan.*/, /^LMS.*/, /^Tujuan.*/, /^Manfaat.*/, /^Live Unpad.*/];
      const isHeaderFirstLine = headerPatterns.some(pattern => pattern.test(firstLine)) && firstLine.length < 100 && !firstLine.endsWith('.');
      
      if (isHeaderFirstLine && lines.length > 1) {
        currentHeader = firstLine;
      }
      
      chunks.push({
        tag: `live_unpad::${currentHeader}-${chunks.length + 1}`.replace(/[^a-zA-Z0-9\-:]/g, '_'),
        content_text: trimmed
      });
    }

    console.log(`📦 Found ${chunks.length} chunks to insert into KnowledgeSource...`);
    
    for (const chunk of chunks) {
      await prisma.knowledgeSource.upsert({
        where: { tag: chunk.tag },
        update: { content_text: chunk.content_text },
        create: {
          tag: chunk.tag,
          content_text: chunk.content_text,
          embedding: []
        }
      });
    }
    console.log('✅ KnowledgeSource table successfully updated with DataLiveUnpad.txt content!');
  } else {
    console.warn(`⚠️ Warning: DataLiveUnpad.txt not found at ${txtPath}`);
  }

  console.log('🌱 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
