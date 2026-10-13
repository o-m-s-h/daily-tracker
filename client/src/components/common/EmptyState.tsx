import { Sprout, Plus } from 'lucide-react';

export function EmptyState({ archived, onCreate }: { archived: boolean; onCreate: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><Sprout size={30} /></span><h2>{archived ? 'A place for past routines' : 'Small steps start here.'}</h2><p>{archived ? 'Archived activities will appear here, with their checkmarks safely kept.' : 'Add your first activity. A short walk, a chapter, a glass of water — make it your own.'}</p>{!archived && <button className="button primary" onClick={onCreate}><Plus size={17} /> Create your first activity</button>}</div>;
}
