'use client';

import { EmptyState } from '@/components/enterprise/empty-state';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const GENDER_LABELS: Record<string, string> = {
  male: 'Laki-laki',
  female: 'Perempuan',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Diajukan',
  verified: 'Terverifikasi',
  approved: 'Disetujui',
  completed: 'Selesai',
  rejected: 'Ditolak',
};

const CHART_COLORS = ['#059669', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

interface PopulationChartProps {
  byGender: { gender: string; _count: { id: number } }[];
  byStatus: { residentStatus: string; _count: { id: number } }[];
}

interface LettersChartProps {
  byStatus: { status: string; _count: { id: number } }[];
}

export function PopulationCharts({ byGender, byStatus }: PopulationChartProps) {
  const genderData = byGender.map((item) => ({
    name: GENDER_LABELS[item.gender] ?? item.gender,
    value: item._count.id,
  }));
  const hasGenderData = genderData.some((item) => item.value > 0);

  const statusData = byStatus.map((item) => ({
    name: item.residentStatus,
    label: item.residentStatus,
    count: item._count.id,
  }));
  const hasStatusData = statusData.some((item) => item.count > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold text-slate-900">Penduduk per Jenis Kelamin</h3>
        <div className="mt-4 h-64">
          {hasGenderData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {genderData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              className="h-full py-0"
              title="Data gender kosong"
              description="Grafik tampil setelah data penduduk tersedia."
            />
          )}
        </div>
      </div>
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold text-slate-900">Penduduk per Status</h3>
        <div className="mt-4 h-64">
          {hasStatusData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              className="h-full py-0"
              title="Data status kosong"
              description="Grafik tampil setelah data status penduduk tersedia."
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function LettersStatusChart({ byStatus }: LettersChartProps) {
  const data = byStatus.map((item) => ({
    name: STATUS_LABELS[item.status] ?? item.status,
    count: item._count.id,
  }));
  const hasData = data.some((item) => item.count > 0);

  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-semibold text-slate-900">Permohonan Surat per Status</h3>
      <div className="mt-4 h-64">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            className="h-full py-0"
            title="Data surat kosong"
            description="Grafik tampil setelah permohonan surat tersedia."
          />
        )}
      </div>
    </div>
  );
}
