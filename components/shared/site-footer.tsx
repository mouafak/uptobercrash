import { PROJECT } from '@/config/project';

export default function SiteFooter() {
  return (
    <footer className="flex-center h-12 w-full shrink-0 px-4">
      <p className="text-xs text-foreground/70">
        © {new Date().getFullYear()} {PROJECT.name}
      </p>
    </footer>
  );
}
