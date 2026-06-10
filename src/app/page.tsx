import MapWrapper from "@/components/MapWrapper";

export default function Home() {
  return (
    <main className="flex flex-col h-screen">
      <header className="p-4 bg-blue-600 text-white text-xl font-semibold">
        Easypharma
      </header>
      <div className="flex-1">
        <MapWrapper center={[48.8566, 2.3522]} zoom={13} />
      </div>
    </main>
  );
}
