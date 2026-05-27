import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            ⚗️ Alchemist
          </CardTitle>
          <CardDescription>
            Ask your local database what it knows
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-sm">
            Local-first SQLite intelligence. Coming soon.
          </p>
          <Button
            variant="default"
            onClick={() => setCount((c) => c + 1)}
          >
            Spells cast: {count}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
