export function LoadingSkeleton() {
  return <div className="loading-skeleton" role="status"><span className="sr-only">Loading your activities</span>{[0, 1, 2, 3].map(value => <div key={value} />)}</div>;
}
