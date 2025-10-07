import { useEffect, useState } from 'react';
import { listTeam } from '../../lib/team';
import ReactMarkdown from 'react-markdown';

export default function Zespol(){
  const [rows,setRows]=useState<any[]>([]);
  useEffect(()=>{ listTeam().then(setRows); },[]);
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-6">Zespół</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map(m=>(
          <div key={m.id} className="border rounded-2xl overflow-hidden">
            {m.photo_url && <img src={m.photo_url} className="w-full aspect-square object-cover" />}
            <div className="p-4">
              <div className="font-medium text-lg">{m.name}</div>
              <div className="text-sm text-text-black/70 mb-2">{m.role}</div>
              {m.bio_md && <ReactMarkdown>{m.bio_md}</ReactMarkdown>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}