'use client';

import React, { useEffect, useState } from 'react';
import PWAInstallButton from '../components/PWAInstallButton';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const WEEKDAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'];

function formatFullDate(date: Date): string {
  const day = DAY_NAMES[date.getDay()];
  const d = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day}, ${d} ${month} ${year}`;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function relativeTime(date: Date | null): string {
  if (!date) return '—';
  const secs = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (secs < 5) return 'baru saja';
  if (secs < 60) return `${secs} detik lalu`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} jam lalu`;
}

// Percentage of a bar's value relative to the tallest bar in its own chart
function pctOf(val: number, maxV: number): number {
  return maxV > 0 ? Math.round((val / maxV) * 100) : 0;
}

export default function SonarDashboard() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [scrolled, setScrolled] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Live clock/date — also doubles as the tick that keeps "diperbarui X lalu" fresh.
  // IMPORTANT: start as null, not `new Date()`. Creating the Date at render time
  // means the server (SSR) and the client (hydration) run at slightly different
  // instants, producing two different strings for the same markup — a hydration
  // mismatch. Filling it in inside useEffect guarantees it only ever runs client-side.
  const [now, setNow] = useState<Date | null>(null);

  const [currentCount, setCurrentCount] = useState<number>(0);
  const [maxCapacity, setMaxCapacity] = useState<number>(30);
  const [totalToday, setTotalToday] = useState<number>(0);
  const [totalMonth, setTotalMonth] = useState<number>(0);

  // Senin–Jumat visitor counts, for the "Pengunjung per hari" diagram
  const [weekdayValues, setWeekdayValues] = useState<number[]>(Array(5).fill(0));
  // Januari–Desember visitor counts, for the "Pengunjung per bulan" diagram
  const [monthlyValues, setMonthlyValues] = useState<number[]>(Array(12).fill(0));

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // Scroll listener for the blurred sticky nav
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Tick every second so the live clock and "diperbarui X detik lalu" stay live.
  // Setting the first value here too — this effect only ever runs in the browser.
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/sensor/dashboard`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Gagal mengambil data sensor');
        const data = await res.json();

        setCurrentCount(data.currentCount ?? 0);
        setMaxCapacity(data.maxCapacity ?? 30);
        setTotalToday(data.totalToday ?? 0);
        setTotalMonth(data.totalMonth ?? 0);

        if (Array.isArray(data.weekdayValues)) setWeekdayValues(data.weekdayValues);
        if (Array.isArray(data.monthlyValues)) setMonthlyValues(data.monthlyValues);

        setIsOnline(true);
        setLoaded(true);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Gagal mengambil data sensor:', error);
        setIsOnline(false);
        setLoaded(true);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  // No hard capacity limit anymore — however many people are inside is fine.
  // maxCapacity is kept only as a soft, informational reference (never triggers
  // a "full/red" warning state), used just to give the meter a gentle sense of scale.
  const capacityRatio = maxCapacity > 0 ? Math.min(currentCount / maxCapacity, 1) : 0;
  const meterFilled = Math.round(capacityRatio * 20);

  // Weekday diagram derived stats
  const weekdayMaxV = Math.max(...weekdayValues, 1);
  const hasWeekdayData = weekdayValues.some((v) => v > 0);
  const weekdayPeakIndex = weekdayValues.indexOf(Math.max(...weekdayValues));
  const weekdayPeakCount = hasWeekdayData ? Math.max(...weekdayValues) : 0;
  const busiestDayName = hasWeekdayData ? WEEKDAY_NAMES[weekdayPeakIndex] : '-';

  // Monthly diagram derived stats
  const monthMaxV = Math.max(...monthlyValues, 1);
  const hasMonthData = monthlyValues.some((v) => v > 0);
  const monthPeakIndex = monthlyValues.indexOf(Math.max(...monthlyValues));
  const monthPeakCount = hasMonthData ? Math.max(...monthlyValues) : 0;
  const busiestMonthName = hasMonthData ? MONTH_NAMES[monthPeakIndex] : '-';

  const Skel = () => <span className="skeleton" />;

  return (
    <>
      <div className="bg-grid" />
      <div className="bg-ambient" />
      <div className="bg-grain" />

      <div className="wrap">
        <nav className={scrolled ? 'scrolled' : ''}>
          <div className="nav-left">
            <button
              onClick={toggleTheme}
              title="Ganti mode tampilan"
              aria-label={`Ganti ke mode ${theme === 'dark' ? 'terang' : 'gelap'}`}
              type="button"
              className="theme-toggle-btn"
            >
              <span className="knob">
                <i className={theme === 'dark' ? 'ti ti-moon' : 'ti ti-sun'} />
              </span>
            </button>
            <div className="logo">
              <span className="ping" /> Sonar
            </div>
          </div>
          <div className="loc-switch">
            <i className="ti ti-map-pin" /> Perpustakaan Pusat <i className="ti ti-chevron-down" />
          </div>
          <PWAInstallButton />
        </nav>

        <header className="page reveal reveal-1">
          <div>
            <h1>Kapasitas ruangan</h1>
            <div className="sub">Pintu-01 · Lantai 1</div>
            <div className="date-tag" role="status" aria-live="polite">
              <i className="ti ti-calendar-event" />
              {now ? (
                <>
                  <span>{formatFullDate(now)}</span>
                  <span className="date-sep">·</span>
                  <span className="clock-live">{formatClock(now)}</span>
                </>
              ) : (
                <Skel />
              )}
            </div>
          </div>
          <div className={`live-tag${isOnline ? '' : ' offline'}`}>
            <span className="ping" /> {isOnline ? 'Live' : 'Sensor offline'}
          </div>
        </header>

        <div className="hero-card reveal reveal-2">
          <div className="radar">
            <div className="radar-face" />
            <div className="radar-sweep" />
            <div className="radar-rings" key={currentCount}>
              <span className="ring a" />
              <span className="ring b" />
            </div>
            <div className="radar-core" role="status" aria-live="polite">
              {loaded ? (
                <span key={currentCount} className="n digit-pop">
                  {currentCount}
                </span>
              ) : (
                <Skel />
              )}
              <span className="u">pengunjung</span>
            </div>
          </div>

          <div className="hero-info">
            <div className="eyebrow">Pengunjung di dalam ruangan saat ini</div>
            <div className="row">
              <span className="max">referensi kapasitas ±{maxCapacity} pengunjung</span>
            </div>
            <div className="meter">
              {Array.from({ length: 20 }).map((_, i) => (
                <i key={i} className={i < meterFilled ? 'on' : ''} />
              ))}
            </div>
            <div className="status-pill">
              <i className="ti ti-infinity" style={{ fontSize: '14px' }} /> Tanpa batas kapasitas
            </div>
          </div>
        </div>

        <div className="stats-row reveal reveal-3">
          <div className="stat-card">
            <div className="icon">
              <i className="ti ti-calendar-event" />
            </div>
            <div className="label">Total hari ini</div>
            <div className="value">
              {loaded ? (
                <span key={totalToday} className="digit-pop">
                  {totalToday.toLocaleString('id-ID')}
                </span>
              ) : (
                <Skel />
              )}
            </div>
          </div>
          <div className="stat-card">
            <div className="icon">
              <i className="ti ti-calendar-stats" />
            </div>
            <div className="label">Total bulan ini</div>
            <div className="value">{loaded ? totalMonth.toLocaleString('id-ID') : <Skel />}</div>
          </div>
          <div className="stat-card">
            <div className="icon">
              <i className="ti ti-users" />
            </div>
            <div className="label">Hari banyak pengunjung</div>
            <div className="value">{loaded ? busiestDayName : <Skel />}</div>
            {loaded && weekdayPeakCount > 0 && (
              <div className="value-sub">{weekdayPeakCount.toLocaleString('id-ID')} pengunjung</div>
            )}
          </div>
          <div className="stat-card">
            <div className="icon">
              <i className="ti ti-trending-up" />
            </div>
            <div className="label">Bulan banyak pengunjung</div>
            <div className="value">{loaded ? busiestMonthName : <Skel />}</div>
            {loaded && monthPeakCount > 0 && (
              <div className="value-sub">{monthPeakCount.toLocaleString('id-ID')} pengunjung</div>
            )}
          </div>
        </div>

        <div className="chart-card reveal reveal-4">
          <div className="chart-head">
            <h2>Pengunjung per hari</h2>
            <span className="rng">Senin – Jumat</span>
          </div>
          <div className="chart-bars">
            {WEEKDAY_LABELS.map((_, i) => {
              const val = weekdayValues[i] || 0;
              const pct = pctOf(val, weekdayMaxV);
              const heightPct = Math.max(pct, val > 0 ? 4 : 0);
              return (
                <div
                  key={i}
                  className={`bar${i === weekdayPeakIndex && val > 0 ? ' peak' : ''}`}
                  style={{ height: `${heightPct}%` }}
                >
                  <span className="pct">{pct}%</span>
                  <span className="tip">{WEEKDAY_NAMES[i]} · {val} pengunjung</span>
                </div>
              );
            })}
          </div>
          <div className="chart-labels">
            {WEEKDAY_LABELS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
        </div>

        <div className="chart-card reveal reveal-5">
          <div className="chart-head">
            <h2>Pengunjung per bulan</h2>
            <span className="rng">Januari – Desember</span>
          </div>
          <div className="chart-bars dense">
            {MONTH_LABELS.map((_, i) => {
              const val = monthlyValues[i] || 0;
              const pct = pctOf(val, monthMaxV);
              const heightPct = Math.max(pct, val > 0 ? 4 : 0);
              return (
                <div
                  key={i}
                  className={`bar${i === monthPeakIndex && val > 0 ? ' peak' : ''}`}
                  style={{ height: `${heightPct}%` }}
                >
                  <span className="pct">{pct}%</span>
                  <span className="tip">{MONTH_NAMES[i]} · {val} pengunjung</span>
                </div>
              );
            })}
          </div>
          <div className="chart-labels dense">
            {MONTH_LABELS.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>

        <div className="status-strip reveal reveal-5">
          <div className="grp">
            <span className="item">
              <span className={`dot${isOnline ? '' : ' off'}`} /> {isOnline ? 'Sensor terhubung' : 'Sensor terputus'}
            </span>
            <span className="item">
              <i className="ti ti-refresh" /> Diperbarui {relativeTime(lastUpdated)}
            </span>
          </div>
          <div className="grp">
            <span>PINTU-01</span>
            <span>REFERENSI {maxCapacity}</span>
          </div>
        </div>
      </div>
    </>
  );
}