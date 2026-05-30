import streamlit as st
import pandas as pd
import os
from datetime import datetime

# Set Konfigurasi Halaman Dashboard (Sangat modern & premium)
st.set_page_config(
    page_title="Dashboard Absensi Wajah",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Tema & Styling Kustom via CSS
st.markdown("""
    <style>
    .main {
        background-color: #0e1117;
        color: #ffffff;
    }
    .stMetric {
        background-color: #1e222b;
        padding: 15px;
        border-radius: 10px;
        border: 1px solid #30363d;
    }
    h1, h2, h3 {
        font-family: 'Outfit', 'Inter', sans-serif;
    }
    </style>
    """, unsafe_allow_html=True)

# Nama File Database Excel Lokal
EXCEL_FILE = "attendance.xlsx"

st.title("🎓 Dashboard Absensi Siswa - Face Recognition")
st.markdown("Rekapitulasi absensi siswa secara *real-time* berbasis kecerdasan buatan.")
st.markdown("---")

# Cek apakah file absensi ada
if not os.path.exists(EXCEL_FILE):
    st.warning("⚠️ Database absensi (`attendance.xlsx`) belum ditemukan.")
    st.info("💡 Silakan jalankan program kamera absensi terlebih dahulu di terminal menggunakan perintah: `python face_attendance.py` lalu pilih Menu 3 untuk melakukan perekaman absen pertama.")
else:
    # Fungsi membaca data secara real-time
    @st.fragment
    def load_data():
        df = pd.read_excel(EXCEL_FILE)
        # Pastikan kolom Tanggal, Bulan, Tahun diubah menjadi string agar mudah difilter
        df["Tanggal"] = df["Tanggal"].astype(str)
        df["Tahun"] = df["Tahun"].astype(str)
        return df

    df = load_data()

    # --- SIDEBAR FILTER ---
    st.sidebar.header("🔍 Filter Data Absensi")
    
    # 1. Filter Nama Siswa
    all_names = ["Semua"] + list(df["Nama"].unique())
    selected_name = st.sidebar.selectbox("Pilih Nama Siswa", all_names)
    
    # 2. Filter Bulan
    all_months = ["Semua"] + list(df["Bulan"].unique())
    selected_month = st.sidebar.selectbox("Pilih Bulan", all_months)

    # Filter DataFrame berdasarkan pilihan sidebar
    df_filtered = df.copy()
    if selected_name != "Semua":
        df_filtered = df_filtered[df_filtered["Nama"] == selected_name]
    if selected_month != "Semua":
        df_filtered = df_filtered[df_filtered["Bulan"] == selected_month]

    # --- METRICS SECTION ---
    col1, col2, col3, col4 = st.columns(4)
    
    total_records = len(df_filtered)
    unique_students = df_filtered["Nama"].nunique()
    
    # Cari absensi terakhir jika ada data
    if not df_filtered.empty:
        last_student = df_filtered.iloc[-1]["Nama"]
        last_time = f"{df_filtered.iloc[-1]['Waktu Absen']} ({df_filtered.iloc[-1]['Tanggal']} {df_filtered.iloc[-1]['Bulan']})"
    else:
        last_student = "-"
        last_time = "-"

    with col1:
        st.metric(label="Total Kehadiran (Log)", value=total_records)
    with col2:
        st.metric(label="Siswa Hadir (Unik)", value=unique_students)
    with col3:
        st.metric(label="Absensi Terakhir", value=last_student)
    with col4:
        st.metric(label="Waktu Terakhir", value=last_time)

    st.markdown("---")

    # --- VISUALISASI GRAPHICS ---
    col_chart1, col_chart2 = st.columns([1, 1])

    with col_chart1:
        st.subheader("📊 Frekuensi Kehadiran per Siswa")
        if not df_filtered.empty:
            # Hitung jumlah kehadiran masing-masing siswa
            attendance_counts = df_filtered["Nama"].value_counts().reset_index()
            attendance_counts.columns = ["Nama", "Jumlah Hadir"]
            st.bar_chart(data=attendance_counts, x="Nama", y="Jumlah Hadir", color="#00ffcc")
        else:
            st.info("Tidak ada data untuk grafik.")

    with col_chart2:
        st.subheader("📅 Kehadiran Harian (Jumlah Absen)")
        if not df_filtered.empty:
            # Gabungkan Hari, Tanggal, Bulan menjadi label
            df_filtered["Label_Tanggal"] = df_filtered["Tanggal"] + " " + df_filtered["Bulan"]
            daily_counts = df_filtered["Label_Tanggal"].value_counts().reset_index()
            daily_counts.columns = ["Tanggal", "Jumlah Hadir"]
            st.line_chart(data=daily_counts, x="Tanggal", y="Jumlah Hadir", color="#ff007f")
        else:
            st.info("Tidak ada data untuk grafik.")

    st.markdown("---")

    # --- TABLE DATABASE SECTION ---
    st.subheader("📋 Log Riwayat Kehadiran Lengkap")
    
    # Tombol Refresh manual
    if st.button("🔄 Refresh Data Terbaru"):
        st.rerun()
        
    # Tampilkan tabel data hasil filter
    st.dataframe(
        df_filtered.sort_index(ascending=False), # Tampilkan yang terbaru di atas
        use_container_width=True,
        column_config={
            "Waktu Absen": st.column_config.TextColumn("Jam Absen"),
            "Tanggal": st.column_config.TextColumn("Tanggal"),
            "Tahun": st.column_config.TextColumn("Tahun"),
        }
    )
    
    # Tombol unduh data Excel hasil filter
    csv = df_filtered.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="📥 Download Data Filter (.CSV)",
        data=csv,
        file_name='log_absensi_filtered.csv',
        mime='text/csv',
    )
