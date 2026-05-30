import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const jsonPath = path.join(process.cwd(), '..', 'agenda_kalender.json');

async function readData() {
  const data = await fs.readFile(jsonPath, 'utf8');
  return JSON.parse(data);
}

async function writeData(data: any) {
  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf8');
}

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read agenda data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await readData();
    
    const newEvent = {
      id: data.academic_calendar.events.length > 0 
        ? Math.max(...data.academic_calendar.events.map((e: any) => e.id)) + 1 
        : 1,
      title: body.title,
      type: body.type || 'Umum',
      time: body.time || '-',
      icon: body.icon || '📅'
    };

    data.academic_calendar.events.push(newEvent);
    await writeData(data);

    return NextResponse.json({ message: 'Event berhasil ditambahkan', event: newEvent });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add event' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const data = await readData();
    
    const idx = data.academic_calendar.events.findIndex((e: any) => e.id === Number(body.id));
    if (idx === -1) {
      return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 });
    }

    data.academic_calendar.events[idx] = {
      ...data.academic_calendar.events[idx],
      title: body.title || data.academic_calendar.events[idx].title,
      type: body.type || data.academic_calendar.events[idx].type,
      time: body.time || data.academic_calendar.events[idx].time,
      icon: body.icon || data.academic_calendar.events[idx].icon
    };

    await writeData(data);
    return NextResponse.json({ message: 'Event berhasil diperbarui', event: data.academic_calendar.events[idx] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const data = await readData();
    const initialLength = data.academic_calendar.events.length;
    data.academic_calendar.events = data.academic_calendar.events.filter((e: any) => e.id !== Number(id));

    if (data.academic_calendar.events.length === initialLength) {
      return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 });
    }

    await writeData(data);
    return NextResponse.json({ message: 'Event berhasil dihapus' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
