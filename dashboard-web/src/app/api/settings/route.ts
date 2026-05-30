import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Kita simpan settings.json di root (di samping attendance.xlsx)
const getSettingsPath = () => path.resolve(process.cwd(), '../settings.json');

const defaultSettings = {
  arrivalTime: '06:30',
  departureTime: '15:00',
  desktopNotifications: false,
  darkMode: false,
  autoBackup: false
};

export async function GET() {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      // Jika belum ada, kembalikan default
      return NextResponse.json(defaultSettings);
    }
    const data = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(data);
    return NextResponse.json({ ...defaultSettings, ...settings });
  } catch (error) {
    console.error('Error reading settings:', error);
    return NextResponse.json(defaultSettings);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settingsPath = getSettingsPath();
    
    let currentSettings = { ...defaultSettings };
    if (fs.existsSync(settingsPath)) {
      currentSettings = { ...currentSettings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) };
    }

    const newSettings = { ...currentSettings, ...body };
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));

    return NextResponse.json({ message: 'Pengaturan berhasil disimpan', settings: newSettings });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
