import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // Jalur ke file Excel (attendance.xlsx berada di root project, di atas folder dashboard-web)
    const excelPath = path.resolve(process.cwd(), '../attendance.xlsx');
    
    // Jika file Excel belum ada, kembalikan array kosong
    if (!fs.existsSync(excelPath)) {
      return NextResponse.json([]);
    }

    // Membaca file Excel secara lokal
    const fileBuffer = fs.readFileSync(excelPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Konversi baris data Excel ke JSON array
    const data = XLSX.utils.sheet_to_json(worksheet);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error saat membaca file Excel:', error);
    return NextResponse.json({ error: 'Gagal memuat data absensi' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const recordsToDelete = body.recordsToDelete;
    if (!Array.isArray(recordsToDelete)) {
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    const excelPath = path.resolve(process.cwd(), '../attendance.xlsx');
    let existingData: any[] = [];
    let workbook: XLSX.WorkBook;
    let sheetName = 'Attendance';

    if (fs.existsSync(excelPath)) {
      try {
        const fileBuffer = fs.readFileSync(excelPath);
        workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        sheetName = workbook.SheetNames[0] || 'Attendance';
        existingData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } catch (readError: any) {
        console.error('Error reading file:', readError);
        return NextResponse.json({ error: 'File Excel sedang dibuka oleh program lain (seperti Microsoft Excel). Silakan tutup Excel terlebih dahulu!' }, { status: 500 });
      }
    } else {
      workbook = XLSX.utils.book_new();
    }

    // Process each deletion by marking status as 'Dihapus' so they disappear and don't regenerate as Alpa
    for (const delRec of recordsToDelete) {
      const rowIndex = existingData.findIndex((row: any) => 
        row.Nama && delRec.Nama &&
        row.Nama.toString().trim().toLowerCase() === delRec.Nama.toString().trim().toLowerCase() && 
        String(row.Tanggal) === String(delRec.Tanggal) && 
        row.Bulan === delRec.Bulan && 
        String(row.Tahun) === String(delRec.Tahun)
      );

      if (rowIndex >= 0) {
        existingData[rowIndex].Status = 'Dihapus';
      } else {
        existingData.push({
          Nama: delRec.Nama,
          Kelas: delRec.Kelas,
          'No Absen': delRec['No Absen'],
          Hari: delRec.Hari,
          Tanggal: delRec.Tanggal,
          Bulan: delRec.Bulan,
          Tahun: delRec.Tahun,
          'Waktu Absen': delRec['Waktu Absen'] || '-',
          Status: 'Dihapus'
        });
      }
    }

    const newWorksheet = XLSX.utils.json_to_sheet(existingData);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);
    
    try {
      const outputBuffer = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'buffer' });
      fs.writeFileSync(excelPath, outputBuffer);
    } catch (writeError: any) {
      console.error('Error writing file:', writeError);
      return NextResponse.json({ error: 'Tidak dapat menyimpan. File Excel sedang dibuka oleh program lain (seperti Microsoft Excel). Silakan tutup Excel terlebih dahulu!' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Log absensi berhasil dihapus', count: recordsToDelete.length });
  } catch (error: any) {
    console.error('Error saat menghapus log absensi:', error);
    return NextResponse.json({ error: 'Gagal menghapus log absensi' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    const excelPath = path.resolve(process.cwd(), '../attendance.xlsx');
    let existingData: any[] = [];
    let workbook: XLSX.WorkBook;
    let sheetName = 'Attendance';
    
    if (fs.existsSync(excelPath)) {
      try {
        const fileBuffer = fs.readFileSync(excelPath);
        workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        sheetName = workbook.SheetNames[0] || 'Attendance';
        existingData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } catch (readError: any) {
        console.error('Error reading file:', readError);
        return NextResponse.json({ error: 'File Excel sedang dibuka oleh program lain (seperti Microsoft Excel). Silakan tutup Excel terlebih dahulu!' }, { status: 500 });
      }
    } else {
      workbook = XLSX.utils.book_new();
    }

    const rowIndex = existingData.findIndex((row: any) => 
      row.Nama && body.Nama &&
      row.Nama.toString().trim().toLowerCase() === body.Nama.toString().trim().toLowerCase() && 
      String(row.Tanggal) === String(body.Tanggal) && 
      row.Bulan === body.Bulan && 
      String(row.Tahun) === String(body.Tahun)
    );

    if (rowIndex >= 0) {
      existingData[rowIndex].Status = body.Status;
      if (body['Waktu Absen']) existingData[rowIndex]['Waktu Absen'] = body['Waktu Absen'];
      if (body.Kelas) existingData[rowIndex].Kelas = body.Kelas;
      if (body['No Absen']) existingData[rowIndex]['No Absen'] = body['No Absen'];
    } else {
      existingData.push({
        Nama: body.Nama,
        Kelas: body.Kelas,
        'No Absen': body['No Absen'],
        Hari: body.Hari,
        Tanggal: body.Tanggal,
        Bulan: body.Bulan,
        Tahun: body.Tahun,
        'Waktu Absen': body['Waktu Absen'] || '-',
        Status: body.Status
      });
    }

    const newWorksheet = XLSX.utils.json_to_sheet(existingData);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);
    
    try {
      const outputBuffer = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'buffer' });
      fs.writeFileSync(excelPath, outputBuffer);
    } catch (writeError: any) {
      console.error('Error writing file:', writeError);
      return NextResponse.json({ error: 'Tidak dapat menyimpan. File Excel sedang dibuka oleh program lain (seperti Microsoft Excel). Silakan tutup Excel terlebih dahulu!' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Status berhasil diperbarui' });
  } catch (error: any) {
    console.error('Error update status:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status' }, { status: 500 });
  }
}
