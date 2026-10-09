import type { Route } from "./+types/_demo.primitives";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "~/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useThemeMode } from "~/hooks/useThemeMode";
import { readThemeMode } from "~/lib/theme-cookie.server";

export function meta() {
  return [
    { title: "Primitives demo" },
    { name: "description", content: "Smoke test for ported shadcn primitives." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  return { mode: readThemeMode(request, "counselor") };
}

export default function PrimitivesDemo({ loaderData }: Route.ComponentProps) {
  const [mode, setMode] = useThemeMode("counselor", loaderData.mode);

  return (
    <main data-testid="primitives-demo">
      <h1>Primitives demo</h1>

      <section>
        <h2>Theme</h2>
        <Button
          data-mode={mode}
          data-testid="theme-toggle"
          onClick={() => setMode(mode === "dark" ? "light" : "dark")}
        >
          Toggle theme (current: {mode})
        </Button>
      </section>

      <section>
        <h2>Button</h2>
        <Button>Click me</Button>
      </section>

      <section>
        <h2>Dialog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demo dialog</DialogTitle>
              <DialogDescription>This is a smoke-test dialog.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section>
        <h2>Select</h2>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Pick an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one">One</SelectItem>
            <SelectItem value="two">Two</SelectItem>
            <SelectItem value="three">Three</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section>
        <h2>Textarea</h2>
        <Textarea placeholder="Type something..." />
      </section>
    </main>
  );
}
