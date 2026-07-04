import { prisma } from "@/lib/prisma";

function formatBytes(bytes: bigint) {
  const value = Number(bytes);

  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  if (value < 1024 * 1024 * 1024)
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;

  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default async function VideosPage() {
  const videos = await prisma.video.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-8 text-3xl font-bold">
        Videos
      </h1>

      {videos.length === 0 ? (
        <div className="rounded-lg border p-6 text-center">
          No videos uploaded yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full">
            <thead className="border-b bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Size</th>
                <th className="px-4 py-3 text-left">Uploaded</th>
              </tr>
            </thead>

            <tbody>
              {videos.map((video) => (
                <tr
                  key={video.id}
                  className="border-b last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium">
                    {video.title}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-200 px-2 py-1 text-sm">
                      {video.videoStatus}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {video.mimeType}
                  </td>

                  <td className="px-4 py-3">
                    {formatBytes(video.size)}
                  </td>

                  <td className="px-4 py-3">
                    {video.createdAt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}