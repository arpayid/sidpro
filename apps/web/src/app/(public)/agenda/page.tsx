import { Card, CardContent, CardHeader, CardTitle } from '@sidpro/ui';
import { apiFetchWithFallback } from '@/lib/api';
import { demoAgenda, type AgendaItem } from '@/lib/demo-data';
import { Calendar, MapPin } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agenda',
};

export default async function AgendaPage() {
  const agenda = await apiFetchWithFallback<AgendaItem[]>(
    '/api/v1/public/agenda',
    demoAgenda,
  );

  return (
    <div className="container-page py-10">
      <h1 className="page-title">Agenda Kegiatan</h1>
      <p className="page-description">Jadwal kegiatan dan acara resmi desa.</p>

      <div className="mt-8 space-y-4">
        {agenda.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="text-lg">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>
                  {new Date(item.date).toLocaleString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <span>{item.location}</span>
              </div>
              <p className="pt-2 text-slate-700">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
