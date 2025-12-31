export default function VideoCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="aspect-video bg-gray-200 animate-pulse" />
      <div className="p-6">
        <div className="h-6 bg-gray-200 rounded animate-pulse mb-4 w-3/4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-1/4" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
        </div>
      </div>
    </div>
  );
}
