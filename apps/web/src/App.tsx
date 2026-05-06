import { trpc } from "./lib/trpc";

function App() {
  const { data: health, isLoading } = trpc.health.useQuery();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          psy-manager
        </h1>
        <p className="text-muted-foreground">
          Environment configured successfully ✅
        </p>
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-sm font-medium">API Status</p>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Connecting...</p>
          ) : health ? (
            <p className="text-green-500 text-sm font-mono">
              {JSON.stringify(health, null, 2)}
            </p>
          ) : (
            <p className="text-red-500 text-sm">Not connected</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
