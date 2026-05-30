import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define path relative to process.cwd() (which is dashboard-web)
// But the JSON is one level up in the ML-guy directory
const jsonPath = path.join(process.cwd(), '..', 'admin_account.json');

export async function GET() {
  try {
    const data = await fs.readFile(jsonPath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read account data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const newData = await request.json();
    
    // Read existing to merge or just replace? Let's just replace the whole object
    // but keep existing password if password is empty in newData
    let currentData = { fullName: "", email: "", phone: "", role: "", password: "" };
    try {
      const existing = await fs.readFile(jsonPath, 'utf8');
      currentData = JSON.parse(existing);
    } catch(e) {}
    
    const updatedData = {
      fullName: newData.fullName || currentData.fullName,
      email: newData.email || currentData.email,
      phone: newData.phone || currentData.phone,
      role: newData.role || currentData.role,
      password: newData.password ? newData.password : currentData.password
    };
    
    await fs.writeFile(jsonPath, JSON.stringify(updatedData, null, 2), 'utf8');
    return NextResponse.json({ success: true, message: 'Profil berhasil diperbarui' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to write account data' }, { status: 500 });
  }
}
